/**
 * Poll - Poll generation and statistics
 */

import type { PollConfig, PollResult, PollResponse, Agent, Cluster } from "@/types";
import { getZones, getZone } from "./storage";
import { getClusters, getClustersByZone } from "./storage";
import { getAllAgents, getAgentsForCluster } from "./storage";
import { callLLM } from "./llm";
import type { LLMConfig } from "./config";
import { PollResultSchema, PollResponseSchema } from "@/types";

const STORAGE_KEY_POLLS = "op_polls";

// ============================================================================
// POLL GENERATION
// ============================================================================

function formatPollPrompt(
  question: string,
  options: Array<{ id: string; name: string; description?: string }>,
  responseMode: "choice" | "ranking" | "scoring",
  agent: Agent
): string {
  const optionsList = options
    .map((opt, idx) => `${idx + 1}. ${opt.name}${opt.description ? ` - ${opt.description}` : ""}`)
    .join("\n");

  let responseInstructions = "";
  if (responseMode === "choice") {
    responseInstructions = `Choose ONE option (provide only the option number or name).`;
  } else if (responseMode === "ranking") {
    responseInstructions = `Rank ALL options from most preferred to least preferred (provide the option numbers or names in order, separated by commas).`;
  } else if (responseMode === "scoring") {
    responseInstructions = `Score EACH option from 0 to 100 (provide a JSON object with option names as keys and scores as values).`;
  }

  return `You are ${agent.name || `Agent ${agent.agentNumber}`}, a virtual agent with specific characteristics.

Your profile:
- Age: ${agent.age}
- Socio-demographic: ${agent.socio_demo}
- Personality traits: ${agent.traits.join(", ")}
- Core beliefs: ${agent.priors}
- Speaking style: ${agent.speaking_style}

Question: ${question}

Options:
${optionsList}

${responseInstructions}

Based on your personality, beliefs, and characteristics, provide your response.

Reply in JSON format:
{
  "response": <your response based on mode>,
  "reasoning": "Brief explanation of your choice (2-3 sentences)",
  "confidence": <number 0-100 indicating how confident you are in your response>
}

For choice mode: response should be the option number or name.
For ranking mode: response should be an array of option numbers/names in order.
For scoring mode: response should be an object: {"Option 1": 85, "Option 2": 45, ...}`;
}

async function generatePollResponse(
  agent: Agent,
  config: PollConfig,
  llmConfig: LLMConfig
): Promise<PollResponse> {
  const prompt = formatPollPrompt(
    config.question,
    config.options,
    config.responseMode,
    agent
  );

  const response = await callLLM(
    {
      prompt,
      temperature: 0.7,
      maxTokens: 500,
    },
    llmConfig
  );

  if (response.error) {
    throw new Error(`LLM error: ${response.error}`);
  }

  // Parse JSON response
  let responseData: any;
  try {
    const jsonMatch = response.content.match(/```json\s*([\s\S]*?)\s*```/) ||
                      response.content.match(/```\s*([\s\S]*?)\s*```/) ||
                      response.content;
    const jsonStr = typeof jsonMatch === "string" ? jsonMatch : jsonMatch[1];
    responseData = JSON.parse(jsonStr.trim());
  } catch (error) {
    throw new Error(`Failed to parse LLM response: ${error instanceof Error ? error.message : "Unknown error"}`);
  }

  // Normalize response based on mode
  let normalizedResponse: string | string[] | Record<string, number>;
  
  if (config.responseMode === "choice") {
    // Try to match option by name or number
    const responseStr = String(responseData.response || "").trim();
    const optionMatch = config.options.find(
      (opt, idx) => 
        opt.name.toLowerCase() === responseStr.toLowerCase() ||
        String(idx + 1) === responseStr ||
        opt.id === responseStr
    );
    normalizedResponse = optionMatch?.id || config.options[0].id; // Fallback to first option
  } else if (config.responseMode === "ranking") {
    // Normalize ranking array
    const responseArray = Array.isArray(responseData.response) 
      ? responseData.response 
      : String(responseData.response || "").split(",").map(s => s.trim());
    
    const rankingArray = responseArray
      .map((item: string) => {
        const optionMatch = config.options.find(
          (opt, idx) =>
            opt.name.toLowerCase() === String(item).toLowerCase() ||
            String(idx + 1) === String(item) ||
            opt.id === String(item)
        );
        return optionMatch?.id;
      })
      .filter((id: string | undefined): id is string => !!id);
    
    // Ensure all options are included (add missing ones at the end)
    const includedIds = new Set(rankingArray);
    config.options.forEach(opt => {
      if (!includedIds.has(opt.id)) {
        rankingArray.push(opt.id);
      }
    });
    
    normalizedResponse = rankingArray;
  } else {
    // Scoring mode
    const scoringResponse: Record<string, number> = {};
    config.options.forEach((opt, idx) => {
      const score = responseData.response?.[opt.name] || 
                   responseData.response?.[String(idx + 1)] ||
                   responseData.response?.[opt.id] ||
                   50; // Default score
      scoringResponse[opt.id] = Math.max(0, Math.min(100, Number(score)));
    });
    normalizedResponse = scoringResponse;
  }

  const pollResponse: PollResponse = {
    agentId: agent.id,
    clusterId: agent.cluster_id,
    response: normalizedResponse,
    reasoning: responseData.reasoning || "",
    confidence: responseData.confidence ?? 50,
  };

  return PollResponseSchema.parse(pollResponse);
}

// ============================================================================
// STATISTICS CALCULATION
// ============================================================================

function calculatePollStatistics(
  responses: PollResponse[],
  options: Array<{ id: string; name: string }>,
  responseMode: "choice" | "ranking" | "scoring",
  clusters: Cluster[],
  agents: Agent[]
): PollResult["statistics"] {
  const statistics: PollResult["statistics"] = {
    overall: {},
    byCluster: {},
    byDemographics: {
      age: {},
      region: {},
      socioClass: {},
    },
  };

  // Initialize cluster stats
  clusters.forEach(cluster => {
    statistics.byCluster[cluster.id] = {};
  });

  if (responseMode === "choice") {
    // Choice statistics
    const overallChoice: Record<string, number> = {};
    const clusterChoice: Record<string, Record<string, number>> = {};
    
    options.forEach(opt => {
      overallChoice[opt.id] = 0;
      clusters.forEach(cluster => {
        if (!clusterChoice[cluster.id]) clusterChoice[cluster.id] = {};
        clusterChoice[cluster.id][opt.id] = 0;
      });
    });

    responses.forEach(response => {
      const choice = response.response as string;
      if (overallChoice[choice] !== undefined) {
        overallChoice[choice]++;
        if (clusterChoice[response.clusterId]?.[choice] !== undefined) {
          clusterChoice[response.clusterId][choice]++;
        }
      }
    });

    statistics.overall.choice = overallChoice;
    clusters.forEach(cluster => {
      statistics.byCluster[cluster.id].choice = clusterChoice[cluster.id] || {};
    });

  } else if (responseMode === "ranking") {
    // Ranking statistics
    const overallRanking: Array<{ optionId: string; averageRank: number; firstChoiceCount: number }> = [];
    const clusterRanking: Record<string, Array<{ optionId: string; averageRank: number; firstChoiceCount: number }>> = {};

    options.forEach(opt => {
      // Overall
      const ranks: number[] = [];
      let firstChoiceCount = 0;
      
      responses.forEach(response => {
        const ranking = response.response as string[];
        const rank = ranking.indexOf(opt.id);
        if (rank >= 0) {
          ranks.push(rank + 1); // 1-indexed
          if (rank === 0) firstChoiceCount++;
        }
      });

      overallRanking.push({
        optionId: opt.id,
        averageRank: ranks.length > 0 ? ranks.reduce((a, b) => a + b, 0) / ranks.length : 0,
        firstChoiceCount,
      });

      // By cluster
      clusters.forEach(cluster => {
        if (!clusterRanking[cluster.id]) clusterRanking[cluster.id] = [];
        const clusterRanks: number[] = [];
        let clusterFirstChoice = 0;

        responses
          .filter(r => r.clusterId === cluster.id)
          .forEach(response => {
            const ranking = response.response as string[];
            const rank = ranking.indexOf(opt.id);
            if (rank >= 0) {
              clusterRanks.push(rank + 1);
              if (rank === 0) clusterFirstChoice++;
            }
          });

        clusterRanking[cluster.id].push({
          optionId: opt.id,
          averageRank: clusterRanks.length > 0 ? clusterRanks.reduce((a, b) => a + b, 0) / clusterRanks.length : 0,
          firstChoiceCount: clusterFirstChoice,
        });
      });
    });

    // Sort by average rank (lower is better)
    overallRanking.sort((a, b) => a.averageRank - b.averageRank);
    Object.keys(clusterRanking).forEach(clusterId => {
      clusterRanking[clusterId].sort((a, b) => a.averageRank - b.averageRank);
    });

    statistics.overall.ranking = overallRanking;
    clusters.forEach(cluster => {
      statistics.byCluster[cluster.id].ranking = clusterRanking[cluster.id] || [];
    });

  } else {
    // Scoring statistics
    const overallScoring: Record<string, { averageScore: number; minScore: number; maxScore: number; distribution: number[] }> = {};
    const clusterScoring: Record<string, Record<string, { averageScore: number; minScore: number; maxScore: number }>> = {};

    options.forEach(opt => {
      const scores: number[] = [];
      responses.forEach(response => {
        const scoring = response.response as Record<string, number>;
        if (scoring[opt.id] !== undefined) {
          scores.push(scoring[opt.id]);
        }
      });

      if (scores.length > 0) {
        const distribution = new Array(11).fill(0); // 0-10, 11-20, ..., 91-100
        scores.forEach(score => {
          const bucket = Math.floor(score / 10);
          distribution[Math.min(bucket, 10)]++;
        });

        overallScoring[opt.id] = {
          averageScore: scores.reduce((a, b) => a + b, 0) / scores.length,
          minScore: Math.min(...scores),
          maxScore: Math.max(...scores),
          distribution,
        };
      }

      // By cluster
      clusters.forEach(cluster => {
        if (!clusterScoring[cluster.id]) clusterScoring[cluster.id] = {};
        const clusterScores: number[] = [];

        responses
          .filter(r => r.clusterId === cluster.id)
          .forEach(response => {
            const scoring = response.response as Record<string, number>;
            if (scoring[opt.id] !== undefined) {
              clusterScores.push(scoring[opt.id]);
            }
          });

        if (clusterScores.length > 0) {
          clusterScoring[cluster.id][opt.id] = {
            averageScore: clusterScores.reduce((a, b) => a + b, 0) / clusterScores.length,
            minScore: Math.min(...clusterScores),
            maxScore: Math.max(...clusterScores),
          };
        }
      });
    });

    statistics.overall.scoring = overallScoring;
    clusters.forEach(cluster => {
      statistics.byCluster[cluster.id].scoring = clusterScoring[cluster.id] || {};
    });
  }

  // Demographics statistics (simplified - can be expanded)
  // This would require more detailed demographic data

  return statistics;
}

// ============================================================================
// POLL EXECUTION
// ============================================================================

export async function runPoll(
  title: string,
  config: PollConfig,
  llmConfig: LLMConfig,
  onProgress?: (stage: string, current: number, total: number, item?: { agentName: string; response: string }) => void
): Promise<PollResult> {
  onProgress?.("Preparing poll...", 0, 100);
  await new Promise(resolve => setTimeout(resolve, 300));

  // Validate zone
  const zone = getZone(config.zoneId);
  if (!zone) {
    throw new Error(`Zone ${config.zoneId} not found`);
  }

  onProgress?.("Loading agents from zone...", 10, 100);
  await new Promise(resolve => setTimeout(resolve, 200));

  // Get all agents from zone
  const clusters = getClustersByZone(config.zoneId);
  if (clusters.length === 0) {
    throw new Error(`No clusters found in zone ${config.zoneId}`);
  }

  const allAgents: Agent[] = [];
  clusters.forEach(cluster => {
    const clusterAgents = getAgentsForCluster(cluster.id);
    allAgents.push(...clusterAgents);
  });

  if (allAgents.length === 0) {
    throw new Error(`No agents found in zone ${config.zoneId}`);
  }

  onProgress?.("Generating poll responses...", 20, allAgents.length);
  await new Promise(resolve => setTimeout(resolve, 300));

  // Generate responses
  const responses: PollResponse[] = [];
  for (let i = 0; i < allAgents.length; i++) {
    const agent = allAgents[i];
    
    try {
      const response = await generatePollResponse(agent, config, llmConfig);
      responses.push(response);

      onProgress?.(
        `Generating response ${i + 1}/${allAgents.length}...`,
        i + 1,
        allAgents.length,
        {
          agentName: agent.name || `Agent ${agent.agentNumber}`,
          response: response.reasoning?.substring(0, 50) || "Response generated"
        }
      );

      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`Error generating response for agent ${agent.id}:`, error);
      // Continue with next agent
    }
  }

  onProgress?.("Calculating statistics...", 90, 100);
  await new Promise(resolve => setTimeout(resolve, 300));

  // Calculate statistics
  const statistics = calculatePollStatistics(
    responses,
    config.options,
    config.responseMode,
    clusters,
    allAgents
  );

  onProgress?.("Saving poll results...", 95, 100);
  await new Promise(resolve => setTimeout(resolve, 200));

  // Create poll result
  const pollResult: PollResult = {
    id: `poll_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    title,
    question: config.question,
    options: config.options,
    responseMode: config.responseMode,
    zoneId: config.zoneId,
    createdAt: new Date().toISOString(),
    clustersSnapshot: clusters,
    panelSnapshot: allAgents,
    responses,
    statistics,
  };

  // Save poll
  const validated = PollResultSchema.parse(pollResult);
  savePoll(validated);

  onProgress?.("Complete!", 100, 100);
  await new Promise(resolve => setTimeout(resolve, 200));

  return validated;
}

// ============================================================================
// POLL STORAGE
// ============================================================================

export function savePoll(poll: PollResult): void {
  if (typeof window === "undefined") return;
  try {
    const polls = getAllPolls();
    polls.push(poll);
    localStorage.setItem(STORAGE_KEY_POLLS, JSON.stringify(polls));
  } catch (error) {
    console.error("Error saving poll:", error);
  }
}

export function getAllPolls(): PollResult[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY_POLLS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function getPoll(id: string): PollResult | null {
  const polls = getAllPolls();
  return polls.find(p => p.id === id) || null;
}

export function deletePoll(id: string): void {
  if (typeof window === "undefined") return;
  try {
    const polls = getAllPolls().filter(p => p.id !== id);
    localStorage.setItem(STORAGE_KEY_POLLS, JSON.stringify(polls));
  } catch (error) {
    console.error("Error deleting poll:", error);
  }
}
