"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import MainLayout from "@/components/Layout/MainLayout";
import Card from "@/components/UI/Card";
import Button from "@/components/UI/Button";
import Input from "@/components/UI/Input";
import Textarea from "@/components/UI/Textarea";
import { saveClusters, getClusters, getZones } from "@/lib/core/storage";
import type { Cluster } from "@/types";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import Link from "next/link";

export default function NewClusterPage() {
  const router = useRouter();
  const [zones, setZones] = useState<Array<{ id: string; name: string }>>([]);
  const [formData, setFormData] = useState({
    name: "",
    description_prompt: "",
    zoneId: "",
    weight: "0",
  });
  const [error, setError] = useState("");

  useEffect(() => {
    const zonesData = getZones();
    setZones(zonesData);
    
    // Check if zoneId is provided in URL params
    const urlParams = new URLSearchParams(window.location.search);
    const zoneIdParam = urlParams.get("zoneId");
    
    if (zoneIdParam && zonesData.find(z => z.id === zoneIdParam)) {
      setFormData({ ...formData, zoneId: zoneIdParam });
    } else if (zonesData.length > 0 && !formData.zoneId) {
      setFormData({ ...formData, zoneId: zonesData[0].id });
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.name.trim()) {
      setError("Cluster name is required");
      return;
    }
    if (!formData.description_prompt.trim() || formData.description_prompt.length < 10) {
      setError("Description must contain at least 10 characters");
      return;
    }
    if (!formData.zoneId) {
      setError("Please select a zone");
      return;
    }

    const weight = parseFloat(formData.weight);
    if (isNaN(weight) || weight < 0 || weight > 100) {
      setError("Weight must be between 0 and 100");
      return;
    }

    const newCluster: Cluster = {
      id: `cluster_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: formData.name.trim(),
      description_prompt: formData.description_prompt.trim(),
      zoneId: formData.zoneId,
      weight: weight,
    };

    const clusters = getClusters();
    clusters.push(newCluster);
    saveClusters(clusters);

    router.push("/clusters");
  };

  if (zones.length === 0) {
    return (
      <MainLayout>
        <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
          <Link href="/clusters">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeftIcon className="w-4 h-4 mr-2 inline" />
              Back
            </Button>
          </Link>
          <Card>
            <div className="text-center py-12">
              <p className="text-gray-400 mb-4">
                You must first create a zone
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
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
        <Link href="/clusters">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeftIcon className="w-4 h-4 mr-2 inline" />
            Back
          </Button>
        </Link>

        <Card gradient>
          <h1 className="text-2xl font-bold text-white mb-6">
            Create a new cluster
          </h1>

          <form onSubmit={handleSubmit} className="space-y-6">
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
              >
                {zones.map((zone) => (
                  <option key={zone.id} value={zone.id}>
                    {zone.name}
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="Cluster name"
              placeholder="e.g., Conservatives, Progressives..."
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
            />

            <Textarea
              label="Description / Prompt"
              placeholder="Describe the characteristics of this opinion group (minimum 10 characters)..."
              rows={6}
              value={formData.description_prompt}
              onChange={(e) =>
                setFormData({ ...formData, description_prompt: e.target.value })
              }
              required
            />

            <Input
              label="Weight (%)"
              type="number"
              min="0"
              max="100"
              step="0.1"
              placeholder="0"
              value={formData.weight}
              onChange={(e) =>
                setFormData({ ...formData, weight: e.target.value })
              }
            />

            {error && (
              <p className="text-sm text-red-400">{error}</p>
            )}

            <div className="flex gap-4 pt-4">
              <Link href="/clusters" className="flex-1">
                <Button variant="outline" className="w-full">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" className="flex-1">
                Create cluster
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </MainLayout>
  );
}
