/**
 * Spatial Data Processing - Client-side utility for 3D visualization
 */

import type { Simulation } from "@/types";

export interface SpatialCluster {
  id: string;
  name: string;
  description: string;
  weight: number;
  agentCount: number;
  position: { x: number; y: number; z: number };
  sentiment: number; // -1 to 1
  avgScore: number;
  cohesion: number; // 0 to 100
  dominantEmotion: string;
  keywords: string[];
  agents: Array<{
    id: string;
    name: string;
    score: number;
    emotion: string;
    response: string;
  }>;
  analysis: {
    think: string;
    say: string;
    do: string;
  };
  verbatims: string[];
}

export interface OpinionBridge {
  sourceId: string;
  targetId: string;
  strength: number; // 0 to 1
  sharedKeywords: string[];
  sharedEmotions: string[];
  scoreDifference: number;
  bridgeType: "strong" | "moderate" | "weak";
  persuasionVector: string; // How to bridge these clusters
}

export interface SpatialDataResponse {
  metadata: {
    simulationId: string;
    title: string;
    scenario: string;
    totalAgents: number;
    totalClusters: number;
    createdAt: string;
  };
  clusters: SpatialCluster[];
  bridges: OpinionBridge[];
}

// Calculate similarity between two clusters based on score, keywords, and emotions
function calculateClusterSimilarity(
  cluster1: { avgScore: number; keywords: string[]; dominantEmotion: string },
  cluster2: { avgScore: number; keywords: string[]; dominantEmotion: string }
): number {
  // Score similarity (0 to 1)
  const scoreDiff = Math.abs(cluster1.avgScore - cluster2.avgScore) / 100;
  const scoreSimilarity = 1 - scoreDiff;
  
  // Keyword similarity (Jaccard index)
  const keywords1 = new Set(cluster1.keywords);
  const keywords2 = new Set(cluster2.keywords);
  const intersection = [...keywords1].filter(k => keywords2.has(k)).length;
  const union = new Set([...keywords1, ...keywords2]).size;
  const keywordSimilarity = union > 0 ? intersection / union : 0;
  
  // Emotion similarity
  const emotionSimilarity = cluster1.dominantEmotion === cluster2.dominantEmotion ? 1 : 0.3;
  
  // Weighted combination
  return scoreSimilarity * 0.5 + keywordSimilarity * 0.3 + emotionSimilarity * 0.2;
}

// Calculate positions using force-directed layout based on similarity
function calculateSimilarityBasedPositions(
  clusterData: Array<{ avgScore: number; keywords: string[]; dominantEmotion: string }>
): Array<{ x: number; y: number; z: number }> {
  const n = clusterData.length;
  if (n === 0) return [];
  if (n === 1) return [{ x: 0, y: 0, z: 0 }];
  
  // Initialize positions in a circle
  const positions = clusterData.map((_, i) => {
    const angle = (i / n) * 2 * Math.PI;
    return {
      x: Math.cos(angle) * 5,
      y: (clusterData[i].avgScore - 50) / 10, // Y based on score
      z: Math.sin(angle) * 5,
    };
  });
  
  // Calculate similarity matrix
  const similarities: number[][] = [];
  for (let i = 0; i < n; i++) {
    similarities[i] = [];
    for (let j = 0; j < n; j++) {
      if (i === j) {
        similarities[i][j] = 1;
      } else {
        similarities[i][j] = calculateClusterSimilarity(clusterData[i], clusterData[j]);
      }
    }
  }
  
  // Force-directed layout iterations
  const iterations = 50;
  const repulsion = 2;
  const attraction = 0.5;
  
  for (let iter = 0; iter < iterations; iter++) {
    const forces = positions.map(() => ({ x: 0, y: 0, z: 0 }));
    
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const dx = positions[j].x - positions[i].x;
        const dy = positions[j].y - positions[i].y;
        const dz = positions[j].z - positions[i].z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.1;
        
        // Ideal distance: similar clusters should be closer
        const similarity = similarities[i][j];
        const idealDistance = (1 - similarity) * 8 + 2; // 2 to 10 units
        
        // Force direction
        const nx = dx / distance;
        const ny = dy / distance;
        const nz = dz / distance;
        
        // Attraction/repulsion based on ideal distance
        const forceMagnitude = (distance - idealDistance) * attraction;
        
        forces[i].x += nx * forceMagnitude;
        forces[i].z += nz * forceMagnitude;
        forces[j].x -= nx * forceMagnitude;
        forces[j].z -= nz * forceMagnitude;
        
        // Additional repulsion if too close
        if (distance < 2) {
          const repulsionForce = repulsion / (distance * distance);
          forces[i].x -= nx * repulsionForce;
          forces[i].z -= nz * repulsionForce;
          forces[j].x += nx * repulsionForce;
          forces[j].z += nz * repulsionForce;
        }
      }
    }
    
    // Apply forces with damping
    const damping = 0.3 * (1 - iter / iterations);
    for (let i = 0; i < n; i++) {
      positions[i].x += forces[i].x * damping;
      positions[i].z += forces[i].z * damping;
    }
  }
  
  // Center the positions
  const centerX = positions.reduce((sum, p) => sum + p.x, 0) / n;
  const centerZ = positions.reduce((sum, p) => sum + p.z, 0) / n;
  
  return positions.map(p => ({
    x: p.x - centerX,
    y: p.y,
    z: p.z - centerZ,
  }));
}

// Calculate opinion bridges between clusters
function calculateOpinionBridges(
  clusters: Array<{
    id: string;
    avgScore: number;
    keywords: string[];
    dominantEmotion: string;
    verbatims: string[];
  }>
): OpinionBridge[] {
  const bridges: OpinionBridge[] = [];
  
  for (let i = 0; i < clusters.length; i++) {
    for (let j = i + 1; j < clusters.length; j++) {
      const c1 = clusters[i];
      const c2 = clusters[j];
      
      // Find shared keywords
      const keywords1 = new Set(c1.keywords);
      const keywords2 = new Set(c2.keywords);
      const sharedKeywords = [...keywords1].filter(k => keywords2.has(k));
      
      // Shared emotions (if same dominant emotion)
      const sharedEmotions = c1.dominantEmotion === c2.dominantEmotion 
        ? [c1.dominantEmotion] 
        : [];
      
      // Score difference
      const scoreDifference = Math.abs(c1.avgScore - c2.avgScore);
      
      // Calculate bridge strength
      const keywordBonus = sharedKeywords.length * 0.15;
      const emotionBonus = sharedEmotions.length * 0.2;
      const scorePenalty = scoreDifference / 100;
      
      const strength = Math.min(1, Math.max(0, 0.5 + keywordBonus + emotionBonus - scorePenalty));
      
      // Determine bridge type
      let bridgeType: "strong" | "moderate" | "weak";
      if (strength >= 0.6) {
        bridgeType = "strong";
      } else if (strength >= 0.4) {
        bridgeType = "moderate";
      } else {
        bridgeType = "weak";
      }
      
      // Generate persuasion vector
      let persuasionVector = "";
      if (sharedKeywords.length > 0) {
        persuasionVector = `Leverage shared concerns: ${sharedKeywords.slice(0, 3).join(", ")}. `;
      }
      if (scoreDifference < 20) {
        persuasionVector += "Opinions are close - focus on common ground. ";
      } else if (scoreDifference > 40) {
        persuasionVector += "Significant gap - bridge through shared emotions or values. ";
      }
      if (sharedEmotions.length > 0) {
        persuasionVector += `Both feel ${sharedEmotions[0]} - use emotional resonance.`;
      }
      
      bridges.push({
        sourceId: c1.id,
        targetId: c2.id,
        strength,
        sharedKeywords,
        sharedEmotions,
        scoreDifference,
        bridgeType,
        persuasionVector: persuasionVector || "Build connection through dialogue and understanding.",
      });
    }
  }
  
  // Sort by strength (strongest bridges first)
  return bridges.sort((a, b) => b.strength - a.strength);
}

function scoreToSentiment(score: number): number {
  return (score - 50) / 50;
}

function extractKeywords(responses: string[]): string[] {
  const wordCounts = new Map<string, number>();
  const stopWords = new Set([
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with",
    "by", "from", "as", "is", "was", "are", "were", "been", "be", "have", "has", "had",
    "do", "does", "did", "will", "would", "could", "should", "may", "might", "must",
    "i", "you", "he", "she", "it", "we", "they", "this", "that", "these", "those",
    "my", "your", "his", "her", "its", "our", "their", "what", "which", "who", "whom",
    "very", "just", "also", "more", "most", "some", "any", "all", "both", "each",
    "not", "no", "yes", "can", "about", "into", "through", "during", "before", "after",
  ]);

  responses.forEach(response => {
    const words = response.toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter(word => word.length > 3 && !stopWords.has(word));
    
    words.forEach(word => {
      wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
    });
  });

  return Array.from(wordCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([word]) => word);
}

function calculateCohesion(scores: number[]): number {
  if (scores.length === 0) return 0;
  if (scores.length === 1) return 100;
  
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
  const stdDev = Math.sqrt(variance);
  
  const cohesion = Math.max(0, 100 - (stdDev * 2));
  return Math.round(cohesion);
}

function getDominantEmotion(emotions: string[]): string {
  if (emotions.length === 0) return "neutral";
  
  const counts = new Map<string, number>();
  emotions.forEach(emotion => {
    if (emotion) {
      counts.set(emotion, (counts.get(emotion) || 0) + 1);
    }
  });
  
  let dominant = "neutral";
  let maxCount = 0;
  counts.forEach((count, emotion) => {
    if (count > maxCount) {
      maxCount = count;
      dominant = emotion;
    }
  });
  
  return dominant;
}

export function processSimulationToSpatialData(simulation: Simulation): SpatialDataResponse {
  const clusters = simulation.clustersSnapshot || [];
  const results = simulation.results || [];
  const panel = simulation.panelSnapshot || [];

  // First pass: calculate basic data for each cluster
  const clusterData = clusters.map((cluster) => {
    const clusterResults = results.filter(r => r.clusterId === cluster.id);
    const clusterAgents = panel.filter(a => a.cluster_id === cluster.id);
    
    const scores = clusterResults
      .map(r => r.turns[0]?.stance_score)
      .filter((s): s is number => s !== undefined && !isNaN(s));
    
    const emotions = clusterResults
      .map(r => r.turns[0]?.emotion)
      .filter((e) => e !== undefined) as string[];
    
    const responses = clusterResults
      .map(r => r.turns[0]?.response)
      .filter((r): r is string => r !== undefined);
    
    const avgScore = scores.length > 0 
      ? scores.reduce((a, b) => a + b, 0) / scores.length 
      : 50;
    
    const trueBeliefs = clusterResults
      .map(r => r.turns[0]?.true_belief)
      .filter((b): b is NonNullable<typeof b> => b !== undefined);
    const publicExpressions = clusterResults
      .map(r => r.turns[0]?.public_expression)
      .filter((e): e is NonNullable<typeof e> => e !== undefined);
    const behavioralActions = clusterResults
      .map(r => r.turns[0]?.behavioral_action)
      .filter((a): a is NonNullable<typeof a> => a !== undefined);
    
    const avgInnerScore = trueBeliefs.length > 0
      ? trueBeliefs.reduce((sum, tb) => sum + (tb.inner_stance_score || 0), 0) / trueBeliefs.length
      : avgScore;
    const avgExpressedScore = publicExpressions.length > 0
      ? publicExpressions.reduce((sum, pe) => sum + (pe.expressed_stance_score || 0), 0) / publicExpressions.length
      : avgScore;
    const avgActionIntensity = behavioralActions.length > 0
      ? behavioralActions.reduce((sum, ba) => sum + (ba.action_intensity || 0), 0) / behavioralActions.length
      : avgScore;

    const agentSummaries = clusterResults.slice(0, 10).map(result => {
      const agent = panel.find(a => a.id === result.agentId);
      const turn = result.turns[0];
      return {
        id: result.agentId,
        name: agent?.name || `Agent ${agent?.agentNumber || ""}`,
        score: turn?.stance_score || 0,
        emotion: turn?.emotion || "neutral",
        response: turn?.response || "",
      };
    });

    const keywords = extractKeywords(responses);
    const dominantEmotion = getDominantEmotion(emotions);

    return {
      id: cluster.id,
      name: cluster.name,
      description: cluster.description_prompt || "",
      weight: cluster.weight || 0,
      agentCount: clusterAgents.length || clusterResults.length,
      sentiment: scoreToSentiment(avgScore),
      avgScore: Math.round(avgScore * 10) / 10,
      cohesion: calculateCohesion(scores),
      dominantEmotion,
      keywords,
      agents: agentSummaries,
      analysis: {
        think: `Average inner belief score: ${avgInnerScore.toFixed(1)}/100. ${trueBeliefs.length > 0 ? `Based on ${trueBeliefs.length} agent beliefs.` : "No belief data available."}`,
        say: `Average public expression score: ${avgExpressedScore.toFixed(1)}/100. ${publicExpressions.length > 0 ? `${publicExpressions.length} agents expressed their views.` : "No expression data available."}`,
        do: `Average action intensity: ${avgActionIntensity.toFixed(1)}/100. ${behavioralActions.length > 0 ? `${behavioralActions.length} predicted behavioral outcomes.` : "No action data available."}`,
      },
      verbatims: responses.slice(0, 5),
    };
  });

  // Calculate similarity-based positions
  const positions = calculateSimilarityBasedPositions(
    clusterData.map(c => ({
      avgScore: c.avgScore,
      keywords: c.keywords,
      dominantEmotion: c.dominantEmotion,
    }))
  );

  // Combine data with positions
  const spatialClusters: SpatialCluster[] = clusterData.map((data, index) => ({
    ...data,
    position: positions[index] || { x: 0, y: 0, z: 0 },
  }));

  // Calculate opinion bridges
  const bridges = calculateOpinionBridges(
    clusterData.map(c => ({
      id: c.id,
      avgScore: c.avgScore,
      keywords: c.keywords,
      dominantEmotion: c.dominantEmotion,
      verbatims: c.verbatims,
    }))
  );

  return {
    metadata: {
      simulationId: simulation.id,
      title: simulation.title,
      scenario: simulation.scenario,
      totalAgents: panel.length || results.length,
      totalClusters: clusters.length,
      createdAt: simulation.createdAt,
    },
    clusters: spatialClusters,
    bridges,
  };
}
