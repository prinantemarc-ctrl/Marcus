/**
 * Storage - localStorage persistence management
 * Simplified and optimized version
 */

import type { Zone, Cluster, Agent, Simulation } from "@/types";

const STORAGE_KEYS = {
  zones: "op_zones",
  clusters: "op_clusters",
  agents: "op_agents", // { [clusterId]: Agent[] }
  simulations: "op_simulations",
  polls: "op_polls",
} as const;

// ============================================================================
// HELPERS
// ============================================================================
function isStorageAvailable(): boolean {
  if (typeof window === "undefined") return false;
  try {
    localStorage.setItem("__test__", "__test__");
    localStorage.removeItem("__test__");
    return true;
  } catch {
    return false;
  }
}

function safeGet<T>(key: string, defaultValue: T): T {
  console.log(`[storage] safeGet called for key: ${key}`);
  if (!isStorageAvailable()) {
    console.warn(`[storage] Storage not available for key: ${key}, returning default`);
    return defaultValue;
  }
  try {
    const data = localStorage.getItem(key);
    console.log(`[storage] Raw data from localStorage for ${key}:`, data);
    const result = data ? JSON.parse(data) : defaultValue;
    console.log(`[storage] Parsed result for ${key}:`, result);
    return result;
  } catch (error) {
    console.error(`[storage] Error getting ${key}:`, error);
    return defaultValue;
  }
}

function safeSet(key: string, value: unknown): void {
  console.log(`[storage] safeSet called for key: ${key}`, value);
  if (!isStorageAvailable()) {
    console.error("[storage] Storage is not available!");
    throw new Error("localStorage is not available");
  }
  try {
    const jsonString = JSON.stringify(value);
    console.log(`[storage] Setting ${key} with value:`, jsonString);
    localStorage.setItem(key, jsonString);
    console.log(`[storage] Successfully set ${key}`);
    
    // Verify it was set
    const verify = localStorage.getItem(key);
    console.log(`[storage] Verification read:`, verify);
    if (verify !== jsonString) {
      console.error(`[storage] Verification failed! Expected: ${jsonString}, Got: ${verify}`);
      throw new Error("Failed to save to localStorage - verification failed");
    }
  } catch (error) {
    console.error(`[storage] Error setting ${key}:`, error);
    if (error instanceof Error && error.name === "QuotaExceededError") {
      throw new Error("Storage quota exceeded");
    }
    throw error;
  }
}

// ============================================================================
// ZONES
// ============================================================================
export function saveZones(zones: Zone[]): void {
  safeSet(STORAGE_KEYS.zones, zones);
}

export function getZones(): Zone[] {
  return safeGet(STORAGE_KEYS.zones, []);
}

export function getZone(id: string): Zone | null {
  const zones = getZones();
  return zones.find(z => z.id === id) || null;
}

export function deleteZone(id: string): void {
  const zones = getZones().filter(z => z.id !== id);
  saveZones(zones);
  
  // Delete associated clusters and agents
  const clusters = getClusters().filter(c => c.zoneId === id);
  clusters.forEach(c => deleteCluster(c.id));
}

// ============================================================================
// CLUSTERS
// ============================================================================
export function saveClusters(clusters: Cluster[]): void {
  safeSet(STORAGE_KEYS.clusters, clusters);
}

export function getClusters(): Cluster[] {
  return safeGet(STORAGE_KEYS.clusters, []);
}

export function getClustersByZone(zoneId: string): Cluster[] {
  return getClusters().filter(c => c.zoneId === zoneId);
}

export function getCluster(id: string): Cluster | null {
  const clusters = getClusters();
  return clusters.find(c => c.id === id) || null;
}

export function updateCluster(id: string, updates: Partial<Cluster>): void {
  const clusters = getClusters();
  const index = clusters.findIndex(c => c.id === id);
  if (index >= 0) {
    clusters[index] = { ...clusters[index], ...updates };
    saveClusters(clusters);
  }
}

export function deleteCluster(id: string): void {
  const clusters = getClusters().filter(c => c.id !== id);
  saveClusters(clusters);
  
  // Delete agents from cluster
  deleteAgentsForCluster(id);
}

// ============================================================================
// AGENTS
// ============================================================================
export function saveAgentsForCluster(clusterId: string, agents: Agent[]): void {
  const allAgents = getAllAgents();
  allAgents[clusterId] = agents;
  safeSet(STORAGE_KEYS.agents, allAgents);
}

export function getAgentsForCluster(clusterId: string): Agent[] {
  const allAgents = getAllAgents();
  return allAgents[clusterId] || [];
}

export function getAllAgents(): Record<string, Agent[]> {
  return safeGet(STORAGE_KEYS.agents, {});
}

export function deleteAgentsForCluster(clusterId: string): void {
  const allAgents = getAllAgents();
  delete allAgents[clusterId];
  safeSet(STORAGE_KEYS.agents, allAgents);
}

export function deleteAgent(clusterId: string, agentId: string): void {
  const agents = getAgentsForCluster(clusterId);
  const filtered = agents.filter(a => a.id !== agentId);
  saveAgentsForCluster(clusterId, filtered);
}

// ============================================================================
// SIMULATIONS
// ============================================================================
export function saveSimulation(simulation: Simulation): void {
  const simulations = getAllSimulations();
  const index = simulations.findIndex(s => s.id === simulation.id);
  if (index >= 0) {
    simulations[index] = simulation;
  } else {
    simulations.push(simulation);
  }
  safeSet(STORAGE_KEYS.simulations, simulations);
}

export function getAllSimulations(): Simulation[] {
  return safeGet(STORAGE_KEYS.simulations, []);
}

export function getSimulation(id: string): Simulation | null {
  const simulations = getAllSimulations();
  return simulations.find(s => s.id === id) || null;
}

export function deleteSimulation(id: string): void {
  const simulations = getAllSimulations().filter(s => s.id !== id);
  safeSet(STORAGE_KEYS.simulations, simulations);
}

// ============================================================================
// POLLS
// ============================================================================
export interface Poll {
  id: string;
  title: string;
  question: string;
  options: string[];
  responseMode: "choice" | "ranking" | "scoring";
  status: "pending" | "running" | "completed" | "failed";
  zoneId: string;
  results?: unknown[];
  statistics?: unknown;
  createdAt: string;
}

export function getAllPolls(): Poll[] {
  return safeGet(STORAGE_KEYS.polls, []);
}

export function getPoll(id: string): Poll | null {
  const polls = getAllPolls();
  return polls.find(p => p.id === id) || null;
}

export function savePoll(poll: Poll): void {
  const polls = getAllPolls();
  const existingIndex = polls.findIndex(p => p.id === poll.id);
  if (existingIndex >= 0) {
    polls[existingIndex] = poll;
  } else {
    polls.push(poll);
  }
  safeSet(STORAGE_KEYS.polls, polls);
}

export function deletePoll(id: string): void {
  const polls = getAllPolls().filter(p => p.id !== id);
  safeSet(STORAGE_KEYS.polls, polls);
}

// ============================================================================
// CACHE MANAGEMENT
// ============================================================================
export function clearAllCache(): void {
  if (!isStorageAvailable()) return;
  Object.values(STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
}
