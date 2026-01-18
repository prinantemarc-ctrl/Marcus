"use client";

import { CheckCircleIcon } from "@heroicons/react/24/solid";
import { ClockIcon } from "@heroicons/react/24/outline";

interface Step {
  label: string;
  status: "pending" | "active" | "completed";
}

interface ProgressStepsProps {
  steps: Step[];
  currentStep: number;
}

export default function ProgressSteps({ steps, currentStep }: ProgressStepsProps) {
  return (
    <div className="space-y-2 sm:space-y-3 md:space-y-4">
      {steps.map((step, index) => {
        const isActive = index === currentStep;
        const isCompleted = index < currentStep;
        const isPending = index > currentStep;

        return (
          <div
            key={index}
            style={isActive ? { 
              backgroundColor: "rgba(102, 126, 234, 0.2)", 
              borderColor: "#667eea" 
            } : undefined}
            className={`
              flex items-center gap-2 sm:gap-3 md:gap-4 p-2 sm:p-3 md:p-4 rounded-lg transition-all duration-300
              ${
                isActive
                  ? "border-2 scale-[1.02] sm:scale-105"
                  : isCompleted
                  ? "bg-green-500/10 border border-green-500/30"
                  : "bg-white/5 border border-white/10 opacity-50"
              }
            `}
          >
            <div
              style={isActive ? { backgroundColor: "#667eea" } : undefined}
              className={`
                w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center flex-shrink-0
                transition-all duration-300
                ${
                  isCompleted
                    ? "bg-green-500 text-white"
                    : isActive
                    ? "text-white animate-pulse"
                    : "bg-gray-600 text-gray-400"
                }
              `}
            >
              {isCompleted ? (
                <CheckCircleIcon className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
              ) : isActive ? (
                <div className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <ClockIcon className="w-4 h-4 sm:w-4.5 sm:h-4.5 md:w-5 md:h-5" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p
                className={`
                  font-medium transition-all duration-300 text-sm sm:text-base
                  ${isActive ? "text-white sm:text-lg" : isCompleted ? "text-green-300" : "text-gray-400"}
                `}
              >
                {step.label}
              </p>
              {isActive && (
                <div className="mt-1 sm:mt-2 w-full bg-white/10 rounded-full h-1 sm:h-1.5 overflow-hidden">
                  <div
                    className="h-full rounded-full animate-pulse"
                    style={{ 
                      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                      animation: "shimmer 2s infinite"
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
