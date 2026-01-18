"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import ClusterSidebar from "@/components/Visualization/ClusterSidebar";
import ClusterDetailsPanel from "@/components/Visualization/ClusterDetailsPanel";
import { processSimulationToSpatialData, type SpatialCluster, type SpatialDataResponse } from "@/lib/core/spatialData";
import { getAllSimulations, getSimulation } from "@/lib/core/storage";

// Dynamic import for Three.js component to avoid SSR issues
const ThreeScene = dynamic(
  () => import("@/components/Visualization/ThreeScene"),
  { 
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-[#0a0a0f] to-[#1a1a2e] rounded-lg">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading 3D Scene...</p>
        </div>
      </div>
    )
  }
);

function VisualizationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const simulationId = searchParams.get("simulationId");

  const [data, setData] = useState<SpatialDataResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedClusterId, setSelectedClusterId] = useState<string | null>(null);
  const [simulations, setSimulations] = useState<Array<{ id: string; title: string }>>([]);
  const [selectedSimId, setSelectedSimId] = useState<string>(simulationId || "");
  const [mounted, setMounted] = useState(false);

  // Mark as mounted (client-side only)
  useEffect(() => {
    setMounted(true);
  }, []);

  // Load available simulations (client-side only)
  useEffect(() => {
    if (!mounted) return;
    
    const sims = getAllSimulations();
    console.log("[Visualization] Loaded simulations:", sims.length);
    setSimulations(sims.map(s => ({ id: s.id, title: s.title })));
    if (!simulationId && sims.length > 0) {
      setSelectedSimId(sims[0].id);
    }
  }, [mounted, simulationId]);

  // Fetch spatial data (client-side processing)
  const fetchData = useCallback((simId: string) => {
    if (!simId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      console.log("[Visualization] Fetching simulation with ID:", simId);
      const simulation = getSimulation(simId);
      console.log("[Visualization] Simulation result:", simulation ? "Found" : "Not found");
      
      if (!simulation) {
        // List all available simulations for debugging
        const allSims = getAllSimulations();
        console.log("[Visualization] Available simulations:", allSims.map(s => ({ id: s.id, title: s.title })));
        throw new Error(`Simulation not found (ID: ${simId})`);
      }
      
      console.log("[Visualization] Processing spatial data...");
      const result = processSimulationToSpatialData(simulation);
      console.log("[Visualization] Spatial data processed:", result.clusters.length, "clusters");
      setData(result);
      
      // Auto-select first cluster
      if (result.clusters.length > 0 && !selectedClusterId) {
        setSelectedClusterId(result.clusters[0].id);
      }
    } catch (err) {
      console.error("[Visualization] Error:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [selectedClusterId]);

  useEffect(() => {
    if (!mounted) return;
    
    const simId = simulationId || selectedSimId;
    console.log("[Visualization] Fetching data for simId:", simId);
    if (simId) {
      fetchData(simId);
    } else {
      setLoading(false);
    }
  }, [mounted, simulationId, selectedSimId, fetchData]);

  const handleSelectCluster = (clusterId: string) => {
    setSelectedClusterId(clusterId);
  };

  const handleNavigateCluster = (direction: "prev" | "next") => {
    if (!data || !selectedClusterId) return;
    
    const currentIndex = data.clusters.findIndex(c => c.id === selectedClusterId);
    if (direction === "prev" && currentIndex > 0) {
      setSelectedClusterId(data.clusters[currentIndex - 1].id);
    } else if (direction === "next" && currentIndex < data.clusters.length - 1) {
      setSelectedClusterId(data.clusters[currentIndex + 1].id);
    }
  };

  const handleRefresh = () => {
    const simId = simulationId || selectedSimId;
    if (simId) {
      setSelectedClusterId(null);
      fetchData(simId);
    }
  };

  const handleDownload = () => {
    if (!data) return;
    
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${data.metadata.title.replace(/\s+/g, "_")}_spatial_data.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleResetView = () => {
    // Force re-render of Three.js scene
    setData(prev => prev ? { ...prev } : null);
  };

  const handleSimulationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSimId = e.target.value;
    setSelectedSimId(newSimId);
    setSelectedClusterId(null);
    router.push(`/clusters/visualization?simulationId=${newSimId}`);
  };

  const selectedCluster = data?.clusters.find(c => c.id === selectedClusterId) || null;
  const selectedClusterIndex = data?.clusters.findIndex(c => c.id === selectedClusterId) ?? -1;

  // No simulation selected state (only show after mounted and loading is done)
  if (mounted && !loading && !simulationId && !selectedSimId && simulations.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#0a0a0f]">
        <div className="text-center p-8">
          <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">No Simulations Found</h2>
          <p className="text-gray-400 mb-6">Run a simulation first to visualize clusters in 3D.</p>
          <button
            onClick={() => router.push("/simulations/new")}
            className="px-6 py-3 bg-gradient-to-r from-primary-500 to-secondary-500 text-white rounded-lg font-medium hover:opacity-90 transition-all"
          >
            Create Simulation
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[#0a0a0f] overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 border-b border-white/10 bg-black/40 backdrop-blur-md">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Left: Back button + Title */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/clusters")}
              className="p-2 rounded-lg hover:bg-white/10 transition-all"
            >
              <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
              <h1 className="text-lg font-bold text-white">3D Opinion Map</h1>
              {data && (
                <p className="text-xs text-gray-400">{data.metadata.title}</p>
              )}
            </div>
          </div>
          
          {/* Center: Simulation selector */}
          {simulations.length > 0 && (
            <select
              value={selectedSimId}
              onChange={handleSimulationChange}
              className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {simulations.map(sim => (
                <option key={sim.id} value={sim.id} className="bg-gray-900">
                  {sim.title}
                </option>
              ))}
            </select>
          )}
          
          {/* Right: Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-50 transition-all"
              title="Refresh"
            >
              <svg className={`w-5 h-5 text-gray-400 ${loading ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <button
              onClick={handleResetView}
              className="p-2 rounded-lg hover:bg-white/10 transition-all"
              title="Reset View"
            >
              <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </button>
            <button
              onClick={handleDownload}
              disabled={!data}
              className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-50 transition-all"
              title="Download JSON"
            >
              <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Error State */}
        {error && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center p-8">
              <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">Error Loading Data</h2>
              <p className="text-gray-400 mb-4">{error}</p>
              <button
                onClick={handleRefresh}
                className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-all"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && !error && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-400">Loading spatial data...</p>
            </div>
          </div>
        )}

        {/* Main Visualization Layout */}
        {data && !loading && !error && (
          <>
            {/* Left Sidebar: Cluster List (20%) */}
            <div className="w-[20%] flex-shrink-0">
              <ClusterSidebar
                clusters={data.clusters}
                selectedClusterId={selectedClusterId}
                onSelectCluster={handleSelectCluster}
                totalAgents={data.metadata.totalAgents}
              />
            </div>

            {/* Center: 3D Scene (60%) */}
            <div className="flex-1 relative">
              <ThreeScene
                clusters={data.clusters}
                bridges={data.bridges}
                selectedClusterId={selectedClusterId}
                onSelectCluster={handleSelectCluster}
              />
              
              {/* Stats overlay */}
              <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/10">
                <p className="text-xs text-gray-400">
                  {data.metadata.totalAgents} agents • {data.metadata.totalClusters} clusters
                </p>
              </div>
            </div>

            {/* Right Panel: Cluster Details (20%) */}
            <div className="w-[20%] flex-shrink-0">
              <ClusterDetailsPanel
                cluster={selectedCluster}
                clusterIndex={selectedClusterIndex}
                totalClusters={data.clusters.length}
                onNavigate={handleNavigateCluster}
                bridges={data.bridges}
                allClusters={data.clusters}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function ClusterVisualizationPage() {
  return (
    <Suspense fallback={
      <div className="h-screen flex items-center justify-center bg-[#0a0a0f]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    }>
      <VisualizationContent />
    </Suspense>
  );
}
