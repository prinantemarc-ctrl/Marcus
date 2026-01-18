"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import MainLayout from "@/components/Layout/MainLayout";
import Card from "@/components/UI/Card";
import Button from "@/components/UI/Button";
import Input from "@/components/UI/Input";
import Textarea from "@/components/UI/Textarea";
import { saveZones, getZones } from "@/lib/core/storage";
import { generateClustersForZone } from "@/lib/core/cluster";
import { getLLMConfig, isConfigValid } from "@/lib/core/config";
import type { Zone } from "@/types";
import { ZoneSchema } from "@/types";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import GenerationModal from "@/components/UI/GenerationModal";

export default function NewZonePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showClusterModal, setShowClusterModal] = useState(false);
  const [showGenerationModal, setShowGenerationModal] = useState(false);
  const [clusterCount, setClusterCount] = useState("5");
  const [useAICount, setUseAICount] = useState(false);
  const [createdZoneId, setCreatedZoneId] = useState<string | null>(null);
  const [generationStep, setGenerationStep] = useState(0);
  const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 100 });
  const [generatedItems, setGeneratedItems] = useState<Array<{ title: string; content: string }>>([]);

  const generationSteps = [
    { label: "Creating zone", status: "pending" as const },
    { label: "Preparing cluster generation", status: "pending" as const },
    { label: "Analyzing zone characteristics", status: "pending" as const },
    { label: "Generating clusters with AI", status: "pending" as const },
    { label: "Parsing and validating data", status: "pending" as const },
    { label: "Creating clusters", status: "pending" as const },
    { label: "Normalizing weights", status: "pending" as const },
    { label: "Saving to database", status: "pending" as const },
  ];

  const handleCreate = async () => {
    console.log("=== CREATE BUTTON CLICKED ===");
    console.log("Name:", name);
    console.log("Description:", description);
    
    if (isSubmitting) {
      console.log("Already submitting");
      return;
    }
    
    if (!name.trim()) {
      setError("Zone name is required");
      return;
    }
    
    setIsSubmitting(true);
    setError("");
    
    try {
      console.log("Creating zone...");
      
      const newZone: Zone = {
        id: `zone_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: name.trim(),
        description: description.trim() || undefined,
        createdAt: new Date().toISOString(),
      };
      
      console.log("Zone object:", newZone);
      
      const validatedZone = ZoneSchema.parse(newZone);
      console.log("Zone validated:", validatedZone);
      
      const zones = getZones();
      console.log("Current zones:", zones);
      
      zones.push(validatedZone);
      console.log("Pushing zone to array");
      
      saveZones(zones);
      console.log("Zones saved");
      
      // Verify
      const savedZones = getZones();
      console.log("Saved zones:", savedZones);
      
      if (!savedZones.find(z => z.id === validatedZone.id)) {
        throw new Error("Zone was not saved");
      }
      
      console.log("Zone created successfully!");
      
      // Check LLM config
      const llmConfig = getLLMConfig();
      if (!isConfigValid(llmConfig)) {
        console.log("LLM not configured, redirecting to zone page");
        window.location.href = `/zones/${validatedZone.id}`;
        return;
      }
      
      // Show modal to propose cluster generation
      setCreatedZoneId(validatedZone.id);
      setIsSubmitting(false); // Reset submitting state so the Generate button is clickable
      setShowClusterModal(true);
    } catch (err) {
      console.error("ERROR:", err);
      setError(err instanceof Error ? err.message : "Failed to create zone");
      setIsSubmitting(false);
    }
  };

  const handleGenerateClusters = async () => {
    if (!createdZoneId) return;
    
    const llmConfig = getLLMConfig();
    if (!isConfigValid(llmConfig)) {
      setError("Invalid LLM configuration. Please configure the LLM in settings.");
      return;
    }
    
    const count = useAICount ? undefined : parseInt(clusterCount);
    if (!useAICount && (isNaN(count!) || count! < 1 || count! > 20)) {
      setError("Number of clusters must be between 1 and 20");
      return;
    }
    
    setShowClusterModal(false);
    setShowGenerationModal(true);
    setGenerationStep(0);
    setGeneratedItems([]);
    setGenerationProgress({ current: 0, total: 100 });
    setError("");
    
    try {
      const zone = getZones().find(z => z.id === createdZoneId);
      if (!zone) {
        throw new Error("Zone not found");
      }
      
      // Use AI-determined count (default 5) or user-specified count
      const finalCount = useAICount ? 5 : count!;
      
      await generateClustersForZone(
        zone.id,
        zone.name,
        llmConfig,
        finalCount,
        zone.description,
        (stage, current, total, item) => {
          setGenerationProgress({ current, total });
          
          if (stage.includes("Preparing")) {
            setGenerationStep(1);
          } else if (stage.includes("Analyzing")) {
            setGenerationStep(2);
          } else if (stage.includes("Generating")) {
            setGenerationStep(3);
          } else if (stage.includes("Parsing")) {
            setGenerationStep(4);
          } else if (stage.includes("Creating")) {
            setGenerationStep(5);
            if (item) {
              setGeneratedItems((prev) => [
                ...prev,
                {
                  title: item.name,
                  content: item.description.substring(0, 100) + "...",
                },
              ]);
            }
          } else if (stage.includes("Normalizing")) {
            setGenerationStep(6);
          } else if (stage.includes("Saving") || stage.includes("Complete")) {
            setGenerationStep(7);
          }
        }
      );
      
      // Small delay to show completion
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Redirect to zone detail page
      window.location.href = `/zones/${createdZoneId}`;
    } catch (err) {
      console.error("Error generating clusters:", err);
      setError(err instanceof Error ? err.message : "Failed to generate clusters");
      setShowGenerationModal(false);
    }
  };

  const handleSkipClusterGeneration = () => {
    if (createdZoneId) {
      window.location.href = `/zones/${createdZoneId}`;
    } else {
      window.location.href = "/zones";
    }
  };

  return (
    <MainLayout>
      {/* Cluster Generation Proposal Modal */}
      {showClusterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <Card className="max-w-md w-full">
            <h2 className="text-2xl font-bold text-white mb-4">
              Generate Clusters?
            </h2>
            <p className="text-gray-400 mb-6">
              Would you like to automatically generate opinion clusters for this zone using AI?
            </p>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="flex items-center gap-3 mb-3">
                  <input
                    type="radio"
                    name="clusterOption"
                    checked={!useAICount}
                    onChange={() => setUseAICount(false)}
                    className="w-4 h-4 text-primary-500"
                  />
                  <span className="text-white">Specify number of clusters</span>
                </label>
                {!useAICount && (
                  <Input
                    type="number"
                    min="1"
                    max="20"
                    value={clusterCount}
                    onChange={(e) => setClusterCount(e.target.value)}
                    placeholder="Number of clusters (1-20)"
                    className="ml-7"
                  />
                )}
              </div>
              
              <div>
                <label className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="clusterOption"
                    checked={useAICount}
                    onChange={() => setUseAICount(true)}
                    className="w-4 h-4 text-primary-500"
                  />
                  <span className="text-white">Let AI decide the optimal number</span>
                </label>
              </div>
            </div>
            
            {error && (
              <p className="text-sm text-red-400 mb-4">{error}</p>
            )}
            
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleSkipClusterGeneration}
              >
                Skip
              </Button>
              <Button
                className="flex-1"
                onClick={handleGenerateClusters}
                disabled={!createdZoneId}
              >
                Generate Clusters
              </Button>
            </div>
          </Card>
        </div>
      )}
      
      {/* Generation Progress Modal */}
      <GenerationModal
        isOpen={showGenerationModal}
        onClose={() => {
          // Don't allow closing during generation
          if (isSubmitting) return;
          setShowGenerationModal(false);
        }}
        title="Generating Clusters"
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
      />
      
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
        <Link href="/zones">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeftIcon className="w-4 h-4 mr-2 inline" />
            Back
          </Button>
        </Link>

        <Card gradient>
          <h1 className="text-2xl font-bold text-white mb-6">
            Create a new zone
          </h1>

          <div className="space-y-6">
            <Input
              label="Zone name"
              placeholder="e.g., France, Europe, World..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={error && !name.trim() ? error : undefined}
              required
              disabled={isSubmitting}
            />

            <Textarea
              label="Description (optional)"
              placeholder="Describe this geographical zone..."
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSubmitting}
            />

            {error && (
              <p className="text-sm text-red-400">{error}</p>
            )}

            <div className="flex gap-4 pt-4">
              <Button
                variant="outline"
                className="flex-1"
                type="button"
                onClick={() => router.push("/zones")}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button 
                type="button"
                className="flex-1"
                disabled={isSubmitting}
                onClick={handleCreate}
              >
                {isSubmitting ? "Creating..." : "Create zone"}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </MainLayout>
  );
}
