"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import MainLayout from "@/components/Layout/MainLayout";
import Card from "@/components/UI/Card";
import Button from "@/components/UI/Button";
import { getPoll } from "@/lib/core/poll";
import type { PollResult } from "@/types";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import ProgressBar from "@/components/UI/ProgressBar";

export default function PollDetailPage() {
  const params = useParams();
  const [poll, setPoll] = useState<PollResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id && typeof params.id === "string") {
      const pollData = getPoll(params.id);
      setPoll(pollData);
      setLoading(false);
    }
  }, [params.id]);

  if (loading) {
    return (
      <MainLayout>
        <div className="animate-fade-in">
          <p className="text-gray-400">Loading...</p>
        </div>
      </MainLayout>
    );
  }

  if (!poll) {
    return (
      <MainLayout>
        <div className="animate-fade-in">
          <p className="text-red-400">Poll not found</p>
          <Link href="/polls">
            <Button className="mt-4">Back to polls</Button>
          </Link>
        </div>
      </MainLayout>
    );
  }

  const totalResponses = poll.responses.length;
  const getOptionName = (optionId: string) => {
    return poll.options.find((opt) => opt.id === optionId)?.name || optionId;
  };

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <Link href="/polls">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeftIcon className="w-4 h-4 mr-2 inline" />
            Back to polls
          </Button>
        </Link>

        {/* Header */}
        <Card gradient>
          <h1 className="text-3xl font-bold text-white mb-2">{poll.title}</h1>
          <p className="text-gray-400 mb-4 text-lg">{poll.question}</p>
          <div className="flex items-center gap-4 text-sm text-gray-400">
            <span className="px-3 py-1 rounded-full bg-primary-500/20 text-primary-300">
              {poll.responseMode}
            </span>
            <span>{poll.options.length} options</span>
            <span>{totalResponses} responses</span>
            <span>
              {new Date(poll.createdAt).toLocaleDateString("en-US", {
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        </Card>

        {/* Overall Statistics */}
        <Card>
          <h2 className="text-xl font-semibold text-white mb-4">
            Overall Results
          </h2>

          {poll.responseMode === "choice" && poll.statistics.overall.choice && (
            <div className="space-y-4">
              {Object.entries(poll.statistics.overall.choice)
                .sort(([, a], [, b]) => b - a)
                .map(([optionId, count]) => {
                  const percentage = (count / totalResponses) * 100;
                  return (
                    <div key={optionId} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-white font-medium">
                          {getOptionName(optionId)}
                        </span>
                        <span className="text-gray-400">
                          {count} votes ({percentage.toFixed(1)}%)
                        </span>
                      </div>
                      <ProgressBar
                        current={count}
                        total={totalResponses}
                        showPercentage={false}
                      />
                    </div>
                  );
                })}
            </div>
          )}

          {poll.responseMode === "ranking" && poll.statistics.overall.ranking && (
            <div className="space-y-4">
              {poll.statistics.overall.ranking.map((item, index) => (
                <div
                  key={item.optionId}
                  className="p-4 rounded-lg bg-white/5 border border-white/10"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-bold text-primary-500">
                        #{index + 1}
                      </span>
                      <span className="text-white font-medium text-lg">
                        {getOptionName(item.optionId)}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-400">
                        Avg rank: {item.averageRank.toFixed(2)}
                      </div>
                      <div className="text-sm text-gray-400">
                        First choice: {item.firstChoiceCount} (
                        {((item.firstChoiceCount / totalResponses) * 100).toFixed(1)}%)
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {poll.responseMode === "scoring" && poll.statistics.overall.scoring && (
            <div className="space-y-4">
              {Object.entries(poll.statistics.overall.scoring)
                .sort(([, a], [, b]) => b.averageScore - a.averageScore)
                .map(([optionId, stats]) => (
                  <div
                    key={optionId}
                    className="p-4 rounded-lg bg-white/5 border border-white/10"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-white font-medium text-lg">
                        {getOptionName(optionId)}
                      </span>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary-500">
                          {stats.averageScore.toFixed(1)}
                        </div>
                        <div className="text-xs text-gray-400">
                          Range: {stats.minScore} - {stats.maxScore}
                        </div>
                      </div>
                    </div>
                    <ProgressBar
                      current={stats.averageScore}
                      total={100}
                      showPercentage={false}
                    />
                  </div>
                ))}
            </div>
          )}
        </Card>

        {/* By Cluster Statistics */}
        <Card>
          <h2 className="text-xl font-semibold text-white mb-4">
            Results by Cluster
          </h2>
          <div className="space-y-6">
            {poll.clustersSnapshot.map((cluster) => {
              const clusterStats = poll.statistics.byCluster[cluster.id];
              if (!clusterStats) return null;

              const clusterResponses = poll.responses.filter(
                (r) => r.clusterId === cluster.id
              );
              const clusterTotal = clusterResponses.length;

              return (
                <div
                  key={cluster.id}
                  className="p-4 rounded-lg bg-white/5 border border-white/10"
                >
                  <h3 className="text-lg font-semibold text-white mb-3">
                    {cluster.name} ({clusterTotal} responses, {cluster.weight}%)
                  </h3>

                  {poll.responseMode === "choice" && clusterStats.choice && (
                    <div className="space-y-2">
                      {Object.entries(clusterStats.choice)
                        .sort(([, a], [, b]) => b - a)
                        .map(([optionId, count]) => {
                          const percentage = (count / clusterTotal) * 100;
                          return (
                            <div key={optionId} className="space-y-1">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-300">
                                  {getOptionName(optionId)}
                                </span>
                                <span className="text-gray-400">
                                  {count} ({percentage.toFixed(1)}%)
                                </span>
                              </div>
                              <div className="w-full bg-white/5 rounded-full h-1.5">
                                <div
                                  className="bg-primary-500 h-1.5 rounded-full transition-all duration-300"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}

                  {poll.responseMode === "ranking" && clusterStats.ranking && (
                    <div className="space-y-2">
                      {clusterStats.ranking.map((item, index) => (
                        <div
                          key={item.optionId}
                          className="flex items-center justify-between text-sm p-2 rounded bg-white/5"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-primary-500 font-bold">
                              #{index + 1}
                            </span>
                            <span className="text-gray-300">
                              {getOptionName(item.optionId)}
                            </span>
                          </div>
                          <div className="text-gray-400">
                            Avg: {item.averageRank.toFixed(2)} | First:{" "}
                            {item.firstChoiceCount}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {poll.responseMode === "scoring" && clusterStats.scoring && (
                    <div className="space-y-2">
                      {Object.entries(clusterStats.scoring)
                        .sort(([, a], [, b]) => b.averageScore - a.averageScore)
                        .map(([optionId, stats]) => (
                          <div
                            key={optionId}
                            className="flex items-center justify-between text-sm p-2 rounded bg-white/5"
                          >
                            <span className="text-gray-300">
                              {getOptionName(optionId)}
                            </span>
                            <div className="flex items-center gap-3">
                              <span className="text-primary-500 font-bold">
                                {stats.averageScore.toFixed(1)}
                              </span>
                              <span className="text-gray-400 text-xs">
                                {stats.minScore}-{stats.maxScore}
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        {/* Demographic Analysis */}
        {poll.statistics.byDemographics && (
          <Card>
            <h2 className="text-xl font-semibold text-white mb-4">
              Demographic Analysis
            </h2>
            <div className="space-y-6">
              {poll.statistics.byDemographics.age && (
                <div>
                  <h3 className="text-lg font-medium text-white mb-3">By Age</h3>
                  <div className="space-y-3">
                    {Object.entries(poll.statistics.byDemographics.age).map(([ageGroup, stats]) => {
                      if (poll.responseMode === "choice" && typeof stats === "object") {
                        const total = Object.values(stats).reduce((a, b) => a + b, 0);
                        return (
                          <div key={ageGroup} className="p-3 rounded-lg bg-white/5 border border-white/10">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-white">{ageGroup}</span>
                              <span className="text-sm text-gray-400">{total} responses</span>
                            </div>
                            <div className="space-y-2">
                              {Object.entries(stats)
                                .sort(([, a], [, b]) => b - a)
                                .slice(0, 3)
                                .map(([optionId, count]) => {
                                  const percentage = (count / total) * 100;
                                  return (
                                    <div key={optionId} className="flex items-center justify-between text-sm">
                                      <span className="text-gray-300">{getOptionName(optionId)}</span>
                                      <span className="text-gray-400">{count} ({percentage.toFixed(1)}%)</span>
                                    </div>
                                  );
                                })}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>
                </div>
              )}

              {poll.statistics.byDemographics.region && (
                <div>
                  <h3 className="text-lg font-medium text-white mb-3">By Region</h3>
                  <div className="space-y-3">
                    {Object.entries(poll.statistics.byDemographics.region).map(([region, stats]) => {
                      if (poll.responseMode === "choice" && typeof stats === "object") {
                        const total = Object.values(stats).reduce((a, b) => a + b, 0);
                        return (
                          <div key={region} className="p-3 rounded-lg bg-white/5 border border-white/10">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-white">{region}</span>
                              <span className="text-sm text-gray-400">{total} responses</span>
                            </div>
                            <div className="space-y-2">
                              {Object.entries(stats)
                                .sort(([, a], [, b]) => b - a)
                                .slice(0, 3)
                                .map(([optionId, count]) => {
                                  const percentage = (count / total) * 100;
                                  return (
                                    <div key={optionId} className="flex items-center justify-between text-sm">
                                      <span className="text-gray-300">{getOptionName(optionId)}</span>
                                      <span className="text-gray-400">{count} ({percentage.toFixed(1)}%)</span>
                                    </div>
                                  );
                                })}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>
                </div>
              )}

              {poll.statistics.byDemographics.socioClass && (
                <div>
                  <h3 className="text-lg font-medium text-white mb-3">By Socio-Economic Class</h3>
                  <div className="space-y-3">
                    {Object.entries(poll.statistics.byDemographics.socioClass).map(([csp, stats]) => {
                      if (poll.responseMode === "choice" && typeof stats === "object") {
                        const total = Object.values(stats).reduce((a, b) => a + b, 0);
                        return (
                          <div key={csp} className="p-3 rounded-lg bg-white/5 border border-white/10">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-white">{csp}</span>
                              <span className="text-sm text-gray-400">{total} responses</span>
                            </div>
                            <div className="space-y-2">
                              {Object.entries(stats)
                                .sort(([, a], [, b]) => b - a)
                                .slice(0, 3)
                                .map(([optionId, count]) => {
                                  const percentage = (count / total) * 100;
                                  return (
                                    <div key={optionId} className="flex items-center justify-between text-sm">
                                      <span className="text-gray-300">{getOptionName(optionId)}</span>
                                      <span className="text-gray-400">{count} ({percentage.toFixed(1)}%)</span>
                                    </div>
                                  );
                                })}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Individual Responses */}
        <Card>
          <h2 className="text-xl font-semibold text-white mb-4">
            Individual Responses ({poll.responses.length})
          </h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {poll.responses.map((response, index) => {
              const agent = poll.panelSnapshot.find(
                (a) => a.id === response.agentId
              );
              const cluster = poll.clustersSnapshot.find(
                (c) => c.id === response.clusterId
              );

              if (!agent) return null;

              let responseDisplay = "";
              if (poll.responseMode === "choice") {
                responseDisplay = getOptionName(response.response as string);
              } else if (poll.responseMode === "ranking") {
                const ranking = response.response as string[];
                responseDisplay = ranking
                  .map((id, idx) => `${idx + 1}. ${getOptionName(id)}`)
                  .join(", ");
              } else {
                const scoring = response.response as Record<string, number>;
                responseDisplay = Object.entries(scoring)
                  .map(([id, score]) => `${getOptionName(id)}: ${score}`)
                  .join(", ");
              }

              return (
                <div
                  key={response.agentId}
                  className="p-3 rounded-lg bg-white/5 border border-white/10"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="font-medium text-white">
                        {agent.name || `Agent #${agent.agentNumber || index + 1}`}
                      </div>
                      <div className="text-xs text-gray-400">
                        {cluster?.name} • {agent.socio_demo}
                      </div>
                    </div>
                    {response.confidence !== undefined && (
                      <span className="text-xs px-2 py-1 rounded-full bg-primary-500/20 text-primary-300">
                        {response.confidence}% confidence
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-300 mt-2">
                    <strong>Response:</strong> {responseDisplay}
                  </div>
                  {response.reasoning && (
                    <div className="text-xs text-gray-400 mt-2 italic">
                      {response.reasoning}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </MainLayout>
  );
}
