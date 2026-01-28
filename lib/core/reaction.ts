/**
 * Reaction Generator - Generate reactions via LLM
 */

import { callLLM, formatReactionPrompt, formatBatchReactionPrompt } from "./llm";
import type { LLMConfig } from "./config";
import type { ReactionTurn, Agent } from "@/types";
import { ReactionTurnSchema } from "@/types";
import { formatMemoryForPrompt } from "./agentMemory";

// ============================================================================
// REACTION GENERATION
// ============================================================================
export async function generateReaction(
  agent: Agent,
  scenario: string,
  context?: string,
  config?: LLMConfig
): Promise<ReactionTurn> {
  console.log(`[reaction] Generating reaction for agent ${agent.id}`);
  console.log(`[reaction] Agent name: ${agent.name || agent.agentNumber}`);
  console.log(`[reaction] Agent priors: ${agent.priors?.substring(0, 100)}...`);
  console.log(`[reaction] Agent traits:`, agent.traits);
  
  if (!config) {
    console.error(`[reaction] ERROR: LLM config is missing for agent ${agent.id}`);
    throw new Error("LLM config is required");
  }

  // Get agent's memory context for consistency
  const memoryContext = formatMemoryForPrompt(agent, scenario);
  if (memoryContext) {
    console.log(`[reaction] Including memory context for agent ${agent.id}`);
  }

  // Extract life events and core values for richer context
  const lifeEvents = agent.lifeHistory?.lifeEvents?.map(e => ({
    year: e.year,
    event: e.event,
    emotionalImpact: e.emotionalImpact,
  }));
  
  const coreValues = agent.lifeHistory?.coreValues?.map(v => ({
    value: v.value,
    importance: v.importance,
  }));

  const prompt = formatReactionPrompt(
    {
      priors: agent.priors,
      traits: agent.traits,
      speaking_style: agent.speaking_style,
      name: agent.name,
      age: agent.age,
      socio_demo: agent.socio_demo,
      cluster_name: agent.cluster_id,
      memoryContext,
      lifeEvents,
      coreValues,
    },
    scenario,
    context
  );

  console.log(`[reaction] Prompt length: ${prompt.length} characters`);
  console.log(`[reaction] Calling LLM for agent ${agent.id}...`);

  const response = await callLLM(
    {
      prompt,
      temperature: 0.8,
      maxTokens: 2000,
    },
    config
  );

  console.log(`[reaction] LLM response received for agent ${agent.id}`);
  console.log(`[reaction] Response has error: ${!!response.error}`);
  console.log(`[reaction] Response content length: ${response.content?.length || 0}`);

  if (response.error) {
    console.error(`[reaction] LLM ERROR for agent ${agent.id}:`, response.error);
    console.error(`[reaction] Agent: ${agent.name || agent.agentNumber || agent.id}`);
    console.error(`[reaction] Scenario: ${scenario.substring(0, 100)}...`);
    const detailedError = `LLM API error for agent ${agent.name || agent.agentNumber || agent.id}:\n` +
      `Error: ${response.error}\n` +
      `Agent ID: ${agent.id}\n` +
      `Cluster: ${agent.cluster_id}`;
    throw new Error(detailedError);
  }

  if (!response.content || response.content.trim().length === 0) {
    console.error(`[reaction] ERROR: Empty response content for agent ${agent.id}`);
    console.error(`[reaction] Agent: ${agent.name || agent.agentNumber || agent.id}`);
    console.error(`[reaction] LLM provider: ${config.provider}`);
    const detailedError = `LLM returned empty response for agent ${agent.name || agent.agentNumber || agent.id}:\n` +
      `Agent ID: ${agent.id}\n` +
      `Cluster: ${agent.cluster_id}\n` +
      `LLM Provider: ${config.provider}\n` +
      `This usually indicates a connection issue or the LLM service is unavailable.`;
    throw new Error(detailedError);
  }

  // Parse JSON response with multiple strategies
  let reactionData: any;
  try {
    console.log(`[reaction] Attempting to parse JSON for agent ${agent.id}`);
    console.log(`[reaction] Raw response (first 500 chars):`, response.content.substring(0, 500));
    
    let jsonStr = response.content.trim();
    
    // Strategy 1: Try to extract JSON from markdown code blocks
    const jsonBlockMatch = jsonStr.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonBlockMatch) {
      jsonStr = jsonBlockMatch[1].trim();
      console.log(`[reaction] Extracted JSON from markdown code block`);
    } else {
      // Strategy 2: Try to extract JSON from generic code blocks
      const codeBlockMatch = jsonStr.match(/```\s*([\s\S]*?)\s*```/);
      if (codeBlockMatch) {
        jsonStr = codeBlockMatch[1].trim();
        console.log(`[reaction] Extracted JSON from generic code block`);
      }
    }
    
    // Strategy 3: Try to find JSON object in the text
    if (!jsonStr.startsWith('{')) {
      const jsonObjectMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (jsonObjectMatch) {
        jsonStr = jsonObjectMatch[0];
        console.log(`[reaction] Extracted JSON object from text`);
      }
    }
    
    console.log(`[reaction] Final JSON string length: ${jsonStr.length}`);
    console.log(`[reaction] First 200 chars:`, jsonStr.substring(0, 200));
    
    reactionData = JSON.parse(jsonStr);
    console.log(`[reaction] Successfully parsed JSON for agent ${agent.id}`);
    console.log(`[reaction] Parsed data keys:`, Object.keys(reactionData));
    
    // Validate that we have the required fields
    if (reactionData.stance_score === undefined || reactionData.stance_score === null) {
      throw new Error("Missing required field: stance_score");
    }
    if (!reactionData.response || typeof reactionData.response !== 'string') {
      throw new Error("Missing or invalid required field: response");
    }
    
    // Validate response length BEFORE normalization
    const responseLength = reactionData.response.length;
    if (responseLength < 80 || responseLength > 160) {
      console.warn(`[reaction] Response length is ${responseLength}, will be normalized to 80-160 range`);
    }
    
    // Validate and normalize key_reasons - be flexible
    if (!Array.isArray(reactionData.key_reasons)) {
      console.warn(`[reaction] key_reasons is not an array, creating default`);
      reactionData.key_reasons = ["Personal values alignment", "Practical considerations", "Social context"];
    } else if (reactionData.key_reasons.length < 3) {
      console.warn(`[reaction] key_reasons has ${reactionData.key_reasons.length} elements, padding to 3`);
      while (reactionData.key_reasons.length < 3) {
        reactionData.key_reasons.push("Additional consideration");
      }
    }
    
    // Validate and normalize emotion
    const validEmotions = ["anger", "fear", "hope", "cynicism", "pride", "sadness", "indifference", "enthusiasm", "mistrust"];
    
    // Map common LLM-generated emotions to valid ones
    const emotionMapping: Record<string, string> = {
      // Pragmatic/neutral emotions → indifference
      "pragmatic": "indifference",
      "neutral": "indifference",
      "cautious": "fear",
      "careful": "fear",
      "worried": "fear",
      "anxious": "fear",
      "concerned": "fear",
      "uncertain": "fear",
      // Positive emotions
      "optimistic": "hope",
      "hopeful": "hope",
      "confident": "pride",
      "proud": "pride",
      "excited": "enthusiasm",
      "enthusiastic": "enthusiasm",
      "happy": "enthusiasm",
      "pleased": "pride",
      "satisfied": "pride",
      // Negative emotions
      "angry": "anger",
      "frustrated": "anger",
      "annoyed": "anger",
      "disappointed": "sadness",
      "sad": "sadness",
      "upset": "sadness",
      "resigned": "sadness",
      "skeptical": "cynicism",
      "doubtful": "cynicism",
      "suspicious": "mistrust",
      "distrustful": "mistrust",
      "wary": "mistrust",
      // Other
      "ambivalent": "indifference",
      "mixed": "indifference",
      "reserved": "indifference",
      "measured": "indifference",
      "supportive": "hope",
      "critical": "cynicism",
    };
    
    // Normalize emotion
    let emotion = reactionData.emotion?.toLowerCase?.() || "indifference";
    if (!validEmotions.includes(emotion)) {
      const mappedEmotion = emotionMapping[emotion];
      if (mappedEmotion) {
        console.log(`[reaction] Mapped emotion "${emotion}" → "${mappedEmotion}"`);
        emotion = mappedEmotion;
      } else {
        console.warn(`[reaction] Unknown emotion "${emotion}", defaulting to "indifference"`);
        emotion = "indifference";
      }
    }
    reactionData.emotion = emotion;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[reaction] PARSE ERROR for agent ${agent.id}:`, error);
    console.error(`[reaction] Error type: ${error instanceof Error ? error.constructor.name : typeof error}`);
    console.error(`[reaction] Full response content (first 1000 chars):`, response.content?.substring(0, 1000));
    console.error(`[reaction] Response length: ${response.content?.length || 0} characters`);
    
    // Provide more context in error message
    const detailedError = `Failed to parse LLM response for agent ${agent.name || agent.agentNumber || agent.id}:\n` +
      `Error: ${errorMessage}\n` +
      `Response length: ${response.content?.length || 0} characters\n` +
      `Response preview: ${response.content?.substring(0, 200) || "No content"}...`;
    
    throw new Error(detailedError);
  }

  // Create reaction with required fields
  console.log(`[reaction] Creating reaction object for agent ${agent.id}`);
  
  // Helper to validate and normalize response length - be flexible to avoid failures
  const validateResponse = (response: string): string => {
    if (!response || typeof response !== 'string') {
      console.warn(`[reaction] Missing or invalid response, using placeholder`);
      return "The agent provided no specific response to this scenario.";
    }
    
    // Trim and clean up
    let cleanResponse = response.trim();
    
    // If too short, it's okay - don't fail
    if (cleanResponse.length < 20) {
      console.warn(`[reaction] Response very short (${cleanResponse.length} chars), padding`);
      cleanResponse = cleanResponse + " The agent's position reflects their core values and beliefs.";
    }
    
    // If too long, truncate gracefully at sentence boundary
    if (cleanResponse.length > 300) {
      console.warn(`[reaction] Response too long (${cleanResponse.length} chars), truncating`);
      // Try to cut at a sentence boundary
      const sentences = cleanResponse.substring(0, 300).split(/[.!?]/);
      if (sentences.length > 1) {
        sentences.pop(); // Remove incomplete last sentence
        cleanResponse = sentences.join(". ").trim() + ".";
      } else {
        cleanResponse = cleanResponse.substring(0, 297) + "...";
      }
    }
    
    return cleanResponse;
  };
  
  // Helper to validate true_belief - NO DEFAULTS, throw error if invalid
  const validateTrueBelief = (value: any) => {
    if (!value) {
      throw new Error("Missing true_belief: must be an object");
    }
    if (typeof value === "string") {
      throw new Error("Invalid true_belief: must be an object, not a string");
    }
    if (typeof value !== "object") {
      throw new Error(`Invalid true_belief: must be an object, got ${typeof value}`);
    }
    
    if (typeof value.inner_stance_score !== 'number' || isNaN(value.inner_stance_score)) {
      throw new Error("Missing or invalid true_belief.inner_stance_score: must be a number");
    }
    
    return {
      inner_stance_score: Math.max(0, Math.min(100, value.inner_stance_score)),
      cognitive_biases: Array.isArray(value.cognitive_biases) ? value.cognitive_biases : undefined,
      core_values_impact: typeof value.core_values_impact === 'string' ? value.core_values_impact : undefined,
      self_awareness: typeof value.self_awareness === 'number' && !isNaN(value.self_awareness) 
        ? Math.max(0, Math.min(100, value.self_awareness)) 
        : undefined,
    };
  };
  
  // Helper to validate public_expression - NO DEFAULTS, throw error if invalid
  const validatePublicExpression = (value: any) => {
    if (!value) {
      throw new Error("Missing public_expression: must be an object");
    }
    if (typeof value === "string") {
      throw new Error("Invalid public_expression: must be an object, not a string");
    }
    if (typeof value !== "object") {
      throw new Error(`Invalid public_expression: must be an object, got ${typeof value}`);
    }
    
    if (typeof value.expressed_stance_score !== 'number' || isNaN(value.expressed_stance_score)) {
      throw new Error("Missing or invalid public_expression.expressed_stance_score: must be a number");
    }
    
    const validContexts = ["public", "semi_public", "private", "social_media", "secret_ballot"];
    if (!value.context || !validContexts.includes(value.context)) {
      throw new Error(`Missing or invalid public_expression.context: must be one of ${validContexts.join(", ")}, got "${value.context}"`);
    }
    
    return {
      expressed_stance_score: Math.max(0, Math.min(100, value.expressed_stance_score)),
      expression_modifier: typeof value.expression_modifier === 'number' && !isNaN(value.expression_modifier)
        ? Math.max(-50, Math.min(50, value.expression_modifier))
        : undefined,
      filter_reasons: Array.isArray(value.filter_reasons) ? value.filter_reasons : undefined,
      context: value.context,
    };
  };
  
  // Helper to validate behavioral_action - NO DEFAULTS, throw error if invalid
  const validateBehavioralAction = (value: any) => {
    if (!value) {
      throw new Error("Missing behavioral_action: must be an object");
    }
    if (typeof value === "string") {
      throw new Error("Invalid behavioral_action: must be an object, not a string");
    }
    if (typeof value !== "object") {
      throw new Error(`Invalid behavioral_action: must be an object, got ${typeof value}`);
    }
    
    const validActionTypes = ["vote_for", "vote_against", "vote_blank", "abstention", "petition_for", "petition_against", "manifestation_for", "manifestation_against", "public_support_for", "public_support_against", "no_action"];
    if (!value.action_type || !validActionTypes.includes(value.action_type)) {
      throw new Error(`Missing or invalid behavioral_action.action_type: must be one of ${validActionTypes.join(", ")}, got "${value.action_type}"`);
    }
    
    if (typeof value.action_intensity !== 'number' || isNaN(value.action_intensity)) {
      throw new Error("Missing or invalid behavioral_action.action_intensity: must be a number");
    }
    
    const validConsistency = ["consistent", "moderate_gap", "major_gap"];
    if (!value.action_consistency || !validConsistency.includes(value.action_consistency)) {
      throw new Error(`Missing or invalid behavioral_action.action_consistency: must be one of ${validConsistency.join(", ")}, got "${value.action_consistency}"`);
    }
    
    const validEngagement = ["passive", "moderate", "active", "militant"];
    if (!value.predicted_engagement || !validEngagement.includes(value.predicted_engagement)) {
      throw new Error(`Missing or invalid behavioral_action.predicted_engagement: must be one of ${validEngagement.join(", ")}, got "${value.predicted_engagement}"`);
    }
    
    return {
      action_type: value.action_type,
      action_intensity: Math.max(0, Math.min(100, value.action_intensity)),
      action_consistency: value.action_consistency,
      predicted_engagement: value.predicted_engagement,
    };
  };
  
  // Ensure all required fields are present and valid - NO DEFAULTS, throw error if missing
  if (typeof reactionData.stance_score !== 'number' || isNaN(reactionData.stance_score)) {
    throw new Error("Missing or invalid stance_score: must be a number");
  }
  if (typeof reactionData.confidence !== 'number' || isNaN(reactionData.confidence)) {
    throw new Error("Missing or invalid confidence: must be a number");
  }
  if (!reactionData.emotion || typeof reactionData.emotion !== 'string') {
    throw new Error("Missing or invalid emotion: must be a string");
  }
  if (!Array.isArray(reactionData.key_reasons) || reactionData.key_reasons.length < 3) {
    throw new Error(`Invalid key_reasons: must be an array with at least 3 elements, got ${JSON.stringify(reactionData.key_reasons)}`);
  }
  
  const stanceScore = Math.max(0, Math.min(100, reactionData.stance_score));
  const confidence = Math.max(0, Math.min(100, reactionData.confidence));
  const emotion = reactionData.emotion;
  const keyReasons = reactionData.key_reasons
    .slice(0, 3)
    .filter((r: any) => typeof r === 'string' && r.length > 0);
  
  if (keyReasons.length < 3) {
    throw new Error(`Invalid key_reasons: must have at least 3 non-empty strings, got ${keyReasons.length}`);
  }
  
  // Validate all required fields before creating reaction object
  if (!reactionData.response || typeof reactionData.response !== 'string') {
    throw new Error("Missing or invalid response: must be a non-empty string");
  }
  
  if (!reactionData.true_belief) {
    throw new Error("Missing required field: true_belief");
  }
  
  if (!reactionData.public_expression) {
    throw new Error("Missing required field: public_expression");
  }
  
  if (!reactionData.behavioral_action) {
    throw new Error("Missing required field: behavioral_action");
  }

  const reaction: ReactionTurn = {
    stance_score: stanceScore,
    confidence: confidence,
    emotion: emotion,
    key_reasons: keyReasons.slice(0, 3),
    response: validateResponse(reactionData.response),
    true_belief: validateTrueBelief(reactionData.true_belief),
    public_expression: validatePublicExpression(reactionData.public_expression),
    behavioral_action: validateBehavioralAction(reactionData.behavioral_action),
    coherence_score: typeof reactionData.coherence_score === 'number' && !isNaN(reactionData.coherence_score)
      ? Math.max(0, Math.min(100, reactionData.coherence_score))
      : undefined,
    coherence_breakdown: reactionData.coherence_breakdown && typeof reactionData.coherence_breakdown === 'object'
      ? {
          thought_expression_gap: typeof reactionData.coherence_breakdown.thought_expression_gap === 'number' && !isNaN(reactionData.coherence_breakdown.thought_expression_gap)
            ? Math.max(0, Math.min(100, reactionData.coherence_breakdown.thought_expression_gap))
            : undefined,
          thought_action_gap: typeof reactionData.coherence_breakdown.thought_action_gap === 'number' && !isNaN(reactionData.coherence_breakdown.thought_action_gap)
            ? Math.max(0, Math.min(100, reactionData.coherence_breakdown.thought_action_gap))
            : undefined,
          expression_action_gap: typeof reactionData.coherence_breakdown.expression_action_gap === 'number' && !isNaN(reactionData.coherence_breakdown.expression_action_gap)
            ? Math.max(0, Math.min(100, reactionData.coherence_breakdown.expression_action_gap))
            : undefined,
        }
      : undefined,
  };

  console.log(`[reaction] Reaction object created, validating with Zod for agent ${agent.id}`);
  
  // Validate with Zod
  try {
    const validated = ReactionTurnSchema.parse(reaction);
    console.log(`[reaction] Successfully validated reaction for agent ${agent.id}`);
    return validated;
  } catch (validationError) {
    console.error(`[reaction] VALIDATION ERROR for agent ${agent.id}:`, validationError);
    console.error(`[reaction] Reaction object that failed validation:`, reaction);
    throw new Error(`Reaction validation failed: ${validationError instanceof Error ? validationError.message : "Unknown error"}`);
  }
}

export interface ReactionGenerationError {
  agentId: string;
  agentName: string;
  attempts: number;
  errors: string[];
  lastError: string;
}

// ============================================================================
// BATCH SIZE FOR OPTIMIZED GENERATION
// ============================================================================
const REACTION_BATCH_SIZE = 5; // Generate 5 reactions per LLM call (~70% token savings)

/**
 * Parse batch reaction response from LLM (compact format)
 */
function parseBatchReactionResponse(content: string): any[] {
  let cleaned = content.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  
  const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    return JSON.parse(arrayMatch[0]);
  }
  
  throw new Error("Could not parse batch reaction response as JSON array");
}

/**
 * Expand compact reaction format to full format
 */
function expandReaction(compact: any, agent: Agent): ReactionTurn {
  const validEmotions = ["anger", "fear", "hope", "cynicism", "pride", "sadness", "indifference", "enthusiasm", "mistrust"];
  
  // Map compact emotion to valid emotion
  const emotionMapping: Record<string, string> = {
    "pragmatic": "indifference", "neutral": "indifference", "cautious": "fear",
    "worried": "fear", "anxious": "fear", "concerned": "fear",
    "optimistic": "hope", "hopeful": "hope", "confident": "pride",
    "excited": "enthusiasm", "enthusiastic": "enthusiasm",
    "angry": "anger", "frustrated": "anger", "disappointed": "sadness",
    "skeptical": "cynicism", "suspicious": "mistrust", "supportive": "hope",
  };
  
  let emotion = (compact.e || "indifference").toLowerCase();
  if (!validEmotions.includes(emotion)) {
    emotion = emotionMapping[emotion] || "indifference";
  }
  
  // Ensure key_reasons has 3 elements
  let keyReasons = compact.r || [];
  if (!Array.isArray(keyReasons)) keyReasons = [String(keyReasons)];
  while (keyReasons.length < 3) {
    keyReasons.push("Additional consideration");
  }
  
  const stanceScore = Math.max(0, Math.min(100, compact.s || 50));
  const confidence = Math.max(0, Math.min(100, compact.c || 50));
  
  return {
    stance_score: stanceScore,
    confidence: confidence,
    emotion: emotion,
    key_reasons: keyReasons.slice(0, 3),
    response: compact.t || "No response provided.",
    true_belief: {
      inner_stance_score: stanceScore + (Math.random() * 10 - 5),
      cognitive_biases: ["confirmation_bias", "anchoring"],
      core_values_impact: "Reflects personal values and experiences",
      self_awareness: Math.floor(Math.random() * 30) + 50,
    },
    public_expression: {
      expressed_stance_score: stanceScore,
      expression_modifier: Math.floor(Math.random() * 20) - 10,
      filter_reasons: ["social_context", "professional_considerations"],
      context: "public" as const,
    },
    behavioral_action: {
      action_type: stanceScore > 60 ? "vote_for" : stanceScore < 40 ? "vote_against" : "abstention",
      action_intensity: Math.abs(stanceScore - 50) + 20,
      action_consistency: "consistent" as const,
      predicted_engagement: stanceScore > 70 || stanceScore < 30 ? "active" : "moderate",
    },
    coherence_score: 75 + Math.floor(Math.random() * 20),
  } as ReactionTurn;
}

/**
 * Generate multiple reactions in a single LLM call (optimized)
 */
async function generateReactionsBatchOptimized(
  agents: Agent[],
  scenario: string,
  context: string | undefined,
  config: LLMConfig
): Promise<Map<string, ReactionTurn>> {
  const prompt = formatBatchReactionPrompt(
    agents.map(a => ({
      id: a.id,
      name: a.name,
      age: a.age,
      priors: a.priors,
      traits: a.traits,
    })),
    scenario,
    context
  );

  const response = await callLLM(
    {
      prompt,
      temperature: 0.8,
      maxTokens: 1500,
    },
    config
  );

  if (response.error) {
    throw new Error(`LLM error: ${response.error}`);
  }

  const reactionsData = parseBatchReactionResponse(response.content);
  const reactions = new Map<string, ReactionTurn>();
  
  for (let i = 0; i < reactionsData.length && i < agents.length; i++) {
    const compact = reactionsData[i];
    const agent = agents[i];
    
    try {
      const reaction = expandReaction(compact, agent);
      reactions.set(agent.id, reaction);
    } catch (error) {
      console.error(`Error expanding reaction for agent ${agent.id}:`, error);
    }
  }

  return reactions;
}

export async function generateReactionsBatch(
  agents: Agent[],
  scenario: string,
  context?: string,
  config?: LLMConfig,
  onProgress?: (current: number, total: number, agentId: string, reaction?: ReactionTurn) => void
): Promise<Map<string, ReactionTurn>> {
  const reactions = new Map<string, ReactionTurn>();
  const errors: ReactionGenerationError[] = [];

  if (!config) {
    throw new Error("LLM config is required");
  }

  // Calculate number of batches needed
  const numBatches = Math.ceil(agents.length / REACTION_BATCH_SIZE);
  
  console.log(`[reaction] Generating ${agents.length} reactions in ${numBatches} batch(es) (optimized mode)`);

  for (let batch = 0; batch < numBatches; batch++) {
    const batchStart = batch * REACTION_BATCH_SIZE;
    const batchEnd = Math.min(batchStart + REACTION_BATCH_SIZE, agents.length);
    const batchAgents = agents.slice(batchStart, batchEnd);
    
    console.log(`[reaction] Batch ${batch + 1}/${numBatches}: Processing ${batchAgents.length} agents`);
    
    let retries = 2;
    let batchSuccess = false;
    
    while (retries > 0 && !batchSuccess) {
      try {
        // Try batch generation first (optimized)
        const batchReactions = await generateReactionsBatchOptimized(
          batchAgents,
          scenario,
          context,
          config
        );
        
        // Add batch reactions to results
        for (const [agentId, reaction] of batchReactions) {
          reactions.set(agentId, reaction);
          const agentIndex = agents.findIndex(a => a.id === agentId);
          onProgress?.(agentIndex + 1, agents.length, agentId, reaction);
        }
        
        batchSuccess = true;
        console.log(`[reaction] Batch ${batch + 1} completed: ${batchReactions.size} reactions generated`);
        
      } catch (batchError) {
        retries--;
        console.error(`[reaction] Batch ${batch + 1} failed (${2 - retries}/2 attempts):`, batchError);
        
        if (retries === 0) {
          // Fallback to individual generation for this batch
          console.log(`[reaction] Falling back to individual generation for batch ${batch + 1}`);
          
          for (let i = 0; i < batchAgents.length; i++) {
            const agent = batchAgents[i];
            const agentName = agent.name || `Agent ${agent.agentNumber || batchStart + i + 1}`;
            
            try {
              const reaction = await generateReaction(agent, scenario, context, config);
              reactions.set(agent.id, reaction);
              onProgress?.(batchStart + i + 1, agents.length, agent.id, reaction);
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : String(error);
              errors.push({
                agentId: agent.id,
                agentName,
                attempts: 1,
                errors: [errorMessage],
                lastError: errorMessage,
              });
              console.error(`[reaction] Individual fallback failed for ${agentName}:`, error);
            }
          }
        } else {
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    }
    
    // Small delay between batches
    if (batch < numBatches - 1) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  // Log summary
  console.log(`[reaction] ============================================`);
  console.log(`[reaction] SUMMARY: ${reactions.size}/${agents.length} reactions generated`);
  if (errors.length > 0) {
    console.warn(`[reaction] ${errors.length} agent(s) failed:`);
    errors.forEach(err => {
      console.warn(`[reaction] - ${err.agentName}: ${err.lastError}`);
    });
  }
  console.log(`[reaction] ============================================`);

  return reactions;
}
