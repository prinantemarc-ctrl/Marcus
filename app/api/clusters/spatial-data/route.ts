import { NextRequest, NextResponse } from "next/server";
import { getSimulation } from "@/lib/core/storage";

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
}

function calculateCircularPosition(index: number, total: number, radius: number = 5): { x: number; y: number; z: number } {
  const angle = (index / total) * 2 * Math.PI;
  const heightVariation = Math.sin(index * 0.5) * 2;
  return {
    x: Math.cos(angle) * radius,
    y: heightVariation,
    z: Math.sin(angle) * radius,
  };
}

function scoreToSentiment(score: number): number {
  // Convert 0-100 score to -1 to 1 sentiment
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
  
  // Convert standard deviation to cohesion score (lower stdDev = higher cohesion)
  // Max stdDev for 0-100 range is 50, so we normalize accordingly
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const simulationId = searchParams.get("simulationId");

    if (!simulationId) {
      return NextResponse.json(
        { error: "simulationId parameter is required" },
        { status: 400 }
      );
    }

    const simulation = getSimulation(simulationId);
    if (!simulation) {
      return NextResponse.json(
        { error: "Simulation not found" },
        { status: 404 }
      );
    }

    const clusters = simulation.clustersSnapshot || [];
    const results = simulation.results || [];
    const panel = simulation.panelSnapshot || [];

    const spatialClusters: SpatialCluster[] = clusters.map((cluster, index) => {
      const clusterResults = results.filter(r => r.clusterId === cluster.id);
      const clusterAgents = panel.filter(a => a.cluster_id === cluster.id);
      
      // Get scores
      const scores = clusterResults
        .map(r => r.turns[0]?.stance_score)
        .filter((s): s is number => s !== undefined && !isNaN(s));
      
      // Get emotions
      const emotions = clusterResults
        .map(r => r.turns[0]?.emotion)
        .filter((e) => e !== undefined) as string[];
      
      // Get responses for keyword extraction
      const responses = clusterResults
        .map(r => r.turns[0]?.response)
        .filter((r): r is string => r !== undefined);
      
      // Calculate average score
      const avgScore = scores.length > 0 
        ? scores.reduce((a, b) => a + b, 0) / scores.length 
        : 50;
      
      // Get analysis data
      const trueBeliefs = clusterResults
        .map(r => r.turns[0]?.true_belief)
        .filter((b): b is NonNullable<typeof b> => b !== undefined);
      const publicExpressions = clusterResults
        .map(r => r.turns[0]?.public_expression)
        .filter((e): e is NonNullable<typeof e> => e !== undefined);
      const behavioralActions = clusterResults
        .map(r => r.turns[0]?.behavioral_action)
        .filter((a): a is NonNullable<typeof a> => a !== undefined);
      
      // Summarize analysis
      const avgInnerScore = trueBeliefs.length > 0
        ? trueBeliefs.reduce((sum, tb) => sum + (tb.inner_stance_score || 0), 0) / trueBeliefs.length
        : avgScore;
      const avgExpressedScore = publicExpressions.length > 0
        ? publicExpressions.reduce((sum, pe) => sum + (pe.expressed_stance_score || 0), 0) / publicExpressions.length
        : avgScore;
      const avgActionIntensity = behavioralActions.length > 0
        ? behavioralActions.reduce((sum, ba) => sum + (ba.action_intensity || 0), 0) / behavioralActions.length
        : avgScore;

      // Create agent summaries
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

      return {
        id: cluster.id,
        name: cluster.name,
        description: cluster.description_prompt || "",
        weight: cluster.weight || 0,
        agentCount: clusterAgents.length,
        position: calculateCircularPosition(index, clusters.length),
        sentiment: scoreToSentiment(avgScore),
        avgScore: Math.round(avgScore * 10) / 10,
        cohesion: calculateCohesion(scores),
        dominantEmotion: getDominantEmotion(emotions),
        keywords: extractKeywords(responses),
        agents: agentSummaries,
        analysis: {
          think: `Average inner belief score: ${avgInnerScore.toFixed(1)}/100. ${trueBeliefs.length > 0 ? `Based on ${trueBeliefs.length} agent beliefs.` : "No belief data available."}`,
          say: `Average public expression score: ${avgExpressedScore.toFixed(1)}/100. ${publicExpressions.length > 0 ? `${publicExpressions.length} agents expressed their views.` : "No expression data available."}`,
          do: `Average action intensity: ${avgActionIntensity.toFixed(1)}/100. ${behavioralActions.length > 0 ? `${behavioralActions.length} predicted behavioral outcomes.` : "No action data available."}`,
        },
        verbatims: responses.slice(0, 5),
      };
    });

    const response: SpatialDataResponse = {
      metadata: {
        simulationId: simulation.id,
        title: simulation.title,
        scenario: simulation.scenario,
        totalAgents: panel.length,
        totalClusters: clusters.length,
        createdAt: simulation.createdAt,
      },
      clusters: spatialClusters,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching spatial data:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch spatial data" },
      { status: 500 }
    );
  }
}
