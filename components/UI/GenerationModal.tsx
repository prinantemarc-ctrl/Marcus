"use client";

import { useEffect, useState } from "react";
import Card from "./Card";
import ProgressSteps from "./ProgressSteps";
import ProgressBar from "./ProgressBar";
import GenerationCard from "./GenerationCard";
import Typewriter from "./Typewriter";
import Button from "./Button";
import { XMarkIcon } from "@heroicons/react/24/outline";

interface GenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  steps: Array<{ label: string; status: "pending" | "active" | "completed" }>;
  currentStep: number;
  progress?: { current: number; total: number };
  generatedItems?: Array<{ title: string; content: string }>;
  onComplete?: () => void;
}

export default function GenerationModal({
  isOpen,
  onClose,
  title,
  steps,
  currentStep,
  progress,
  generatedItems = [],
  onComplete,
}: GenerationModalProps) {
  const [showComplete, setShowComplete] = useState(false);

  useEffect(() => {
    if (currentStep >= steps.length && !showComplete) {
      setTimeout(() => {
        setShowComplete(true);
        onComplete?.();
      }, 1000);
    }
  }, [currentStep, steps.length, showComplete, onComplete]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-4xl h-full sm:h-auto sm:max-h-[90vh] flex flex-col">
        <div className="glass rounded-xl bg-gradient-to-br from-white/10 to-white/5 relative flex flex-col h-full sm:h-auto max-h-full overflow-hidden">
          <button
            onClick={onClose}
            className="absolute top-2 right-2 sm:top-4 sm:right-4 z-10 text-gray-400 hover:text-white transition-colors p-2"
          >
            <XMarkIcon className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>

          <div className="space-y-4 sm:space-y-6 overflow-y-auto flex-1 p-4 sm:p-6 pr-8 sm:pr-12">
            {/* Header */}
            <div className="pr-8 sm:pr-12">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-2">
                <Typewriter text={title} speed={50} />
              </h2>
              <div className="h-1 w-24 sm:w-32 rounded-full" style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }} />
            </div>

            {/* Progress Steps */}
            <ProgressSteps steps={steps} currentStep={currentStep} />

            {/* Progress Bar */}
            {progress && (
              <ProgressBar
                current={progress.current}
                total={progress.total}
                label="Overall progress"
              />
            )}

            {/* Generated Items */}
            {generatedItems.length > 0 && (
              <div className="space-y-2 sm:space-y-3 max-h-48 sm:max-h-64 md:max-h-96 overflow-y-auto">
                <h3 className="text-base sm:text-lg font-semibold text-white">
                  Generated Items ({generatedItems.length})
                </h3>
                <div className="space-y-1 sm:space-y-2">
                  {generatedItems.map((item, index) => (
                    <GenerationCard
                      key={index}
                      title={item.title}
                      content={item.content}
                      index={index}
                      delay={index * 200}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Completion Message */}
            {showComplete && (
              <div className="text-center py-4 sm:py-6 md:py-8 animate-scale-in">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 animate-scale-in">
                  <svg
                    className="w-6 h-6 sm:w-8 sm:h-8 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-green-400 mb-2">
                  Generation Complete!
                </h3>
                <p className="text-sm sm:text-base text-gray-400 mb-4 sm:mb-6">
                  All items have been successfully generated
                </p>
                <Button onClick={onClose} size="lg" className="w-full sm:w-auto">
                  Close
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
