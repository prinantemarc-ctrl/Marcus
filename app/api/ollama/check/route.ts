import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const url = searchParams.get("url") || "http://localhost:11434";

    // Check if Ollama is available
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
      return NextResponse.json(
        {
          available: false,
          error: `Ollama server returned ${response.status}`,
        },
        { status: 200 }
      );
    }

    // Get available models
    const modelsData = await response.json().catch(() => ({ models: [] }));
    const models = modelsData.models?.map((m: any) => m.name) || [];

    return NextResponse.json({
      available: true,
      models: models,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "AbortError" || error.message.includes("timeout")) {
        return NextResponse.json(
          {
            available: false,
            error: "Ollama server timeout - is Ollama running?",
          },
          { status: 200 }
        );
      }
      if (error.message.includes("ECONNREFUSED") || error.message.includes("fetch failed")) {
        return NextResponse.json(
          {
            available: false,
            error: "Cannot connect to Ollama. Make sure Ollama is installed and running.",
          },
          { status: 200 }
        );
      }
      return NextResponse.json(
        {
          available: false,
          error: error.message,
        },
        { status: 200 }
      );
    }
    return NextResponse.json(
      {
        available: false,
        error: "Unknown error",
      },
      { status: 200 }
    );
  }
}
