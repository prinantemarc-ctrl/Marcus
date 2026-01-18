"use client";

import type { SpatialCluster } from "@/lib/core/spatialData";

interface ClusterSidebarProps {
  clusters: SpatialCluster[];
  selectedClusterId: string | null;
  onSelectCluster: (id: string) => void;
  totalAgents: number;
}

function getSentimentColor(sentiment: number): string {
  if (sentiment < -0.3) return "bg-red-500";
  if (sentiment < 0.3) return "bg-yellow-500";
  return "bg-green-500";
}

function getSentimentGradient(sentiment: number): string {
  if (sentiment < -0.3) return "from-red-500 to-red-600";
  if (sentiment < 0.3) return "from-yellow-500 to-orange-500";
  return "from-green-500 to-emerald-500";
}

export default function ClusterSidebar({
  clusters,
  selectedClusterId,
  onSelectCluster,
  totalAgents,
}: ClusterSidebarProps) {
  return (
    <div className="h-full flex flex-col bg-black/40 backdrop-blur-md border-r border-white/10">
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <span className="text-white font-semibold">Clusters</span>
          </div>
          <span className="text-xs bg-white/10 text-gray-300 px-2 py-1 rounded-full">
            {clusters.length}
          </span>
        </div>
      </div>
      
      {/* Cluster List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {clusters.map((cluster, index) => {
          const isSelected = selectedClusterId === cluster.id;
          const percentage = totalAgents > 0 ? ((cluster.agentCount / totalAgents) * 100).toFixed(1) : 0;
          
          return (
            <button
              key={cluster.id}
              onClick={() => onSelectCluster(cluster.id)}
              className={`
                w-full text-left p-3 rounded-lg transition-all duration-200
                ${isSelected 
                  ? "bg-gradient-to-r from-primary-500/30 to-secondary-500/30 border border-primary-500/50" 
                  : "bg-white/5 hover:bg-white/10 border border-transparent"
                }
              `}
            >
              <div className="flex items-start gap-3">
                {/* Color indicator */}
                <div className={`
                  w-3 h-3 rounded-full mt-1 flex-shrink-0
                  ${getSentimentColor(cluster.sentiment)}
                `} />
                
                <div className="flex-1 min-w-0">
                  {/* Cluster name */}
                  <div className="flex items-center justify-between gap-2">
                    <span className={`font-medium truncate ${isSelected ? "text-white" : "text-gray-200"}`}>
                      {cluster.name}
                    </span>
                  </div>
                  
                  {/* Stats */}
                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                    <span>{cluster.agentCount} agents</span>
                    <span>•</span>
                    <span>{cluster.weight}%</span>
                  </div>
                  
                  {/* Score bar */}
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-gray-500">Score</span>
                      <span className={`font-medium ${
                        cluster.avgScore >= 70 ? "text-green-400" :
                        cluster.avgScore >= 40 ? "text-yellow-400" :
                        "text-red-400"
                      }`}>
                        {cluster.avgScore.toFixed(0)}
                      </span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${getSentimentGradient(cluster.sentiment)}`}
                        style={{ width: `${cluster.avgScore}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
      
      {/* Footer stats */}
      <div className="p-4 border-t border-white/10 bg-black/20">
        <div className="text-xs text-gray-400 space-y-1">
          <div className="flex justify-between">
            <span>Total Agents</span>
            <span className="text-white font-medium">{totalAgents}</span>
          </div>
          <div className="flex justify-between">
            <span>Clusters</span>
            <span className="text-white font-medium">{clusters.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
