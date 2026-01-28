/**
 * Agent Memory Management
 * Handles storing and retrieving agent interaction history for coherent responses
 */

import type { Agent, AgentMemoryEntry, AnchoredBelief, ReactionTurn } from "@/types";

// ============================================================================
// MEMORY STORAGE
// ============================================================================

const MEMORY_STORAGE_KEY = "op_agent_memories";

/**
 * Get all agent memories from storage
 */
export function getAllMemories(): Record<string, Agent["memory"]> {
  if (typeof window === "undefined") return {};
  const stored = localStorage.getItem(MEMORY_STORAGE_KEY);
  return stored ? JSON.parse(stored) : {};
}

/**
 * Get memory for a specific agent
 */
export function getAgentMemory(agentId: string): Agent["memory"] | null {
  const memories = getAllMemories();
  return memories[agentId] || null;
}

/**
 * Save memory for a specific agent
 */
export function saveAgentMemory(agentId: string, memory: Agent["memory"]): void {
  if (typeof window === "undefined") return;
  const memories = getAllMemories();
  memories[agentId] = memory;
  localStorage.setItem(MEMORY_STORAGE_KEY, JSON.stringify(memories));
}

// ============================================================================
// MEMORY UPDATES
// ============================================================================

/**
 * Add a new interaction to agent's memory
 */
export function addInteractionToMemory(
  agent: Agent,
  topic: string,
  reaction: ReactionTurn,
  simulationId?: string,
  pollId?: string
): Agent {
  const now = new Date().toISOString();
  
  const newEntry: AgentMemoryEntry = {
    date: now,
    topic,
    simulationId,
    pollId,
    stance: reaction.stance_score,
    emotion: reaction.emotion,
    keyArguments: reaction.key_reasons,
    response: reaction.response,
  };

  // Initialize memory if needed
  const memory = agent.memory || { interactions: [], anchoredBeliefs: [] };
  const interactions = memory.interactions || [];
  const anchoredBeliefs = memory.anchoredBeliefs || [];

  // Add new interaction (keep last 20)
  const updatedInteractions = [...interactions, newEntry].slice(-20);

  // Update or create anchored belief for this topic
  const existingBeliefIndex = anchoredBeliefs.findIndex(
    b => b.topic.toLowerCase() === topic.toLowerCase()
  );

  if (existingBeliefIndex >= 0) {
    // Update existing belief (weighted average with more weight on recent)
    const existing = anchoredBeliefs[existingBeliefIndex];
    const newStance = Math.round(
      (existing.stance * existing.timesExpressed + reaction.stance_score * 2) / 
      (existing.timesExpressed + 2)
    );
    anchoredBeliefs[existingBeliefIndex] = {
      ...existing,
      stance: newStance,
      confidence: Math.min(100, existing.confidence + 5), // Confidence grows with repetition
      lastUpdated: now,
      timesExpressed: existing.timesExpressed + 1,
    };
  } else {
    // Create new anchored belief
    anchoredBeliefs.push({
      topic,
      stance: reaction.stance_score,
      confidence: reaction.confidence,
      lastUpdated: now,
      timesExpressed: 1,
    });
  }

  // Keep only 10 most recent/relevant anchored beliefs
  const updatedBeliefs = anchoredBeliefs
    .sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime())
    .slice(0, 10);

  const updatedMemory = {
    interactions: updatedInteractions,
    anchoredBeliefs: updatedBeliefs,
  };

  // Save to storage
  saveAgentMemory(agent.id, updatedMemory);

  // Return updated agent
  return {
    ...agent,
    memory: updatedMemory,
    lastInteractionAt: now,
  };
}

// ============================================================================
// MEMORY RETRIEVAL FOR PROMPTS
// ============================================================================

/**
 * Find relevant past interactions for a given topic
 */
export function findRelevantMemories(
  agent: Agent,
  currentTopic: string,
  maxResults: number = 3
): AgentMemoryEntry[] {
  const memory = agent.memory || getAgentMemory(agent.id);
  if (!memory?.interactions) return [];

  // Simple keyword matching for relevance
  const topicWords = currentTopic.toLowerCase().split(/\s+/);
  
  const scored = memory.interactions.map(entry => {
    const entryWords = entry.topic.toLowerCase().split(/\s+/);
    const matchScore = topicWords.filter(w => 
      entryWords.some(ew => ew.includes(w) || w.includes(ew))
    ).length;
    return { entry, score: matchScore };
  });

  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
    .map(s => s.entry);
}

/**
 * Find anchored belief on a similar topic
 */
export function findAnchoredBelief(
  agent: Agent,
  currentTopic: string
): AnchoredBelief | null {
  const memory = agent.memory || getAgentMemory(agent.id);
  if (!memory?.anchoredBeliefs) return null;

  const topicWords = currentTopic.toLowerCase().split(/\s+/);
  
  for (const belief of memory.anchoredBeliefs) {
    const beliefWords = belief.topic.toLowerCase().split(/\s+/);
    const matchScore = topicWords.filter(w => 
      beliefWords.some(bw => bw.includes(w) || w.includes(bw))
    ).length;
    
    if (matchScore >= 2) {
      return belief;
    }
  }

  return null;
}

/**
 * Format agent's memory for inclusion in prompt
 */
export function formatMemoryForPrompt(
  agent: Agent,
  currentTopic: string
): string {
  const relevantMemories = findRelevantMemories(agent, currentTopic, 3);
  const anchoredBelief = findAnchoredBelief(agent, currentTopic);

  if (relevantMemories.length === 0 && !anchoredBelief) {
    return "";
  }

  let memorySection = "\n\nYOUR PAST POSITIONS (for consistency):";

  if (anchoredBelief) {
    const stanceLabel = anchoredBelief.stance > 60 ? "supportive" : 
                        anchoredBelief.stance < 40 ? "opposed" : "neutral";
    memorySection += `\n- On "${anchoredBelief.topic}": You've been ${stanceLabel} (${anchoredBelief.stance}/100) - expressed ${anchoredBelief.timesExpressed} time(s)`;
  }

  if (relevantMemories.length > 0) {
    memorySection += "\n\nRELATED PAST RESPONSES:";
    relevantMemories.forEach((mem, i) => {
      const date = new Date(mem.date).toLocaleDateString();
      memorySection += `\n${i + 1}. ${mem.topic} (${date}): Stance ${mem.stance}/100, felt ${mem.emotion}`;
      if (mem.keyArguments.length > 0) {
        memorySection += `\n   Reasons: ${mem.keyArguments.slice(0, 2).join("; ")}`;
      }
    });
  }

  memorySection += "\n\n⚠️ Your response should be CONSISTENT with your past positions. If your view has changed, explain WHY briefly.";

  return memorySection;
}

// ============================================================================
// BATCH MEMORY UPDATE
// ============================================================================

/**
 * Update memory for multiple agents after a simulation
 */
export function updateAgentMemoriesBatch(
  agents: Agent[],
  reactions: Map<string, ReactionTurn>,
  topic: string,
  simulationId?: string
): Agent[] {
  return agents.map(agent => {
    const reaction = reactions.get(agent.id);
    if (reaction) {
      return addInteractionToMemory(agent, topic, reaction, simulationId);
    }
    return agent;
  });
}

/**
 * Clear all agent memories (for testing/reset)
 */
export function clearAllMemories(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(MEMORY_STORAGE_KEY);
}

/**
 * Get memory statistics for an agent
 */
export function getMemoryStats(agent: Agent): {
  totalInteractions: number;
  anchoredBeliefs: number;
  oldestMemory: string | null;
  newestMemory: string | null;
} {
  const memory = agent.memory || getAgentMemory(agent.id);
  const interactions = memory?.interactions || [];
  const beliefs = memory?.anchoredBeliefs || [];

  return {
    totalInteractions: interactions.length,
    anchoredBeliefs: beliefs.length,
    oldestMemory: interactions.length > 0 ? interactions[0].date : null,
    newestMemory: interactions.length > 0 ? interactions[interactions.length - 1].date : null,
  };
}
