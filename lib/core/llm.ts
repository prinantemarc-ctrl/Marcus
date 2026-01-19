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
export function formatAgentPrompt(
  clusterDescription: string,
  demographics?: {
    age?: number;
    region?: string;
    socioClass?: string;
  }
): string {
  let prompt = `You are a virtual agent generator for an opinion simulation.

Opinion cluster: ${clusterDescription}

`;

  if (demographics) {
    prompt += `Demographics:
`;
    if (demographics.age) prompt += `- Age: ${demographics.age} years\n`;
    if (demographics.region) prompt += `- Region: ${demographics.region}\n`;
    if (demographics.socioClass) prompt += `- Socio-professional class: ${demographics.socioClass}\n`;
  }

  // Add randomness seed for variety
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
    "observer who analyzes before speaking"
  ];
  const randomPersonality = personalityVariants[Math.floor(Math.random() * personalityVariants.length)];
  
  const backgroundVariants = [
    "self-made entrepreneur",
    "academic researcher",
    "government employee",
    "small business owner",
    "corporate manager",
    "freelance professional",
    "retired expert",
    "young graduate",
    "community leader",
    "technical specialist"
  ];
  const randomBackground = backgroundVariants[Math.floor(Math.random() * backgroundVariants.length)];

  prompt += `
Generate a virtual agent with the following characteristics in JSON format.

CRITICAL INSTRUCTIONS FOR UNIQUENESS:
1. NAME: Generate a COMPLETELY UNIQUE name. Use diverse surnames from the region (NOT Al-Mansouri, Al-Rashid, or common names). Mix traditional and modern names.
2. PERSONALITY: This agent is a ${randomPersonality} with background as ${randomBackground}.
3. PRIORS/BIO: Write a DISTINCTIVE biography that:
   - Does NOT start with "Champions" or "Values" or "Supports"
   - Uses VARIED sentence structures
   - Mentions specific personal experiences or anecdotes
   - Includes nuanced, even contradictory viewpoints
   - Feels like a REAL person, not a category description
4. TRAITS: Choose unusual, specific traits (not just "traditional" or "modern")

BAD example of priors: "Champions free market economics and diversification. Values efficiency."
GOOD example of priors: "After losing his family's textile business to foreign competition, developed complex views on globalization - sees both opportunity and threat. Weekend chess player who applies strategic thinking to politics."

{
  "name": "First Last (UNIQUE - avoid Al-Mansouri, Al-Rashid, common names)",
  "age": number between 18 and 80,
  "socio_demo": "specific situation with personal details",
  "traits": ["specific_trait1", "specific_trait2", "specific_trait3"],
  "priors": "UNIQUE biography with personal story, specific experiences, nuanced views (100-180 chars). NO generic statements.",
  "speaking_style": "specific style (e.g., 'uses sports metaphors', 'speaks in questions', 'dry humor')",
  "expression_profile": {
    "directness": number between 0 and 100,
    "social_filter": number between 0 and 100,
    "conformity_pressure": number between 0 and 100,
    "context_sensitivity": "high" | "medium" | "low"
  },
  "psychological_profile": {
    "core_values": ["specific_value1", "specific_value2"],
    "cognitive_biases": ["specific_bias1", "specific_bias2"],
    "risk_tolerance": number between 0 and 100,
    "assertiveness": number between 0 and 100
  }
}

`;

  return prompt;
}

export function formatReactionPrompt(
  agentProfile: {
    priors: string;
    traits: string[];
    speaking_style: string;
  },
  scenario: string,
  context?: string
): string {
  return `You are a virtual agent in an opinion simulation.

Agent profile:
- Opinions and values: ${agentProfile.priors}
- Personality traits: ${agentProfile.traits.join(", ")}
- Communication style: ${agentProfile.speaking_style}

Scenario: ${scenario}
${context ? `\nAdditional context: ${context}` : ""}

You MUST generate a valid JSON reaction. Follow these rules EXACTLY:

REQUIRED JSON STRUCTURE:
{
  "stance_score": <number 0-100>,
  "confidence": <number 0-100>,
  "emotion": "<one of: anger, fear, hope, cynicism, pride, sadness, indifference, enthusiasm, mistrust>",
  "key_reasons": ["<reason1>", "<reason2>", "<reason3>"],
  "response": "<text EXACTLY 80-160 characters - count carefully!>",
  "true_belief": {
    "inner_stance_score": <number 0-100>,
    "cognitive_biases": ["<bias1>", "<bias2>"],
    "core_values_impact": "<description>",
    "self_awareness": <number 0-100>
  },
  "public_expression": {
    "expressed_stance_score": <number 0-100>,
    "expression_modifier": <number -50 to 50>,
    "filter_reasons": ["<reason1>", "<reason2>"],
    "context": "<one of: public, semi_public, private, social_media, secret_ballot>"
  },
  "behavioral_action": {
    "action_type": "<one of: vote_for, vote_against, vote_blank, abstention, petition_for, petition_against, manifestation_for, manifestation_against, public_support_for, public_support_against, no_action>",
    "action_intensity": <number 0-100>,
    "action_consistency": "<one of: consistent, moderate_gap, major_gap>",
    "predicted_engagement": "<one of: passive, moderate, active, militant>"
  },
  "coherence_score": <number 0-100>,
  "coherence_breakdown": {
    "thought_expression_gap": <number 0-100>,
    "thought_action_gap": <number 0-100>,
    "expression_action_gap": <number 0-100>
  }
}

CRITICAL REQUIREMENTS:
1. "response" MUST be between 80 and 160 characters EXACTLY. Count each character including spaces.
2. "key_reasons" MUST be an array with exactly 3 non-empty strings.
3. All enum values MUST match exactly (case-sensitive).
4. All numbers MUST be valid integers/floats within specified ranges.
5. "true_belief", "public_expression", and "behavioral_action" MUST be objects, NOT strings.
6. Return ONLY the JSON object, no markdown code blocks, no explanations, no extra text.

EXAMPLE (response is 95 characters):
{
  "stance_score": 75,
  "confidence": 80,
  "emotion": "hope",
  "key_reasons": ["Economic benefits", "Cultural preservation", "Democratic values"],
  "response": "I support this proposal because it aligns with our core values and will benefit our community significantly.",
  "true_belief": {
    "inner_stance_score": 75,
    "cognitive_biases": ["confirmation_bias"],
    "core_values_impact": "Strengthens democratic principles",
    "self_awareness": 60
  },
  "public_expression": {
    "expressed_stance_score": 70,
    "expression_modifier": -5,
    "filter_reasons": ["Economic benefits"],
    "context": "public"
  },
  "behavioral_action": {
    "action_type": "vote_for",
    "action_intensity": 70,
    "action_consistency": "consistent",
    "predicted_engagement": "moderate"
  },
  "coherence_score": 75,
  "coherence_breakdown": {
    "thought_expression_gap": 5,
    "thought_action_gap": 5,
    "expression_action_gap": 0
  }
}

Now generate the reaction for this agent.
`;
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
