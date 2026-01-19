/**
 * Simulation - Orchestration des simulations
 */

import type { Simulation, SimulationConfig, Agent, ReactionResult } from "@/types";
import { getClusters, getCluster } from "./storage";
import { getAllAgents, getAgentsForCluster } from "./storage";
import { saveSimulation } from "./storage";
import { createSimulation as createSimulationAPI, addSimulationResults, updateSimulationAPI } from "./api";
import { generateReactionsBatch } from "./reaction";
import { callLLM, formatExecutiveSummaryPrompt } from "./llm";
import type { LLMConfig } from "./config";

// ============================================================================
// SIMULATION CREATION
// ============================================================================
export function allocateAgents(
  clusters: Array<{ id: string; weight: number }>,
  nAgents: number,
  allocationMode: "equal" | "useClusterWeights"
): Map<string, number> {
  const allocation = new Map<string, number>();

  if (allocationMode === "equal") {
    const perCluster = Math.floor(nAgents / clusters.length);
    const remainder = nAgents % clusters.length;

    clusters.forEach((cluster, index) => {
      allocation.set(cluster.id, perCluster + (index < remainder ? 1 : 0));
    });
  } else {
    // Use cluster weights
    const totalWeight = clusters.reduce((sum, c) => sum + c.weight, 0);
    if (totalWeight === 0) {
      // Fallback to equal if all weights are 0
      return allocateAgents(clusters, nAgents, "equal");
    }

    let allocated = 0;
    clusters.forEach((cluster, index) => {
      if (index === clusters.length - 1) {
        // Last cluster gets the remainder
        allocation.set(cluster.id, nAgents - allocated);
      } else {
        const count = Math.floor((cluster.weight / totalWeight) * nAgents);
        allocation.set(cluster.id, count);
        allocated += count;
      }
    });
  }

  return allocation;
}

export function selectAgentsForSimulation(
  clusterId: string,
  count: number
): Agent[] {
  const availableAgents = getAgentsForCluster(clusterId);
  
  if (availableAgents.length === 0) {
    return [];
  }

  // If we need more agents than available, use all available
  if (count >= availableAgents.length) {
    return [...availableAgents];
  }

  // Randomly select agents
  const selected: Agent[] = [];
  const indices = new Set<number>();
  
  while (selected.length < count) {
    const index = Math.floor(Math.random() * availableAgents.length);
    if (!indices.has(index)) {
      indices.add(index);
      selected.push(availableAgents[index]);
    }
  }

  return selected;
}

export async function runSimulation(
  title: string,
  scenario: string,
  zoneId: string | undefined,
  config: SimulationConfig,
  llmConfig: LLMConfig,
  onProgress?: (stage: string, current: number, total: number, item?: { agentName: string; reaction: string }) => void
): Promise<Simulation> {
  onProgress?.("Preparing simulation...", 0, 100);
  await new Promise(resolve => setTimeout(resolve, 300));
  
  onProgress?.("Loading clusters...", 10, 100);
  await new Promise(resolve => setTimeout(resolve, 200));
  
  // Get clusters
  const clusters = zoneId
    ? getClusters().filter((c) => c.zoneId === zoneId)
    : getClusters();

  if (clusters.length === 0) {
    throw new Error("No clusters available for simulation");
  }

  onProgress?.("Allocating agents...", 20, 100);
  await new Promise(resolve => setTimeout(resolve, 300));

  // Allocate agents
  const allocation = allocateAgents(
    clusters.map((c) => ({ id: c.id, weight: c.weight })),
    config.nAgents,
    config.allocationMode
  );

  onProgress?.("Selecting agents for panel...", 30, 100);
  await new Promise(resolve => setTimeout(resolve, 200));

  // Select agents for each cluster
  const panel: Agent[] = [];
  for (const [clusterId, count] of allocation.entries()) {
    const selected = selectAgentsForSimulation(clusterId, count);
    panel.push(...selected);
  }

  if (panel.length === 0) {
    throw new Error("No agents available for simulation");
  }

  onProgress?.("Generating reactions with AI...", 40, panel.length);
  await new Promise(resolve => setTimeout(resolve, 300));

  // Generate reactions
  const reactions = await generateReactionsBatch(
    panel,
    scenario,
    undefined, // context
    llmConfig,
    (current, total, agentId, reaction) => {
      const agent = panel.find(a => a.id === agentId);
      const agentName = agent?.name || `Agent ${agent?.agentNumber || current}`;
      const reactionText = reaction?.response || reaction?.key_reasons?.[0] || "Processing...";
      const stance = reaction?.stance_score !== undefined ? `${reaction.stance_score}/100` : "";
      const emotion = reaction?.emotion || "";
      
      onProgress?.(
        `Generating reaction ${current}/${total}...`,
        current,
        total,
        {
          agentName,
          reaction: `${stance ? `Stance: ${stance} | ` : ""}${emotion ? `Emotion: ${emotion} | ` : ""}${reactionText.substring(0, 80)}${reactionText.length > 80 ? "..." : ""}`
        }
      );
    }
  );

  onProgress?.("Building results...", panel.length, panel.length);
  await new Promise(resolve => setTimeout(resolve, 300));

  // Build results
  const results: ReactionResult[] = panel.map((agent) => {
    const reaction = reactions.get(agent.id);
    if (!reaction) {
      throw new Error(`No reaction generated for agent ${agent.id}`);
    }

    return {
      agentId: agent.id,
      clusterId: agent.cluster_id,
      demographics: {
        ageBucketId: agent.ageBucketId,
        regionId: agent.regionId,
        cspId: agent.cspId,
      },
      exposure: {
        exposed: config.influence?.enabled || false,
        exposureType: config.influence?.exposureType,
      },
      turns: [reaction], // For now, single turn
    };
  });

  onProgress?.("Generating executive summary...", 85, 100);
  await new Promise(resolve => setTimeout(resolve, 200));

  // Generate executive summary
  let executiveSummary: string | undefined;
  try {
    const summaryPrompt = formatExecutiveSummaryPrompt(
      title,
      scenario,
      results,
      clusters,
      panel
    );

    const summaryResponse = await callLLM(
      {
        prompt: summaryPrompt,
        temperature: 0.7,
        maxTokens: 1000,
      },
      llmConfig
    );

    if (!summaryResponse.error && summaryResponse.content) {
      // Clean up the response (remove markdown code blocks if any)
      let summary = summaryResponse.content.trim();
      const codeBlockMatch = summary.match(/```[\s\S]*?\n([\s\S]*?)```/);
      if (codeBlockMatch) {
        summary = codeBlockMatch[1].trim();
      }
      executiveSummary = summary;
      console.log("[simulation] Executive summary generated successfully");
    } else {
      console.warn("[simulation] Failed to generate executive summary:", summaryResponse.error);
    }
  } catch (error) {
    console.error("[simulation] Error generating executive summary:", error);
    // Don't fail the simulation if summary generation fails
  }

  onProgress?.("Creating simulation object...", 90, 100);
  await new Promise(resolve => setTimeout(resolve, 200));

  // Create simulation object
  const simulation: Simulation = {
    id: `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    title,
    scenario,
    createdAt: new Date().toISOString(),
    zoneId,
    clustersSnapshot: clusters,
    panelSnapshot: panel,
    config,
    results,
    executiveSummary,
  };

  onProgress?.("Saving simulation to database...", 95, 100);
  await new Promise(resolve => setTimeout(resolve, 200));

  // Save simulation to Supabase via API
  try {
    if (zoneId) {
      // Create simulation in database
      const dbSimulation = await createSimulationAPI({
        title,
        scenario,
        zoneId,
        clustersSnapshot: clusters,
        panelSnapshot: panel,
      });

      // Add results to database
      const resultsForAPI = results.map(r => ({
        agentId: r.agentId,
        clusterId: r.clusterId,
        turns: r.turns,
      }));
      
      await addSimulationResults(dbSimulation.id, resultsForAPI);

      // Update with executive summary if available
      if (executiveSummary) {
        await updateSimulationAPI(dbSimulation.id, { executiveSummary });
      }

      // Update local simulation with DB ID
      simulation.id = dbSimulation.id;
    }
    
    // Also save to localStorage for backwards compatibility
    saveSimulation(simulation);

    onProgress?.("Complete!", 100, 100);
    await new Promise(resolve => setTimeout(resolve, 200));

    return simulation;
  } catch (apiError) {
    console.error("API save failed, falling back to localStorage:", apiError);
    
    // Fallback to localStorage
    saveSimulation(simulation);

    onProgress?.("Complete (saved locally)!", 100, 100);
    await new Promise(resolve => setTimeout(resolve, 200));

    return simulation;
  }
}
