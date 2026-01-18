"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import MainLayout from "@/components/Layout/MainLayout";
import Card from "@/components/UI/Card";
import Button from "@/components/UI/Button";
import Input from "@/components/UI/Input";
import Textarea from "@/components/UI/Textarea";
import { saveClusters, getClusters, getCluster, getZones } from "@/lib/core/storage";
import type { Cluster } from "@/types";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import Link from "next/link";

export default function EditClusterPage() {
  const router = useRouter();
  const params = useParams();
  const [zones, setZones] = useState<Array<{ id: string; name: string }>>([]);
  const [formData, setFormData] = useState({
    name: "",
    description_prompt: "",
    zoneId: "",
    weight: "0",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const zonesData = getZones();
    setZones(zonesData);

    if (params.id && typeof params.id === "string") {
      const cluster = getCluster(params.id);
      if (cluster) {
        setFormData({
          name: cluster.name,
          description_prompt: cluster.description_prompt,
          zoneId: cluster.zoneId,
          weight: cluster.weight.toString(),
        });
      }
      setLoading(false);
    }
  }, [params.id]);

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

    if (!params.id || typeof params.id !== "string") {
      setError("Invalid cluster ID");
      return;
    }

    const clusters = getClusters();
    const clusterIndex = clusters.findIndex((c) => c.id === params.id);
    
    if (clusterIndex === -1) {
      setError("Cluster not found");
      return;
    }

    const updatedCluster: Cluster = {
      ...clusters[clusterIndex],
      name: formData.name.trim(),
      description_prompt: formData.description_prompt.trim(),
      zoneId: formData.zoneId,
      weight: weight,
    };

    clusters[clusterIndex] = updatedCluster;
    saveClusters(clusters);

    router.push("/clusters");
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
          <p className="text-gray-400">Loading...</p>
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
            Edit cluster
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
                Save changes
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </MainLayout>
  );
}
