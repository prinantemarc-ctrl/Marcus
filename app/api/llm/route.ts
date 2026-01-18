import { NextRequest, NextResponse } from "next/server";
import type { LLMConfig, LLMProvider } from "@/lib/core/config";

interface LLMRequest {
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  config: LLMConfig;
}

// ============================================================================
// OLLAMA PROVIDER
// ============================================================================
async function checkOllamaAvailable(url: string): Promise<{ available: boolean; error?: string }> {
  try {
    const healthUrl = `${url}/api/tags`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const response = await fetch(healthUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        available: false,
        error: `Ollama server returned ${response.status}`,
      };
    }

    return { available: true };
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "AbortError" || error.message.includes("timeout")) {
        return {
          available: false,
          error: "Ollama server timeout - is Ollama running?",
        };
      }
      if (error.message.includes("ECONNREFUSED") || error.message.includes("fetch failed")) {
        return {
          available: false,
          error: "Cannot connect to Ollama. Make sure Ollama is installed and running.",
        };
      }
      return {
        available: false,
        error: error.message,
      };
    }
    return {
      available: false,
      error: "Unknown error checking Ollama availability",
    };
  }
}

async function callOllama(
  request: LLMRequest,
  config: LLMConfig
): Promise<{ content: string; error?: string }> {
  try {
    const ollamaUrl = config.ollamaUrl || "http://localhost:11434";
    const model = config.ollamaModel || "llama3.1:8b";

    // First check if Ollama is available
    const healthCheck = await checkOllamaAvailable(ollamaUrl);
    if (!healthCheck.available) {
      return {
        content: "",
        error: healthCheck.error || "Ollama is not available",
      };
    }

    const url = `${ollamaUrl}/api/generate`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout for generation
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model,
        prompt: request.systemPrompt
          ? `${request.systemPrompt}\n\n${request.prompt}`
          : request.prompt,
        stream: false,
        options: {
          temperature: request.temperature ?? 0.7,
          num_predict: request.maxTokens ?? 2000,
        },
      }),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      let errorMessage = `Ollama error: ${response.status} ${response.statusText}`;
      
      if (errorData.error) {
        errorMessage = `Ollama error: ${errorData.error}`;
        // Check for common errors
        if (errorData.error.includes("model") && errorData.error.includes("not found")) {
          errorMessage = `Model "${model}" not found. Please pull it first: ollama pull ${model}`;
        }
      }
      
      return {
        content: "",
        error: errorMessage,
      };
    }

    const data = await response.json();
    
    if (!data.response) {
      return {
        content: "",
        error: "Ollama returned empty response",
      };
    }

    return {
      content: data.response || "",
    };
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "AbortError" || error.message.includes("timeout")) {
        return {
          content: "",
          error: "Request timeout - the model might be too slow or the prompt too long",
        };
      }
      if (error.message.includes("ECONNREFUSED") || error.message.includes("fetch failed")) {
        return {
          content: "",
          error: "Cannot connect to Ollama. Make sure Ollama is installed and running on " + (config.ollamaUrl || "http://localhost:11434"),
        };
      }
      return {
        content: "",
        error: `Ollama connection error: ${error.message}`,
      };
    }
    return {
      content: "",
      error: "Unknown Ollama connection error",
    };
  }
}

// ============================================================================
// OPENAI PROVIDER
// ============================================================================
async function callOpenAI(
  request: LLMRequest,
  config: LLMConfig
): Promise<{ content: string; error?: string }> {
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.openaiApiKey}`,
      },
      body: JSON.stringify({
        model: config.openaiModel || "gpt-4",
        messages: [
          ...(request.systemPrompt
            ? [{ role: "system", content: request.systemPrompt }]
            : []),
          { role: "user", content: request.prompt },
        ],
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens ?? 2000,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return {
        content: "",
        error: `OpenAI error: ${error.error?.message || response.statusText}`,
      };
    }

    const data = await response.json();
    return {
      content: data.choices[0]?.message?.content || "",
    };
  } catch (error) {
    return {
      content: "",
      error: error instanceof Error ? error.message : "OpenAI connection error",
    };
  }
}

// ============================================================================
// CLAUDE PROVIDER
// ============================================================================
async function callClaude(
  request: LLMRequest,
  config: LLMConfig
): Promise<{ content: string; error?: string }> {
  try {
    // Use config key or fallback to environment variable
    const apiKey = config.claudeApiKey || process.env.ANTHROPIC_API_KEY || "";
    
    if (!apiKey) {
      return {
        content: "",
        error: "Claude API key not configured. Please add it in Settings or set ANTHROPIC_API_KEY environment variable.",
      };
    }
    
    const response = await fetch(
      "https://api.anthropic.com/v1/messages",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: config.claudeModel || "claude-3-5-sonnet-20241022",
          max_tokens: request.maxTokens ?? 2000,
          temperature: request.temperature ?? 0.7,
          messages: [
            {
              role: "user",
              content: request.systemPrompt
                ? `${request.systemPrompt}\n\n${request.prompt}`
                : request.prompt,
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return {
        content: "",
        error: `Claude error: ${error.error?.message || response.statusText}`,
      };
    }

    const data = await response.json();
    return {
      content: data.content[0]?.text || "",
    };
  } catch (error) {
    return {
      content: "",
      error: error instanceof Error ? error.message : "Claude connection error",
    };
  }
}

// ============================================================================
// MAIN HANDLER
// ============================================================================
export async function POST(req: NextRequest) {
  try {
    const body: LLMRequest = await req.json();

    if (!body.config || !body.prompt) {
      return NextResponse.json(
        { error: "Missing config or prompt" },
        { status: 400 }
      );
    }

    let result: { content: string; error?: string };

    switch (body.config.provider) {
      case "ollama":
        result = await callOllama(body, body.config);
        break;
      case "openai":
        result = await callOpenAI(body, body.config);
        break;
      case "claude":
        result = await callClaude(body, body.config);
        break;
      default:
        return NextResponse.json(
          { error: `Unknown provider: ${body.config.provider}` },
          { status: 400 }
        );
    }

    if (result.error) {
      return NextResponse.json(
        { content: "", error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({ content: result.content });
  } catch (error) {
    return NextResponse.json(
      {
        content: "",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
