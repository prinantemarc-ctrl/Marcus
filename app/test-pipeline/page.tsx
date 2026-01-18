"use client";

import { useState } from "react";
import MainLayout from "@/components/Layout/MainLayout";
import Card from "@/components/UI/Card";
import Button from "@/components/UI/Button";
import { 
  saveZones, 
  getZones, 
  saveClusters, 
  getClustersByZone,
  saveAgentsForCluster,
  getAgentsForCluster,
  saveSimulation
} from "@/lib/core/storage";
import { savePoll } from "@/lib/core/poll";
import { generateClustersForZone } from "@/lib/core/cluster";
import { generateAgentsBatch } from "@/lib/core/agent";
import { runSimulation } from "@/lib/core/simulation";
import { runPoll } from "@/lib/core/poll";
import { getLLMConfig, isConfigValid } from "@/lib/core/config";
import type { Zone, Cluster, Agent, Simulation, PollResult } from "@/types";
import { ZoneSchema } from "@/types";

export default function TestPipelinePage() {
  const [status, setStatus] = useState<string>("Ready");
  const [logs, setLogs] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<{
    zone?: Zone;
    clusters?: Cluster[];
    agents?: Agent[];
    simulation?: Simulation;
    poll?: PollResult;
  }>({});

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
    console.log(`[TEST] ${message}`);
  };

  const clearLogs = () => {
    setLogs([]);
    setResults({});
    setStatus("Ready");
  };

  const testCompletePipeline = async () => {
    setIsRunning(true);
    setStatus("Running...");
    clearLogs();
    
    try {
      // ============================================
      // STEP 1: Create Zone
      // ============================================
      addLog("📍 STEP 1: Creating zone...");
      setStatus("Creating zone...");
      
      const testZone: Zone = {
        id: `test_zone_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: "Test Region - Pipeline Test",
        description: "A test region created for complete pipeline validation",
        createdAt: new Date().toISOString(),
      };
      
      const validatedZone = ZoneSchema.parse(testZone);
      const zones = getZones();
      zones.push(validatedZone);
      saveZones(zones);
      
      addLog(`✓ Zone created: ${validatedZone.name} (${validatedZone.id})`);
      setResults(prev => ({ ...prev, zone: validatedZone }));
      
      // ============================================
      // STEP 2: Generate Clusters
      // ============================================
      addLog("\n🔗 STEP 2: Generating clusters...");
      setStatus("Generating clusters...");
      
      const llmConfig = getLLMConfig();
      if (!isConfigValid(llmConfig)) {
        throw new Error("LLM config is not valid. Please configure it in Settings.");
      }
      
      const clusters = await generateClustersForZone(
        validatedZone.id,
        validatedZone.name,
        llmConfig,
        3, // Generate 3 clusters for testing
        validatedZone.description,
        (stage, current, total, item) => {
          if (item) {
            addLog(`  → ${item.name}: ${item.description.substring(0, 50)}...`);
          }
        }
      );
      
      addLog(`✓ Generated ${clusters.length} clusters`);
      setResults(prev => ({ ...prev, clusters }));
      
      // ============================================
      // STEP 3: Generate Agents
      // ============================================
      addLog("\n👥 STEP 3: Generating agents...");
      setStatus("Generating agents...");
      
      const allAgents: Agent[] = [];
      for (const cluster of clusters) {
        addLog(`  → Generating agents for cluster: ${cluster.name}`);
        
        const demographics = Array.from({ length: 5 }, () => ({
          ageBucketId: "default",
          regionId: "default",
          cspId: "default",
          age: Math.floor(Math.random() * 50) + 25,
        }));
        
        const clusterAgents = await generateAgentsBatch(
          cluster.id,
          cluster.description_prompt || "",
          5, // 5 agents per cluster for testing
          demographics,
          llmConfig,
          (stage, current, total, item) => {
            if (item) {
              addLog(`    → Agent ${current}/${total}: ${item.name}`);
            }
          }
        );
        
        allAgents.push(...clusterAgents);
        saveAgentsForCluster(cluster.id, clusterAgents);
      }
      
      addLog(`✓ Generated ${allAgents.length} agents total`);
      setResults(prev => ({ ...prev, agents: allAgents }));
      
      // ============================================
      // STEP 4: Run Simulation
      // ============================================
      addLog("\n🎬 STEP 4: Running simulation...");
      setStatus("Running simulation...");
      
      const simulation = await runSimulation(
        "Pipeline Test Simulation",
        "This is a test scenario to validate the complete pipeline functionality. The agents should react to this scenario.",
        validatedZone.id,
        {
          nAgents: Math.min(10, allAgents.length), // Use up to 10 agents
          allocationMode: "useClusterWeights",
          multiTurn: {
            enabled: false,
            turns: 1,
            mediaSummaryMode: "generated",
          },
          influence: {
            enabled: false,
            exposurePct: 0,
            exposureType: "rumor",
            exposureContentMode: "generated",
          },
        },
        llmConfig,
        (stage, current, total, item) => {
          if (item) {
            addLog(`  → ${item.agentName}: ${item.reaction.substring(0, 60)}...`);
          }
        }
      );
      
      addLog(`✓ Simulation completed: ${simulation.title}`);
      addLog(`  → ${simulation.results.length} reactions generated`);
      if (simulation.executiveSummary) {
        addLog(`  → Executive summary generated (${simulation.executiveSummary.length} characters)`);
        addLog(`  → Summary preview: ${simulation.executiveSummary.substring(0, 100)}...`);
      } else {
        addLog(`  ⚠ Executive summary not generated`);
      }
      setResults(prev => ({ ...prev, simulation }));
      
      // ============================================
      // STEP 5: Run Poll
      // ============================================
      addLog("\n📊 STEP 5: Running poll...");
      setStatus("Running poll...");
      
      const poll = await runPoll(
        "Pipeline Test Poll",
        {
          question: "Do you support this test proposal?",
          options: [
            { id: "opt_1", name: "Strongly Support" },
            { id: "opt_2", name: "Support" },
            { id: "opt_3", name: "Neutral" },
            { id: "opt_4", name: "Oppose" },
            { id: "opt_5", name: "Strongly Oppose" },
          ],
          responseMode: "choice",
          zoneId: validatedZone.id,
        },
        llmConfig,
        (stage, current, total, item) => {
          if (item) {
            addLog(`  → ${item.agentName}: ${item.response.substring(0, 50)}...`);
          }
        }
      );
      
      addLog(`✓ Poll completed: ${poll.title}`);
      addLog(`  → ${poll.responses.length} responses collected`);
      setResults(prev => ({ ...prev, poll }));
      
      // ============================================
      // SUCCESS
      // ============================================
      addLog("\n✅ PIPELINE TEST COMPLETED SUCCESSFULLY!");
      addLog(`\n📋 Summary:`);
      addLog(`   Zone: ${validatedZone.name}`);
      addLog(`   Clusters: ${clusters.length}`);
      addLog(`   Agents: ${allAgents.length}`);
      addLog(`   Simulation: ${simulation.title} (${simulation.results.length} reactions)`);
      if (simulation.executiveSummary) {
        addLog(`   Executive Summary: ✓ Generated`);
      } else {
        addLog(`   Executive Summary: ✗ Not generated`);
      }
      addLog(`   Poll: ${poll.title} (${poll.responses.length} responses)`);
      
      // Verify simulation results quality
      addLog(`\n🔍 Verification:`);
      const validReactions = simulation.results.filter(r => r.turns[0]?.stance_score !== undefined);
      addLog(`   Valid reactions: ${validReactions.length}/${simulation.results.length}`);
      if (validReactions.length > 0) {
        const avgStance = validReactions.reduce((sum, r) => sum + (r.turns[0]?.stance_score || 0), 0) / validReactions.length;
        addLog(`   Average stance: ${avgStance.toFixed(1)}/100`);
      }
      
      setStatus("✅ Success!");
      
    } catch (error) {
      addLog(`\n❌ ERROR: ${error instanceof Error ? error.message : "Unknown error"}`);
      addLog(`Stack: ${error instanceof Error ? error.stack : "No stack"}`);
      setStatus("❌ Failed");
      console.error("Pipeline test error:", error);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <Card gradient>
          <h1 className="text-2xl font-bold text-white mb-4">
            Complete Pipeline Test
          </h1>
          <p className="text-gray-300 mb-6">
            This page tests the complete pipeline: Zone → Clusters → Agents → Simulation → Poll
          </p>

          <div className="flex gap-4 mb-6">
            <Button
              onClick={testCompletePipeline}
              disabled={isRunning}
              className="flex-1"
            >
              {isRunning ? "Running Test..." : "Run Complete Pipeline Test"}
            </Button>
            <Button
              variant="outline"
              onClick={clearLogs}
              disabled={isRunning}
            >
              Clear Logs
            </Button>
          </div>

          <div className="mb-4">
            <p className="text-sm text-gray-400 mb-2">Status:</p>
            <p className="text-lg font-semibold text-white">{status}</p>
          </div>

          {results.zone && (
            <div className="mb-4 p-4 glass rounded-lg">
              <p className="text-sm text-gray-400 mb-2">Test Results:</p>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>✓ Zone: {results.zone.name}</li>
                {results.clusters && <li>✓ Clusters: {results.clusters.length}</li>}
                {results.agents && <li>✓ Agents: {results.agents.length}</li>}
                {results.simulation && <li>✓ Simulation: {results.simulation.title}</li>}
                {results.poll && <li>✓ Poll: {results.poll.title}</li>}
              </ul>
            </div>
          )}

          <div className="glass rounded-lg p-4 max-h-96 overflow-y-auto">
            <div className="font-mono text-xs text-gray-300 space-y-1">
              {logs.length === 0 ? (
                <p className="text-gray-500">No logs yet. Click "Run Complete Pipeline Test" to start.</p>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className="whitespace-pre-wrap">
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>
        </Card>
      </div>
    </MainLayout>
  );
}
