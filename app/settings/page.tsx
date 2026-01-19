"use client";

import { useState, useEffect } from "react";
import MainLayout from "@/components/Layout/MainLayout";
import Card from "@/components/UI/Card";
import Button from "@/components/UI/Button";
import Input from "@/components/UI/Input";
import {
  getLLMConfig,
  saveLLMConfig,
  isConfigValid,
  type LLMConfig,
  type LLMProvider,
} from "@/lib/core/config";
import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";

export default function SettingsPage() {
  const [config, setConfig] = useState<LLMConfig>({
    provider: "ollama",
    ollamaUrl: "http://localhost:11434",
    ollamaModel: "llama3.1:8b",
    openaiModel: "gpt-4",
    claudeModel: "claude-sonnet-4-20250514",
  });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null);

  useEffect(() => {
    const savedConfig = getLLMConfig();
    setConfig(savedConfig);
  }, []);

  const handleProviderChange = (provider: LLMProvider) => {
    setConfig({ ...config, provider });
    setSaved(false);
    setTestResult(null);
  };

  const handleSave = () => {
    if (!isConfigValid(config)) {
      setError("Invalid configuration. Please check that all required fields are filled.");
      return;
    }

    saveLLMConfig(config);
    setSaved(true);
    setError("");
    setTimeout(() => setSaved(false), 3000);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    setError("");

    try {
      // For Ollama, first check if it's available
      if (config.provider === "ollama") {
        const checkResponse = await fetch(
          `/api/ollama/check?url=${encodeURIComponent(config.ollamaUrl || "http://localhost:11434")}`
        );
        const checkData = await checkResponse.json();
        
        if (!checkData.available) {
          throw new Error(checkData.error || "Ollama is not available");
        }

        // Check if the model is available
        if (checkData.models && !checkData.models.includes(config.ollamaModel)) {
          throw new Error(
            `Model "${config.ollamaModel}" not found. Available models: ${checkData.models.join(", ") || "none"}. Please pull it first: ollama pull ${config.ollamaModel}`
          );
        }
      }

      // Now test the actual LLM call
      const response = await fetch("/api/llm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: "Simply reply 'OK' if you are working correctly.",
          config,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Connection error");
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      setTestResult("success");
    } catch (err) {
      setTestResult("error");
      setError(err instanceof Error ? err.message : "Test error");
    } finally {
      setTesting(false);
    }
  };

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
        <Link href="/">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeftIcon className="w-4 h-4 mr-2 inline" />
            Back
          </Button>
        </Link>

        <Card gradient>
          <h1 className="text-2xl font-bold text-white mb-6">
            LLM Configuration
          </h1>

          <div className="space-y-6">
            {/* Provider Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                LLM Provider
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => handleProviderChange("ollama")}
                  className={`
                    p-4 rounded-lg border-2 transition-all
                    ${
                      config.provider === "ollama"
                        ? "border-primary-500 bg-primary-500/10"
                        : "border-white/10 bg-white/5 hover:border-white/20"
                    }
                  `}
                >
                  <div className="text-white font-medium">Ollama</div>
                  <div className="text-xs text-gray-400 mt-1">Local</div>
                </button>
                <button
                  type="button"
                  onClick={() => handleProviderChange("openai")}
                  className={`
                    p-4 rounded-lg border-2 transition-all
                    ${
                      config.provider === "openai"
                        ? "border-primary-500 bg-primary-500/10"
                        : "border-white/10 bg-white/5 hover:border-white/20"
                    }
                  `}
                >
                  <div className="text-white font-medium">OpenAI</div>
                  <div className="text-xs text-gray-400 mt-1">Remote</div>
                </button>
                <button
                  type="button"
                  onClick={() => handleProviderChange("claude")}
                  className={`
                    p-4 rounded-lg border-2 transition-all
                    ${
                      config.provider === "claude"
                        ? "border-primary-500 bg-primary-500/10"
                        : "border-white/10 bg-white/5 hover:border-white/20"
                    }
                  `}
                >
                  <div className="text-white font-medium">Claude</div>
                  <div className="text-xs text-gray-400 mt-1">Remote</div>
                </button>
              </div>
            </div>

            {/* Ollama Configuration */}
            {config.provider === "ollama" && (
              <div className="space-y-4">
                <Input
                  label="Ollama URL"
                  placeholder="http://localhost:11434"
                  value={config.ollamaUrl || ""}
                  onChange={(e) =>
                    setConfig({ ...config, ollamaUrl: e.target.value })
                  }
                  required
                />
                <div>
                  <Input
                  label="Model"
                  placeholder="llama3.1:8b"
                  value={config.ollamaModel || ""}
                  onChange={(e) =>
                    setConfig({ ...config, ollamaModel: e.target.value })
                  }
                  required
                />
                  <p className="mt-1 text-xs text-gray-400">
                    Available models: llama3.1:8b, llama3.2:3b (or any model you've pulled)
                  </p>
                </div>
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                  <p className="text-sm text-yellow-300">
                    <strong>Note:</strong> Ollama is detected and running. 
                    Available models: llama3.1:8b, llama3.2:3b. 
                    If you need another model, pull it first: <code className="bg-black/20 px-1 rounded">ollama pull {config.ollamaModel || "llama3.1:8b"}</code>
                  </p>
                </div>
              </div>
            )}

            {/* OpenAI Configuration */}
            {config.provider === "openai" && (
              <div className="space-y-4">
                <Input
                  label="OpenAI API Key"
                  type="password"
                  placeholder="sk-..."
                  value={config.openaiApiKey || ""}
                  onChange={(e) =>
                    setConfig({ ...config, openaiApiKey: e.target.value })
                  }
                  required
                />
                <Input
                  label="Model"
                  placeholder="gpt-4"
                  value={config.openaiModel || ""}
                  onChange={(e) =>
                    setConfig({ ...config, openaiModel: e.target.value })
                  }
                  required
                />
              </div>
            )}

            {/* Claude Configuration */}
            {config.provider === "claude" && (
              <div className="space-y-4">
                <Input
                  label="Claude API Key"
                  type="password"
                  placeholder="sk-ant-..."
                  value={config.claudeApiKey || ""}
                  onChange={(e) =>
                    setConfig({ ...config, claudeApiKey: e.target.value })
                  }
                  required
                />
                <Input
                  label="Model"
                  placeholder="claude-sonnet-4-20250514"
                  value={config.claudeModel || ""}
                  onChange={(e) =>
                    setConfig({ ...config, claudeModel: e.target.value })
                  }
                  required
                />
              </div>
            )}

            {/* Test & Save */}
            <div className="flex items-center gap-4 pt-4 border-t border-white/10">
              <Button
                variant="outline"
                onClick={handleTest}
                disabled={testing || !isConfigValid(config)}
              >
                {testing ? "Testing..." : "Test connection"}
              </Button>
              {testResult === "success" && (
                <div className="flex items-center gap-2 text-green-400">
                  <CheckCircleIcon className="w-5 h-5" />
                  <span className="text-sm">Connection successful</span>
                </div>
              )}
              {testResult === "error" && (
                <div className="flex items-center gap-2 text-red-400">
                  <XCircleIcon className="w-5 h-5" />
                  <span className="text-sm">Connection error</span>
                </div>
              )}
            </div>

            {error && (
              <p className="text-sm text-red-400">{error}</p>
            )}

            {saved && (
              <p className="text-sm text-green-400">
                Configuration saved successfully
              </p>
            )}

            <div className="flex gap-4 pt-4">
              <Button
                onClick={handleSave}
                disabled={!isConfigValid(config)}
                className="flex-1"
              >
                Save configuration
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </MainLayout>
  );
}
