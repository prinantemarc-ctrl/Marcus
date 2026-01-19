/**
 * API Client - Functions to interact with the Supabase backend via API routes
 */

import type { Zone, Cluster, Agent, Simulation, Poll } from "@/types";

// ============================================================================
// HELPER
// ============================================================================
async function fetchAPI<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// ============================================================================
// ZONES
// ============================================================================
export async function fetchZones(): Promise<Zone[]> {
  const data = await fetchAPI<{ zones: Zone[] }>("/api/zones");
  return data.zones;
}

export async function fetchZone(id: string): Promise<Zone | null> {
  try {
    const data = await fetchAPI<{ zone: Zone }>(`/api/zones/${id}`);
    return data.zone;
  } catch {
    return null;
  }
}

export async function createZone(zone: { name: string; description?: string }): Promise<Zone> {
  const data = await fetchAPI<{ zone: Zone }>("/api/zones", {
    method: "POST",
    body: JSON.stringify(zone),
  });
  return data.zone;
}

export async function updateZone(id: string, updates: Partial<Zone>): Promise<Zone> {
  const data = await fetchAPI<{ zone: Zone }>(`/api/zones/${id}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });
  return data.zone;
}

export async function deleteZoneAPI(id: string): Promise<void> {
  await fetchAPI(`/api/zones/${id}`, { method: "DELETE" });
}

// ============================================================================
// CLUSTERS
// ============================================================================
export async function fetchClusters(zoneId?: string): Promise<Cluster[]> {
  const url = zoneId ? `/api/clusters?zoneId=${zoneId}` : "/api/clusters";
  const data = await fetchAPI<{ clusters: Cluster[] }>(url);
  return data.clusters;
}

export async function fetchCluster(id: string): Promise<Cluster | null> {
  try {
    const data = await fetchAPI<{ cluster: Cluster }>(`/api/clusters/${id}`);
    return data.cluster;
  } catch {
    return null;
  }
}

export async function createCluster(cluster: {
  name: string;
  descriptionPrompt: string;
  weight: number;
  zoneId: string;
}): Promise<Cluster> {
  const data = await fetchAPI<{ cluster: Cluster }>("/api/clusters", {
    method: "POST",
    body: JSON.stringify(cluster),
  });
  return data.cluster;
}

export async function createClustersBatch(
  zoneId: string,
  clusters: Array<{ name: string; descriptionPrompt: string; weight: number }>
): Promise<Cluster[]> {
  const data = await fetchAPI<{ clusters: Cluster[] }>("/api/clusters", {
    method: "PUT",
    body: JSON.stringify({ zoneId, clusters }),
  });
  return data.clusters;
}

export async function updateClusterAPI(id: string, updates: Partial<Cluster>): Promise<Cluster> {
  const data = await fetchAPI<{ cluster: Cluster }>(`/api/clusters/${id}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });
  return data.cluster;
}

export async function deleteClusterAPI(id: string): Promise<void> {
  await fetchAPI(`/api/clusters/${id}`, { method: "DELETE" });
}

// ============================================================================
// AGENTS
// ============================================================================
export async function fetchAgents(options?: { clusterId?: string; zoneId?: string }): Promise<Agent[]> {
  const params = new URLSearchParams();
  if (options?.clusterId) params.set("clusterId", options.clusterId);
  if (options?.zoneId) params.set("zoneId", options.zoneId);
  
  const url = `/api/agents${params.toString() ? `?${params}` : ""}`;
  const data = await fetchAPI<{ agents: Agent[] }>(url);
  return data.agents;
}

export async function fetchAgent(id: string): Promise<Agent | null> {
  try {
    const data = await fetchAPI<{ agent: Agent }>(`/api/agents/${id}`);
    return data.agent;
  } catch {
    return null;
  }
}

export async function createAgent(agent: {
  clusterId: string;
  name?: string;
  age: number;
  ageBucketId?: string;
  regionId?: string;
  cspId?: string;
  socioDemoDescription?: string;
  traits?: string[];
  priors?: string;
  speakingStyle?: string;
  expressionProfile?: unknown;
  psychologicalProfile?: unknown;
}): Promise<Agent> {
  const data = await fetchAPI<{ agent: Agent }>("/api/agents", {
    method: "POST",
    body: JSON.stringify(agent),
  });
  return data.agent;
}

export async function createAgentsBatch(
  clusterId: string,
  agents: Array<{
    name?: string;
    age: number;
    ageBucketId?: string;
    regionId?: string;
    cspId?: string;
    socioDemoDescription?: string;
    traits?: string[];
    priors?: string;
    speakingStyle?: string;
    expressionProfile?: unknown;
    psychologicalProfile?: unknown;
  }>
): Promise<Agent[]> {
  const data = await fetchAPI<{ agents: Agent[] }>("/api/agents", {
    method: "PUT",
    body: JSON.stringify({ clusterId, agents }),
  });
  return data.agents;
}

export async function deleteAgentAPI(id: string): Promise<void> {
  await fetchAPI(`/api/agents/${id}`, { method: "DELETE" });
}

// ============================================================================
// SIMULATIONS
// ============================================================================
export async function fetchSimulations(zoneId?: string): Promise<Simulation[]> {
  const url = zoneId ? `/api/simulations?zoneId=${zoneId}` : "/api/simulations";
  const data = await fetchAPI<{ simulations: Simulation[] }>(url);
  return data.simulations;
}

export async function fetchSimulation(id: string): Promise<Simulation | null> {
  try {
    const data = await fetchAPI<{ simulation: Simulation }>(`/api/simulations/${id}`);
    return data.simulation;
  } catch {
    return null;
  }
}

export async function createSimulation(simulation: {
  title: string;
  scenario: string;
  zoneId: string;
  clustersSnapshot?: unknown;
  panelSnapshot?: unknown;
}): Promise<Simulation> {
  const data = await fetchAPI<{ simulation: Simulation }>("/api/simulations", {
    method: "POST",
    body: JSON.stringify(simulation),
  });
  return data.simulation;
}

export async function updateSimulationAPI(
  id: string,
  updates: Partial<{ status: string; executiveSummary: string; clustersSnapshot: unknown; panelSnapshot: unknown }>
): Promise<Simulation> {
  const data = await fetchAPI<{ simulation: Simulation }>(`/api/simulations/${id}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });
  return data.simulation;
}

export async function addSimulationResults(
  simulationId: string,
  results: Array<{ agentId: string; clusterId: string; turns: unknown }>
): Promise<void> {
  await fetchAPI(`/api/simulations/${simulationId}/results`, {
    method: "POST",
    body: JSON.stringify({ results }),
  });
}

export async function deleteSimulationAPI(id: string): Promise<void> {
  await fetchAPI(`/api/simulations/${id}`, { method: "DELETE" });
}

// ============================================================================
// POLLS
// ============================================================================
export async function fetchPolls(zoneId?: string): Promise<Poll[]> {
  const url = zoneId ? `/api/polls?zoneId=${zoneId}` : "/api/polls";
  const data = await fetchAPI<{ polls: Poll[] }>(url);
  return data.polls;
}

export async function fetchPoll(id: string): Promise<Poll | null> {
  try {
    const data = await fetchAPI<{ poll: Poll }>(`/api/polls/${id}`);
    return data.poll;
  } catch {
    return null;
  }
}

export async function createPoll(poll: {
  title: string;
  question: string;
  options: unknown[];
  responseMode: string;
  zoneId: string;
}): Promise<Poll> {
  const data = await fetchAPI<{ poll: Poll }>("/api/polls", {
    method: "POST",
    body: JSON.stringify(poll),
  });
  return data.poll;
}

export async function updatePollAPI(
  id: string,
  updates: Partial<{ status: string; statistics: unknown }>
): Promise<Poll> {
  const data = await fetchAPI<{ poll: Poll }>(`/api/polls/${id}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });
  return data.poll;
}

export async function addPollResponses(
  pollId: string,
  responses: Array<{ agentId: string; response: unknown; reasoning?: string; confidence?: number }>
): Promise<void> {
  await fetchAPI(`/api/polls/${pollId}/responses`, {
    method: "POST",
    body: JSON.stringify({ responses }),
  });
}

export async function deletePollAPI(id: string): Promise<void> {
  await fetchAPI(`/api/polls/${id}`, { method: "DELETE" });
}
