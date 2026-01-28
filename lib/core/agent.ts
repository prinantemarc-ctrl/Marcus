/**
 * Agent Generator - Generate agents via LLM
 * Enhanced with name tracking and age variance for diversity
 */

import { callLLM, formatAgentPrompt, formatBatchAgentPrompt, trackUsedName, getUsedNames, clearUsedNames } from "./llm";
import type { LLMConfig } from "./config";
import type { Agent } from "@/types";
import { saveAgentsForCluster, getAgentsForCluster } from "./storage";
import { createAgentsBatch as createAgentsBatchAPI } from "./api";
import { AgentSchema } from "@/types";

// ============================================================================
// AGENT GENERATION
// ============================================================================
export async function generateAgent(
  clusterId: string,
  clusterDescription: string,
  demographics: {
    ageBucketId: string;
    regionId: string;
    cspId: string;
    age?: number;
    region?: string;
    socioClass?: string;
    agentIndex?: number;
  },
  config: LLMConfig
): Promise<Agent> {
  // Get currently used names to avoid duplicates
  const usedNames = getUsedNames();
  
  const prompt = formatAgentPrompt(clusterDescription, {
    age: demographics.age,
    region: demographics.region,
    socioClass: demographics.socioClass,
    agentIndex: demographics.agentIndex || 0,
    forbiddenFirstNames: usedNames.firstNames.slice(-10),
    forbiddenLastNames: usedNames.lastNames.slice(-10),
  });

  const response = await callLLM(
    {
      prompt,
      temperature: 0.9, // Higher temperature for more diversity
      maxTokens: 1500,
    },
    config
  );

  if (response.error) {
    throw new Error(`LLM error: ${response.error}`);
  }

  // Parse JSON response
  let agentData: any;
  try {
    let jsonStr = response.content.trim();
    
    // Try to extract JSON from markdown code blocks
    const jsonMatch = jsonStr.match(/```json\s*([\s\S]*?)\s*```/) ||
                      jsonStr.match(/```\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }
    
    // Try to find JSON object in text
    if (!jsonStr.startsWith('{')) {
      const jsonObjMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (jsonObjMatch) {
        jsonStr = jsonObjMatch[0];
      }
    }
    
    agentData = JSON.parse(jsonStr);
  } catch (error) {
    throw new Error(`Failed to parse LLM response: ${error instanceof Error ? error.message : "Unknown error"}`);
  }

  // Track used names to prevent duplicates
  if (agentData.name) {
    const nameParts = agentData.name.split(" ");
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(" ");
    trackUsedName(firstName, lastName);
  }

  // Create agent with required fields
  const agent: Agent = {
    id: `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    agentNumber: undefined,
    name: agentData.name || `Agent ${Date.now()}`,
    age: agentData.age || 35,
    ageBucketId: demographics.ageBucketId,
    regionId: demographics.regionId,
    cspId: demographics.cspId,
    socio_demo: agentData.socio_demo || "Not specified",
    cluster_id: clusterId,
    traits: Array.isArray(agentData.traits) ? agentData.traits : [],
    priors: agentData.priors || "",
    speaking_style: agentData.speaking_style || "neutral",
    expression_profile: agentData.expression_profile || {
      directness: 50,
      social_filter: 50,
      conformity_pressure: 50,
      context_sensitivity: "medium",
    },
    psychological_profile: agentData.psychological_profile || {
      core_values: [],
      cognitive_biases: [],
      risk_tolerance: 50,
      assertiveness: 50,
    },
  };

  // Validate with Zod
  const validated = AgentSchema.parse(agent);
  return validated;
}

// Export function to clear name tracking (call before starting a new batch)
export { clearUsedNames };

// ============================================================================
// BATCH SIZE FOR OPTIMIZED GENERATION
// ============================================================================
const BATCH_SIZE = 5; // Generate 5 agents per LLM call (90% token savings)

/**
 * Parse batch agent response from LLM
 */
function parseBatchAgentResponse(content: string): any[] {
  let cleaned = content.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  
  const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    return JSON.parse(arrayMatch[0]);
  }
  
  throw new Error("Could not parse batch agent response as JSON array");
}

/**
 * Generate multiple agents in a single LLM call (optimized)
 */
async function generateAgentsBatchOptimized(
  clusterId: string,
  clusterDescription: string,
  count: number,
  demographics: Array<{
    ageBucketId: string;
    regionId: string;
    cspId: string;
    age?: number;
    region?: string;
    socioClass?: string;
  }>,
  config: LLMConfig,
  existingNames: string[]
): Promise<Agent[]> {
  const usedNames = getUsedNames();
  const forbiddenNames = [...usedNames.firstNames, ...usedNames.lastNames, ...existingNames];
  
  const prompt = formatBatchAgentPrompt(clusterDescription, count, {
    region: demographics[0]?.region,
    forbiddenNames,
  });

  const response = await callLLM(
    {
      prompt,
      temperature: 0.9,
      maxTokens: 2000,
    },
    config
  );

  if (response.error) {
    throw new Error(`LLM error: ${response.error}`);
  }

  const agentsData = parseBatchAgentResponse(response.content);
  
  const agents: Agent[] = agentsData.map((data: any, i: number) => {
    const demo = demographics[i % demographics.length];
    
    // Track used names
    if (data.name) {
      const nameParts = data.name.split(" ");
      trackUsedName(nameParts[0], nameParts.slice(1).join(" "));
    }
    
    return {
      id: `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${i}`,
      agentNumber: undefined,
      name: data.name || `Agent ${Date.now()}_${i}`,
      age: data.age || 35,
      ageBucketId: demo.ageBucketId,
      regionId: demo.regionId,
      cspId: demo.cspId,
      socio_demo: data.job || data.socio_demo || "Not specified",
      cluster_id: clusterId,
      traits: Array.isArray(data.traits) ? data.traits : [],
      priors: data.priors || "",
      speaking_style: data.style || data.speaking_style || "neutral",
      expression_profile: {
        directness: Math.floor(Math.random() * 60) + 20,
        social_filter: Math.floor(Math.random() * 60) + 20,
        conformity_pressure: Math.floor(Math.random() * 60) + 20,
        context_sensitivity: ["high", "medium", "low"][Math.floor(Math.random() * 3)] as "high" | "medium" | "low",
      },
      psychological_profile: {
        core_values: ["personal_growth", "stability"],
        cognitive_biases: ["confirmation_bias"],
        risk_tolerance: Math.floor(Math.random() * 60) + 20,
        assertiveness: Math.floor(Math.random() * 60) + 20,
      },
    } as Agent;
  });

  return agents;
}

export async function generateAgentsBatch(
  clusterId: string,
  clusterDescription: string,
  count: number,
  demographics: Array<{
    ageBucketId: string;
    regionId: string;
    cspId: string;
    age?: number;
    region?: string;
    socioClass?: string;
  }>,
  config: LLMConfig,
  onProgress?: (stage: string, current: number, total: number, item?: { name: string; personality: string }) => void
): Promise<Agent[]> {
  onProgress?.("Preparing optimized batch generation...", 0, count);
  await new Promise(resolve => setTimeout(resolve, 300));
  
  const agents: Agent[] = [];
  const existingAgents = getAgentsForCluster(clusterId);
  const existingNames = existingAgents.map(a => a.name || "").filter(Boolean);

  // Calculate number of batches needed
  const numBatches = Math.ceil(count / BATCH_SIZE);
  
  onProgress?.(`Generating ${count} agents in ${numBatches} batch(es)...`, 0, count);
  await new Promise(resolve => setTimeout(resolve, 200));

  for (let batch = 0; batch < numBatches; batch++) {
    const batchStart = batch * BATCH_SIZE;
    const batchCount = Math.min(BATCH_SIZE, count - batchStart);
    
    try {
      onProgress?.(
        `Batch ${batch + 1}/${numBatches}: Generating ${batchCount} agents...`,
        batchStart,
        count
      );
      
      // Get demographics for this batch
      const batchDemographics = [];
      for (let i = 0; i < batchCount; i++) {
        batchDemographics.push(demographics[(batchStart + i) % demographics.length]);
      }
      
      // Generate batch of agents in single LLM call
      const batchAgents = await generateAgentsBatchOptimized(
        clusterId,
        clusterDescription,
        batchCount,
        batchDemographics,
        config,
        [...existingNames, ...agents.map(a => a.name || "")]
      );
      
      // Assign agent numbers and add to list
      for (let i = 0; i < batchAgents.length; i++) {
        const agent = batchAgents[i];
        agent.agentNumber = existingAgents.length + agents.length + 1;
        agents.push(agent);
        
        onProgress?.(
          `Agent ${agents.length} created: ${agent.name}`,
          agents.length,
          count,
          {
            name: agent.name || `Agent ${agent.agentNumber}`,
            personality: agent.priors || "No personality defined"
          }
        );
      }
      
      // Small delay between batches
      if (batch < numBatches - 1) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    } catch (error) {
      console.error(`Error in batch ${batch + 1}:`, error);
      
      // Fallback to individual generation for this batch
      onProgress?.(`Batch ${batch + 1} failed, falling back to individual generation...`, batchStart, count);
      
      for (let i = 0; i < batchCount; i++) {
        try {
          const demo = demographics[(batchStart + i) % demographics.length];
          const agent = await generateAgent(
            clusterId,
            clusterDescription,
            { ...demo, agentIndex: batchStart + i },
            config
          );
          agent.agentNumber = existingAgents.length + agents.length + 1;
          agents.push(agent);
          
          onProgress?.(
            `Agent ${agents.length} created: ${agent.name}`,
            agents.length,
            count,
            {
              name: agent.name || `Agent ${agent.agentNumber}`,
              personality: agent.priors || "No personality defined"
            }
          );
        } catch (individualError) {
          console.error(`Error generating individual agent ${batchStart + i + 1}:`, individualError);
        }
      }
    }
  }

  onProgress?.("Saving agents to database...", count, count);
  await new Promise(resolve => setTimeout(resolve, 300));

  // Save agents to Supabase via API
  try {
    const agentsForAPI = agents.map(a => ({
      name: a.name,
      age: a.age,
      ageBucketId: a.ageBucketId,
      regionId: a.regionId,
      cspId: a.cspId,
      socioDemoDescription: a.socio_demo,
      traits: a.traits,
      priors: a.priors,
      speakingStyle: a.speaking_style,
      expressionProfile: a.expression_profile,
      psychologicalProfile: a.psychological_profile,
    }));
    
    const savedAgents = await createAgentsBatchAPI(clusterId, agentsForAPI);
    
    // Also save to localStorage for backwards compatibility
    const allAgents = [...existingAgents, ...agents];
    saveAgentsForCluster(clusterId, allAgents);

    onProgress?.("Complete!", count, count);
    await new Promise(resolve => setTimeout(resolve, 200));

    // Return agents with DB IDs
    return savedAgents.map((sa, i) => ({
      ...agents[i],
      id: sa.id,
    }));
  } catch (apiError) {
    console.error("API save failed, falling back to localStorage:", apiError);
    
    // Fallback to localStorage
    const allAgents = [...existingAgents, ...agents];
    saveAgentsForCluster(clusterId, allAgents);

    onProgress?.("Complete (saved locally)!", count, count);
    await new Promise(resolve => setTimeout(resolve, 200));

    return agents;
  }
}
