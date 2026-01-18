"use client";

import { useEffect, useState } from "react";
import MainLayout from "@/components/Layout/MainLayout";
import Card from "@/components/UI/Card";
import Button from "@/components/UI/Button";
import {
  GlobeAltIcon,
  UserGroupIcon,
  CpuChipIcon,
  PlayIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";
import { getZones, getClusters, getAllAgents, getAllSimulations } from "@/lib/core/storage";
import Link from "next/link";

export default function HomePage() {
  const [stats, setStats] = useState({
    zones: 0,
    clusters: 0,
    agents: 0,
    simulations: 0,
  });

  useEffect(() => {
    const loadStats = () => {
      try {
        const zones = getZones();
        const clusters = getClusters();
        const allAgents = getAllAgents();
        const simulations = getAllSimulations();

        const totalAgents = Object.values(allAgents).reduce(
          (sum, agents) => sum + agents.length,
          0
        );

        setStats({
          zones: zones.length,
          clusters: clusters.length,
          agents: totalAgents,
          simulations: simulations.length,
        });
      } catch (error) {
        console.error("Error loading stats:", error);
      }
    };

    loadStats();
  }, []);

  const statCards = [
    {
      title: "Zones",
      value: stats.zones,
      icon: GlobeAltIcon,
      color: "from-blue-500 to-cyan-500",
      href: "/zones",
    },
    {
      title: "Clusters",
      value: stats.clusters,
      icon: UserGroupIcon,
      color: "from-purple-500 to-pink-500",
      href: "/clusters",
    },
    {
      title: "Agents",
      value: stats.agents,
      icon: CpuChipIcon,
      color: "from-orange-500 to-red-500",
      href: "/agents",
    },
    {
      title: "Simulations",
      value: stats.simulations,
      icon: PlayIcon,
      color: "from-green-500 to-emerald-500",
      href: "/simulations",
    },
  ];

  return (
    <MainLayout>
      <div className="space-y-8 animate-fade-in" style={{ position: 'relative', zIndex: 10 }}>
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-white">
            Welcome to <span className="gradient-text">Marcus</span>
          </h1>
          <p className="text-gray-400 text-lg">
            Create and manage opinion simulations with AI agents
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <Link key={stat.title} href={stat.href}>
                <Card hover className="cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-400 mb-1">{stat.title}</p>
                      <p className="text-3xl font-bold text-white">{stat.value}</p>
                    </div>
                    <div
                      className={`w-12 h-12 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center`}
                    >
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card gradient>
            <h2 className="text-xl font-semibold text-white mb-4">
              Start a new simulation
            </h2>
            <p className="text-gray-400 mb-6">
              Create a new simulation with your configured agents and clusters
            </p>
            <Link href="/simulations/new">
              <Button size="lg" className="w-full md:w-auto">
                Create simulation
                <ArrowRightIcon className="w-5 h-5 ml-2 inline" />
              </Button>
            </Link>
          </Card>

          <Card gradient>
            <h2 className="text-xl font-semibold text-white mb-4">
              Quick setup
            </h2>
            <p className="text-gray-400 mb-6">
              Configure your zones, clusters and agents to get started
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/zones/new">
                <Button variant="outline" size="md">
                  New Zone
                </Button>
              </Link>
              <Link href="/clusters/new">
                <Button variant="outline" size="md">
                  New Cluster
                </Button>
              </Link>
            </div>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <h2 className="text-xl font-semibold text-white mb-4">
            Recent activity
          </h2>
          <div className="space-y-3">
            {stats.simulations === 0 && stats.zones === 0 ? (
              <p className="text-gray-400 text-center py-8">
                No recent activity. Start by creating a zone!
              </p>
            ) : (
              <div className="space-y-2">
                {stats.zones > 0 && (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                    <span className="text-gray-300">
                      {stats.zones} zone{stats.zones > 1 ? "s" : ""} configured
                    </span>
                    <Link href="/zones">
                      <Button variant="ghost" size="sm">
                        View
                      </Button>
                    </Link>
                  </div>
                )}
                {stats.clusters > 0 && (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                    <span className="text-gray-300">
                      {stats.clusters} cluster{stats.clusters > 1 ? "s" : ""} configured
                    </span>
                    <Link href="/clusters">
                      <Button variant="ghost" size="sm">
                        View
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>
      </div>
    </MainLayout>
  );
}
