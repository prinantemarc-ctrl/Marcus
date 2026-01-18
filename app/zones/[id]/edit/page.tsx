"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import MainLayout from "@/components/Layout/MainLayout";
import Card from "@/components/UI/Card";
import Button from "@/components/UI/Button";
import Input from "@/components/UI/Input";
import Textarea from "@/components/UI/Textarea";
import { saveZones, getZones, getZone } from "@/lib/core/storage";
import type { Zone } from "@/types";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import Link from "next/link";

export default function EditZonePage() {
  const router = useRouter();
  const params = useParams();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id && typeof params.id === "string") {
      const zone = getZone(params.id);
      if (zone) {
        setFormData({
          name: zone.name,
          description: zone.description || "",
        });
      }
      setLoading(false);
    }
  }, [params.id]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.name.trim()) {
      setError("Zone name is required");
      return;
    }

    if (!params.id || typeof params.id !== "string") {
      setError("Invalid zone ID");
      return;
    }

    const zones = getZones();
    const zoneIndex = zones.findIndex((z) => z.id === params.id);
    
    if (zoneIndex === -1) {
      setError("Zone not found");
      return;
    }

    const updatedZone: Zone = {
      ...zones[zoneIndex],
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
    };

    zones[zoneIndex] = updatedZone;
    saveZones(zones);

    router.push("/zones");
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
        <Link href="/zones">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeftIcon className="w-4 h-4 mr-2 inline" />
            Back
          </Button>
        </Link>

        <Card gradient>
          <h1 className="text-2xl font-bold text-white mb-6">
            Edit zone
          </h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label="Zone name"
              placeholder="e.g., France, Europe, World..."
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              error={error && !formData.name.trim() ? error : undefined}
              required
            />

            <Textarea
              label="Description (optional)"
              placeholder="Describe this geographical zone..."
              rows={4}
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
            />

            {error && formData.name.trim() && (
              <p className="text-sm text-red-400">{error}</p>
            )}

            <div className="flex gap-4 pt-4">
              <Link href="/zones" className="flex-1">
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
