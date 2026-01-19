"use client";

import { useEffect, useState } from "react";
import MainLayout from "@/components/Layout/MainLayout";
import Card from "@/components/UI/Card";
import Button from "@/components/UI/Button";
import Input from "@/components/UI/Input";
import Textarea from "@/components/UI/Textarea";
import { getAllAgents, getClusters, getZones, saveAgentsForCluster } from "@/lib/core/storage";
import type { Agent, Cluster, Zone } from "@/types";
import Link from "next/link";
import {
  PlusIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";

interface ClusterWithAgents extends Cluster {
  agents: Agent[];
  zone?: Zone;
}

export default function AgentsPage() {
  const [clustersWithAgents, setClustersWithAgents] = useState<ClusterWithAgents[]>([]);
  const [expandedClusters, setExpandedClusters] = useState<Set<string>>(new Set());
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [editForm, setEditForm] = useState<Partial<Agent>>({});
  const [totalAgents, setTotalAgents] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const allAgentsMap = getAllAgents();
    const clustersData = getClusters();
    const zonesData = getZones();

    const zonesMap = new Map(zonesData.map(z => [z.id, z]));

    let total = 0;
    const clustersWithAgentsData: ClusterWithAgents[] = clustersData.map(cluster => {
      const agents = allAgentsMap[cluster.id] || [];
      total += agents.length;
      return {
        ...cluster,
        agents,
        zone: zonesMap.get(cluster.zoneId),
      };
    }).filter(c => c.agents.length > 0); // Only show clusters with agents

    setClustersWithAgents(clustersWithAgentsData);
    setTotalAgents(total);

    // Auto-expand first cluster if only one
    if (clustersWithAgentsData.length === 1) {
      setExpandedClusters(new Set([clustersWithAgentsData[0].id]));
    }
  };

  const toggleCluster = (clusterId: string) => {
    setExpandedClusters(prev => {
      const next = new Set(prev);
      if (next.has(clusterId)) {
        next.delete(clusterId);
      } else {
        next.add(clusterId);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedClusters(new Set(clustersWithAgents.map(c => c.id)));
  };

  const collapseAll = () => {
    setExpandedClusters(new Set());
  };

  const handleEditAgent = (agent: Agent) => {
    setEditingAgent(agent);
    setEditForm({
      name: agent.name,
      age: agent.age,
      socio_demo: agent.socio_demo,
      traits: agent.traits,
      priors: agent.priors,
      speaking_style: agent.speaking_style,
    });
  };

  const handleSaveAgent = () => {
    if (!editingAgent) return;

    const clusterId = editingAgent.cluster_id;
    const allAgentsMap = getAllAgents();
    const clusterAgents = allAgentsMap[clusterId] || [];

    const updatedAgents = clusterAgents.map(a =>
      a.id === editingAgent.id
        ? { ...a, ...editForm }
        : a
    );

    saveAgentsForCluster(clusterId, updatedAgents);
    setEditingAgent(null);
    setEditForm({});
    loadData();
  };

  const handleDeleteAgent = (agent: Agent) => {
    if (!confirm(`Are you sure you want to delete ${agent.name || 'this agent'}?`)) return;

    const clusterId = agent.cluster_id;
    const allAgentsMap = getAllAgents();
    const clusterAgents = allAgentsMap[clusterId] || [];

    const updatedAgents = clusterAgents.filter(a => a.id !== agent.id);
    saveAgentsForCluster(clusterId, updatedAgents);
    loadData();
  };

  const getClusterColor = (index: number) => {
    const colors = [
      "from-blue-500 to-cyan-500",
      "from-purple-500 to-pink-500",
      "from-orange-500 to-red-500",
      "from-green-500 to-emerald-500",
      "from-indigo-500 to-violet-500",
      "from-yellow-500 to-amber-500",
    ];
    return colors[index % colors.length];
  };

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Agents</h1>
            <p className="text-gray-400 mt-1">
              {totalAgents} agent{totalAgents !== 1 ? "s" : ""} across {clustersWithAgents.length} cluster{clustersWithAgents.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex gap-2">
            {clustersWithAgents.length > 0 && (
              <>
                <Button variant="outline" size="sm" onClick={expandAll}>
                  Expand all
                </Button>
                <Button variant="outline" size="sm" onClick={collapseAll}>
                  Collapse all
                </Button>
              </>
            )}
            <Link href="/zones">
              <Button>
                <PlusIcon className="w-5 h-5 mr-2 inline" />
                Generate agents
              </Button>
            </Link>
          </div>
        </div>

        {/* Info */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
          <p className="text-sm text-blue-300">
            <strong>Tip:</strong> Agents are generated from zones. Go to a zone's detail page to generate agents for that zone's clusters.
          </p>
        </div>

        {/* Clusters Accordion */}
        {clustersWithAgents.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <UserGroupIcon className="w-16 h-16 mx-auto text-gray-600 mb-4" />
              <p className="text-gray-400 mb-4">No agents generated yet</p>
              <Link href="/zones">
                <Button>Go to Zones to generate agents</Button>
              </Link>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {clustersWithAgents.map((cluster, index) => {
              const isExpanded = expandedClusters.has(cluster.id);
              const colorClass = getClusterColor(index);

              return (
                <div key={cluster.id} className="rounded-xl overflow-hidden border border-white/10 bg-white/5">
                  {/* Cluster Header */}
                  <button
                    onClick={() => toggleCluster(cluster.id)}
                    className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${colorClass} flex items-center justify-center`}>
                        <UserGroupIcon className="w-5 h-5 text-white" />
                      </div>
                      <div className="text-left">
                        <h3 className="text-lg font-semibold text-white">
                          {cluster.name}
                        </h3>
                        <p className="text-sm text-gray-400">
                          {cluster.agents.length} agent{cluster.agents.length !== 1 ? "s" : ""}
                          {cluster.zone && (
                            <span className="ml-2 text-gray-500">• {cluster.zone.name}</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-400">
                        Weight: {cluster.weight}%
                      </span>
                      {isExpanded ? (
                        <ChevronDownIcon className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronRightIcon className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </button>

                  {/* Agents List */}
                  {isExpanded && (
                    <div className="border-t border-white/10 p-4 space-y-3">
                      {cluster.agents.map((agent) => (
                        <div
                          key={agent.id}
                          className="p-4 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 transition-all"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-700 text-gray-300">
                                  #{agent.agentNumber || agent.id.slice(-4)}
                                </span>
                                <h4 className="text-md font-medium text-white">
                                  {agent.name || `Agent ${agent.agentNumber}`}
                                </h4>
                                <span className="text-sm text-gray-400">
                                  {agent.age} years
                                </span>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm mb-2">
                                <div>
                                  <span className="text-gray-500">Socio-demo:</span>{" "}
                                  <span className="text-gray-300">{agent.socio_demo}</span>
                                </div>
                                <div>
                                  <span className="text-gray-500">Style:</span>{" "}
                                  <span className="text-gray-300">{agent.speaking_style}</span>
                                </div>
                              </div>

                              {agent.traits && agent.traits.length > 0 && (
                                <div className="flex flex-wrap gap-1 mb-2">
                                  {agent.traits.map((trait, i) => (
                                    <span
                                      key={i}
                                      className="text-xs px-2 py-0.5 rounded-full bg-primary-500/20 text-primary-300"
                                    >
                                      {trait}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {agent.priors && (
                                <p className="text-gray-400 text-sm line-clamp-2">
                                  {agent.priors}
                                </p>
                              )}
                            </div>

                            <div className="flex gap-2 ml-4">
                              <button
                                onClick={() => handleEditAgent(agent)}
                                className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-all"
                                title="Edit agent"
                              >
                                <PencilIcon className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteAgent(agent)}
                                className="p-2 rounded-lg hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-all"
                                title="Delete agent"
                              >
                                <TrashIcon className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Edit Modal */}
        {editingAgent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setEditingAgent(null)}
            />
            <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-gray-900 rounded-2xl border border-white/10 shadow-2xl">
              <div className="sticky top-0 bg-gray-900 border-b border-white/10 p-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">
                  Edit Agent
                </h2>
                <button
                  onClick={() => setEditingAgent(null)}
                  className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-all"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <Input
                  label="Name"
                  value={editForm.name || ""}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                />

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Age"
                    type="number"
                    value={editForm.age || ""}
                    onChange={(e) => setEditForm({ ...editForm, age: parseInt(e.target.value) || 0 })}
                  />
                  <Input
                    label="Speaking Style"
                    value={editForm.speaking_style || ""}
                    onChange={(e) => setEditForm({ ...editForm, speaking_style: e.target.value })}
                  />
                </div>

                <Input
                  label="Socio-demographic"
                  value={editForm.socio_demo || ""}
                  onChange={(e) => setEditForm({ ...editForm, socio_demo: e.target.value })}
                />

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Traits (comma-separated)
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    value={editForm.traits?.join(", ") || ""}
                    onChange={(e) => setEditForm({
                      ...editForm,
                      traits: e.target.value.split(",").map(t => t.trim()).filter(Boolean)
                    })}
                  />
                </div>

                <Textarea
                  label="Priors / Biography"
                  rows={4}
                  value={editForm.priors || ""}
                  onChange={(e) => setEditForm({ ...editForm, priors: e.target.value })}
                />

                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setEditingAgent(null)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleSaveAgent} className="flex-1">
                    Save Changes
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
