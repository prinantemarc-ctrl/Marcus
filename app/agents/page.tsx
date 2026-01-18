"use client";

import { useEffect, useState } from "react";
import MainLayout from "@/components/Layout/MainLayout";
import Card from "@/components/UI/Card";
import Button from "@/components/UI/Button";
import { getAllAgents, getClusters } from "@/lib/core/storage";
import type { Agent } from "@/types";
import Link from "next/link";
import { PlusIcon } from "@heroicons/react/24/outline";

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [clusters, setClusters] = useState<Record<string, string>>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const allAgents = getAllAgents();
    const agentsList: Agent[] = [];
    Object.values(allAgents).forEach((clusterAgents) => {
      agentsList.push(...clusterAgents);
    });
    setAgents(agentsList);

    const clustersData = getClusters();
    const clustersMap: Record<string, string> = {};
    clustersData.forEach((cluster) => {
      clustersMap[cluster.id] = cluster.name;
    });
    setClusters(clustersMap);
  };

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Agents</h1>
            <p className="text-gray-400 mt-1">
              Manage your AI agents ({agents.length} agent{agents.length > 1 ? "s" : ""})
            </p>
          </div>
          <Link href="/agents/new">
            <Button>
              <PlusIcon className="w-5 h-5 mr-2 inline" />
              Generate agents
            </Button>
          </Link>
        </div>

        {/* Agents List */}
        {agents.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <p className="text-gray-400 mb-4">No agents generated</p>
              <Link href="/agents/new">
                <Button>Generate your first agents</Button>
              </Link>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {agents.map((agent) => (
              <Card key={agent.id} hover>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-white">
                        {agent.name || `Agent #${agent.agentNumber || agent.id.slice(-6)}`}
                      </h3>
                      {clusters[agent.cluster_id] && (
                        <span className="text-xs px-2 py-1 rounded-full bg-primary-500/20 text-primary-300">
                          {clusters[agent.cluster_id]}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-400">Age:</span>{" "}
                        <span className="text-white">{agent.age} years</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Socio-demo:</span>{" "}
                        <span className="text-white">{agent.socio_demo}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Traits:</span>{" "}
                        <span className="text-white">
                          {agent.traits.length} trait{agent.traits.length > 1 ? "s" : ""}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400">Style:</span>{" "}
                        <span className="text-white">{agent.speaking_style}</span>
                      </div>
                    </div>
                    {agent.priors && (
                      <p className="text-gray-400 text-sm mt-3 line-clamp-2">
                        {agent.priors}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
