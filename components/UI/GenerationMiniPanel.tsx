"use client";

import { useGeneration, GenerationType } from "@/lib/core/generationContext";
import {
  XMarkIcon,
  ArrowsPointingOutIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";

const TYPE_TO_PAGE: Record<GenerationType, string> = {
  zone: "/zones",
  cluster: "/clusters",
  agent: "/agents",
  simulation: "/simulations",
  poll: "/polls",
};

const TYPE_LABELS: Record<GenerationType, string> = {
  zone: "Zone",
  cluster: "Clusters",
  agent: "Agents",
  simulation: "Simulation",
  poll: "Poll",
};

/**
 * Minimized panel showing background generations
 * Appears in the bottom-right corner
 */
export default function GenerationMiniPanel() {
  const { generations, maximizeGeneration, removeGeneration } = useGeneration();

  // Get minimized generations
  const minimizedGenerations = Array.from(generations.values()).filter(g => g.isMinimized);

  if (minimizedGenerations.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 w-80">
      {minimizedGenerations.map((gen) => {
        const progressPercent = gen.progress.total > 0
          ? Math.round((gen.progress.current / gen.progress.total) * 100)
          : 0;

        return (
          <div
            key={gen.id}
            className="bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                {gen.isActive ? (
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                ) : gen.error ? (
                  <ExclamationCircleIcon className="w-4 h-4 text-red-400" />
                ) : (
                  <CheckCircleIcon className="w-4 h-4 text-green-400" />
                )}
                <span className="text-xs font-medium text-gray-400">
                  {TYPE_LABELS[gen.type]}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Link href={TYPE_TO_PAGE[gen.type]}>
                  <button
                    onClick={() => maximizeGeneration(gen.id)}
                    className="p-1 hover:bg-white/10 rounded transition-all"
                    title="Show full view"
                  >
                    <ArrowsPointingOutIcon className="w-4 h-4 text-gray-400" />
                  </button>
                </Link>
                {!gen.isActive && (
                  <button
                    onClick={() => removeGeneration(gen.id)}
                    className="p-1 hover:bg-white/10 rounded transition-all"
                    title="Dismiss"
                  >
                    <XMarkIcon className="w-4 h-4 text-gray-400" />
                  </button>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="p-3">
              <p className="text-sm text-white font-medium truncate mb-1">
                {gen.title}
              </p>
              <p className="text-xs text-gray-400 truncate mb-2">
                {gen.currentStepLabel}
              </p>

              {/* Progress */}
              {gen.isActive && (
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <span className="text-xs text-primary-400 font-medium">
                    {progressPercent}%
                  </span>
                </div>
              )}

              {/* Error */}
              {gen.error && (
                <p className="text-xs text-red-400 truncate">
                  {gen.error}
                </p>
              )}

              {/* Success */}
              {!gen.isActive && !gen.error && (
                <p className="text-xs text-green-400">
                  Complete! Click to view results.
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
