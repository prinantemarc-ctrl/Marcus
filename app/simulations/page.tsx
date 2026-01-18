"use client";

import { useEffect, useState } from "react";
import MainLayout from "@/components/Layout/MainLayout";
import Card from "@/components/UI/Card";
import Button from "@/components/UI/Button";
import { getAllSimulations, deleteSimulation } from "@/lib/core/storage";
import type { Simulation } from "@/types";
import Link from "next/link";
import { PlusIcon, TrashIcon, PlayIcon } from "@heroicons/react/24/outline";

export default function SimulationsPage() {
  const [simulations, setSimulations] = useState<Simulation[]>([]);

  useEffect(() => {
    loadSimulations();
  }, []);

  const loadSimulations = () => {
    setSimulations(getAllSimulations());
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this simulation?")) {
      deleteSimulation(id);
      loadSimulations();
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Simulations</h1>
            <p className="text-gray-400 mt-1">
              Manage your opinion simulations
            </p>
          </div>
          <Link href="/simulations/new">
            <Button>
              <PlusIcon className="w-5 h-5 mr-2 inline" />
              New Simulation
            </Button>
          </Link>
        </div>

        {/* Simulations Grid */}
        {simulations.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <p className="text-gray-400 mb-4">No simulations created</p>
              <Link href="/simulations/new">
                <Button>Create your first simulation</Button>
              </Link>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {simulations.map((simulation) => (
              <Card key={simulation.id} hover>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-2">
                      {simulation.title}
                    </h3>
                    <p className="text-gray-400 text-sm line-clamp-2 mb-4">
                      {simulation.scenario}
                    </p>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-gray-400">
                        {simulation.panelSnapshot.length} agent{simulation.panelSnapshot.length > 1 ? "s" : ""}
                      </span>
                      <span className="text-gray-400">
                        {simulation.results.length} result{simulation.results.length > 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-white/10">
                    <span className="text-xs text-gray-500">
                      {new Date(simulation.createdAt).toLocaleDateString("en-US")}
                    </span>
                    <div className="flex gap-2">
                      <Link href={`/simulations/${simulation.id}`}>
                        <Button variant="primary" size="sm">
                          <PlayIcon className="w-4 h-4 mr-1" />
                          View
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(simulation.id)}
                      >
                        <TrashIcon className="w-4 h-4 text-red-400" />
                      </Button>
                    </div>
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
