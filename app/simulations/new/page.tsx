"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import MainLayout from "@/components/Layout/MainLayout";
import Card from "@/components/UI/Card";
import Button from "@/components/UI/Button";
import Input from "@/components/UI/Input";
import Textarea from "@/components/UI/Textarea";
import GenerationModal from "@/components/UI/GenerationModal";
import { getClusters, getAllAgents, getZones } from "@/lib/core/storage";
import { runSimulation } from "@/lib/core/simulation";
import { getLLMConfig, isConfigValid } from "@/lib/core/config";
import { taskManager } from "@/lib/core/taskManager";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import type { SimulationConfig } from "@/types";

export default function NewSimulationPage() {
  const router = useRouter();
  const [clusters, setClusters] = useState<Array<{ id: string; name: string }>>([]);
  const [formData, setFormData] = useState({
    title: "",
    scenario: "",
    nAgents: "50",
    zoneId: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Generation modal state
  const [showModal, setShowModal] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);
  const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 100 });
  const [generatedItems, setGeneratedItems] = useState<Array<{ title: string; content: string }>>([]);

  const generationSteps = [
    { label: "Preparing simulation", status: "pending" as const },
    { label: "Loading clusters and agents", status: "pending" as const },
    { label: "Allocating agents to clusters", status: "pending" as const },
    { label: "Selecting agents for panel", status: "pending" as const },
    { label: "Generating reactions with AI", status: "pending" as const },
    { label: "Building results", status: "pending" as const },
    { label: "Saving simulation", status: "pending" as const },
  ];

  useEffect(() => {
    const clustersData = getClusters();
    setClusters(clustersData);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.title.trim()) {
      setError("Title is required");
      return;
    }
    if (!formData.scenario.trim()) {
      setError("Scenario is required");
      return;
    }

    const nAgents = parseInt(formData.nAgents);
    if (isNaN(nAgents) || nAgents < 1 || nAgents > 1000) {
      setError("Number of agents must be between 1 and 1000");
      return;
    }

    // Check LLM config
    const llmConfig = getLLMConfig();
    if (!isConfigValid(llmConfig)) {
      setError("Invalid LLM configuration. Please configure the LLM in settings.");
      router.push("/settings");
      return;
    }

    const config: SimulationConfig = {
      nAgents,
      allocationMode: "useClusterWeights",
      multiTurn: {
        enabled: false,
        turns: 1,
        mediaSummaryMode: "generated",
      },
      influence: {
        enabled: false,
        exposurePct: 0,
        exposureType: "rumor",
        exposureContentMode: "generated",
      },
    };

    // Start background task
    const taskId = taskManager.addTask({
      type: "simulation",
      title: `Running simulation: "${formData.title.trim()}"`,
      status: "running",
      progress: 0,
    });

    // Redirect immediately
    router.push("/simulations");

    // Run in background
    runSimulation(
      formData.title.trim(),
      formData.scenario.trim(),
      formData.zoneId || undefined,
      config,
      llmConfig,
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
      })
      .catch((err) => {
        let errorMessage = "Error generating simulation";
        
        if (err instanceof Error) {
          errorMessage = err.message;
          
          // Format multi-line error messages for better display
          if (errorMessage.includes('\n')) {
            const lines = errorMessage.split('\n');
            errorMessage = lines[0] + (lines.length > 1 ? ` (${lines.length - 1} more details)` : '');
          }
        }
        
        taskManager.failTask(taskId, errorMessage);
      });
  };

  // Legacy function for non-background mode (kept for reference)
  const handleSubmitLegacy = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    setShowModal(true);
    setGenerationStep(0);
    setGeneratedItems([]);
    setGenerationProgress({ current: 0, total: 100 });

    if (!formData.title.trim()) {
      setError("Title is required");
      setLoading(false);
      setShowModal(false);
      return;
    }
    if (!formData.scenario.trim()) {
      setError("Scenario is required");
      setLoading(false);
      setShowModal(false);
      return;
    }

    const nAgents = parseInt(formData.nAgents);
    if (isNaN(nAgents) || nAgents < 1 || nAgents > 1000) {
      setError("Number of agents must be between 1 and 1000");
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
      const config: SimulationConfig = {
        nAgents,
        allocationMode: "useClusterWeights",
        multiTurn: {
          enabled: false,
          turns: 1,
          mediaSummaryMode: "generated",
        },
        influence: {
          enabled: false,
          exposurePct: 0,
          exposureType: "rumor",
          exposureContentMode: "generated",
        },
      };

      await runSimulation(
        formData.title.trim(),
        formData.scenario.trim(),
        formData.zoneId || undefined,
        config,
        llmConfig,
        (stage, current, total, item) => {
          setGenerationProgress({ current, total });
          
          // Update step based on stage
          if (stage.includes("Preparing")) {
            setGenerationStep(0);
          } else if (stage.includes("Loading")) {
            setGenerationStep(1);
          } else if (stage.includes("Allocating")) {
            setGenerationStep(2);
          } else if (stage.includes("Selecting")) {
            setGenerationStep(3);
          } else if (stage.includes("Generating reaction")) {
            setGenerationStep(4);
            if (item) {
              setGeneratedItems((prev) => {
                // Check if this agent already has an item (update it) or add new
                const existingIndex = prev.findIndex(
                  (i) => i.title === item.agentName
                );
                if (existingIndex >= 0) {
                  const updated = [...prev];
                  updated[existingIndex] = {
                    title: item.agentName,
                    content: item.reaction,
                  };
                  return updated;
                }
                return [
                  ...prev,
                  {
                    title: item.agentName,
                    content: item.reaction,
                  },
                ];
              });
            }
          } else if (stage.includes("Generating reactions")) {
            setGenerationStep(4);
            if (item) {
              setGeneratedItems((prev) => {
                // Check if this agent already has an item (update it) or add new
                const existingIndex = prev.findIndex(
                  (i) => i.title === item.agentName
                );
                if (existingIndex >= 0) {
                  const updated = [...prev];
                  updated[existingIndex] = {
                    title: item.agentName,
                    content: item.reaction,
                  };
                  return updated;
                }
                return [
                  ...prev,
                  {
                    title: item.agentName,
                    content: item.reaction,
                  },
                ];
              });
            }
          } else if (stage.includes("Building")) {
            setGenerationStep(5);
          } else if (stage.includes("Saving")) {
            setGenerationStep(6);
          } else if (stage.includes("Complete")) {
            setGenerationStep(6);
          }
        }
      );

      setTimeout(() => {
        setLoading(false);
        router.push("/simulations");
      }, 1000);
    } catch (err) {
      let errorMessage = "Error generating simulation";
      
      if (err instanceof Error) {
        errorMessage = err.message;
        
        // Format multi-line error messages for better display
        if (errorMessage.includes('\n')) {
          const lines = errorMessage.split('\n');
          errorMessage = lines[0] + (lines.length > 1 ? `\n\nDetails:\n${lines.slice(1).join('\n')}` : '');
        }
        
        // Add helpful context based on error type
        if (errorMessage.includes("LLM") || errorMessage.includes("API error")) {
          errorMessage += "\n\nPlease check:\n- LLM service is running (Ollama: 'ollama serve')\n- LLM configuration in Settings\n- Network connection";
        } else if (errorMessage.includes("parse") || errorMessage.includes("JSON") || errorMessage.includes("Invalid")) {
          errorMessage += "\n\nThe LLM response format was invalid. This may indicate:\n- LLM model compatibility issues\n- Prompt format problems\n- Try a different LLM model or provider";
        } else if (errorMessage.includes("No agents") || errorMessage.includes("No clusters")) {
          errorMessage += "\n\nPlease ensure:\n- Agents are generated for the selected zone\n- Clusters exist for the selected zone";
        } else if (errorMessage.includes("Failed to generate reaction")) {
          errorMessage += "\n\nThis agent's reaction generation failed after 3 attempts.\nCheck the console for detailed error logs.";
        }
      }
      
      console.error("Simulation generation error:", err);
      setError(errorMessage);
      setLoading(false);
      setShowModal(false);
    }
  };

  const totalAgents = Object.values(getAllAgents()).flat().length;

  if (clusters.length === 0) {
    return (
      <MainLayout>
        <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
          <Link href="/simulations">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeftIcon className="w-4 h-4 mr-2 inline" />
              Back
            </Button>
          </Link>
          <Card>
            <div className="text-center py-12">
              <p className="text-gray-400 mb-4">
                You must first create a cluster and generate agents
              </p>
              <div className="flex gap-3 justify-center">
                <Link href="/clusters/new">
                  <Button variant="outline">Create a cluster</Button>
                </Link>
                <Link href="/agents/new">
                  <Button>Generate agents</Button>
                </Link>
              </div>
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
            router.push("/simulations");
          }
        }}
        title="Running Simulation"
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
        progress={generationProgress}
        generatedItems={generatedItems}
        onComplete={() => {
          router.push("/simulations");
        }}
      />

      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
        <Link href="/simulations">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeftIcon className="w-4 h-4 mr-2 inline" />
            Back
          </Button>
        </Link>

        <Card gradient>
          <h1 className="text-2xl font-bold text-white mb-6">
            Create a new simulation
          </h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label="Simulation title"
              placeholder="e.g., Referendum on reform..."
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              required
              disabled={loading}
            />

            <Textarea
              label="Scenario"
              placeholder="Describe the simulation scenario..."
              rows={6}
              value={formData.scenario}
              onChange={(e) =>
                setFormData({ ...formData, scenario: e.target.value })
              }
              required
              disabled={loading}
            />

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Zone (optional)
              </label>
              <select
                className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                value={formData.zoneId}
                onChange={(e) =>
                  setFormData({ ...formData, zoneId: e.target.value })
                }
                disabled={loading}
              >
                <option value="">All zones</option>
                {getZones().map((zone) => (
                  <option key={zone.id} value={zone.id}>
                    {zone.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-sm text-gray-400">
                {totalAgents} agent{totalAgents > 1 ? "s" : ""} available in total
              </p>
            </div>

            <Input
              label="Number of agents"
              type="number"
              min="1"
              max="1000"
              placeholder="50"
              value={formData.nAgents}
              onChange={(e) =>
                setFormData({ ...formData, nAgents: e.target.value })
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
              <Link href="/simulations" className="flex-1">
                <Button variant="outline" className="w-full" disabled={loading}>
                  Cancel
                </Button>
              </Link>
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? "Creating..." : "Create simulation"}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </MainLayout>
  );
}
