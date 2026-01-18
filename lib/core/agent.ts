/**
 * Agent Generator - Generate agents via LLM
 */

import { callLLM, formatAgentPrompt } from "./llm";
import type { LLMConfig } from "./config";
import type { Agent } from "@/types";
import { saveAgentsForCluster, getAgentsForCluster } from "./storage";
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
  },
  config: LLMConfig
): Promise<Agent> {
  const prompt = formatAgentPrompt(clusterDescription, {
    age: demographics.age,
    region: demographics.region,
    socioClass: demographics.socioClass,
  });

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

  // Parse JSON response
  let agentData: any;
  try {
    // Try to extract JSON from response (might have markdown code blocks)
    const jsonMatch = response.content.match(/```json\s*([\s\S]*?)\s*```/) ||
                      response.content.match(/```\s*([\s\S]*?)\s*```/) ||
                      response.content;
    const jsonStr = typeof jsonMatch === "string" ? jsonMatch : jsonMatch[1];
    agentData = JSON.parse(jsonStr.trim());
  } catch (error) {
    throw new Error(`Failed to parse LLM response: ${error instanceof Error ? error.message : "Unknown error"}`);
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
  onProgress?.("Preparing generation...", 0, count);
  await new Promise(resolve => setTimeout(resolve, 300));
  
  onProgress?.("Analyzing cluster characteristics...", 0, count);
  await new Promise(resolve => setTimeout(resolve, 400));
  
  const agents: Agent[] = [];
  const existingAgents = getAgentsForCluster(clusterId);

  for (let i = 0; i < count; i++) {
    try {
      onProgress?.(
        `Generating agent ${i + 1}/${count}...`,
        i,
        count
      );
      
      const demo = demographics[i % demographics.length];
      const agent = await generateAgent(
        clusterId,
        clusterDescription,
        demo,
        config
      );
      
      // Assign agent number
      agent.agentNumber = existingAgents.length + agents.length + i + 1;
      
      agents.push(agent);
      
      onProgress?.(
        `Agent ${i + 1} created`,
        i + 1,
        count,
        {
          name: agent.name || `Agent ${agent.agentNumber}`,
          personality: agent.priors || "No personality defined"
        }
      );
      
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error) {
      console.error(`Error generating agent ${i + 1}:`, error);
      // Continue with next agent even if one fails
    }
  }

  onProgress?.("Saving agents...", count, count);
  await new Promise(resolve => setTimeout(resolve, 300));

  // Save all agents
  const allAgents = [...existingAgents, ...agents];
  saveAgentsForCluster(clusterId, allAgents);

  onProgress?.("Complete!", count, count);
  await new Promise(resolve => setTimeout(resolve, 200));

  return agents;
}
