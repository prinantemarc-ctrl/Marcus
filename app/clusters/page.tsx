"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MainLayout from "@/components/Layout/MainLayout";
import Card from "@/components/UI/Card";
import Button from "@/components/UI/Button";
import {
  getClusters,
  getZones,
  deleteCluster,
  getClustersByZone,
  getAgentsForCluster,
} from "@/lib/core/storage";
import { getZoneColor, getZoneGradient } from "@/lib/core/colors";
import type { Zone, Cluster } from "@/types";
import Link from "next/link";
import {
  PlusIcon,
  TrashIcon,
  PencilIcon,
  BoltIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";

export default function ClustersPage() {
  const router = useRouter();
  const [zones, setZones] = useState<Zone[]>([]);
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [error, setError] = useState("");


  useEffect(() => {
    loadData();
    
    // Reload data when page becomes visible (e.g., after navigation)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadData();
      }
    };
    
    // Also reload on focus
    const handleFocus = () => {
      loadData();
    };
    
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);
    
    // Reload periodically to catch changes from other tabs
    const interval = setInterval(() => {
      loadData();
    }, 2000);
    
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    // Auto-select first zone if available
    if (zones.length > 0 && !selectedZoneId) {
      setSelectedZoneId(zones[0].id);
    }
  }, [zones, selectedZoneId]);

  const loadData = () => {
    const zonesData = getZones();
    const clustersData = getClusters();
    setZones(zonesData);
    setClusters(clustersData);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this cluster?")) {
      deleteCluster(id);
      loadData();
    }
  };


  const selectedZoneClusters =
    selectedZoneId
      ? clusters.filter((c) => c.zoneId === selectedZoneId)
      : [];
  const selectedZone = zones.find((z) => z.id === selectedZoneId);

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Clusters</h1>
            <p className="text-gray-400 mt-1">
              Manage your opinion groups organized by zone
            </p>
          </div>
          <Link href="/clusters/new">
            <Button>
              <PlusIcon className="w-5 h-5 mr-2 inline" />
              New Cluster
            </Button>
          </Link>
        </div>

        {error && (
          <Card className="border-2 border-red-500/50">
            <p className="text-sm text-red-400">{error}</p>
          </Card>
        )}

        {/* Zones Tabs */}
        {zones.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <p className="text-gray-400 mb-4">No zones created</p>
              <p className="text-sm text-gray-500 mb-4">
                Create a zone first, then add clusters to it
              </p>
              <Link href="/zones/new">
                <Button>Create your first zone</Button>
              </Link>
            </div>
          </Card>
        ) : (
          <>
            {/* Zone Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {zones.map((zone) => {
                const zoneClusters = clusters.filter((c) => c.zoneId === zone.id);
                const totalAgents = zoneClusters.reduce(
                  (sum, cluster) => sum + getAgentsForCluster(cluster.id).length,
                  0
                );
                const isSelected = selectedZoneId === zone.id;
                const zoneColor = getZoneColor(zone.id);

                return (
                  <button
                    key={zone.id}
                    onClick={() => setSelectedZoneId(zone.id)}
                    className={`
                      flex items-center gap-3 px-6 py-4 rounded-lg transition-all duration-200 whitespace-nowrap
                      ${
                        isSelected
                          ? "bg-gradient-to-r text-white shadow-lg scale-105"
                          : "bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white"
                      }
                    `}
                    style={
                      isSelected
                        ? {
                            background: getZoneGradient(zone.id),
                          }
                        : {}
                    }
                  >
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: zoneColor.primary }}
                    />
                    <div className="text-left">
                      <div className="font-semibold">{zone.name}</div>
                      <div className="text-xs opacity-80">
                        {zoneClusters.length} cluster{zoneClusters.length !== 1 ? "s" : ""} • {totalAgents} agent{totalAgents !== 1 ? "s" : ""}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Selected Zone Content */}
            {selectedZone && (
              <div className="space-y-4">
                {/* Zone Header */}
                <Card
                  className="border-l-4"
                  style={{
                    borderLeftColor: getZoneColor(selectedZone.id).primary,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div
                        className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-xl"
                        style={{
                          background: getZoneGradient(selectedZone.id),
                        }}
                      >
                        {selectedZone.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-white">
                          {selectedZone.name}
                        </h2>
                        {selectedZone.description && (
                          <p className="text-gray-400 text-sm mt-1">
                            {selectedZone.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span>
                            {selectedZoneClusters.length} cluster
                            {selectedZoneClusters.length !== 1 ? "s" : ""}
                          </span>
                          <span>•</span>
                          <span>
                            {selectedZoneClusters.reduce(
                              (sum, cluster) =>
                                sum + getAgentsForCluster(cluster.id).length,
                              0
                            )}{" "}
                            agent
                            {selectedZoneClusters.reduce(
                              (sum, cluster) =>
                                sum + getAgentsForCluster(cluster.id).length,
                              0
                            ) !== 1
                              ? "s"
                              : ""}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/zones/${selectedZone.id}`}>
                        <Button className="flex items-center gap-2">
                          <UserGroupIcon className="w-5 h-5" />
                          Manage Zone & Generate Agents
                        </Button>
                      </Link>
                    </div>
                  </div>
                </Card>

                {/* Clusters Grid */}
                {selectedZoneClusters.length === 0 ? (
                  <Card>
                    <div className="text-center py-12">
                      <p className="text-gray-400 mb-4">
                        No clusters in this zone
                      </p>
                      <p className="text-sm text-gray-500 mb-4">
                        Clusters must belong to a zone. Create clusters for this zone.
                      </p>
                      <Link href={`/clusters/new?zoneId=${selectedZone.id}`}>
                        <Button>Create Cluster for {selectedZone.name}</Button>
                      </Link>
                    </div>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {selectedZoneClusters.map((cluster, index) => {
                      const clusterAgents = getAgentsForCluster(cluster.id);
                      const zoneColor = getZoneColor(selectedZone.id);

                      return (
                        <Card
                          key={cluster.id}
                          hover
                          className="relative border-l-4 animate-scale-in"
                          style={{
                            borderLeftColor: zoneColor.primary,
                            animationDelay: `${index * 100}ms`,
                          }}
                        >
                          <div className="space-y-4">
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <h3 className="text-lg font-semibold text-white">
                                  {cluster.name}
                                </h3>
                                <span
                                  className="text-xs px-2 py-1 rounded-full text-white font-medium"
                                  style={{
                                    backgroundColor: zoneColor.light,
                                    color: zoneColor.primary,
                                  }}
                                >
                                  {cluster.weight}%
                                </span>
                              </div>
                              <div
                                className="text-xs px-2 py-1 rounded mb-2 inline-block"
                                style={{
                                  backgroundColor: zoneColor.light,
                                  color: zoneColor.primary,
                                }}
                              >
                                {selectedZone.name}
                              </div>
                              <p className="text-gray-400 text-sm line-clamp-3 mb-2">
                                {cluster.description_prompt}
                              </p>
                              <div className="flex items-center gap-4 text-xs text-gray-500">
                                <span>
                                  {clusterAgents.length} agent
                                  {clusterAgents.length !== 1 ? "s" : ""}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between pt-4 border-t border-white/10">
                              <Link href={`/zones/${selectedZone.id}`}>
                                <Button variant="ghost" size="sm" title="View zone">
                                  <PencilIcon className="w-4 h-4" />
                                </Button>
                              </Link>
                              <div className="flex gap-2">
                                <Link href={`/clusters/${cluster.id}/edit`}>
                                  <Button variant="ghost" size="sm">
                                    <PencilIcon className="w-4 h-4" />
                                  </Button>
                                </Link>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(cluster.id)}
                                >
                                  <TrashIcon className="w-4 h-4 text-red-400" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
}
