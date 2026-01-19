"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";

export type GenerationType = "zone" | "cluster" | "agent" | "simulation" | "poll";

export interface GenerationItem {
  title: string;
  content: string;
}

export interface GenerationState {
  id: string;
  type: GenerationType;
  title: string;
  isActive: boolean;
  isMinimized: boolean;
  step: number;
  totalSteps: number;
  progress: { current: number; total: number };
  currentStepLabel: string;
  items: GenerationItem[];
  steps: Array<{ label: string; status: "pending" | "active" | "completed" }>;
  error?: string;
  completedAt?: string;
}

interface GenerationContextType {
  generations: Map<string, GenerationState>;
  activeGenerationId: string | null;
  
  // Start a new generation
  startGeneration: (
    type: GenerationType,
    title: string,
    steps: string[]
  ) => string;
  
  // Update generation progress
  updateGeneration: (
    id: string,
    updates: Partial<{
      step: number;
      progress: { current: number; total: number };
      currentStepLabel: string;
      items: GenerationItem[];
    }>
  ) => void;
  
  // Add item to generation
  addGenerationItem: (id: string, item: GenerationItem) => void;
  
  // Complete generation
  completeGeneration: (id: string) => void;
  
  // Fail generation
  failGeneration: (id: string, error: string) => void;
  
  // Minimize/maximize
  minimizeGeneration: (id: string) => void;
  maximizeGeneration: (id: string) => void;
  
  // Remove generation
  removeGeneration: (id: string) => void;
  
  // Get generation for a specific page type
  getGenerationForType: (type: GenerationType) => GenerationState | null;
}

const GenerationContext = createContext<GenerationContextType | null>(null);

export function GenerationProvider({ children }: { children: ReactNode }) {
  const [generations, setGenerations] = useState<Map<string, GenerationState>>(new Map());
  const [activeGenerationId, setActiveGenerationId] = useState<string | null>(null);

  const startGeneration = useCallback((
    type: GenerationType,
    title: string,
    stepLabels: string[]
  ): string => {
    const id = `gen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const newGeneration: GenerationState = {
      id,
      type,
      title,
      isActive: true,
      isMinimized: false,
      step: 0,
      totalSteps: stepLabels.length,
      progress: { current: 0, total: 100 },
      currentStepLabel: stepLabels[0] || "Starting...",
      items: [],
      steps: stepLabels.map((label, i) => ({
        label,
        status: i === 0 ? "active" : "pending",
      })),
    };

    setGenerations(prev => {
      const next = new Map(prev);
      next.set(id, newGeneration);
      return next;
    });
    setActiveGenerationId(id);

    return id;
  }, []);

  const updateGeneration = useCallback((
    id: string,
    updates: Partial<{
      step: number;
      progress: { current: number; total: number };
      currentStepLabel: string;
      items: GenerationItem[];
    }>
  ) => {
    setGenerations(prev => {
      const gen = prev.get(id);
      if (!gen) return prev;

      const next = new Map(prev);
      const updatedGen = { ...gen };

      if (updates.step !== undefined) {
        updatedGen.step = updates.step;
        updatedGen.steps = gen.steps.map((s, i) => ({
          ...s,
          status: i < updates.step! ? "completed" : i === updates.step! ? "active" : "pending",
        }));
      }
      if (updates.progress) updatedGen.progress = updates.progress;
      if (updates.currentStepLabel) updatedGen.currentStepLabel = updates.currentStepLabel;
      if (updates.items) updatedGen.items = updates.items;

      next.set(id, updatedGen);
      return next;
    });
  }, []);

  const addGenerationItem = useCallback((id: string, item: GenerationItem) => {
    setGenerations(prev => {
      const gen = prev.get(id);
      if (!gen) return prev;

      const next = new Map(prev);
      next.set(id, {
        ...gen,
        items: [...gen.items, item],
      });
      return next;
    });
  }, []);

  const completeGeneration = useCallback((id: string) => {
    setGenerations(prev => {
      const gen = prev.get(id);
      if (!gen) return prev;

      const next = new Map(prev);
      next.set(id, {
        ...gen,
        isActive: false,
        step: gen.totalSteps,
        progress: { current: 100, total: 100 },
        currentStepLabel: "Complete!",
        completedAt: new Date().toISOString(),
        steps: gen.steps.map(s => ({ ...s, status: "completed" as const })),
      });
      return next;
    });

    // Auto-remove after 10 seconds
    setTimeout(() => {
      setGenerations(prev => {
        const next = new Map(prev);
        next.delete(id);
        return next;
      });
      setActiveGenerationId(prev => prev === id ? null : prev);
    }, 10000);
  }, []);

  const failGeneration = useCallback((id: string, error: string) => {
    setGenerations(prev => {
      const gen = prev.get(id);
      if (!gen) return prev;

      const next = new Map(prev);
      next.set(id, {
        ...gen,
        isActive: false,
        error,
        completedAt: new Date().toISOString(),
      });
      return next;
    });
  }, []);

  const minimizeGeneration = useCallback((id: string) => {
    setGenerations(prev => {
      const gen = prev.get(id);
      if (!gen) return prev;

      const next = new Map(prev);
      next.set(id, { ...gen, isMinimized: true });
      return next;
    });
  }, []);

  const maximizeGeneration = useCallback((id: string) => {
    setGenerations(prev => {
      const gen = prev.get(id);
      if (!gen) return prev;

      const next = new Map(prev);
      next.set(id, { ...gen, isMinimized: false });
      return next;
    });
    setActiveGenerationId(id);
  }, []);

  const removeGeneration = useCallback((id: string) => {
    setGenerations(prev => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
    setActiveGenerationId(prev => prev === id ? null : prev);
  }, []);

  const getGenerationForType = useCallback((type: GenerationType): GenerationState | null => {
    for (const gen of generations.values()) {
      if (gen.type === type && gen.isActive) {
        return gen;
      }
    }
    return null;
  }, [generations]);

  return (
    <GenerationContext.Provider
      value={{
        generations,
        activeGenerationId,
        startGeneration,
        updateGeneration,
        addGenerationItem,
        completeGeneration,
        failGeneration,
        minimizeGeneration,
        maximizeGeneration,
        removeGeneration,
        getGenerationForType,
      }}
    >
      {children}
    </GenerationContext.Provider>
  );
}

export function useGeneration() {
  const context = useContext(GenerationContext);
  if (!context) {
    throw new Error("useGeneration must be used within a GenerationProvider");
  }
  return context;
}
