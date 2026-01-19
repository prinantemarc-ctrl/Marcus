/**
 * Configuration - LLM configuration management
 */

export type LLMProvider = "ollama" | "openai" | "claude";

export interface LLMConfig {
  provider: LLMProvider;
  // Pour Ollama
  ollamaUrl?: string;
  ollamaModel?: string;
  // Pour OpenAI
  openaiApiKey?: string;
  openaiModel?: string;
  // Pour Claude
  claudeApiKey?: string;
  claudeModel?: string;
}

const CONFIG_KEY = "op_llm_config";

// ============================================================================
// HELPERS
// ============================================================================
function isStorageAvailable(): boolean {
  if (typeof window === "undefined") return false;
  try {
    localStorage.setItem("__test__", "__test__");
    localStorage.removeItem("__test__");
    return true;
  } catch {
    return false;
  }
}

function safeGet<T>(key: string, defaultValue: T): T {
  if (!isStorageAvailable()) return defaultValue;
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function safeSet(key: string, value: unknown): void {
  if (!isStorageAvailable()) return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    if (error instanceof Error && error.name === "QuotaExceededError") {
      throw new Error("Storage quota exceeded");
    }
    throw error;
  }
}

// ============================================================================
// CONFIG MANAGEMENT
// ============================================================================
export function getLLMConfig(): LLMConfig {
  return safeGet<LLMConfig>(CONFIG_KEY, {
    provider: "ollama",
    ollamaUrl: "http://localhost:11434",
    ollamaModel: "llama3.1:8b",
    openaiModel: "gpt-4",
    claudeModel: "claude-sonnet-4-20250514",
  });
}

export function saveLLMConfig(config: LLMConfig): void {
  safeSet(CONFIG_KEY, config);
}

export function isConfigValid(config: LLMConfig): boolean {
  if (config.provider === "ollama") {
    return !!(config.ollamaUrl && config.ollamaModel);
  }
  if (config.provider === "openai") {
    return !!(config.openaiApiKey && config.openaiModel);
  }
  if (config.provider === "claude") {
    return !!(config.claudeApiKey && config.claudeModel);
  }
  return false;
}
