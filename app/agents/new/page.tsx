"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import MainLayout from "@/components/Layout/MainLayout";
import Card from "@/components/UI/Card";
import Button from "@/components/UI/Button";
import Input from "@/components/UI/Input";
import GenerationModal from "@/components/UI/GenerationModal";
import { getClusters, getCluster } from "@/lib/core/storage";
import { generateAgentsBatch } from "@/lib/core/agent";
import { getLLMConfig, isConfigValid } from "@/lib/core/config";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import Link from "next/link";

export default function NewAgentPage() {
  const router = useRouter();
  const [clusters, setClusters] = useState<Array<{ id: string; name: string }>>([]);
  const [formData, setFormData] = useState({
    clusterId: "",
    count: "10",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  // Generation modal state
  const [showModal, setShowModal] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);
  const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0 });
  const [generatedItems, setGeneratedItems] = useState<Array<{ title: string; content: string }>>([]);

  const generationSteps = [
    { label: "Preparing generation", status: "pending" as const },
    { label: "Analyzing cluster characteristics", status: "pending" as const },
    { label: "Generating agents with AI", status: "pending" as const },
    { label: "Creating agent profiles", status: "pending" as const },
    { label: "Saving to database", status: "pending" as const },
  ];

  useEffect(() => {
    const clustersData = getClusters();
    setClusters(clustersData);
    if (clustersData.length > 0 && !formData.clusterId) {
      setFormData({ ...formData, clusterId: clustersData[0].id });
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    setShowModal(true);
    setGenerationStep(0);
    setGeneratedItems([]);
    setGenerationProgress({ current: 0, total: 0 });

    if (!formData.clusterId) {
      setError("Please select a cluster");
      setLoading(false);
      setShowModal(false);
      return;
    }

    const count = parseInt(formData.count);
    if (isNaN(count) || count < 1 || count > 100) {
      setError("Number of agents must be between 1 and 100");
      setLoading(false);
      setShowModal(false);
      return;
    }

    // Check LLM config
    const llmConfig = getLLMConfig();
    if (!isConfigValid(llmConfig)) {
      setError("Invalid LLM configuration. Please configure the LLM in settings.");
      setLoading(false);
      setShowModal(false);
      router.push("/settings");
      return;
    }

    try {
      const cluster = getCluster(formData.clusterId);
      if (!cluster) {
        setError("Cluster not found");
        setLoading(false);
        setShowModal(false);
        return;
      }

      // Generate demographics (simplified - you might want to use actual demographics from cluster)
      const demographics = Array.from({ length: count }, () => ({
        ageBucketId: "default",
        regionId: "default",
        cspId: "default",
        age: Math.floor(Math.random() * 50) + 25, // Random age between 25-75
      }));

      await generateAgentsBatch(
        formData.clusterId,
        cluster.description_prompt,
        count,
        demographics,
        llmConfig,
        (stage, current, total, item) => {
          setGenerationProgress({ current, total });
          
          // Update step based on stage
          if (stage.includes("Preparing")) {
            setGenerationStep(0);
          } else if (stage.includes("Analyzing")) {
            setGenerationStep(1);
          } else if (stage.includes("Generating agent")) {
            setGenerationStep(2);
          } else if (stage.includes("created") && item) {
            setGenerationStep(3);
            setGeneratedItems((prev) => [
              ...prev,
              {
                title: item.name,
                content: item.personality.substring(0, 150) + "...",
              },
            ]);
          } else if (stage.includes("Saving")) {
            setGenerationStep(4);
          } else if (stage.includes("Complete")) {
            setGenerationStep(4);
          }
        }
      );

      setTimeout(() => {
        setLoading(false);
        router.push("/agents");
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error generating agents");
      setLoading(false);
      setShowModal(false);
    }
  };

  if (clusters.length === 0) {
    return (
      <MainLayout>
        <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
          <Link href="/agents">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeftIcon className="w-4 h-4 mr-2 inline" />
              Back
            </Button>
          </Link>
          <Card>
            <div className="text-center py-12">
              <p className="text-gray-400 mb-4">
                You must first create a cluster
              </p>
              <Link href="/clusters/new">
                <Button>Create a cluster</Button>
              </Link>
            </div>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <GenerationModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          if (!loading) {
            router.push("/agents");
          }
        }}
        title="Generating Virtual Agents"
        steps={generationSteps.map((step, index) => ({
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
          router.push("/agents");
        }}
      />

      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
        <Link href="/agents">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeftIcon className="w-4 h-4 mr-2 inline" />
            Back
          </Button>
        </Link>

        <Card gradient>
          <h1 className="text-2xl font-bold text-white mb-6">
            Generate agents
          </h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Cluster
              </label>
              <select
                className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                value={formData.clusterId}
                onChange={(e) =>
                  setFormData({ ...formData, clusterId: e.target.value })
                }
                required
                disabled={loading}
              >
                {clusters.map((cluster) => (
                  <option key={cluster.id} value={cluster.id}>
                    {cluster.name}
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="Number of agents"
              type="number"
              min="1"
              max="100"
              placeholder="10"
              value={formData.count}
              onChange={(e) =>
                setFormData({ ...formData, count: e.target.value })
              }
              required
              disabled={loading}
            />

            {error && (
              <p className="text-sm text-red-400">{error}</p>
            )}

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <p className="text-sm text-blue-300">
                <strong>Note:</strong> Make sure you have configured your LLM in{" "}
                <Link href="/settings" className="underline">
                  settings
                </Link>
                .
              </p>
            </div>

            <div className="flex gap-4 pt-4">
              <Link href="/agents" className="flex-1">
                <Button variant="outline" className="w-full" disabled={loading}>
                  Cancel
                </Button>
              </Link>
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? "Generating..." : "Generate agents"}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </MainLayout>
  );
}
