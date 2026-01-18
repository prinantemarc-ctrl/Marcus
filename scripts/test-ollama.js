#!/usr/bin/env node

/**
 * Test script to verify Ollama connection and functionality
 */

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const MODEL = process.env.OLLAMA_MODEL || "llama3.1:8b";

async function testOllama() {
  console.log("🔍 Testing Ollama connection...\n");

  // Test 1: Check if Ollama is available
  console.log("1. Checking Ollama availability...");
  try {
    const healthResponse = await fetch(`${OLLAMA_URL}/api/tags`);
    if (!healthResponse.ok) {
      console.error("❌ Ollama is not responding");
      process.exit(1);
    }
    const modelsData = await healthResponse.json();
    const models = modelsData.models?.map((m) => m.name) || [];
    console.log(`✅ Ollama is running`);
    console.log(`   Available models: ${models.join(", ") || "none"}\n`);
  } catch (error) {
    console.error("❌ Cannot connect to Ollama:", error.message);
    console.error("   Make sure Ollama is running: ollama serve");
    process.exit(1);
  }

  // Test 2: Check if model exists
  console.log(`2. Checking if model "${MODEL}" is available...`);
  try {
    const modelsResponse = await fetch(`${OLLAMA_URL}/api/tags`);
    const modelsData = await modelsResponse.json();
    const models = modelsData.models?.map((m) => m.name) || [];
    
    if (!models.includes(MODEL)) {
      console.error(`❌ Model "${MODEL}" not found`);
      console.error(`   Available models: ${models.join(", ") || "none"}`);
      console.error(`   Pull it first: ollama pull ${MODEL}`);
      process.exit(1);
    }
    console.log(`✅ Model "${MODEL}" is available\n`);
  } catch (error) {
    console.error("❌ Error checking models:", error.message);
    process.exit(1);
  }

  // Test 3: Test generation
  console.log(`3. Testing generation with "${MODEL}"...`);
  try {
    const generateResponse = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        prompt: "Say 'OK' if you are working correctly.",
        stream: false,
      }),
    });

    if (!generateResponse.ok) {
      const error = await generateResponse.json().catch(() => ({}));
      console.error("❌ Generation failed:", error.error || generateResponse.statusText);
      process.exit(1);
    }

    const data = await generateResponse.json();
    if (data.response) {
      console.log(`✅ Generation successful`);
      console.log(`   Response: "${data.response.trim()}"\n`);
    } else {
      console.error("❌ Empty response from Ollama");
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ Generation error:", error.message);
    process.exit(1);
  }

  console.log("🎉 All tests passed! Ollama is ready to use.");
}

testOllama().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
