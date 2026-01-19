/**
 * Reaction Generator - Generate reactions via LLM
 */

import { callLLM, formatReactionPrompt } from "./llm";
import type { LLMConfig } from "./config";
import type { ReactionTurn, Agent } from "@/types";
import { ReactionTurnSchema } from "@/types";

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

  const prompt = formatReactionPrompt(
    {
      priors: agent.priors,
      traits: agent.traits,
      speaking_style: agent.speaking_style,
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

  for (let i = 0; i < agents.length; i++) {
    const agent = agents[i];
    const agentName = agent.name || `Agent ${agent.agentNumber || i + 1}`;
    let retries = 3;
    let reaction: ReactionTurn | null = null;
    const attemptErrors: string[] = [];
    
    while (retries > 0 && !reaction) {
      try {
        reaction = await generateReaction(agent, scenario, context, config);
        reactions.set(agent.id, reaction);
        onProgress?.(i + 1, agents.length, agent.id, reaction);
        await new Promise(resolve => setTimeout(resolve, 100));
        break; // Success, exit retry loop
      } catch (error) {
        retries--;
        const errorMessage = error instanceof Error ? error.message : String(error);
        attemptErrors.push(`Attempt ${4 - retries}: ${errorMessage}`);
        
        console.error(`[reaction] Error generating reaction for agent ${agent.id} (${4 - retries}/3 attempts):`, error);
        console.error(`[reaction] Error message: ${errorMessage}`);
        
        if (retries === 0) {
          // Last attempt failed, collect error details
          const detailedError: ReactionGenerationError = {
            agentId: agent.id,
            agentName,
            attempts: 3,
            errors: attemptErrors,
            lastError: errorMessage,
          };
          errors.push(detailedError);
          
          console.error(`[reaction] ============================================`);
          console.error(`[reaction] FAILED to generate reaction for agent ${agent.id} after 3 attempts`);
          console.error(`[reaction] Agent details:`, {
            id: agent.id,
            name: agent.name,
            agentNumber: agent.agentNumber,
            cluster_id: agent.cluster_id,
            priors: agent.priors?.substring(0, 200),
            traits: agent.traits,
          });
          console.error(`[reaction] All error attempts:`, attemptErrors);
          console.error(`[reaction] Last error:`, error);
          console.error(`[reaction] ============================================`);
          
          // Throw detailed error
          const errorSummary = `Agent: ${agentName} (${agent.id})\n` +
            `Cluster: ${agent.cluster_id}\n` +
            `Attempts: 3\n` +
            `Errors:\n${attemptErrors.map((e, idx) => `  ${idx + 1}. ${e}`).join('\n')}\n` +
            `Last error: ${errorMessage}`;
          
          throw new Error(`Failed to generate reaction for agent ${agentName} (${agent.id}) after 3 attempts:\n\n${errorSummary}`);
        }
        
        // Wait before retry with exponential backoff
        const waitTime = 500 * (4 - retries); // 500ms, 1000ms, 1500ms
        console.log(`[reaction] Retrying in ${waitTime}ms... (${retries} attempts remaining)`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  // If we have errors, log summary but don't throw if we have some successful reactions
  if (errors.length > 0) {
    console.warn(`[reaction] ============================================`);
    console.warn(`[reaction] SUMMARY: ${errors.length} agent(s) failed to generate reactions`);
    console.warn(`[reaction] Successful: ${reactions.size}/${agents.length}`);
    errors.forEach(err => {
      console.warn(`[reaction] - ${err.agentName} (${err.agentId}): ${err.lastError}`);
    });
    console.warn(`[reaction] ============================================`);
  }

  return reactions;
}
