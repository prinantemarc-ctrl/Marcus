/**
 * LLM Interface - Interface abstraite pour les différents providers LLM
 */

import type { LLMConfig, LLMProvider } from "./config";

export interface LLMResponse {
  content: string;
  error?: string;
}

export interface LLMRequest {
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

// ============================================================================
// LLM INTERFACE
// ============================================================================
export async function callLLM(
  request: LLMRequest,
  config: LLMConfig
): Promise<LLMResponse> {
  try {
    const response = await fetch("/api/llm", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...request,
        config,
      }),
    });

    const data = await response.json().catch(() => ({ error: "Failed to parse response" }));

    if (!response.ok || data.error) {
      // Provide helpful error messages
      let errorMessage = data.error || `HTTP ${response.status}`;
      
      if (config.provider === "ollama") {
        if (errorMessage.includes("ECONNREFUSED") || errorMessage.includes("Cannot connect")) {
          errorMessage = "Cannot connect to Ollama. Make sure Ollama is installed and running. See OLLAMA_SETUP.md for instructions.";
        } else if (errorMessage.includes("not found")) {
          errorMessage = `Model "${config.ollamaModel}" not found. Pull it first: ollama pull ${config.ollamaModel}`;
        } else if (errorMessage.includes("timeout")) {
          errorMessage = "Request timeout. The model might be too slow. Try a smaller model or increase timeout.";
        }
      }
      
      return {
        content: "",
        error: errorMessage,
      };
    }

    return {
      content: data.content || "",
      error: data.error,
    };
  } catch (error) {
    let errorMessage = error instanceof Error ? error.message : "Network error";
    
    if (config.provider === "ollama" && errorMessage.includes("fetch")) {
      errorMessage = "Cannot connect to Ollama. Make sure Ollama is installed and running on " + (config.ollamaUrl || "http://localhost:11434");
    }
    
    return {
      content: "",
      error: errorMessage,
    };
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
// Track used names across generations for uniqueness
const usedFirstNames = new Set<string>();
const usedLastNames = new Set<string>();

export function formatAgentPrompt(
  clusterDescription: string,
  demographics?: {
    age?: number;
    region?: string;
    socioClass?: string;
    agentIndex?: number;
    forbiddenFirstNames?: string[];
    forbiddenLastNames?: string[];
  }
): string {
  // Age range based on agent index for diversity
  const ageRanges = [
    { min: 25, max: 32, label: "young professional" },
    { min: 33, max: 42, label: "mid-career" },
    { min: 43, max: 55, label: "experienced senior" },
    { min: 56, max: 70, label: "veteran/elder" },
  ];
  const ageRange = ageRanges[(demographics?.agentIndex || 0) % ageRanges.length];
  const suggestedAge = demographics?.age || (Math.floor(Math.random() * (ageRange.max - ageRange.min + 1)) + ageRange.min);

  // Forbidden names from tracking
  const forbiddenFirst = demographics?.forbiddenFirstNames || Array.from(usedFirstNames).slice(-10);
  const forbiddenLast = demographics?.forbiddenLastNames || Array.from(usedLastNames).slice(-10);

  // Random personality and background for variety
  const personalityVariants = [
    "introvert who prefers written communication",
    "extrovert who loves debates",
    "pragmatic professional focused on results",
    "idealist driven by principles",
    "skeptic who questions everything",
    "traditionalist valuing heritage",
    "innovator embracing change",
    "mediator seeking consensus",
    "activist pushing for reform",
    "observer who analyzes before speaking",
    "storyteller who uses anecdotes",
    "data-driven analyst",
    "community-focused collaborator",
    "independent thinker"
  ];
  const randomPersonality = personalityVariants[Math.floor(Math.random() * personalityVariants.length)];
  
  const speakingStyles = [
    "uses sports metaphors",
    "speaks in questions",
    "dry humor and irony",
    "formal and measured",
    "casual street slang",
    "academic precision",
    "emotional and passionate",
    "uses proverbs and sayings",
    "technical analogies",
    "storytelling with anecdotes",
    "diplomatic and careful",
    "direct and blunt"
  ];
  const randomStyle = speakingStyles[Math.floor(Math.random() * speakingStyles.length)];

  let prompt = `You are generating a UNIQUE virtual agent for an opinion simulation.

Cluster: ${clusterDescription}
${demographics?.region ? `Region: ${demographics.region}` : ""}

CRITICAL UNIQUENESS RULES:

1. NAME MUST BE UNIQUE:
   DO NOT use these first names: ${forbiddenFirst.join(", ") || "none specified"}
   DO NOT use these last names: ${forbiddenLast.join(", ") || "none specified"}
   
   NAME POOLS (choose creatively, MIX different origins):
   - Emirati: Saif, Rashid, Hamad, Majid, Omar, Yousef, Abdullah, Khalid, Noura, Fatima, Maryam, Aisha, Latifa, Shamma
   - Gulf surnames: Al-Kaabi, Al-Nuaimi, Al-Shamsi, Al-Dhaheri, Al-Mazrouei, Al-Falasi, Al-Muhairi, Al-Ketbi, Al-Suwaidi
   - Indian: Arun, Vikram, Sandeep, Priya, Anjali, Meera, Ravi, Sunil + Kumar, Reddy, Nair, Verma, Singh, Sharma, Gupta
   - Filipino: Jose, Marco, Anna, Maria, Miguel, Carlos, Elena + Santos, Dela Cruz, Torres, Reyes, Bautista, Garcia
   - Western: James, Michael, Sarah, Emily, David, Robert, Jennifer + Williams, Brown, Martinez, Anderson, Taylor

2. AGE: MUST be ${suggestedAge} years old (${ageRange.label})

3. PERSONALITY TYPE: ${randomPersonality}

4. SPEAKING STYLE: ${randomStyle}

5. BIO/PRIORS - Write a UNIQUE biography that:
   - Starts with a SPECIFIC personal experience or anecdote
   - Does NOT start with "Champions", "Values", "Supports", "Believes"
   - Mentions concrete details (job, family situation, specific event)
   - Shows nuance and contradictions like a real person
   - Is in FIRST PERSON ("I think...", "My experience...")

BAD priors: "Champions economic diversification and traditional values."
GOOD priors: "I lost my small shop to a mall chain in 2019. Now I drive Uber and see both sides - progress brings opportunities but crushes the little guy. My kids need jobs, but not at any cost."

Generate JSON:
{
  "name": "UNIQUE First Last - NOT from forbidden lists",
  "age": ${suggestedAge},
  "socio_demo": "specific job, family status, income, education",
  "traits": ["specific_trait1", "specific_trait2", "specific_trait3"],
  "priors": "UNIQUE first-person bio with personal story (100-180 chars)",
  "speaking_style": "${randomStyle}",
  "expression_profile": {
    "directness": ${Math.floor(Math.random() * 60) + 20},
    "social_filter": ${Math.floor(Math.random() * 60) + 20},
    "conformity_pressure": ${Math.floor(Math.random() * 60) + 20},
    "context_sensitivity": "${["high", "medium", "low"][Math.floor(Math.random() * 3)]}"
  },
  "psychological_profile": {
    "core_values": ["value1", "value2"],
    "cognitive_biases": ["bias1", "bias2"],
    "risk_tolerance": ${Math.floor(Math.random() * 60) + 20},
    "assertiveness": ${Math.floor(Math.random() * 60) + 20}
  }
}

Reply ONLY with valid JSON.`;

  return prompt;
}

// Helper to track used names
export function trackUsedName(firstName: string, lastName: string): void {
  usedFirstNames.add(firstName);
  usedLastNames.add(lastName);
}

export function getUsedNames(): { firstNames: string[]; lastNames: string[] } {
  return {
    firstNames: Array.from(usedFirstNames),
    lastNames: Array.from(usedLastNames),
  };
}

export function clearUsedNames(): void {
  usedFirstNames.clear();
  usedLastNames.clear();
}

// ============================================================================
// BATCH PROMPTS (Token-optimized)
// ============================================================================

/**
 * Batch Agent Generation Prompt
 * Generates multiple agents in a single LLM call (~90% token savings)
 */
export function formatBatchAgentPrompt(
  clusterDescription: string,
  count: number,
  options?: {
    region?: string;
    forbiddenNames?: string[];
  }
): string {
  const forbidden = options?.forbiddenNames?.slice(-20).join(", ") || "none";
  
  // Determine age distribution
  const ages = [];
  for (let i = 0; i < count; i++) {
    const ageRanges = [
      { min: 25, max: 32 },
      { min: 33, max: 42 },
      { min: 43, max: 55 },
      { min: 56, max: 70 },
    ];
    const range = ageRanges[i % ageRanges.length];
    ages.push(Math.floor(Math.random() * (range.max - range.min + 1)) + range.min);
  }

  return `Generate ${count} UNIQUE agents for: "${clusterDescription}"
${options?.region ? `Region: ${options.region}` : ""}

Requirements:
- All ${count} names DIFFERENT (vary first AND last names)
- DO NOT use: ${forbidden}
- Ages: ${ages.join(", ")}
- Mix cultural backgrounds: Emirati, Indian, Filipino, Western
- Each bio: first-person, personal experience, 80-120 chars
- NO "Values", "Champions", "Believes" starts
- Include DIVERSE perspectives (some pro-change, some conservative, some neutral)

JSON array (no markdown):
[{"name":"Full Name","age":N,"job":"job title","traits":["t1","t2","t3"],"priors":"First-person bio","style":"speaking style"}]`;
}

/**
 * Batch Reaction Generation Prompt
 * Generates multiple reactions in a single LLM call (~70% token savings)
 */
export function formatBatchReactionPrompt(
  agents: Array<{
    id: string;
    name?: string;
    age?: number;
    priors: string;
    traits?: string[];
  }>,
  scenario: string,
  context?: string
): string {
  const agentList = agents.map((a, i) => 
    `${i+1}. ${a.name || `Agent ${i+1}`} (${a.age || "?"}): ${a.priors.substring(0, 100)}`
  ).join("\n");

  return `Scenario: "${scenario}"
${context ? `Context: ${context}` : ""}

Agents:
${agentList}

CRITICAL: Generate DIVERSE reactions reflecting each agent's UNIQUE perspective.
- Some should SUPPORT (s>60), some should OPPOSE (s<40), some NEUTRAL (40-60)
- Stances must VARY based on each agent's background and interests
- Use SPECIFIC scores (not 50, 25, 75) - use 23, 47, 63, 78, etc.

Emotions: anger|fear|hope|cynicism|pride|sadness|indifference|enthusiasm|mistrust

JSON array (no markdown):
[{"id":1,"s":0-100,"c":0-100,"e":"emotion","r":["reason1","reason2","reason3"],"t":"response 80-150 chars"}]

Legend: id=agent number, s=stance_score, c=confidence, e=emotion, r=key_reasons, t=response text`;
}

export function formatReactionPrompt(
  agentProfile: {
    priors: string;
    traits: string[];
    speaking_style: string;
    name?: string;
    age?: number;
    socio_demo?: string;
    cluster_name?: string;
  },
  scenario: string,
  context?: string
): string {
  // Add variance factor to encourage different stances
  const varianceFactor = Math.floor(Math.random() * 15) - 7; // -7 to +7
  
  return `You are ${agentProfile.name || "a virtual agent"}, age ${agentProfile.age || "unknown"}.

YOUR UNIQUE PROFILE:
- Personal beliefs: ${agentProfile.priors}
- Personality: ${agentProfile.traits.join(", ")}
- Speaking style: ${agentProfile.speaking_style}
${agentProfile.socio_demo ? `- Situation: ${agentProfile.socio_demo}` : ""}
${agentProfile.cluster_name ? `- Group: ${agentProfile.cluster_name}` : ""}

SCENARIO: ${scenario}
${context ? `Context: ${context}` : ""}

CRITICAL: Generate YOUR UNIQUE stance score.
- DO NOT use round numbers like 25, 50, 75!
- Use SPECIFIC numbers like 23, 47, 63, 78, 81, etc.
- Your personal variance: ${varianceFactor > 0 ? "+" : ""}${varianceFactor} (consider this to differentiate from others)
- Consider how YOUR specific age (${agentProfile.age || "unknown"}) and situation affect your view

VALID EMOTIONS (MUST use exactly one):
anger | fear | hope | cynicism | pride | sadness | indifference | enthusiasm | mistrust

Generate JSON:
{
  "stance_score": <SPECIFIC number 0-100, NOT 25/50/75 - use 23, 47, 63, 78, etc.>,
  "confidence": <0-100>,
  "emotion": "<EXACTLY: anger|fear|hope|cynicism|pride|sadness|indifference|enthusiasm|mistrust>",
  "key_reasons": ["YOUR reason 1", "YOUR reason 2", "YOUR reason 3"],
  "response": "<YOUR verbal response 80-200 chars, in YOUR speaking style>",
  "true_belief": {
    "inner_stance_score": <0-100>,
    "cognitive_biases": ["bias1", "bias2"],
    "core_values_impact": "description",
    "self_awareness": <0-100>
  },
  "public_expression": {
    "expressed_stance_score": <0-100>,
    "expression_modifier": <-50 to 50>,
    "filter_reasons": ["reason1", "reason2"],
    "context": "<public|semi_public|private|social_media|secret_ballot>"
  },
  "behavioral_action": {
    "action_type": "<vote_for|vote_against|vote_blank|abstention|petition_for|petition_against|manifestation_for|manifestation_against|public_support_for|public_support_against|no_action>",
    "action_intensity": <0-100>,
    "action_consistency": "<consistent|moderate_gap|major_gap>",
    "predicted_engagement": "<passive|moderate|active|militant>"
  },
  "coherence_score": <0-100>,
  "coherence_breakdown": {
    "thought_expression_gap": <0-100>,
    "thought_action_gap": <0-100>,
    "expression_action_gap": <0-100>
  }
}

Reply ONLY with valid JSON. No markdown, no explanation.`;
}

export function formatExecutiveSummaryPrompt(
  title: string,
  scenario: string,
  results: Array<{
    agentId: string;
    clusterId: string;
    turns: Array<{
      stance_score?: number;
      confidence?: number;
      emotion?: string;
      key_reasons?: string[];
      response?: string;
    }>;
  }>,
  clusters: Array<{ id: string; name: string; weight: number }>,
  agents: Array<{ id: string; name?: string; agentNumber?: number }>
): string {
  // Calculate statistics
  const stanceScores = results
    .map(r => r.turns[0]?.stance_score)
    .filter((s): s is number => s !== undefined);
  const avgStance = stanceScores.length > 0
    ? stanceScores.reduce((a, b) => a + b, 0) / stanceScores.length
    : 0;
  
  const veryNegative = stanceScores.filter(s => s < 25).length;
  const negative = stanceScores.filter(s => s >= 25 && s < 50).length;
  const neutral = stanceScores.filter(s => s >= 50 && s < 75).length;
  const positive = stanceScores.filter(s => s >= 75).length;
  const total = stanceScores.length;

  // Get most frequent arguments
  const argumentCounts = new Map<string, number>();
  results.forEach(result => {
    const turn = result.turns[0];
    if (turn?.key_reasons) {
      turn.key_reasons.forEach(reason => {
        argumentCounts.set(reason, (argumentCounts.get(reason) || 0) + 1);
      });
    }
  });
  const topArguments = Array.from(argumentCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([arg, count]) => `${arg} (${count} mentions)`);

  // Cluster distribution
  const clusterDistribution = clusters.map(cluster => {
    const clusterResults = results.filter(r => r.clusterId === cluster.id);
    const clusterScores = clusterResults
      .map(r => r.turns[0]?.stance_score)
      .filter((s): s is number => s !== undefined);
    const avgClusterStance = clusterScores.length > 0
      ? clusterScores.reduce((a, b) => a + b, 0) / clusterScores.length
      : 0;
    return `${cluster.name}: ${clusterResults.length} agents, average stance ${avgClusterStance.toFixed(1)}/100`;
  });

  return `You are an expert analyst generating an executive summary for an opinion simulation.

SIMULATION DETAILS:
Title: ${title}
Scenario: ${scenario}

PANEL COMPOSITION:
- Total agents: ${total}
- Clusters: ${clusters.length}
${clusterDistribution.map(c => `  - ${c}`).join('\n')}

KEY STATISTICS:
- Average stance score: ${avgStance.toFixed(1)}/100
- Distribution:
  * Very negative (<25): ${veryNegative} agents (${((veryNegative / total) * 100).toFixed(1)}%)
  * Negative (25-50): ${negative} agents (${((negative / total) * 100).toFixed(1)}%)
  * Neutral (50-75): ${neutral} agents (${((neutral / total) * 100).toFixed(1)}%)
  * Positive (>75): ${positive} agents (${((positive / total) * 100).toFixed(1)}%)

TOP ARGUMENTS:
${topArguments.map((arg, i) => `${i + 1}. ${arg}`).join('\n')}

Generate a professional executive summary (3-5 paragraphs, 300-500 words) that:
1. Provides a clear overview of the simulation results
2. Highlights key findings and trends
3. Explains the distribution of opinions across clusters
4. Identifies the main arguments and concerns
5. Offers insights into the overall sentiment and potential implications

Write in a professional, analytical tone suitable for decision-makers. Be concise but comprehensive.

Return ONLY the executive summary text, without any markdown formatting, titles, or additional commentary.`;
}
