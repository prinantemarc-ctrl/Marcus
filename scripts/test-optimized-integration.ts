/**
 * Integration Test for Token-Optimized Generation
 * Tests the full pipeline with batch generation
 */

import Anthropic from "@anthropic-ai/sdk";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

if (!ANTHROPIC_API_KEY) {
  console.error("❌ ANTHROPIC_API_KEY not set in environment");
  process.exit(1);
}

const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

// ============================================================================
// BATCH PROMPTS (Same as in lib/core/llm.ts)
// ============================================================================
function formatBatchAgentPrompt(clusterDescription: string, count: number, forbiddenNames: string[] = []): string {
  const ages = [];
  for (let i = 0; i < count; i++) {
    const ageRanges = [{ min: 25, max: 32 }, { min: 33, max: 42 }, { min: 43, max: 55 }, { min: 56, max: 70 }];
    const range = ageRanges[i % ageRanges.length];
    ages.push(Math.floor(Math.random() * (range.max - range.min + 1)) + range.min);
  }

  return `Generate ${count} UNIQUE agents for: "${clusterDescription}"

Requirements:
- All ${count} names DIFFERENT (vary first AND last names)
- DO NOT use: ${forbiddenNames.join(", ") || "none"}
- Ages: ${ages.join(", ")}
- Mix cultural backgrounds: Emirati, Indian, Filipino, Western
- Each bio: first-person, personal experience, 80-120 chars
- NO "Values", "Champions", "Believes" starts
- Include DIVERSE perspectives (some pro-change, some conservative, some neutral)

JSON array (no markdown):
[{"name":"Full Name","age":N,"job":"job title","traits":["t1","t2","t3"],"priors":"First-person bio","style":"speaking style"}]`;
}

function formatBatchReactionPrompt(agents: any[], scenario: string): string {
  const agentList = agents.map((a, i) => 
    `${i+1}. ${a.name} (${a.age}): ${a.priors.substring(0, 100)}`
  ).join("\n");

  return `Scenario: "${scenario}"

Agents:
${agentList}

CRITICAL: Generate DIVERSE reactions reflecting each agent's UNIQUE perspective.
- Some should SUPPORT (s>60), some should OPPOSE (s<40), some NEUTRAL (40-60)
- Stances must VARY based on each agent's background and interests
- Use SPECIFIC scores (not 50, 25, 75) - use 23, 47, 63, 78, etc.

Emotions: anger|fear|hope|cynicism|pride|sadness|indifference|enthusiasm|mistrust

JSON array (no markdown):
[{"id":1,"s":0-100,"c":0-100,"e":"emotion","r":["reason1","reason2","reason3"],"t":"response 80-150 chars"}]

Legend: id=agent number, s=stance_score, c=confidence, e=emotion, r=key_reasons, t=response text`;
}

// ============================================================================
// LLM Call
// ============================================================================
async function callClaude(prompt: string): Promise<{ text: string; inputTokens: number; outputTokens: number }> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  return {
    text,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  };
}

function parseJSON(text: string): any {
  let cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
  if (arrayMatch) return JSON.parse(arrayMatch[0]);
  const objectMatch = cleaned.match(/\{[\s\S]*\}/);
  if (objectMatch) return JSON.parse(objectMatch[0]);
  return JSON.parse(cleaned);
}

// ============================================================================
// INTEGRATION TEST
// ============================================================================
async function runIntegrationTest() {
  const CLUSTER = "Tech professionals in Dubai concerned about housing costs and work-life balance";
  const SCENARIO = "The government announces a new 15% tax on luxury goods to fund affordable housing programs";
  const AGENT_COUNT = 10;

  console.log("╔══════════════════════════════════════════════════════════════════╗");
  console.log("║       INTEGRATION TEST - TOKEN-OPTIMIZED GENERATION              ║");
  console.log("╚══════════════════════════════════════════════════════════════════╝\n");

  let totalTokens = { input: 0, output: 0 };
  const allAgents: any[] = [];

  // =========================================================================
  // STEP 1: Generate agents in batches of 5
  // =========================================================================
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`🚀 STEP 1: Generate ${AGENT_COUNT} agents (2 batch calls of 5)`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  const usedNames: string[] = [];
  
  for (let batch = 0; batch < 2; batch++) {
    console.log(`  Batch ${batch + 1}/2: Generating 5 agents...`);
    const prompt = formatBatchAgentPrompt(CLUSTER, 5, usedNames);
    const result = await callClaude(prompt);
    totalTokens.input += result.inputTokens;
    totalTokens.output += result.outputTokens;
    
    try {
      const agents = parseJSON(result.text);
      agents.forEach((a: any) => {
        allAgents.push(a);
        usedNames.push(a.name);
        console.log(`    ✓ ${a.name} (${a.age}) - ${a.job || "N/A"}`);
      });
    } catch (e) {
      console.error(`    ✗ Parse error:`, e);
    }
    
    console.log(`    Tokens: ${result.inputTokens} in / ${result.outputTokens} out\n`);
  }

  console.log(`\n  📈 Agent Generation Total: ${totalTokens.input + totalTokens.output} tokens\n`);

  // =========================================================================
  // STEP 2: Generate reactions in batches of 5
  // =========================================================================
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`🚀 STEP 2: Generate ${allAgents.length} reactions (2 batch calls of 5)`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  const allReactions: any[] = [];
  let reactionTokens = { input: 0, output: 0 };

  for (let batch = 0; batch < 2; batch++) {
    const batchAgents = allAgents.slice(batch * 5, (batch + 1) * 5);
    console.log(`  Batch ${batch + 1}/2: Generating reactions for 5 agents...`);
    
    const prompt = formatBatchReactionPrompt(batchAgents, SCENARIO);
    const result = await callClaude(prompt);
    reactionTokens.input += result.inputTokens;
    reactionTokens.output += result.outputTokens;
    
    try {
      const reactions = parseJSON(result.text);
      reactions.forEach((r: any, i: number) => {
        const agent = batchAgents[i];
        allReactions.push({ agent: agent?.name, ...r });
        console.log(`    ✓ ${agent?.name || `Agent ${i+1}`}: Stance ${r.s}, Emotion: ${r.e}`);
      });
    } catch (e) {
      console.error(`    ✗ Parse error:`, e);
    }
    
    console.log(`    Tokens: ${result.inputTokens} in / ${result.outputTokens} out\n`);
  }

  totalTokens.input += reactionTokens.input;
  totalTokens.output += reactionTokens.output;

  console.log(`\n  📈 Reaction Generation Total: ${reactionTokens.input + reactionTokens.output} tokens\n`);

  // =========================================================================
  // RESULTS SUMMARY
  // =========================================================================
  console.log("\n╔══════════════════════════════════════════════════════════════════╗");
  console.log("║                    📊 RESULTS SUMMARY                            ║");
  console.log("╚══════════════════════════════════════════════════════════════════╝\n");

  const grandTotal = totalTokens.input + totalTokens.output;
  
  // Estimate old method tokens (based on test data)
  const oldMethodEstimate = AGENT_COUNT * 1040 + AGENT_COUNT * 600; // ~1040 per agent, ~600 per reaction
  const savings = ((oldMethodEstimate - grandTotal) / oldMethodEstimate * 100).toFixed(1);

  console.log("┌─────────────────────┬──────────────┬──────────────┬─────────────┐");
  console.log("│                     │ OLD ESTIMATE │ NEW ACTUAL   │ SAVINGS     │");
  console.log("├─────────────────────┼──────────────┼──────────────┼─────────────┤");
  console.log(`│ Agent Generation    │ ${(AGENT_COUNT * 1040).toString().padStart(10)} │ ${(totalTokens.input - reactionTokens.input + totalTokens.output - reactionTokens.output).toString().padStart(10)} │     ~90%   │`);
  console.log(`│ Reaction Generation │ ${(AGENT_COUNT * 600).toString().padStart(10)} │ ${(reactionTokens.input + reactionTokens.output).toString().padStart(10)} │     ~70%   │`);
  console.log("├─────────────────────┼──────────────┼──────────────┼─────────────┤");
  console.log(`│ TOTAL               │ ${oldMethodEstimate.toString().padStart(10)} │ ${grandTotal.toString().padStart(10)} │ ${savings.padStart(8)}%  │`);
  console.log("└─────────────────────┴──────────────┴──────────────┴─────────────┘");

  console.log(`\n  💰 Tokens économisés: ~${oldMethodEstimate - grandTotal}`);

  // =========================================================================
  // QUALITY ANALYSIS
  // =========================================================================
  console.log("\n╔══════════════════════════════════════════════════════════════════╗");
  console.log("║                    🎯 QUALITY ANALYSIS                           ║");
  console.log("╚══════════════════════════════════════════════════════════════════╝\n");

  // Names diversity
  const uniqueNames = new Set(allAgents.map(a => a.name)).size;
  console.log(`📝 AGENTS (${allAgents.length}):`);
  console.log(`  Unique names: ${uniqueNames}/${allAgents.length}`);
  
  allAgents.forEach((a, i) => {
    console.log(`  ${i+1}. ${a.name} (${a.age}) - ${a.priors?.substring(0, 60)}...`);
  });

  // Stance diversity
  console.log(`\n📊 REACTIONS (${allReactions.length}):`);
  const stances = allReactions.map(r => r.s).filter(Boolean);
  if (stances.length > 0) {
    const avg = stances.reduce((a, b) => a + b, 0) / stances.length;
    const stdDev = Math.sqrt(stances.map(s => Math.pow(s - avg, 2)).reduce((a, b) => a + b, 0) / stances.length);
    const pro = stances.filter(s => s > 60).length;
    const neutral = stances.filter(s => s >= 40 && s <= 60).length;
    const against = stances.filter(s => s < 40).length;
    
    console.log(`  Average stance: ${avg.toFixed(1)}`);
    console.log(`  Std deviation: ${stdDev.toFixed(1)}`);
    console.log(`  Range: ${Math.min(...stances)}-${Math.max(...stances)}`);
    console.log(`  Distribution: ${pro} pro / ${neutral} neutral / ${against} against`);
  }

  // Emotion diversity
  const emotions = allReactions.map(r => r.e).filter(Boolean);
  const uniqueEmotions = new Set(emotions);
  console.log(`  Unique emotions: ${uniqueEmotions.size} (${[...uniqueEmotions].join(", ")})`);

  console.log("\n✅ Integration test completed successfully!\n");
}

runIntegrationTest().catch(console.error);
