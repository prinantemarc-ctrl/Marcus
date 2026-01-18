"use client";

import { useState } from "react";
import type { SpatialCluster, OpinionBridge } from "@/lib/core/spatialData";

interface ClusterDetailsPanelProps {
  cluster: SpatialCluster | null;
  clusterIndex: number;
  totalClusters: number;
  onNavigate: (direction: "prev" | "next") => void;
  bridges?: OpinionBridge[];
  allClusters?: SpatialCluster[];
}

function getSentimentLabel(sentiment: number): { label: string; color: string } {
  if (sentiment < -0.5) return { label: "VERY NEGATIVE", color: "text-red-400" };
  if (sentiment < -0.2) return { label: "NEGATIVE", color: "text-red-400" };
  if (sentiment < 0.2) return { label: "NEUTRAL", color: "text-yellow-400" };
  if (sentiment < 0.5) return { label: "POSITIVE", color: "text-green-400" };
  return { label: "VERY POSITIVE", color: "text-green-400" };
}

function getSentimentColor(sentiment: number): string {
  if (sentiment < -0.3) return "bg-red-500";
  if (sentiment < 0.3) return "bg-yellow-500";
  return "bg-green-500";
}

export default function ClusterDetailsPanel({
  cluster,
  clusterIndex,
  totalClusters,
  onNavigate,
  bridges = [],
  allClusters = [],
}: ClusterDetailsPanelProps) {
  const [activeTab, setActiveTab] = useState<"analysis" | "bridges" | "agents">("analysis");
  
  // Get bridges for this cluster
  const clusterBridges = cluster 
    ? bridges.filter(b => b.sourceId === cluster.id || b.targetId === cluster.id)
        .sort((a, b) => b.strength - a.strength)
    : [];

  if (!cluster) {
    return (
      <div className="h-full flex flex-col bg-black/40 backdrop-blur-md border-l border-white/10">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center p-6">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
              </svg>
            </div>
            <p className="text-gray-400 text-sm">Select a cluster to view details</p>
            <p className="text-gray-500 text-xs mt-1">Click on a sphere in the 3D view</p>
          </div>
        </div>
      </div>
    );
  }

  const sentimentInfo = getSentimentLabel(cluster.sentiment);

  return (
    <div className="h-full flex flex-col bg-black/40 backdrop-blur-md border-l border-white/10">
      {/* Header with Tabs */}
      <div className="border-b border-white/10">
        <div className="flex items-center justify-center gap-1 p-2">
          <button
            onClick={() => setActiveTab("analysis")}
            className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
              activeTab === "analysis"
                ? "bg-primary-500/20 text-primary-400"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            Analysis
          </button>
          <button
            onClick={() => setActiveTab("bridges")}
            className={`px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${
              activeTab === "bridges"
                ? "bg-green-500/20 text-green-400"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            Bridges
            {clusterBridges.filter(b => b.bridgeType !== "weak").length > 0 && (
              <span className="text-[10px] bg-green-500/30 text-green-400 px-1.5 py-0.5 rounded-full">
                {clusterBridges.filter(b => b.bridgeType !== "weak").length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("agents")}
            className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
              activeTab === "agents"
                ? "bg-primary-500/20 text-primary-400"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            Agents
          </button>
        </div>
      </div>
      
      {/* Navigation */}
      <div className="p-3 border-b border-white/10 flex items-center justify-between">
        <button
          onClick={() => onNavigate("prev")}
          disabled={clusterIndex <= 0}
          className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${getSentimentColor(cluster.sentiment)}`} />
          <span className="text-white text-sm">
            Cluster {clusterIndex + 1} of {totalClusters}
          </span>
        </div>
        
        <button
          onClick={() => onNavigate("next")}
          disabled={clusterIndex >= totalClusters - 1}
          className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
      
      {/* Progress dots */}
      <div className="px-4 py-2 border-b border-white/10">
        <div className="flex items-center gap-1 overflow-x-auto">
          <div 
            className="h-1 rounded-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 flex-shrink-0"
            style={{ width: `${((clusterIndex + 1) / totalClusters) * 100}%`, minWidth: "20px", maxWidth: "100%" }}
          />
          <div className="flex-1 h-1 rounded-full bg-white/10" />
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "analysis" ? (
          <div className="p-4 space-y-4">
            {/* Cluster Title */}
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-full ${getSentimentColor(cluster.sentiment)} flex items-center justify-center flex-shrink-0`}>
                <span className="text-white text-sm font-bold">{cluster.agentCount}</span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-white leading-tight">
                  {cluster.name}
                </h3>
                <p className="text-gray-400 text-sm mt-1">
                  {cluster.agentCount} posts • {((cluster.agentCount / (cluster.agentCount || 1)) * cluster.weight).toFixed(1)}% of total
                </p>
              </div>
            </div>
            
            {/* Analysis Section */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                ANALYSIS
              </h4>
              <p className="text-gray-300 text-sm leading-relaxed">
                {cluster.description || `This cluster represents ${cluster.agentCount} agents with an average sentiment score of ${cluster.avgScore.toFixed(1)}. The dominant emotion is ${cluster.dominantEmotion}.`}
              </p>
            </div>
            
            {/* Three Dimensions */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                THREE DIMENSIONS
              </h4>
              
              {/* Think */}
              <div className="p-3 rounded-lg bg-primary-500/10 border border-primary-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-primary-500/30 flex items-center justify-center">
                    <span className="text-xs font-bold text-primary-400">T</span>
                  </div>
                  <span className="text-sm font-medium text-white">What they think</span>
                </div>
                <p className="text-xs text-gray-400">{cluster.analysis.think}</p>
              </div>
              
              {/* Say */}
              <div className="p-3 rounded-lg bg-secondary-500/10 border border-secondary-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-secondary-500/30 flex items-center justify-center">
                    <span className="text-xs font-bold text-secondary-400">S</span>
                  </div>
                  <span className="text-sm font-medium text-white">What they say</span>
                </div>
                <p className="text-xs text-gray-400">{cluster.analysis.say}</p>
              </div>
              
              {/* Do */}
              <div className="p-3 rounded-lg bg-accent-500/10 border border-cyan-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-cyan-500/30 flex items-center justify-center">
                    <span className="text-xs font-bold text-cyan-400">D</span>
                  </div>
                  <span className="text-sm font-medium text-white">What they do</span>
                </div>
                <p className="text-xs text-gray-400">{cluster.analysis.do}</p>
              </div>
            </div>
            
            {/* Keywords */}
            {cluster.keywords.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  KEY TOPICS
                </h4>
                <div className="flex flex-wrap gap-2">
                  {cluster.keywords.map((keyword, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 rounded-full bg-white/10 text-gray-300 text-xs border border-white/10"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {/* Sentiment Gauge */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  SENTIMENT
                </h4>
                <span className={`text-xs font-medium ${sentimentInfo.color}`}>
                  {sentimentInfo.label}
                </span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full flex">
                  <div className="bg-red-500" style={{ width: "33.3%" }} />
                  <div className="bg-yellow-500" style={{ width: "33.3%" }} />
                  <div className="bg-green-500" style={{ width: "33.3%" }} />
                </div>
              </div>
              {/* Sentiment indicator */}
              <div className="relative h-4">
                <div 
                  className="absolute w-3 h-3 bg-white rounded-full border-2 border-gray-800 transform -translate-x-1/2"
                  style={{ left: `${((cluster.sentiment + 1) / 2) * 100}%` }}
                />
              </div>
            </div>
            
            {/* Cohesion Score */}
            <div className="p-3 rounded-lg bg-white/5 border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400">Cohesion Score</span>
                <span className={`text-sm font-bold ${
                  cluster.cohesion >= 70 ? "text-green-400" :
                  cluster.cohesion >= 40 ? "text-yellow-400" :
                  "text-red-400"
                }`}>
                  {cluster.cohesion}%
                </span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    cluster.cohesion >= 70 ? "bg-green-500" :
                    cluster.cohesion >= 40 ? "bg-yellow-500" :
                    "bg-red-500"
                  }`}
                  style={{ width: `${cluster.cohesion}%` }}
                />
              </div>
            </div>
            
            {/* Verbatims */}
            {cluster.verbatims.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  SAMPLE RESPONSES
                </h4>
                <div className="space-y-2">
                  {cluster.verbatims.slice(0, 3).map((verbatim, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg bg-white/5 border border-white/10"
                    >
                      <p className="text-xs text-gray-300 italic leading-relaxed">
                        "{verbatim.length > 150 ? verbatim.substring(0, 147) + "..." : verbatim}"
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : activeTab === "bridges" ? (
          /* Bridges Tab */
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                OPINION BRIDGES
              </h4>
              <span className="text-xs text-gray-500">
                {clusterBridges.filter(b => b.bridgeType !== "weak").length} connections
              </span>
            </div>
            
            {clusterBridges.filter(b => b.bridgeType !== "weak").length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </div>
                <p className="text-gray-400 text-sm">No strong bridges found</p>
                <p className="text-gray-500 text-xs mt-1">This cluster has distinct opinions</p>
              </div>
            ) : (
              <div className="space-y-3">
                {clusterBridges
                  .filter(b => b.bridgeType !== "weak")
                  .map((bridge, idx) => {
                    const otherClusterId = bridge.sourceId === cluster.id ? bridge.targetId : bridge.sourceId;
                    const otherCluster = allClusters.find(c => c.id === otherClusterId);
                    
                    if (!otherCluster) return null;
                    
                    return (
                      <div
                        key={idx}
                        className={`p-4 rounded-lg border ${
                          bridge.bridgeType === "strong" 
                            ? "bg-green-500/10 border-green-500/30" 
                            : "bg-yellow-500/10 border-yellow-500/30"
                        }`}
                      >
                        {/* Bridge Header */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${getSentimentColor(otherCluster.sentiment)}`} />
                            <span className="text-sm font-medium text-white">{otherCluster.name}</span>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            bridge.bridgeType === "strong"
                              ? "bg-green-500/20 text-green-400"
                              : "bg-yellow-500/20 text-yellow-400"
                          }`}>
                            {bridge.bridgeType.toUpperCase()}
                          </span>
                        </div>
                        
                        {/* Bridge Stats */}
                        <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                          <div className="p-2 rounded bg-black/20">
                            <span className="text-gray-500">Strength</span>
                            <p className="text-white font-medium">{(bridge.strength * 100).toFixed(0)}%</p>
                          </div>
                          <div className="p-2 rounded bg-black/20">
                            <span className="text-gray-500">Score Gap</span>
                            <p className="text-white font-medium">{bridge.scoreDifference.toFixed(0)} pts</p>
                          </div>
                        </div>
                        
                        {/* Shared Keywords */}
                        {bridge.sharedKeywords.length > 0 && (
                          <div className="mb-3">
                            <span className="text-[10px] text-gray-500 uppercase">Shared Topics</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {bridge.sharedKeywords.map((kw, i) => (
                                <span key={i} className="px-2 py-0.5 text-[10px] bg-white/10 text-gray-300 rounded-full">
                                  {kw}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Persuasion Strategy */}
                        <div className="p-3 rounded bg-black/30 border border-white/5">
                          <div className="flex items-center gap-2 mb-2">
                            <svg className="w-4 h-4 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                            <span className="text-[10px] text-gray-400 uppercase">How to Bridge</span>
                          </div>
                          <p className="text-xs text-gray-300 leading-relaxed">
                            {bridge.persuasionVector}
                          </p>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        ) : (
          /* Agents Tab */
          <div className="p-4 space-y-3">
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              AGENTS IN CLUSTER ({cluster.agents.length})
            </h4>
            {cluster.agents.map((agent, idx) => (
              <div
                key={agent.id}
                className="p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-sm font-medium text-white">{agent.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    agent.score >= 70 ? "bg-green-500/20 text-green-400" :
                    agent.score >= 40 ? "bg-yellow-500/20 text-yellow-400" :
                    "bg-red-500/20 text-red-400"
                  }`}>
                    {agent.score.toFixed(0)}
                  </span>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-gray-500">Emotion:</span>
                  <span className="text-xs text-gray-300">{agent.emotion}</span>
                </div>
                {agent.response && (
                  <p className="text-xs text-gray-400 italic">
                    "{agent.response.length > 100 ? agent.response.substring(0, 97) + "..." : agent.response}"
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
