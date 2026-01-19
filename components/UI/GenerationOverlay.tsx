"use client";

import { useEffect } from "react";
import { useGeneration, GenerationType } from "@/lib/core/generationContext";
import { XMarkIcon, ArrowsPointingInIcon } from "@heroicons/react/24/outline";
import { CheckCircleIcon, ExclamationCircleIcon } from "@heroicons/react/24/solid";
import Typewriter from "./Typewriter";

interface GenerationOverlayProps {
  type: GenerationType;
}

/**
 * Full-screen generation overlay that shows detailed progress
 * Displays when there's an active generation of the specified type
 */
export default function GenerationOverlay({ type }: GenerationOverlayProps) {
  const { generations, getGenerationForType, minimizeGeneration } = useGeneration();
  
  const generation = getGenerationForType(type);
  
  // Don't show if no active generation or if minimized
  if (!generation || generation.isMinimized) {
    return null;
  }

  const progressPercent = generation.progress.total > 0 
    ? Math.round((generation.progress.current / generation.progress.total) * 100)
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col bg-gray-900/95 rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div>
            <h2 className="text-2xl font-bold text-white">{generation.title}</h2>
            <p className="text-gray-400 mt-1">
              {generation.isActive ? "Generation in progress..." : generation.error ? "Generation failed" : "Generation complete!"}
            </p>
          </div>
          <button
            onClick={() => minimizeGeneration(generation.id)}
            className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-all"
            title="Minimize (continue in background)"
          >
            <ArrowsPointingInIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-gray-400">
              Step {generation.step + 1} of {generation.totalSteps}
            </span>
            <span className="text-sm font-medium text-primary-400">
              {progressPercent}%
            </span>
          </div>

          {/* Progress Bar */}
          <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-6">
            <div
              className="h-full bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Steps List */}
          <div className="space-y-3">
            {generation.steps.map((step, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className={`
                  w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-all
                  ${step.status === "completed" 
                    ? "bg-green-500 text-white" 
                    : step.status === "active"
                    ? "bg-primary-500 text-white animate-pulse"
                    : "bg-white/10 text-gray-500"
                  }
                `}>
                  {step.status === "completed" ? (
                    <CheckCircleIcon className="w-4 h-4" />
                  ) : (
                    index + 1
                  )}
                </div>
                <span className={`
                  text-sm transition-all
                  ${step.status === "completed" 
                    ? "text-green-400" 
                    : step.status === "active"
                    ? "text-white font-medium"
                    : "text-gray-500"
                  }
                `}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Generated Items */}
        <div className="flex-1 overflow-y-auto p-6">
          <h3 className="text-sm font-medium text-gray-400 mb-4">
            Generated items ({generation.items.length})
          </h3>
          
          {generation.items.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mx-auto mb-3" />
              <p className="text-gray-500 text-sm">Waiting for generation...</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {generation.items.map((item, index) => (
                <div
                  key={index}
                  className="p-4 rounded-xl bg-white/5 border border-white/10 animate-fade-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="w-6 h-6 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center text-white text-xs font-medium">
                      {index + 1}
                    </span>
                    <h4 className="text-white font-medium">{item.title}</h4>
                  </div>
                  <div className="pl-9">
                    <Typewriter
                      text={item.content}
                      speed={10}
                      className="text-gray-400 text-sm"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Error State */}
        {generation.error && (
          <div className="p-6 border-t border-red-500/20 bg-red-500/10">
            <div className="flex items-start gap-3">
              <ExclamationCircleIcon className="w-6 h-6 text-red-400 flex-shrink-0" />
              <div>
                <h4 className="text-red-400 font-medium">Generation failed</h4>
                <p className="text-red-300/70 text-sm mt-1">{generation.error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Completion State */}
        {!generation.isActive && !generation.error && (
          <div className="p-6 border-t border-green-500/20 bg-green-500/10">
            <div className="flex items-center gap-3">
              <CheckCircleIcon className="w-6 h-6 text-green-400" />
              <span className="text-green-400 font-medium">Generation complete!</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
