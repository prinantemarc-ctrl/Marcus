"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import MainLayout from "@/components/Layout/MainLayout";
import Card from "@/components/UI/Card";
import Button from "@/components/UI/Button";
import Input from "@/components/UI/Input";
import Textarea from "@/components/UI/Textarea";
import GenerationModal from "@/components/UI/GenerationModal";
import { getZones } from "@/lib/core/storage";
import { runPoll } from "@/lib/core/poll";
import { getLLMConfig, isConfigValid } from "@/lib/core/config";
import { ArrowLeftIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import type { PollConfig, PollOption } from "@/types";

export default function NewPollPage() {
  const router = useRouter();
  const [zones, setZones] = useState<Array<{ id: string; name: string }>>([]);
  const [formData, setFormData] = useState({
    title: "",
    question: "",
    zoneId: "",
    responseMode: "choice" as "choice" | "ranking" | "scoring",
  });
  const [options, setOptions] = useState<PollOption[]>([
    { id: `opt_${Date.now()}_1`, name: "", description: "" },
    { id: `opt_${Date.now()}_2`, name: "", description: "" },
  ]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Generation modal state
  const [showModal, setShowModal] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);
  const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0 });
  const [generatedItems, setGeneratedItems] = useState<Array<{ title: string; content: string }>>([]);

  const generationSteps = [
    { label: "Preparing poll", status: "pending" as const },
    { label: "Loading agents from zone", status: "pending" as const },
    { label: "Generating poll responses", status: "pending" as const },
    { label: "Calculating statistics", status: "pending" as const },
    { label: "Saving poll results", status: "pending" as const },
  ];

  useEffect(() => {
    const zonesData = getZones();
    setZones(zonesData);
    if (zonesData.length > 0 && !formData.zoneId) {
      setFormData({ ...formData, zoneId: zonesData[0].id });
    }
  }, []);

  const handleAddOption = () => {
    setOptions([
      ...options,
      { id: `opt_${Date.now()}_${options.length + 1}`, name: "", description: "" },
    ]);
  };

  const handleRemoveOption = (id: string) => {
    if (options.length <= 2) {
      setError("You need at least 2 options");
      return;
    }
    setOptions(options.filter((opt) => opt.id !== id));
  };

  const handleOptionChange = (id: string, field: "name" | "description", value: string) => {
    setOptions(
      options.map((opt) => (opt.id === id ? { ...opt, [field]: value } : opt))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    setShowModal(true);
    setGenerationStep(0);
    setGeneratedItems([]);
    setGenerationProgress({ current: 0, total: 100 });

    // Validation
    if (!formData.title.trim()) {
      setError("Title is required");
      setLoading(false);
      setShowModal(false);
      return;
    }
    if (!formData.question.trim()) {
      setError("Question is required");
      setLoading(false);
      setShowModal(false);
      return;
    }
    if (!formData.zoneId) {
      setError("Zone is required");
      setLoading(false);
      setShowModal(false);
      return;
    }

    const validOptions = options.filter((opt) => opt.name.trim() !== "");
    if (validOptions.length < 2) {
      setError("You need at least 2 valid options");
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
      const config: PollConfig = {
        question: formData.question.trim(),
        options: validOptions.map((opt) => ({
          id: opt.id,
          name: opt.name.trim(),
          description: opt.description?.trim() || undefined,
        })),
        responseMode: formData.responseMode,
        zoneId: formData.zoneId,
      };

      await runPoll(
        formData.title.trim(),
        config,
        llmConfig,
        (stage, current, total, item) => {
          setGenerationProgress({ current, total });

          if (stage.includes("Preparing")) {
            setGenerationStep(0);
          } else if (stage.includes("Loading")) {
            setGenerationStep(1);
          } else if (stage.includes("Generating")) {
            setGenerationStep(2);
            if (item) {
              setGeneratedItems((prev) => [
                ...prev,
                {
                  title: item.agentName,
                  content: item.response,
                },
              ]);
            }
          } else if (stage.includes("Calculating")) {
            setGenerationStep(3);
          } else if (stage.includes("Saving")) {
            setGenerationStep(4);
          } else if (stage.includes("Complete")) {
            setGenerationStep(4);
          }
        }
      );

      setTimeout(() => {
        setLoading(false);
        router.push("/polls");
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error creating poll");
      setLoading(false);
      setShowModal(false);
    }
  };

  if (zones.length === 0) {
    return (
      <MainLayout>
        <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
          <Link href="/polls">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeftIcon className="w-4 h-4 mr-2 inline" />
              Back
            </Button>
          </Link>
          <Card>
            <div className="text-center py-12">
              <p className="text-gray-400 mb-4">
                You must first create a zone with agents
              </p>
              <Link href="/zones/new">
                <Button>Create a zone</Button>
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
            router.push("/polls");
          }
        }}
        title="Running Poll"
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
          router.push("/polls");
        }}
      />

      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
        <Link href="/polls">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeftIcon className="w-4 h-4 mr-2 inline" />
            Back
          </Button>
        </Link>

        <Card gradient>
          <h1 className="text-2xl font-bold text-white mb-6">Create a new poll</h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label="Poll title"
              placeholder="e.g., Name preference test"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              required
              disabled={loading}
            />

            <Textarea
              label="Question"
              placeholder="What would you like to test?"
              rows={3}
              value={formData.question}
              onChange={(e) =>
                setFormData({ ...formData, question: e.target.value })
              }
              required
              disabled={loading}
            />

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Zone
              </label>
              <select
                className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                value={formData.zoneId}
                onChange={(e) =>
                  setFormData({ ...formData, zoneId: e.target.value })
                }
                required
                disabled={loading}
              >
                {zones.map((zone) => (
                  <option key={zone.id} value={zone.id}>
                    {zone.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Response mode
              </label>
              <select
                className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                value={formData.responseMode}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    responseMode: e.target.value as "choice" | "ranking" | "scoring",
                  })
                }
                disabled={loading}
              >
                <option value="choice">Choice (single selection)</option>
                <option value="ranking">Ranking (order preferences)</option>
                <option value="scoring">Scoring (rate each option 0-100)</option>
              </select>
              <p className="text-xs text-gray-400 mt-1">
                {formData.responseMode === "choice" &&
                  "Agents will choose one option"}
                {formData.responseMode === "ranking" &&
                  "Agents will rank all options from most to least preferred"}
                {formData.responseMode === "scoring" &&
                  "Agents will score each option from 0 to 100"}
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-300">
                  Options
                </label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddOption}
                  disabled={loading}
                >
                  <PlusIcon className="w-4 h-4 mr-1 inline" />
                  Add option
                </Button>
              </div>
              <div className="space-y-3">
                {options.map((option, index) => (
                  <div
                    key={option.id}
                    className="p-4 rounded-lg bg-white/5 border border-white/10"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 space-y-2">
                        <Input
                          placeholder={`Option ${index + 1} name`}
                          value={option.name}
                          onChange={(e) =>
                            handleOptionChange(option.id, "name", e.target.value)
                          }
                          required
                          disabled={loading}
                        />
                        <Input
                          placeholder="Description (optional)"
                          value={option.description}
                          onChange={(e) =>
                            handleOptionChange(
                              option.id,
                              "description",
                              e.target.value
                            )
                          }
                          disabled={loading}
                        />
                      </div>
                      {options.length > 2 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveOption(option.id)}
                          disabled={loading}
                        >
                          <TrashIcon className="w-4 h-4 text-red-400" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <p className="text-sm text-blue-300">
                <strong>Note:</strong> Make sure you have configured your LLM in{" "}
                <Link href="/settings" className="underline">
                  settings
                </Link>
                . All agents in the selected zone will participate in this poll.
              </p>
            </div>

            <div className="flex gap-4 pt-4">
              <Link href="/polls" className="flex-1">
                <Button variant="outline" className="w-full" disabled={loading}>
                  Cancel
                </Button>
              </Link>
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? "Running poll..." : "Run poll"}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </MainLayout>
  );
}
