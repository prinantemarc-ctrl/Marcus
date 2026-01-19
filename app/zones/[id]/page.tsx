"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import MainLayout from "@/components/Layout/MainLayout";
import Card from "@/components/UI/Card";
import Button from "@/components/UI/Button";
import Input from "@/components/UI/Input";
import GenerationModal from "@/components/UI/GenerationModal";
import WeightEditor from "@/components/UI/WeightEditor";
import {
  getZone,
  getClustersByZone,
  updateCluster,
  getAgentsForCluster,
  deleteCluster,
} from "@/lib/core/storage";
import { generateClustersForZone } from "@/lib/core/cluster";
import { generateAgentsBatch } from "@/lib/core/agent";
import { getLLMConfig, isConfigValid } from "@/lib/core/config";
import { taskManager } from "@/lib/core/taskManager";
import type { Zone, Cluster } from "@/types";
import Link from "next/link";
import {
  ArrowLeftIcon,
  PlusIcon,
  TrashIcon,
  PencilIcon,
  BoltIcon,
  UserGroupIcon,
  AdjustmentsHorizontalIcon,
} from "@heroicons/react/24/outline";

export default function ZoneDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [zone, setZone] = useState<Zone | null>(null);
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [clusterCount, setClusterCount] = useState("5");
  const [editingWeights, setEditingWeights] = useState(false);
  const [generatingAgents, setGeneratingAgents] = useState(false);
  const [agentCount, setAgentCount] = useState("100");
  
  // Generation modal state
  const [showModal, setShowModal] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);
  const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 100 });
  const [generatedItems, setGeneratedItems] = useState<Array<{ title: string; content: string }>>([]);
  const [generationType, setGenerationType] = useState<"clusters" | "agents">("clusters");

  const generationSteps = {
    clusters: [
      { label: "Preparing generation", status: "pending" as const },
      { label: "Analyzing zone characteristics", status: "pending" as const },
      { label: "Generating clusters with AI", status: "pending" as const },
      { label: "Parsing and validating data", status: "pending" as const },
      { label: "Creating clusters", status: "pending" as const },
      { label: "Normalizing weights", status: "pending" as const },
      { label: "Saving to database", status: "pending" as const },
    ],
    agents: [
      { label: "Preparing generation", status: "pending" as const },
      { label: "Analyzing cluster characteristics", status: "pending" as const },
      { label: "Generating agents with AI", status: "pending" as const },
      { label: "Creating agent profiles", status: "pending" as const },
      { label: "Saving to database", status: "pending" as const },
    ],
  };

  useEffect(() => {
    if (params.id && typeof params.id === "string") {
      const zoneData = getZone(params.id);
      setZone(zoneData);
      
      if (zoneData) {
        const clustersData = getClustersByZone(params.id);
        setClusters(clustersData);
      }
      
      setLoading(false);
    }
  }, [params.id]);

  const handleGenerateClusters = async () => {
    if (!zone) return;

    setError("");

    const count = parseInt(clusterCount);
    if (isNaN(count) || count < 1 || count > 20) {
      setError("Number of clusters must be between 1 and 20");
      return;
    }

    // Check LLM config
    const llmConfig = getLLMConfig();
    if (!isConfigValid(llmConfig)) {
      setError("Invalid LLM configuration. Please configure the LLM in settings.");
      router.push("/settings");
      return;
    }

    // Start background task
    const taskId = taskManager.addTask({
      type: "cluster",
      title: `Generating ${count} clusters for "${zone.name}"`,
      status: "running",
      progress: 0,
    });

    // Run in background
    generateClustersForZone(
      zone.id,
      zone.name,
      llmConfig,
      count,
      zone.description,
      (stage, current, total) => {
        const progress = total > 0 ? Math.round((current / total) * 100) : 0;
        taskManager.updateTask(taskId, {
          progress,
          currentStep: stage,
        });
      }
    )
      .then(() => {
        taskManager.completeTask(taskId);
        // Reload clusters
        if (zone) {
          const clustersData = getClustersByZone(zone.id);
          setClusters(clustersData);
        }
      })
      .catch((err) => {
        taskManager.failTask(taskId, err instanceof Error ? err.message : "Generation failed");
      });
  };

  const handleSaveWeights = (weights: Map<string, number>) => {
    weights.forEach((weight, clusterId) => {
      updateCluster(clusterId, { weight });
    });
    const clustersData = getClustersByZone(zone!.id);
    setClusters(clustersData);
    setEditingWeights(false);
  };

  const handleGenerateAgentsForZone = async () => {
    if (!zone || clusters.length === 0) return;

    setError("");

    const totalAgentsCount = parseInt(agentCount);
    if (isNaN(totalAgentsCount) || totalAgentsCount < 1 || totalAgentsCount > 1000) {
      setError("Total number of agents must be between 1 and 1000");
      return;
    }

    // Check LLM config
    const llmConfig = getLLMConfig();
    if (!isConfigValid(llmConfig)) {
      setError("Invalid LLM configuration. Please configure the LLM in settings.");
      router.push("/settings");
      return;
    }

    // Calculate total weight
    const totalWeightCalc = clusters.reduce((sum, c) => sum + c.weight, 0);
    if (totalWeightCalc === 0) {
      setError("Cluster weights must be set. Please edit cluster weights first.");
      return;
    }

    // Calculate agents per cluster based on weights
    const agentsPerCluster: Array<{ cluster: Cluster; count: number }> = [];
    let allocatedAgents = 0;

    for (let i = 0; i < clusters.length; i++) {
      const cluster = clusters[i];
      if (i === clusters.length - 1) {
        agentsPerCluster.push({
          cluster,
          count: totalAgentsCount - allocatedAgents,
        });
      } else {
        const count = Math.floor((cluster.weight / totalWeightCalc) * totalAgentsCount);
        agentsPerCluster.push({ cluster, count });
        allocatedAgents += count;
      }
    }

    const clustersToProcess = agentsPerCluster.filter((item) => item.count > 0);

    // Start background task
    const taskId = taskManager.addTask({
      type: "agent",
      title: `Generating ${totalAgentsCount} agents for "${zone.name}"`,
      status: "running",
      progress: 0,
    });

    // Close any modal immediately - navigation continues
    setShowModal(false);

    // Run generation in background
    (async () => {
      try {
        for (let i = 0; i < clustersToProcess.length; i++) {
          const { cluster, count } = clustersToProcess[i];
          const progress = Math.round((i / clustersToProcess.length) * 100);
          taskManager.updateTask(taskId, {
            progress,
            currentStep: `Generating ${count} agents for "${cluster.name}"...`,
          });

          const demographics = Array.from({ length: count }, () => ({
            ageBucketId: "default",
            regionId: "default",
            cspId: "default",
            age: Math.floor(Math.random() * 50) + 25,
          }));

          await generateAgentsBatch(
            cluster.id,
            cluster.description_prompt,
            count,
            demographics,
            llmConfig,
            () => {} // No UI callback needed for background task
          );
        }

        taskManager.completeTask(taskId);
        
        // Reload clusters to refresh agent counts (in background)
        if (zone) {
          const clustersData = getClustersByZone(zone.id);
          setClusters(clustersData);
        }
      } catch (err) {
        taskManager.failTask(taskId, err instanceof Error ? err.message : "Generation failed");
      }
    })();
  };


  const handleDeleteCluster = (id: string) => {
    if (confirm("Are you sure you want to delete this cluster?")) {
      deleteCluster(id);
      if (zone) {
        const clustersData = getClustersByZone(zone.id);
        setClusters(clustersData);
      }
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="animate-fade-in">
          <p className="text-gray-400">Loading...</p>
        </div>
      </MainLayout>
    );
  }

  if (!zone) {
    return (
      <MainLayout>
        <div className="animate-fade-in">
          <p className="text-red-400">Zone not found</p>
          <Link href="/zones">
            <Button className="mt-4">Back to zones</Button>
          </Link>
        </div>
      </MainLayout>
    );
  }

  const totalAgents = clusters.reduce((sum, cluster) => sum + getAgentsForCluster(cluster.id).length, 0);
  const totalWeight = clusters.reduce((sum, cluster) => sum + cluster.weight, 0);

  return (
    <MainLayout>
      <GenerationModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          if (!generating && !generatingAgents) {
            const clustersData = getClustersByZone(zone.id);
            setClusters(clustersData);
          }
        }}
        title={generationType === "clusters" ? "Generating Opinion Clusters" : "Generating Virtual Agents"}
        steps={generationSteps[generationType].map((step, index) => ({
          ...step,
          status:
            index < generationStep
              ? "completed"
              : index === generationStep
              ? "active"
              : "pending",
        }))}
        currentStep={generationStep}
        progress={generationProgress.total > 0 ? generationProgress : undefined}
        generatedItems={generatedItems}
        onComplete={() => {
          const clustersData = getClustersByZone(zone.id);
          setClusters(clustersData);
        }}
      />

      <div className="space-y-6 animate-fade-in">
        <Link href="/zones">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeftIcon className="w-4 h-4 mr-2 inline" />
            Back to zones
          </Button>
        </Link>

        {/* Zone Header */}
        <Card gradient>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">{zone.name}</h1>
              {zone.description && (
                <p className="text-gray-400">{zone.description}</p>
              )}
            </div>
            <Link href={`/zones/${zone.id}/edit`}>
              <Button variant="outline" size="sm">
                <PencilIcon className="w-4 h-4 mr-2 inline" />
                Edit
              </Button>
            </Link>
          </div>
        </Card>

        {/* Generate Clusters Section */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-white mb-1">
                Generate Clusters with AI
              </h2>
              <p className="text-sm text-gray-400">
                Automatically generate opinion clusters for this zone using AI
              </p>
            </div>
          </div>

          <div className="flex items-end gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Number of clusters
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={clusterCount}
                onChange={(e) => setClusterCount(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                disabled={generating}
              />
            </div>
            <Button
              onClick={handleGenerateClusters}
              disabled={generating}
              className="flex items-center gap-2"
            >
              <BoltIcon className="w-5 h-5" />
              {generating ? "Generating..." : "Generate Clusters"}
            </Button>
          </div>

          {error && (
            <p className="text-sm text-red-400 mt-4">{error}</p>
          )}

          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mt-4">
            <p className="text-sm text-blue-300">
              <strong>Note:</strong> Make sure you have configured your LLM in{" "}
              <Link href="/settings" className="underline">
                settings
              </Link>
              . Cluster weights will be automatically normalized to total 100%.
            </p>
          </div>
        </Card>

        {/* Generate Agents Section */}
        {clusters.length > 0 && (
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-white mb-1">
                  Generate Agents
                </h2>
                <p className="text-sm text-gray-400">
                  Generate agents for the entire zone. Agents will be distributed across clusters based on their weights.
                </p>
              </div>
            </div>

            <div className="flex items-end gap-4 mb-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Total agents for zone
                </label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={agentCount}
                  onChange={(e) => setAgentCount(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                  disabled={generatingAgents}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Agents will be distributed proportionally based on cluster weights
                </p>
              </div>
              <Button
                onClick={handleGenerateAgentsForZone}
                disabled={generatingAgents || totalWeight !== 100}
                className="flex items-center gap-2"
                title={totalWeight !== 100 ? "Cluster weights must sum to 100%" : ""}
              >
                <UserGroupIcon className="w-5 h-5" />
                Generate Agents for Zone
              </Button>
            </div>

            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
              <p className="text-sm text-green-300">
                <strong>Total agents in zone:</strong> {totalAgents} agents across {clusters.length} clusters
              </p>
            </div>
          </Card>
        )}

        {/* Clusters List */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-semibold text-white">
                Clusters ({clusters.length})
              </h2>
              {clusters.length > 0 && (
                <>
                  <span className="text-sm text-gray-400">
                    Total weight: {totalWeight}%
                  </span>
                  {totalWeight !== 100 && (
                    <span className="text-xs px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-300">
                      Weights don't sum to 100%
                    </span>
                  )}
                </>
              )}
            </div>
            <div className="flex gap-2">
              {clusters.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingWeights(!editingWeights)}
                >
                  <AdjustmentsHorizontalIcon className="w-4 h-4 mr-2 inline" />
                  {editingWeights ? "Cancel" : "Edit Weights"}
                </Button>
              )}
              <Link href={`/clusters/new?zoneId=${zone.id}`}>
                <Button variant="outline" size="sm">
                  <PlusIcon className="w-4 h-4 mr-2 inline" />
                  Create manually
                </Button>
              </Link>
            </div>
          </div>

          {editingWeights && clusters.length > 0 && (
            <div className="mb-6">
              <WeightEditor
                clusters={clusters.map((c) => ({ id: c.id, name: c.name, weight: c.weight }))}
                onSave={handleSaveWeights}
                onCancel={() => setEditingWeights(false)}
              />
            </div>
          )}

          {clusters.length === 0 ? (
            <Card>
              <div className="text-center py-12">
                <p className="text-gray-400 mb-4">No clusters created for this zone</p>
                <p className="text-sm text-gray-500 mb-4">
                  Generate clusters automatically with AI or create them manually
                </p>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {clusters.map((cluster, index) => {
                const clusterAgents = getAgentsForCluster(cluster.id);
                return (
                  <Card
                    key={cluster.id}
                    hover
                    className="animate-scale-in"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-lg font-semibold text-white">
                            {cluster.name}
                          </h3>
                          <span className="text-xs px-2 py-1 rounded-full bg-primary-500/20 text-primary-300">
                            {cluster.weight}%
                          </span>
                        </div>
                        <p className="text-gray-400 text-sm line-clamp-3">
                          {cluster.description_prompt}
                        </p>
                        <div className="mt-2 text-xs text-gray-500">
                          {clusterAgents.length} agent{clusterAgents.length !== 1 ? "s" : ""}
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-4 border-t border-white/10">
                        <Link href={`/clusters/${cluster.id}/edit`}>
                          <Button variant="ghost" size="sm">
                            <PencilIcon className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteCluster(cluster.id)}
                        >
                          <TrashIcon className="w-4 h-4 text-red-400" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
