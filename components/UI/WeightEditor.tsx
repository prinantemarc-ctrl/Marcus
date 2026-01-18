"use client";

import { useState, useEffect } from "react";
import Card from "./Card";
import Button from "./Button";
import Input from "./Input";
import { CheckIcon, XMarkIcon } from "@heroicons/react/24/outline";

interface WeightEditorProps {
  clusters: Array<{ id: string; name: string; weight: number }>;
  onSave: (weights: Map<string, number>) => void;
  onCancel: () => void;
}

export default function WeightEditor({ clusters, onSave, onCancel }: WeightEditorProps) {
  const [weights, setWeights] = useState<Map<string, number>>(new Map());
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const initialWeights = new Map<string, number>();
    clusters.forEach((cluster) => {
      initialWeights.set(cluster.id, cluster.weight);
    });
    setWeights(initialWeights);
    updateTotal(initialWeights);
  }, [clusters]);

  const updateTotal = (newWeights: Map<string, number>) => {
    const sum = Array.from(newWeights.values()).reduce((acc, val) => acc + val, 0);
    setTotal(sum);
  };

  const handleWeightChange = (clusterId: string, value: string) => {
    const numValue = Math.max(0, Math.min(100, parseInt(value) || 0));
    const newWeights = new Map(weights);
    newWeights.set(clusterId, numValue);
    setWeights(newWeights);
    updateTotal(newWeights);
  };

  const normalizeWeights = () => {
    if (total === 0) return;
    const newWeights = new Map<string, number>();
    weights.forEach((weight, id) => {
      newWeights.set(id, Math.round((weight / total) * 100));
    });
    
    // Adjust to ensure sum is exactly 100
    const currentSum = Array.from(newWeights.values()).reduce((acc, val) => acc + val, 0);
    if (clusters.length > 0 && currentSum !== 100) {
      const firstId = clusters[0].id;
      newWeights.set(firstId, newWeights.get(firstId)! + (100 - currentSum));
    }
    
    setWeights(newWeights);
    updateTotal(newWeights);
  };

  const handleSave = () => {
    if (total !== 100) {
      normalizeWeights();
      setTimeout(() => {
        onSave(weights);
      }, 100);
    } else {
      onSave(weights);
    }
  };

  return (
    <Card className="border-2 border-primary-500/50">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Edit Cluster Weights</h3>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium ${total === 100 ? "text-green-400" : total > 100 ? "text-red-400" : "text-yellow-400"}`}>
              Total: {total}%
            </span>
            {total !== 100 && (
              <Button size="sm" variant="outline" onClick={normalizeWeights}>
                Normalize
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-3 max-h-64 overflow-y-auto">
          {clusters.map((cluster) => (
            <div key={cluster.id} className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
              <div className="flex-1">
                <p className="text-sm font-medium text-white">{cluster.name}</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={weights.get(cluster.id) || 0}
                  onChange={(e) => handleWeightChange(cluster.id, e.target.value)}
                  className="w-20 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <span className="text-sm text-gray-400">%</span>
              </div>
            </div>
          ))}
        </div>

        {total !== 100 && (
          <div className={`p-3 rounded-lg ${total > 100 ? "bg-red-500/10 border border-red-500/20" : "bg-yellow-500/10 border border-yellow-500/20"}`}>
            <p className="text-sm text-center">
              {total > 100
                ? "Total exceeds 100%. Click 'Normalize' to adjust automatically."
                : "Total is less than 100%. Click 'Normalize' to adjust automatically."}
            </p>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={onCancel} className="flex-1">
            <XMarkIcon className="w-4 h-4 mr-2 inline" />
            Cancel
          </Button>
          <Button onClick={handleSave} className="flex-1" disabled={total < 0 || total > 100}>
            <CheckIcon className="w-4 h-4 mr-2 inline" />
            Save
          </Button>
        </div>
      </div>
    </Card>
  );
}
