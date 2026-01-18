"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MainLayout from "@/components/Layout/MainLayout";
import Card from "@/components/UI/Card";
import Button from "@/components/UI/Button";
import { getZones, deleteZone, getClustersByZone } from "@/lib/core/storage";
import type { Zone } from "@/types";
import Link from "next/link";
import { PlusIcon, TrashIcon, PencilIcon } from "@heroicons/react/24/outline";

export default function ZonesPage() {
  const router = useRouter();
  const [zones, setZones] = useState<Zone[]>([]);

  useEffect(() => {
    loadZones();
    // Reload zones when the page becomes visible (e.g., after navigation)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadZones();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    
    // Also reload on focus
    window.addEventListener("focus", loadZones);
    
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", loadZones);
    };
  }, []);

  const loadZones = () => {
    const loadedZones = getZones();
    console.log("Loaded zones:", loadedZones);
    setZones(loadedZones);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this zone?")) {
      deleteZone(id);
      loadZones();
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Zones</h1>
            <p className="text-gray-400 mt-1">
              Manage your geographical zones
            </p>
          </div>
          <Link href="/zones/new">
            <Button>
              <PlusIcon className="w-5 h-5 mr-2 inline" />
              New Zone
            </Button>
          </Link>
        </div>

        {/* Zones Grid */}
        {zones.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <p className="text-gray-400 mb-4">No zones created</p>
              <Link href="/zones/new">
                <Button>Create your first zone</Button>
              </Link>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {zones.map((zone) => {
              const clusterCount = getClustersByZone(zone.id).length;
              
              return (
                <Link key={zone.id} href={`/zones/${zone.id}`}>
                  <Card hover className="cursor-pointer">
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-xl font-semibold text-white mb-2">
                          {zone.name}
                        </h3>
                        {zone.description && (
                          <p className="text-gray-400 text-sm line-clamp-2 mb-2">
                            {zone.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>{clusterCount} cluster{clusterCount !== 1 ? "s" : ""}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-4 border-t border-white/10">
                        <span className="text-xs text-gray-500">
                          {zone.createdAt
                            ? new Date(zone.createdAt).toLocaleDateString("en-US")
                            : "Unknown date"}
                        </span>
                        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                          <Link href={`/zones/${zone.id}/edit`}>
                            <Button variant="ghost" size="sm">
                              <PencilIcon className="w-4 h-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(zone.id);
                            }}
                          >
                            <TrashIcon className="w-4 h-4 text-red-400" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
