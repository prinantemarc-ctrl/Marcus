/**
 * Cluster Generator - Generate clusters via LLM
 */

import { callLLM } from "./llm";
import type { LLMConfig } from "./config";
import type { Cluster } from "@/types";
import { saveClusters, getClusters } from "./storage";
import { ClusterSchema } from "@/types";

// ============================================================================
// CLUSTER GENERATION
// ============================================================================
export function formatClusterGenerationPrompt(
  zoneName: string,
  zoneDescription?: string,
  count: number = 5
): string {
  return `You are an opinion cluster generator for a simulation platform.

Zone: ${zoneName}
${zoneDescription ? `Zone description: ${zoneDescription}` : ""}

Generate ${count} distinct opinion clusters that would exist in this zone. Each cluster should represent a different group of people with shared values and opinions.

For each cluster, provide:
- A clear, descriptive name
- A detailed description/prompt that explains the characteristics, values, and opinions of this group (at least 50 characters)
- A weight percentage (0-100) representing the relative size of this group in the population

Return the clusters as a JSON array in this format:
[
  {
    "name": "Cluster name",
    "description_prompt": "Detailed description of the cluster's characteristics, values, and opinions (at least 50 characters)",
    "weight": number between 0 and 100
  },
  ...
]

Make sure the weights add up to approximately 100% total.

Reply ONLY with the JSON array, without any additional text.`;
}

export async function generateClustersForZone(
  zoneId: string,
  zoneName: string,
  config: LLMConfig,
  count: number = 5,
  zoneDescription?: string,
  onProgress?: (stage: string, current: number, total: number, item?: { name: string; description: string }) => void
): Promise<Cluster[]> {
  onProgress?.("Preparing generation...", 0, 100);
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  onProgress?.("Analyzing zone...", 10, 100);
  
  await new Promise(resolve => setTimeout(resolve, 300));
  
  onProgress?.("Generating clusters with AI...", 20, 100);
  
  const prompt = formatClusterGenerationPrompt(zoneName, zoneDescription, count);

  const response = await callLLM(
    {
      prompt,
      temperature: 0.8,
      maxTokens: 2000,
    },
    config
  );

  if (response.error) {
    throw new Error(`LLM error: ${response.error}`);
  }

  onProgress?.("Parsing AI response...", 60, 100);
  
  await new Promise(resolve => setTimeout(resolve, 200));

  // Parse JSON response
  let clustersData: any[];
  try {
    // Try to extract JSON from response (might have markdown code blocks)
    const jsonMatch = response.content.match(/```json\s*([\s\S]*?)\s*```/) ||
                      response.content.match(/```\s*([\s\S]*?)\s*```/) ||
                      response.content;
    const jsonStr = typeof jsonMatch === "string" ? jsonMatch : jsonMatch[1];
    clustersData = JSON.parse(jsonStr.trim());
    
    if (!Array.isArray(clustersData)) {
      throw new Error("Response is not an array");
    }
  } catch (error) {
    throw new Error(`Failed to parse LLM response: ${error instanceof Error ? error.message : "Unknown error"}`);
  }

  onProgress?.("Creating clusters...", 70, 100);

  // Create clusters with required fields
  const clusters: Cluster[] = [];
  for (let index = 0; index < clustersData.length; index++) {
    const clusterData = clustersData[index];
    
    const cluster: Cluster = {
      id: `cluster_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`,
      zoneId: zoneId,
      name: clusterData.name || `Cluster ${index + 1}`,
      description_prompt: clusterData.description_prompt || "",
      weight: clusterData.weight || 0,
    };

    // Validate with Zod
    const validatedCluster = ClusterSchema.parse(cluster);
    clusters.push(validatedCluster);
    
    onProgress?.(
      `Creating cluster ${index + 1}/${clustersData.length}...`,
      70 + Math.floor((index + 1) / clustersData.length * 20),
      100,
      { name: validatedCluster.name, description: validatedCluster.description_prompt }
    );
    
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  // Normalize weights to sum to 100
  const totalWeight = clusters.reduce((sum, c) => sum + c.weight, 0);
  if (totalWeight > 0) {
    clusters.forEach((cluster) => {
      cluster.weight = Math.round((cluster.weight / totalWeight) * 100);
    });
    // Adjust last cluster to ensure sum is exactly 100
    const currentSum = clusters.reduce((sum, c) => sum + c.weight, 0);
    if (clusters.length > 0) {
      clusters[clusters.length - 1].weight += (100 - currentSum);
    }
  } else {
    // If no weights provided, distribute equally
    const equalWeight = Math.floor(100 / clusters.length);
    const remainder = 100 - (equalWeight * clusters.length);
    clusters.forEach((cluster, index) => {
      cluster.weight = equalWeight + (index < remainder ? 1 : 0);
    });
  }

  onProgress?.("Normalizing weights...", 90, 100);
  await new Promise(resolve => setTimeout(resolve, 200));

  onProgress?.("Saving clusters...", 95, 100);
  
  // Save all clusters
  const existingClusters = getClusters();
  const allClusters = [...existingClusters, ...clusters];
  saveClusters(allClusters);

  await new Promise(resolve => setTimeout(resolve, 200));
  
  onProgress?.("Complete!", 100, 100);

  return clusters;
}
