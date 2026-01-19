/**
 * Full Pipeline Test Script v2
 * Tests: Zone → Clusters → Agents → Simulation
 * With enhanced diversity and coherence analysis
 */

import 'dotenv/config';

const CLAUDE_API_KEY = process.env.ANTHROPIC_API_KEY;
if (!CLAUDE_API_KEY) {
  console.error("❌ ANTHROPIC_API_KEY environment variable is required");
  console.error("   Set it in your .env file or export it: export ANTHROPIC_API_KEY=sk-ant-...");
  process.exit(1);
}
const CLAUDE_MODEL = "claude-sonnet-4-20250514";

// Track used names to ensure uniqueness
const usedNames = new Set<string>();
const usedFirstNames = new Set<string>();
const usedLastNames = new Set<string>();

// ============================================================================
// LLM CALL
// ============================================================================
async function callClaude(prompt: string, systemPrompt?: string): Promise<string> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": CLAUDE_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 2000,
      temperature: 0.9, // Higher temperature for more diversity
      messages: [
        {
          role: "user",
          content: systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`Claude API error: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return data.content[0]?.text || "";
}

// ============================================================================
// CLUSTER GENERATION
// ============================================================================
async function generateClusters(zoneName: string, count: number): Promise<any[]> {
  console.log(`\n🎯 Generating ${count} clusters for zone "${zoneName}"...`);
  
  const prompt = `You are an opinion cluster generator for a simulation platform.

Zone: ${zoneName}

Generate ${count} DISTINCT and CONTRASTING opinion clusters. Each cluster must have:
- A unique perspective on issues
- Different demographics, values, and priorities
- Realistic weight distribution

Return as JSON array:
[
  {
    "name": "Descriptive cluster name",
    "description_prompt": "Detailed description: who they are, their values, concerns, typical professions, age range, economic status. Be specific!",
    "weight": number (weights must sum to 100)
  }
]

Make clusters MAXIMALLY DIFFERENT from each other.
Reply ONLY with the JSON array.`;

  const response = await callClaude(prompt);
  
  let jsonStr = response.trim();
  const jsonMatch = jsonStr.match(/```json\s*([\s\S]*?)\s*```/) || jsonStr.match(/```\s*([\s\S]*?)\s*```/);
  if (jsonMatch) jsonStr = jsonMatch[1].trim();
  
  const clusters = JSON.parse(jsonStr);
  console.log(`✅ Generated ${clusters.length} clusters`);
  clusters.forEach((c: any, i: number) => {
    console.log(`   ${i + 1}. ${c.name} (${c.weight}%)`);
    console.log(`      ${c.description_prompt.substring(0, 100)}...`);
  });
  
  return clusters;
}

// ============================================================================
// AGENT GENERATION WITH UNIQUE NAMES
// ============================================================================
async function generateAgent(clusterDescription: string, clusterName: string, agentNumber: number, existingNames: string[], agentIndexInCluster: number): Promise<any> {
  
  // List of forbidden/used names
  const forbiddenNames = [...existingNames, ...Array.from(usedNames)];
  const forbiddenFirstNames = Array.from(usedFirstNames);
  const forbiddenLastNames = Array.from(usedLastNames);
  
  // Generate varied ages based on position
  const ageRanges = [
    { min: 25, max: 32, label: "young professional" },
    { min: 33, max: 42, label: "mid-career" },
    { min: 43, max: 55, label: "experienced senior" },
    { min: 56, max: 68, label: "veteran/elder" },
  ];
  const ageRange = ageRanges[agentIndexInCluster % ageRanges.length];
  
  const prompt = `You are generating a UNIQUE virtual agent for an opinion simulation.

Cluster: ${clusterName}
Description: ${clusterDescription}

CRITICAL UNIQUENESS RULES:
1. Name: DO NOT use these first names: ${forbiddenFirstNames.slice(-5).join(", ") || "none"}
2. Name: DO NOT use these last names: ${forbiddenLastNames.slice(-5).join(", ") || "none"}
3. Age: MUST be between ${ageRange.min} and ${ageRange.max} (${ageRange.label})
4. Generate a DISTINCT personality - not a clone of other agents!

NAME POOLS (choose creatively):
- Emirati: Saif, Rashid, Hamad, Majid, Omar, Fatima, Maryam, Aisha, Noura, Latifa
- Surnames: Al-Kaabi, Al-Nuaimi, Al-Shamsi, Al-Dhaheri, Al-Mazrouei, Al-Falasi
- Indian: Arun, Vikram, Sandeep, Priya, Anjali, Meera + Kumar, Reddy, Nair, Verma, Singh
- Filipino: Jose, Marco, Anna, Maria, Miguel + Santos, Dela Cruz, Torres, Reyes, Bautista
- Western: James, Michael, Sarah, Emily, David + Williams, Brown, Martinez, Garcia

Generate JSON:
{
  "name": "UNIQUE First Last",
  "age": ${Math.floor(Math.random() * (ageRange.max - ageRange.min + 1)) + ageRange.min},
  "socio_demo": "specific job, family, income, education - BE SPECIFIC",
  "traits": ["unique_trait1", "unique_trait2", "unique_trait3"],
  "priors": "PERSONAL opinions (100-150 chars) - use 'I believe', 'I think', be specific",
  "speaking_style": "SPECIFIC style: uses humor? formal? street slang? academic? emotional?"
}

Reply ONLY with JSON.`;

  const response = await callClaude(prompt);
  
  let jsonStr = response.trim();
  const jsonMatch = jsonStr.match(/```json\s*([\s\S]*?)\s*```/) || jsonStr.match(/```\s*([\s\S]*?)\s*```/);
  if (jsonMatch) jsonStr = jsonMatch[1].trim();
  
  const agent = JSON.parse(jsonStr);
  
  // Extract and track names
  const nameParts = agent.name.split(" ");
  const firstName = nameParts[0];
  const lastName = nameParts.slice(1).join(" ");
  
  usedNames.add(agent.name);
  usedFirstNames.add(firstName);
  usedLastNames.add(lastName);
  
  agent.id = `agent_test_${Date.now()}_${agentNumber}`;
  agent.agentNumber = agentNumber;
  agent.cluster_name = clusterName;
  agent.cluster_description = clusterDescription;
  
  return agent;
}

async function generateAgents(clusters: any[], totalAgents: number): Promise<any[]> {
  console.log(`\n👥 Generating ${totalAgents} agents across ${clusters.length} clusters...`);
  
  const agents: any[] = [];
  const totalWeight = clusters.reduce((sum: number, c: any) => sum + c.weight, 0);
  
  let agentNumber = 1;
  for (const cluster of clusters) {
    const count = Math.max(1, Math.round((cluster.weight / totalWeight) * totalAgents));
    console.log(`\n   📁 Cluster: "${cluster.name}" (${count} agents)`);
    
    const existingNamesInCluster: string[] = [];
    
    for (let i = 0; i < count && agents.length < totalAgents; i++) {
      try {
        process.stdout.write(`      Generating agent ${agentNumber}...`);
        const agent = await generateAgent(cluster.description_prompt, cluster.name, agentNumber, existingNamesInCluster, i);
        existingNamesInCluster.push(agent.name);
        agents.push(agent);
        console.log(` ✅ ${agent.name} (${agent.age}yo, ${agent.speaking_style})`);
        agentNumber++;
      } catch (error) {
        console.log(` ❌ Failed`);
        console.error(`         Error:`, error instanceof Error ? error.message : error);
      }
    }
  }
  
  console.log(`\n✅ Generated ${agents.length} agents total`);
  
  // Check name uniqueness
  const uniqueNames = new Set(agents.map(a => a.name));
  if (uniqueNames.size < agents.length) {
    console.log(`⚠️ WARNING: ${agents.length - uniqueNames.size} duplicate names detected!`);
  } else {
    console.log(`✅ All names are unique!`);
  }
  
  return agents;
}

// ============================================================================
// REACTION GENERATION
// ============================================================================
const VALID_EMOTIONS = ["anger", "fear", "hope", "cynicism", "pride", "sadness", "indifference", "enthusiasm", "mistrust"];

const EMOTION_MAPPING: Record<string, string> = {
  "pragmatic": "indifference", "neutral": "indifference", "cautious": "fear",
  "careful": "fear", "worried": "fear", "anxious": "fear", "concerned": "fear",
  "optimistic": "hope", "hopeful": "hope", "confident": "pride", "proud": "pride",
  "excited": "enthusiasm", "enthusiastic": "enthusiasm", "happy": "enthusiasm",
  "pleased": "pride", "satisfied": "pride", "angry": "anger", "frustrated": "anger",
  "annoyed": "anger", "disappointed": "sadness", "sad": "sadness", "upset": "sadness",
  "resigned": "sadness", "skeptical": "cynicism", "doubtful": "cynicism",
  "suspicious": "mistrust", "distrustful": "mistrust", "wary": "mistrust",
  "ambivalent": "indifference", "mixed": "indifference", "reserved": "indifference",
  "supportive": "hope", "critical": "cynicism",
};

function normalizeEmotion(emotion: string): string {
  const lower = emotion?.toLowerCase() || "indifference";
  if (VALID_EMOTIONS.includes(lower)) return lower;
  if (EMOTION_MAPPING[lower]) return EMOTION_MAPPING[lower];
  return "indifference";
}

async function generateReaction(agent: any, scenario: string): Promise<any> {
  // Add randomness factor to encourage variance
  const varianceSeed = Math.floor(Math.random() * 20) - 10; // -10 to +10
  
  const prompt = `You are ${agent.name}, a ${agent.age}-year-old.

YOUR PROFILE:
- Job: ${agent.socio_demo}
- Beliefs: ${agent.priors}
- Traits: ${agent.traits.join(", ")}
- Speaking style: ${agent.speaking_style}

SCENARIO: ${scenario}

CRITICAL: Generate a UNIQUE stance score. Do NOT use round numbers like 25, 50, 75!
Use specific numbers like 23, 47, 68, 81, etc.

Your personal variance factor: ${varianceSeed > 0 ? "+" : ""}${varianceSeed} (apply this to differentiate from others)

Consider how YOUR SPECIFIC situation affects your view:
- Your age ${agent.age} (younger=more adaptable? older=more cautious?)
- Your job security
- Your family situation

{
  "stance_score": <specific number 0-100, NOT round numbers - use 23, 47, 68, 81, etc.>,
  "confidence": <0-100>,
  "emotion": "<EXACTLY: anger|fear|hope|cynicism|pride|sadness|indifference|enthusiasm|mistrust>",
  "key_reasons": ["personal reason 1", "personal reason 2", "personal reason 3"],
  "response": "<your verbal response 80-150 chars>"
}

Reply ONLY with JSON.`;

  const response = await callClaude(prompt);
  
  let jsonStr = response.trim();
  const jsonMatch = jsonStr.match(/```json\s*([\s\S]*?)\s*```/) || jsonStr.match(/```\s*([\s\S]*?)\s*```/);
  if (jsonMatch) jsonStr = jsonMatch[1].trim();
  const jsonObjMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (jsonObjMatch) jsonStr = jsonObjMatch[0];
  
  const reaction = JSON.parse(jsonStr);
  reaction.emotion = normalizeEmotion(reaction.emotion);
  
  if (!Array.isArray(reaction.key_reasons) || reaction.key_reasons.length < 3) {
    reaction.key_reasons = reaction.key_reasons || [];
    while (reaction.key_reasons.length < 3) {
      reaction.key_reasons.push("Personal consideration");
    }
  }
  
  return reaction;
}

async function runSimulation(agents: any[], scenario: string): Promise<any[]> {
  console.log(`\n🎬 Running simulation with ${agents.length} agents...`);
  console.log(`   Scenario: "${scenario.substring(0, 80)}..."`);
  
  const results: any[] = [];
  
  for (const agent of agents) {
    try {
      process.stdout.write(`   ${agent.name}...`);
      const reaction = await generateReaction(agent, scenario);
      results.push({ agent, reaction, success: true });
      console.log(` ✅ stance=${reaction.stance_score}, ${reaction.emotion}`);
    } catch (error) {
      console.log(` ❌ Failed`);
      results.push({ agent, error: error instanceof Error ? error.message : String(error), success: false });
    }
  }
  
  return results;
}

// ============================================================================
// COHERENCE ANALYSIS
// ============================================================================
function analyzeCoherence(results: any[], clusters: any[]) {
  console.log("\n╔════════════════════════════════════════════════════════════════╗");
  console.log("║                    COHERENCE ANALYSIS                          ║");
  console.log("╚════════════════════════════════════════════════════════════════╝");
  
  const successfulResults = results.filter(r => r.success);
  
  // Group by cluster
  const byCluster: Record<string, any[]> = {};
  successfulResults.forEach(r => {
    const cluster = r.agent.cluster_name;
    if (!byCluster[cluster]) byCluster[cluster] = [];
    byCluster[cluster].push(r);
  });
  
  console.log("\n📊 Analysis by Cluster:");
  
  let coherenceIssues: string[] = [];
  
  for (const [clusterName, clusterResults] of Object.entries(byCluster)) {
    console.log(`\n   📁 ${clusterName} (${clusterResults.length} agents):`);
    
    const stances = clusterResults.map(r => r.reaction.stance_score);
    const avgStance = stances.reduce((a, b) => a + b, 0) / stances.length;
    const stanceVariance = stances.reduce((sum, s) => sum + Math.pow(s - avgStance, 2), 0) / stances.length;
    const stanceStdDev = Math.sqrt(stanceVariance);
    
    console.log(`      Stance: avg=${avgStance.toFixed(1)}, stddev=${stanceStdDev.toFixed(1)}, range=[${Math.min(...stances)}-${Math.max(...stances)}]`);
    
    // Check if stance variance within cluster is reasonable (not too high, not too low)
    if (stanceStdDev > 25) {
      coherenceIssues.push(`${clusterName}: High stance variance (${stanceStdDev.toFixed(1)}) - agents too different`);
    }
    if (stanceStdDev < 3 && clusterResults.length > 2) {
      coherenceIssues.push(`${clusterName}: Very low stance variance (${stanceStdDev.toFixed(1)}) - agents too similar`);
    }
    
    // Emotion distribution
    const emotions: Record<string, number> = {};
    clusterResults.forEach(r => {
      emotions[r.reaction.emotion] = (emotions[r.reaction.emotion] || 0) + 1;
    });
    const emotionStr = Object.entries(emotions).map(([e, c]) => `${e}:${c}`).join(", ");
    console.log(`      Emotions: ${emotionStr}`);
    
    // Individual agents
    clusterResults.forEach(r => {
      console.log(`      - ${r.agent.name} (${r.agent.age}yo): stance=${r.reaction.stance_score}, ${r.reaction.emotion}`);
      console.log(`        "${r.reaction.response.substring(0, 80)}..."`);
    });
  }
  
  // Cross-cluster comparison
  console.log("\n📈 Cross-Cluster Comparison:");
  const clusterAvgStances: { name: string; avg: number }[] = [];
  for (const [name, results] of Object.entries(byCluster)) {
    const avg = results.reduce((sum, r) => sum + r.reaction.stance_score, 0) / results.length;
    clusterAvgStances.push({ name, avg });
  }
  clusterAvgStances.sort((a, b) => a.avg - b.avg);
  clusterAvgStances.forEach(c => {
    const bar = "█".repeat(Math.round(c.avg / 5));
    console.log(`   ${c.name.padEnd(35)} ${c.avg.toFixed(1).padStart(5)} ${bar}`);
  });
  
  // Check if clusters are differentiated
  if (clusterAvgStances.length >= 2) {
    const range = clusterAvgStances[clusterAvgStances.length - 1].avg - clusterAvgStances[0].avg;
    if (range < 15) {
      coherenceIssues.push(`Low cluster differentiation (range=${range.toFixed(1)}) - clusters should be more different`);
    } else {
      console.log(`\n   ✅ Good cluster differentiation (stance range: ${range.toFixed(1)} points)`);
    }
  }
  
  // Response diversity check
  console.log("\n📝 Response Diversity:");
  const responses = successfulResults.map(r => r.reaction.response);
  const uniqueStarts = new Set(responses.map(r => r.substring(0, 20)));
  const diversityRatio = uniqueStarts.size / responses.length;
  console.log(`   Unique response starts: ${uniqueStarts.size}/${responses.length} (${(diversityRatio * 100).toFixed(0)}%)`);
  
  if (diversityRatio < 0.7) {
    coherenceIssues.push(`Low response diversity (${(diversityRatio * 100).toFixed(0)}%) - responses too similar`);
  }
  
  // Final coherence verdict
  console.log("\n" + "═".repeat(60));
  if (coherenceIssues.length === 0) {
    console.log("✅ COHERENCE CHECK PASSED - Results are diverse and consistent");
  } else {
    console.log("⚠️ COHERENCE ISSUES DETECTED:");
    coherenceIssues.forEach(issue => console.log(`   - ${issue}`));
  }
  
  return coherenceIssues;
}

// ============================================================================
// MAIN
// ============================================================================
async function main() {
  console.log("╔════════════════════════════════════════════════════════════════╗");
  console.log("║       MARCUS - Full Pipeline Test v2 (Enhanced Diversity)      ║");
  console.log("╚════════════════════════════════════════════════════════════════╝");
  
  const startTime = Date.now();
  
  try {
    const ZONE_NAME = "UAE Public Opinion";
    const CLUSTER_COUNT = 3;
    const AGENT_COUNT = 12;
    const SCENARIO = "The UAE government announces a major policy to attract 100,000 tech workers from abroad over the next 5 years, offering them citizenship pathways. This aims to boost innovation but raises questions about job competition for locals and cultural integration.";
    
    console.log("\n📋 Test Parameters:");
    console.log(`   Zone: ${ZONE_NAME}`);
    console.log(`   Clusters: ${CLUSTER_COUNT}`);
    console.log(`   Agents: ${AGENT_COUNT}`);
    
    // Step 1: Generate clusters
    const clusters = await generateClusters(ZONE_NAME, CLUSTER_COUNT);
    
    // Step 2: Generate agents
    const agents = await generateAgents(clusters, AGENT_COUNT);
    
    // Step 3: Run simulation
    const results = await runSimulation(agents, SCENARIO);
    
    // Step 4: Analyze coherence
    const coherenceIssues = analyzeCoherence(results, clusters);
    
    // Final summary
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log("\n╔════════════════════════════════════════════════════════════════╗");
    console.log("║                      FINAL SUMMARY                             ║");
    console.log("╚════════════════════════════════════════════════════════════════╝");
    console.log(`   ✅ Successful: ${successCount}/${results.length}`);
    console.log(`   ❌ Failed: ${failCount}/${results.length}`);
    console.log(`   ⚠️ Coherence issues: ${coherenceIssues.length}`);
    console.log(`   ⏱️ Time: ${elapsed}s`);
    
    // Unique names check
    const uniqueNames = new Set(agents.map(a => a.name));
    console.log(`   👤 Unique names: ${uniqueNames.size}/${agents.length}`);
    
    console.log("\n" + "═".repeat(60));
    if (failCount === 0 && coherenceIssues.length === 0 && uniqueNames.size === agents.length) {
      console.log("🎉 PIPELINE TEST PASSED - Ready for production!");
    } else if (failCount === 0) {
      console.log("⚠️ PIPELINE WORKS but has minor issues to review");
    } else {
      console.log("❌ PIPELINE HAS FAILURES - Needs fixing");
    }
    
  } catch (error) {
    console.error("\n❌ FATAL ERROR:", error);
    process.exit(1);
  }
}

main();
