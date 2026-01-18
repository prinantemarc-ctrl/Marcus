"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import MainLayout from "@/components/Layout/MainLayout";
import Card from "@/components/UI/Card";
import Button from "@/components/UI/Button";
import { getSimulation } from "@/lib/core/storage";
import type { Simulation } from "@/types";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import Link from "next/link";

export default function SimulationDetailPage() {
  const params = useParams();
  const [simulation, setSimulation] = useState<Simulation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id && typeof params.id === "string") {
      const sim = getSimulation(params.id);
      setSimulation(sim);
      setLoading(false);
    }
  }, [params.id]);

  const exportJSON = () => {
    if (!simulation) return;
    const dataStr = JSON.stringify(simulation, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${simulation.title.replace(/\s+/g, "_")}.json`;
    link.click();
  };

  const exportCSV = () => {
    if (!simulation) return;
    const headers = ["Agent", "Cluster", "Stance Score", "Confidence", "Emotion", "Response"];
    const rows = simulation.results.map(result => {
      const agent = simulation.panelSnapshot.find(a => a.id === result.agentId);
      const cluster = simulation.clustersSnapshot.find(c => c.id === result.clusterId);
      const turn = result.turns[0];
      return [
        agent?.name || `Agent ${agent?.agentNumber || ""}`,
        cluster?.name || "",
        turn?.stance_score || "",
        turn?.confidence || "",
        turn?.emotion || "",
        (turn?.response || "").replace(/"/g, '""')
      ];
    });
    const csv = [headers.join(","), ...rows.map(r => r.map(c => `"${c}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${simulation.title.replace(/\s+/g, "_")}.csv`;
    link.click();
  };

  const exportPDF = async () => {
    if (!simulation) return;

    // Dynamic import to avoid SSR issues
    const { default: jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPos = 20;

    // Colors - Rich color palette
    const colors = {
      primary: [102, 126, 234] as [number, number, number],
      secondary: [118, 75, 162] as [number, number, number],
      accent: [79, 172, 254] as [number, number, number],
      success: [16, 185, 129] as [number, number, number],
      warning: [245, 158, 11] as [number, number, number],
      danger: [239, 68, 68] as [number, number, number],
      orange: [251, 146, 60] as [number, number, number],
      text: [30, 30, 30] as [number, number, number],
      lightGray: [248, 250, 252] as [number, number, number],
      mediumGray: [148, 163, 184] as [number, number, number],
      darkGray: [71, 85, 105] as [number, number, number],
      white: [255, 255, 255] as [number, number, number],
    };

    // Helper function to add new page if needed
    const checkPageBreak = (requiredSpace: number = 20) => {
      if (yPos + requiredSpace > pageHeight - 25) {
        doc.addPage();
        yPos = 25;
        return true;
      }
      return false;
    };

    // Helper to draw colored box with optional rounded corners
    const drawBox = (x: number, y: number, w: number, h: number, color: [number, number, number], radius: number = 0) => {
      doc.setFillColor(color[0], color[1], color[2]);
      if (radius > 0) {
        doc.roundedRect(x, y, w, h, radius, radius, "F");
      } else {
        doc.rect(x, y, w, h, "F");
      }
    };

    // Helper to draw a progress bar
    const drawProgressBar = (x: number, y: number, width: number, height: number, value: number, bgColor: [number, number, number], fillColor: [number, number, number]) => {
      // Background
      doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
      doc.roundedRect(x, y, width, height, height / 2, height / 2, "F");
      // Fill
      const fillWidth = Math.max(0, Math.min(width * (value / 100), width));
      if (fillWidth > 0) {
        doc.setFillColor(fillColor[0], fillColor[1], fillColor[2]);
        doc.roundedRect(x, y, fillWidth, height, height / 2, height / 2, "F");
      }
    };

    // Helper to draw a gauge/meter
    const drawGauge = (x: number, y: number, value: number, label: string, color: [number, number, number]) => {
      const size = 25;
      // Outer circle (background)
      doc.setFillColor(colors.lightGray[0], colors.lightGray[1], colors.lightGray[2]);
      doc.circle(x + size / 2, y + size / 2, size / 2, "F");
      // Progress arc simulation with filled segment
      const segments = 20;
      const filledSegments = Math.round((value / 100) * segments);
      doc.setFillColor(color[0], color[1], color[2]);
      for (let i = 0; i < filledSegments; i++) {
        const angle = (i / segments) * 2 * Math.PI - Math.PI / 2;
        const nextAngle = ((i + 1) / segments) * 2 * Math.PI - Math.PI / 2;
        const cx = x + size / 2;
        const cy = y + size / 2;
        const r = size / 2 - 1;
        // Draw small arc segment
        doc.setDrawColor(color[0], color[1], color[2]);
        doc.setLineWidth(3);
        doc.line(
          cx + Math.cos(angle) * (r - 1.5),
          cy + Math.sin(angle) * (r - 1.5),
          cx + Math.cos(nextAngle) * (r - 1.5),
          cy + Math.sin(nextAngle) * (r - 1.5)
        );
      }
      // Inner circle (white)
      doc.setFillColor(255, 255, 255);
      doc.circle(x + size / 2, y + size / 2, size / 3, "F");
      // Value text
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(color[0], color[1], color[2]);
      doc.text(value.toFixed(0), x + size / 2, y + size / 2 + 2, { align: "center" });
      // Label
      doc.setFontSize(6);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(colors.darkGray[0], colors.darkGray[1], colors.darkGray[2]);
      doc.text(label, x + size / 2, y + size + 5, { align: "center" });
    };

    // Helper to get color based on score
    const getScoreColor = (score: number): [number, number, number] => {
      if (score < 25) return colors.danger;
      if (score < 50) return colors.orange;
      if (score < 75) return colors.warning;
      return colors.success;
    };

    // Helper to draw metric card
    const drawMetricCard = (x: number, y: number, width: number, height: number, value: string, label: string, color: [number, number, number]) => {
      // Card background
      drawBox(x, y, width, height, colors.lightGray, 3);
      // Left accent bar
      doc.setFillColor(color[0], color[1], color[2]);
      doc.rect(x, y, 3, height, "F");
      // Value
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
      doc.text(value, x + width / 2, y + height / 2 - 2, { align: "center" });
      // Label
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(colors.mediumGray[0], colors.mediumGray[1], colors.mediumGray[2]);
      doc.text(label, x + width / 2, y + height / 2 + 8, { align: "center" });
    };

    // Helper to add section title with icon
    const addSectionTitle = (title: string, color: [number, number, number] = colors.primary) => {
      checkPageBreak(20);
      yPos += 8;
      // Gradient-like header
      drawBox(15, yPos - 6, pageWidth - 30, 12, color, 2);
      // Icon circle
      doc.setFillColor(255, 255, 255);
      doc.circle(22, yPos, 4, "F");
      doc.setFillColor(color[0], color[1], color[2]);
      doc.circle(22, yPos, 2.5, "F");
      // Title text
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(title, 30, yPos + 1);
      doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
      yPos += 18;
    };

    // ============================================
    // COVER PAGE
    // ============================================
    // Full page gradient header
    drawBox(0, 0, pageWidth, 80, colors.primary);
    drawBox(0, 60, pageWidth, 20, colors.secondary);
    
    // Logo area
    doc.setFillColor(255, 255, 255);
    doc.circle(pageWidth / 2, 30, 15, "F");
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.text("M", pageWidth / 2, 34, { align: "center" });
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text("MARCUS", pageWidth / 2, 55, { align: "center" });
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("OPINION SIMULATION REPORT", pageWidth / 2, 72, { align: "center" });

    yPos = 95;
    
    // Title card
    drawBox(20, yPos, pageWidth - 40, 35, colors.lightGray, 4);
    doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    const titleLines = doc.splitTextToSize(simulation.title, pageWidth - 50);
    doc.text(titleLines, pageWidth / 2, yPos + 12, { align: "center" });
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(colors.darkGray[0], colors.darkGray[1], colors.darkGray[2]);
    const scenarioLines = doc.splitTextToSize(simulation.scenario, pageWidth - 50);
    doc.text(scenarioLines.slice(0, 2), pageWidth / 2, yPos + 25, { align: "center" });
    yPos += 45;

    // Stats cards row
    const cardWidth = (pageWidth - 50) / 3;
    drawMetricCard(20, yPos, cardWidth - 5, 30, simulation.panelSnapshot.length.toString(), "Total Agents", colors.primary);
    drawMetricCard(20 + cardWidth, yPos, cardWidth - 5, 30, simulation.results.length.toString(), "Responses", colors.secondary);
    drawMetricCard(20 + cardWidth * 2, yPos, cardWidth - 5, 30, simulation.clustersSnapshot.length.toString(), "Clusters", colors.accent);
    yPos += 40;

    // Date
    doc.setFontSize(9);
    doc.setTextColor(colors.mediumGray[0], colors.mediumGray[1], colors.mediumGray[2]);
    doc.text(`Generated: ${new Date(simulation.createdAt).toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}`, pageWidth / 2, yPos, { align: "center" });

    // ============================================
    // EXECUTIVE SUMMARY (AI Generated)
    // ============================================
    if (simulation.executiveSummary) {
      doc.addPage();
      yPos = 25;
      addSectionTitle("Executive Summary", colors.primary);
      
      // Summary box
      drawBox(20, yPos, pageWidth - 40, 5, colors.primary, 2);
      yPos += 10;
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
      const summaryLines = doc.splitTextToSize(simulation.executiveSummary, pageWidth - 50);
      summaryLines.forEach((line: string) => {
        checkPageBreak(7);
        doc.text(line, 25, yPos);
        yPos += 6;
      });
      yPos += 10;
    }

    // ============================================
    // KEY METRICS DASHBOARD
    // ============================================
    doc.addPage();
    yPos = 25;
    addSectionTitle("Key Metrics Dashboard", colors.primary);

    // Calculate statistics
    const turn1Scores = simulation.results
      .map(r => r.turns[0]?.stance_score)
      .filter((s): s is number => s !== undefined && !isNaN(s));
    const finalTurnScores = simulation.results
      .map(r => {
        const turns = r.turns;
        return turns[turns.length - 1]?.stance_score;
      })
      .filter((s): s is number => s !== undefined && !isNaN(s));
    
    const avgTurn1 = turn1Scores.length > 0 
      ? turn1Scores.reduce((a, b) => a + b, 0) / turn1Scores.length 
      : 0;
    const avgFinal = finalTurnScores.length > 0 
      ? finalTurnScores.reduce((a, b) => a + b, 0) / finalTurnScores.length 
      : avgTurn1;
    const delta = avgFinal - avgTurn1;

    const veryNegative = turn1Scores.filter(s => s < 25).length;
    const negative = turn1Scores.filter(s => s >= 25 && s < 50).length;
    const neutral = turn1Scores.filter(s => s >= 50 && s < 75).length;
    const positive = turn1Scores.filter(s => s >= 75).length;
    const total = Math.max(turn1Scores.length, 1);

    // Main score gauges
    const gaugeY = yPos;
    drawGauge(30, gaugeY, avgTurn1, "Turn 1", getScoreColor(avgTurn1));
    drawGauge(70, gaugeY, avgFinal, "Final", getScoreColor(avgFinal));
    
    // Delta indicator
    const deltaColor = delta >= 0 ? colors.success : colors.danger;
    drawBox(115, gaugeY + 5, 40, 20, colors.lightGray, 3);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(deltaColor[0], deltaColor[1], deltaColor[2]);
    doc.text(`${delta >= 0 ? "+" : ""}${delta.toFixed(1)}`, 135, gaugeY + 17, { align: "center" });
    doc.setFontSize(6);
    doc.setTextColor(colors.mediumGray[0], colors.mediumGray[1], colors.mediumGray[2]);
    doc.text("CHANGE", 135, gaugeY + 23, { align: "center" });

    yPos = gaugeY + 45;

    // Distribution title
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
    doc.text("Opinion Distribution", 20, yPos);
    yPos += 10;

    // Visual bar chart for distribution
    const barWidth = pageWidth - 50;
    const categories = [
      { label: "Very Negative (<25)", count: veryNegative, color: colors.danger },
      { label: "Negative (25-50)", count: negative, color: colors.orange },
      { label: "Neutral (50-75)", count: neutral, color: colors.warning },
      { label: "Positive (>75)", count: positive, color: colors.success },
    ];

    categories.forEach((cat) => {
      const pct = (cat.count / total) * 100;
      // Label
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
      doc.text(cat.label, 20, yPos + 3);
      // Bar
      drawProgressBar(70, yPos - 2, barWidth - 50, 6, pct, colors.lightGray, cat.color);
      // Value
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text(`${cat.count} (${pct.toFixed(0)}%)`, pageWidth - 15, yPos + 3, { align: "right" });
      yPos += 12;
    });

    yPos += 10;

    // ============================================
    // MOST FREQUENT ARGUMENTS
    // ============================================
    const argumentCounts = new Map<string, number>();
    simulation.results.forEach(result => {
      const turn = result.turns[0];
      if (turn?.key_reasons) {
        turn.key_reasons.forEach(reason => {
          argumentCounts.set(reason, (argumentCounts.get(reason) || 0) + 1);
        });
      }
    });
    const mostFrequentArgs = Array.from(argumentCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    if (mostFrequentArgs.length > 0) {
      checkPageBreak(60);
      addSectionTitle("Top Arguments", colors.secondary);
      
      const maxCount = mostFrequentArgs[0][1];
      mostFrequentArgs.forEach(([arg, count], idx) => {
        const pct = (count / maxCount) * 100;
        // Rank badge
        doc.setFillColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
        doc.circle(25, yPos, 4, "F");
        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(255, 255, 255);
        doc.text((idx + 1).toString(), 25, yPos + 1.5, { align: "center" });
        // Argument text
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
        const argText = arg.length > 50 ? arg.substring(0, 47) + "..." : arg;
        doc.text(argText, 33, yPos + 1);
        // Bar
        drawProgressBar(33, yPos + 4, 100, 4, pct, colors.lightGray, colors.secondary);
        // Count
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
        doc.text(`${count}`, pageWidth - 20, yPos + 1, { align: "right" });
        yPos += 15;
      });
    }

    // ============================================
    // CLUSTER ANALYSIS
    // ============================================
    simulation.clustersSnapshot.forEach((cluster) => {
      const clusterResults = simulation.results.filter(r => r.clusterId === cluster.id);
      if (clusterResults.length === 0) return;

      doc.addPage();
      yPos = 25;
      addSectionTitle(`${cluster.name}`, colors.primary);

      const clusterScores = clusterResults
        .map(r => r.turns[0]?.stance_score)
        .filter((s): s is number => s !== undefined && !isNaN(s));
      const avgScore = clusterScores.length > 0
        ? clusterScores.reduce((a, b) => a + b, 0) / clusterScores.length
        : 0;
      const minScore = clusterScores.length > 0 ? Math.min(...clusterScores) : 0;
      const maxScore = clusterScores.length > 0 ? Math.max(...clusterScores) : 100;

      // Cluster header cards
      const cCardWidth = (pageWidth - 50) / 4;
      drawMetricCard(20, yPos, cCardWidth - 3, 25, clusterResults.length.toString(), "Agents", colors.primary);
      drawMetricCard(20 + cCardWidth, yPos, cCardWidth - 3, 25, avgScore.toFixed(1), "Avg Score", getScoreColor(avgScore));
      drawMetricCard(20 + cCardWidth * 2, yPos, cCardWidth - 3, 25, `${minScore.toFixed(0)}-${maxScore.toFixed(0)}`, "Range", colors.accent);
      drawMetricCard(20 + cCardWidth * 3, yPos, cCardWidth - 3, 25, `${cluster.weight}%`, "Weight", colors.secondary);
      yPos += 35;

      // Score distribution mini-bar
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
      doc.text("Score Distribution", 20, yPos);
      yPos += 6;
      drawProgressBar(20, yPos, pageWidth - 40, 8, avgScore, colors.lightGray, getScoreColor(avgScore));
      // Min/Max markers
      doc.setFontSize(6);
      doc.setTextColor(colors.mediumGray[0], colors.mediumGray[1], colors.mediumGray[2]);
      doc.text("0", 20, yPos + 12);
      doc.text("100", pageWidth - 20, yPos + 12, { align: "right" });
      yPos += 18;

      // Emotion distribution
      const emotionCounts = new Map<string, number>();
      clusterResults.forEach(r => {
        const emotion = r.turns[0]?.emotion;
        if (emotion) {
          emotionCounts.set(emotion, (emotionCounts.get(emotion) || 0) + 1);
        }
      });
      
      if (emotionCounts.size > 0) {
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
        doc.text("Emotional Profile", 20, yPos);
        yPos += 8;
        
        const emotionColors: { [key: string]: [number, number, number] } = {
          anger: colors.danger,
          fear: colors.orange,
          sadness: [100, 149, 237],
          joy: colors.success,
          trust: colors.accent,
          surprise: colors.warning,
          disgust: [128, 0, 128],
          anticipation: colors.secondary,
        };
        
        const sortedEmotions = Array.from(emotionCounts.entries()).sort((a, b) => b[1] - a[1]);
        const totalEmotions = sortedEmotions.reduce((sum, [, c]) => sum + c, 0);
        
        // Emotion bar segments
        let xOffset = 20;
        sortedEmotions.forEach(([emotion, count]) => {
          const segmentWidth = ((count / totalEmotions) * (pageWidth - 40));
          const emotionColor = emotionColors[emotion.toLowerCase()] || colors.mediumGray;
          drawBox(xOffset, yPos, segmentWidth, 12, emotionColor, 0);
          if (segmentWidth > 25) {
            doc.setFontSize(6);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(255, 255, 255);
            doc.text(`${emotion}`, xOffset + segmentWidth / 2, yPos + 7, { align: "center" });
          }
          xOffset += segmentWidth;
        });
        yPos += 18;
        
        // Legend
        doc.setFontSize(7);
        let legendX = 20;
        sortedEmotions.slice(0, 4).forEach(([emotion, count]) => {
          const emotionColor = emotionColors[emotion.toLowerCase()] || colors.mediumGray;
          doc.setFillColor(emotionColor[0], emotionColor[1], emotionColor[2]);
          doc.circle(legendX + 2, yPos, 2, "F");
          doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
          doc.text(`${emotion}: ${count}`, legendX + 6, yPos + 1);
          legendX += 40;
        });
        yPos += 12;
      }

      // Three Dimensions Analysis - Visual Cards
      const trueBeliefs = clusterResults.map(r => r.turns[0]?.true_belief).filter((b): b is NonNullable<typeof b> => b !== undefined);
      const publicExpressions = clusterResults.map(r => r.turns[0]?.public_expression).filter((e): e is NonNullable<typeof e> => e !== undefined);
      const behavioralActions = clusterResults.map(r => r.turns[0]?.behavioral_action).filter((a): a is NonNullable<typeof a> => a !== undefined);

      const avgInnerStance = trueBeliefs.length > 0
        ? trueBeliefs.reduce((sum, tb) => sum + (tb.inner_stance_score || 0), 0) / trueBeliefs.length
        : 0;
      const avgExpressedStance = publicExpressions.length > 0
        ? publicExpressions.reduce((sum, pe) => sum + (pe.expressed_stance_score || 0), 0) / publicExpressions.length
        : 0;
      const avgActionIntensity = behavioralActions.length > 0
        ? behavioralActions.reduce((sum, ba) => sum + (ba.action_intensity || 0), 0) / behavioralActions.length
        : 0;

      checkPageBreak(50);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
      doc.text("Three Dimensions Analysis", 20, yPos);
      yPos += 10;

      // Dimension cards
      const dimCardWidth = (pageWidth - 50) / 3;
      
      // Think card
      drawBox(20, yPos, dimCardWidth - 3, 40, colors.lightGray, 3);
      doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      doc.rect(20, yPos, dimCardWidth - 3, 6, "F");
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      doc.text("THINK", 20 + (dimCardWidth - 3) / 2, yPos + 4, { align: "center" });
      doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
      doc.setFontSize(14);
      doc.text(avgInnerStance.toFixed(1), 20 + (dimCardWidth - 3) / 2, yPos + 20, { align: "center" });
      doc.setFontSize(6);
      doc.setTextColor(colors.mediumGray[0], colors.mediumGray[1], colors.mediumGray[2]);
      doc.text("Inner Belief Score", 20 + (dimCardWidth - 3) / 2, yPos + 28, { align: "center" });
      drawProgressBar(25, yPos + 32, dimCardWidth - 13, 4, avgInnerStance, [220, 220, 220], colors.primary);

      // Say card
      drawBox(20 + dimCardWidth, yPos, dimCardWidth - 3, 40, colors.lightGray, 3);
      doc.setFillColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
      doc.rect(20 + dimCardWidth, yPos, dimCardWidth - 3, 6, "F");
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      doc.text("SAY", 20 + dimCardWidth + (dimCardWidth - 3) / 2, yPos + 4, { align: "center" });
      doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
      doc.setFontSize(14);
      doc.text(avgExpressedStance.toFixed(1), 20 + dimCardWidth + (dimCardWidth - 3) / 2, yPos + 20, { align: "center" });
      doc.setFontSize(6);
      doc.setTextColor(colors.mediumGray[0], colors.mediumGray[1], colors.mediumGray[2]);
      doc.text("Public Expression", 20 + dimCardWidth + (dimCardWidth - 3) / 2, yPos + 28, { align: "center" });
      drawProgressBar(25 + dimCardWidth, yPos + 32, dimCardWidth - 13, 4, avgExpressedStance, [220, 220, 220], colors.secondary);

      // Do card
      drawBox(20 + dimCardWidth * 2, yPos, dimCardWidth - 3, 40, colors.lightGray, 3);
      doc.setFillColor(colors.accent[0], colors.accent[1], colors.accent[2]);
      doc.rect(20 + dimCardWidth * 2, yPos, dimCardWidth - 3, 6, "F");
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      doc.text("DO", 20 + dimCardWidth * 2 + (dimCardWidth - 3) / 2, yPos + 4, { align: "center" });
      doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
      doc.setFontSize(14);
      doc.text(avgActionIntensity.toFixed(1), 20 + dimCardWidth * 2 + (dimCardWidth - 3) / 2, yPos + 20, { align: "center" });
      doc.setFontSize(6);
      doc.setTextColor(colors.mediumGray[0], colors.mediumGray[1], colors.mediumGray[2]);
      doc.text("Action Intensity", 20 + dimCardWidth * 2 + (dimCardWidth - 3) / 2, yPos + 28, { align: "center" });
      drawProgressBar(25 + dimCardWidth * 2, yPos + 32, dimCardWidth - 13, 4, avgActionIntensity, [220, 220, 220], colors.accent);

      yPos += 50;

      // Sample verbatims
      const verbatims = clusterResults
        .slice(0, 3)
        .map(r => ({ response: r.turns[0]?.response, score: r.turns[0]?.stance_score || 0, emotion: r.turns[0]?.emotion || "" }))
        .filter((v) => v.response !== undefined) as Array<{ response: string; score: number; emotion: string }>;

      if (verbatims.length > 0) {
        checkPageBreak(40);
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
        doc.text("Sample Responses", 20, yPos);
        yPos += 8;

        verbatims.forEach((v) => {
          checkPageBreak(25);
          // Quote box
          drawBox(20, yPos, pageWidth - 40, 20, colors.lightGray, 2);
          // Quote mark
          doc.setFontSize(16);
          doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
          doc.text("\"", 23, yPos + 7);
          // Score badge
          const scoreColor = getScoreColor(v.score);
          doc.setFillColor(scoreColor[0], scoreColor[1], scoreColor[2]);
          doc.roundedRect(pageWidth - 45, yPos + 2, 20, 8, 2, 2, "F");
          doc.setFontSize(7);
          doc.setTextColor(255, 255, 255);
          doc.text(v.score.toFixed(0), pageWidth - 35, yPos + 7, { align: "center" });
          // Text
          doc.setFontSize(8);
          doc.setFont("helvetica", "italic");
          doc.setTextColor(colors.darkGray[0], colors.darkGray[1], colors.darkGray[2]);
          const verbatimText = v.response.length > 120 ? v.response.substring(0, 117) + "..." : v.response;
          const verbLines = doc.splitTextToSize(verbatimText, pageWidth - 70);
          doc.text(verbLines.slice(0, 2), 32, yPos + 8);
          yPos += 24;
        });
      }
    });

    // ============================================
    // INDIVIDUAL RESULTS TABLE
    // ============================================
    doc.addPage();
    yPos = 25;
    addSectionTitle("Individual Agent Results", colors.secondary);

    const agentResultsData = simulation.results.slice(0, 30).map(result => {
      const agent = simulation.panelSnapshot.find(a => a.id === result.agentId);
      const cluster = simulation.clustersSnapshot.find(c => c.id === result.clusterId);
      const turn = result.turns[0];
      return [
        agent?.name || `Agent ${agent?.agentNumber || ""}`,
        cluster?.name?.substring(0, 12) || "",
        turn?.stance_score?.toFixed(0) || "-",
        turn?.confidence?.toFixed(0) || "-",
        turn?.emotion || "-",
        (turn?.response || "").substring(0, 35) + "..."
      ];
    });

    autoTable(doc, {
      startY: yPos,
      head: [["Agent", "Cluster", "Score", "Conf.", "Emotion", "Response"]],
      body: agentResultsData,
      theme: "grid",
      headStyles: { 
        fillColor: colors.secondary, 
        textColor: 255, 
        fontStyle: "bold", 
        fontSize: 8,
        halign: "center"
      },
      styles: { fontSize: 7, cellPadding: 3 },
      columnStyles: { 
        0: { cellWidth: 22 }, 
        1: { cellWidth: 22 }, 
        2: { cellWidth: 14, halign: "center" },
        3: { cellWidth: 14, halign: "center" },
        4: { cellWidth: 18 },
        5: { cellWidth: "auto", fontStyle: "italic" }
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 15, right: 15 },
      didDrawCell: (data: any) => {
        // Color code the score column
        if (data.column.index === 2 && data.section === 'body') {
          const score = parseFloat(data.cell.raw);
          if (!isNaN(score)) {
            const color = getScoreColor(score);
            doc.setFillColor(color[0], color[1], color[2]);
            doc.roundedRect(data.cell.x + 2, data.cell.y + 1.5, data.cell.width - 4, data.cell.height - 3, 1, 1, "F");
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(7);
            doc.setFont("helvetica", "bold");
            doc.text(score.toFixed(0), data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2 + 1, { align: "center" });
          }
        }
      }
    });
    yPos = (doc as any).lastAutoTable.finalY + 10;

    if (simulation.results.length > 30) {
      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(colors.mediumGray[0], colors.mediumGray[1], colors.mediumGray[2]);
      doc.text(`Showing first 30 of ${simulation.results.length} results`, pageWidth / 2, yPos, { align: "center" });
    }

    // ============================================
    // COHERENCE ANALYSIS - Premium Design
    // ============================================
    doc.addPage();
    yPos = 20;
    
    // Full width gradient header
    drawBox(0, 0, pageWidth, 45, colors.primary);
    drawBox(0, 35, pageWidth, 15, colors.secondary);
    
    // Title with icon
    doc.setFillColor(255, 255, 255);
    doc.circle(25, 22, 8, "F");
    doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.circle(25, 22, 5, "F");
    doc.setFillColor(255, 255, 255);
    doc.circle(25, 22, 2, "F");
    
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text("Behavioral Coherence Analysis", 40, 26);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("Understanding the alignment between thoughts, words, and actions", 40, 35);
    
    yPos = 60;

    const coherenceData = simulation.results.map(result => {
      const turn = result.turns[0];
      return {
        coherence: turn?.coherence_score || 0,
        breakdown: turn?.coherence_breakdown
      };
    }).filter(d => d.coherence > 0);

    if (coherenceData.length > 0) {
      const avgOverallCoherence = coherenceData.reduce((sum, d) => sum + d.coherence, 0) / coherenceData.length;
      
      // Breakdown averages
      const thoughtExpressionGaps: number[] = [];
      const thoughtActionGaps: number[] = [];
      const expressionActionGaps: number[] = [];
      
      coherenceData.forEach(d => {
        if (d.breakdown) {
          if (typeof d.breakdown.thought_expression_gap === 'number') {
            thoughtExpressionGaps.push(d.breakdown.thought_expression_gap);
          }
          if (typeof d.breakdown.thought_action_gap === 'number') {
            thoughtActionGaps.push(d.breakdown.thought_action_gap);
          }
          if (typeof d.breakdown.expression_action_gap === 'number') {
            expressionActionGaps.push(d.breakdown.expression_action_gap);
          }
        }
      });

      const avgThoughtExpression = thoughtExpressionGaps.length > 0
        ? thoughtExpressionGaps.reduce((a, b) => a + b, 0) / thoughtExpressionGaps.length
        : 0;
      const avgThoughtAction = thoughtActionGaps.length > 0
        ? thoughtActionGaps.reduce((a, b) => a + b, 0) / thoughtActionGaps.length
        : 0;
      const avgExpressionAction = expressionActionGaps.length > 0
        ? expressionActionGaps.reduce((a, b) => a + b, 0) / expressionActionGaps.length
        : 0;

      const coherenceColor = avgOverallCoherence > 70 ? colors.success : avgOverallCoherence > 40 ? colors.warning : colors.danger;
      
      // Main coherence score - Large circular design
      const centerX = pageWidth / 2;
      
      // Outer decorative ring
      doc.setDrawColor(colors.lightGray[0], colors.lightGray[1], colors.lightGray[2]);
      doc.setLineWidth(8);
      doc.circle(centerX, yPos + 30, 32, "S");
      
      // Colored progress ring
      doc.setDrawColor(coherenceColor[0], coherenceColor[1], coherenceColor[2]);
      doc.setLineWidth(6);
      // Draw arc segments based on coherence
      const segments = 36;
      const filledSegments = Math.round((avgOverallCoherence / 100) * segments);
      for (let i = 0; i < filledSegments; i++) {
        const startAngle = (i / segments) * 2 * Math.PI - Math.PI / 2;
        const endAngle = ((i + 0.8) / segments) * 2 * Math.PI - Math.PI / 2;
        const r = 32;
        doc.line(
          centerX + Math.cos(startAngle) * r,
          yPos + 30 + Math.sin(startAngle) * r,
          centerX + Math.cos(endAngle) * r,
          yPos + 30 + Math.sin(endAngle) * r
        );
      }
      
      // Inner white circle
      doc.setFillColor(255, 255, 255);
      doc.circle(centerX, yPos + 30, 24, "F");
      
      // Score value
      doc.setFontSize(32);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(coherenceColor[0], coherenceColor[1], coherenceColor[2]);
      doc.text(avgOverallCoherence.toFixed(0), centerX, yPos + 35, { align: "center" });
      
      // Label under circle
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(colors.darkGray[0], colors.darkGray[1], colors.darkGray[2]);
      doc.text("OVERALL COHERENCE SCORE", centerX, yPos + 70, { align: "center" });
      
      // Status badge
      const statusText = avgOverallCoherence > 70 ? "HIGH" : avgOverallCoherence > 40 ? "MODERATE" : "LOW";
      const badgeWidth = 35;
      drawBox(centerX - badgeWidth / 2, yPos + 74, badgeWidth, 10, coherenceColor, 5);
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      doc.text(statusText, centerX, yPos + 80, { align: "center" });
      
      yPos += 95;

      // Divider line
      doc.setDrawColor(colors.lightGray[0], colors.lightGray[1], colors.lightGray[2]);
      doc.setLineWidth(0.5);
      doc.line(30, yPos, pageWidth - 30, yPos);
      yPos += 15;

      // Gap analysis section title
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
      doc.text("Gap Analysis", 20, yPos);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(colors.mediumGray[0], colors.mediumGray[1], colors.mediumGray[2]);
      doc.text("Lower values indicate better alignment", 20, yPos + 6);
      yPos += 15;

      const gapCardWidth = (pageWidth - 55) / 3;
      const gapCardHeight = 55;
      
      // Gap Card 1: Think → Say
      const teColor = avgThoughtExpression < 15 ? colors.success : avgThoughtExpression < 30 ? colors.warning : colors.danger;
      drawBox(20, yPos, gapCardWidth, gapCardHeight, colors.white, 4);
      doc.setDrawColor(teColor[0], teColor[1], teColor[2]);
      doc.setLineWidth(0.5);
      doc.roundedRect(20, yPos, gapCardWidth, gapCardHeight, 4, 4, "S");
      // Top colored bar
      doc.setFillColor(teColor[0], teColor[1], teColor[2]);
      doc.rect(20, yPos, gapCardWidth, 4, "F");
      // Icon
      doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      doc.circle(20 + gapCardWidth / 2 - 12, yPos + 18, 5, "F");
      doc.setFontSize(7);
      doc.setTextColor(255, 255, 255);
      doc.text("T", 20 + gapCardWidth / 2 - 12, yPos + 20, { align: "center" });
      // Arrow
      doc.setFontSize(10);
      doc.setTextColor(colors.mediumGray[0], colors.mediumGray[1], colors.mediumGray[2]);
      doc.text("->", 20 + gapCardWidth / 2, yPos + 20, { align: "center" });
      // Icon 2
      doc.setFillColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
      doc.circle(20 + gapCardWidth / 2 + 12, yPos + 18, 5, "F");
      doc.setFontSize(7);
      doc.setTextColor(255, 255, 255);
      doc.text("S", 20 + gapCardWidth / 2 + 12, yPos + 20, { align: "center" });
      // Value
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(teColor[0], teColor[1], teColor[2]);
      doc.text(avgThoughtExpression.toFixed(1), 20 + gapCardWidth / 2, yPos + 38, { align: "center" });
      // Label
      doc.setFontSize(7);
      doc.setTextColor(colors.darkGray[0], colors.darkGray[1], colors.darkGray[2]);
      doc.text("THINK -> SAY GAP", 20 + gapCardWidth / 2, yPos + 48, { align: "center" });

      // Gap Card 2: Think → Do
      const taColor = avgThoughtAction < 15 ? colors.success : avgThoughtAction < 30 ? colors.warning : colors.danger;
      const card2X = 25 + gapCardWidth;
      drawBox(card2X, yPos, gapCardWidth, gapCardHeight, colors.white, 4);
      doc.setDrawColor(taColor[0], taColor[1], taColor[2]);
      doc.roundedRect(card2X, yPos, gapCardWidth, gapCardHeight, 4, 4, "S");
      doc.setFillColor(taColor[0], taColor[1], taColor[2]);
      doc.rect(card2X, yPos, gapCardWidth, 4, "F");
      // Icons
      doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      doc.circle(card2X + gapCardWidth / 2 - 12, yPos + 18, 5, "F");
      doc.setFontSize(7);
      doc.setTextColor(255, 255, 255);
      doc.text("T", card2X + gapCardWidth / 2 - 12, yPos + 20, { align: "center" });
      doc.setFontSize(10);
      doc.setTextColor(colors.mediumGray[0], colors.mediumGray[1], colors.mediumGray[2]);
      doc.text("->", card2X + gapCardWidth / 2, yPos + 20, { align: "center" });
      doc.setFillColor(colors.accent[0], colors.accent[1], colors.accent[2]);
      doc.circle(card2X + gapCardWidth / 2 + 12, yPos + 18, 5, "F");
      doc.setFontSize(7);
      doc.setTextColor(255, 255, 255);
      doc.text("D", card2X + gapCardWidth / 2 + 12, yPos + 20, { align: "center" });
      // Value
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(taColor[0], taColor[1], taColor[2]);
      doc.text(avgThoughtAction.toFixed(1), card2X + gapCardWidth / 2, yPos + 38, { align: "center" });
      doc.setFontSize(7);
      doc.setTextColor(colors.darkGray[0], colors.darkGray[1], colors.darkGray[2]);
      doc.text("THINK -> DO GAP", card2X + gapCardWidth / 2, yPos + 48, { align: "center" });

      // Gap Card 3: Say → Do
      const eaColor = avgExpressionAction < 15 ? colors.success : avgExpressionAction < 30 ? colors.warning : colors.danger;
      const card3X = 30 + gapCardWidth * 2;
      drawBox(card3X, yPos, gapCardWidth, gapCardHeight, colors.white, 4);
      doc.setDrawColor(eaColor[0], eaColor[1], eaColor[2]);
      doc.roundedRect(card3X, yPos, gapCardWidth, gapCardHeight, 4, 4, "S");
      doc.setFillColor(eaColor[0], eaColor[1], eaColor[2]);
      doc.rect(card3X, yPos, gapCardWidth, 4, "F");
      // Icons
      doc.setFillColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
      doc.circle(card3X + gapCardWidth / 2 - 12, yPos + 18, 5, "F");
      doc.setFontSize(7);
      doc.setTextColor(255, 255, 255);
      doc.text("S", card3X + gapCardWidth / 2 - 12, yPos + 20, { align: "center" });
      doc.setFontSize(10);
      doc.setTextColor(colors.mediumGray[0], colors.mediumGray[1], colors.mediumGray[2]);
      doc.text("->", card3X + gapCardWidth / 2, yPos + 20, { align: "center" });
      doc.setFillColor(colors.accent[0], colors.accent[1], colors.accent[2]);
      doc.circle(card3X + gapCardWidth / 2 + 12, yPos + 18, 5, "F");
      doc.setFontSize(7);
      doc.setTextColor(255, 255, 255);
      doc.text("D", card3X + gapCardWidth / 2 + 12, yPos + 20, { align: "center" });
      // Value
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(eaColor[0], eaColor[1], eaColor[2]);
      doc.text(avgExpressionAction.toFixed(1), card3X + gapCardWidth / 2, yPos + 38, { align: "center" });
      doc.setFontSize(7);
      doc.setTextColor(colors.darkGray[0], colors.darkGray[1], colors.darkGray[2]);
      doc.text("SAY -> DO GAP", card3X + gapCardWidth / 2, yPos + 48, { align: "center" });

      yPos += gapCardHeight + 15;

      // Legend
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      let legendX = 25;
      // T
      doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      doc.circle(legendX, yPos, 3, "F");
      doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
      doc.text("T = Think (Inner Belief)", legendX + 5, yPos + 1);
      // S
      legendX += 50;
      doc.setFillColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
      doc.circle(legendX, yPos, 3, "F");
      doc.text("S = Say (Public Expression)", legendX + 5, yPos + 1);
      // D
      legendX += 55;
      doc.setFillColor(colors.accent[0], colors.accent[1], colors.accent[2]);
      doc.circle(legendX, yPos, 3, "F");
      doc.text("D = Do (Behavioral Action)", legendX + 5, yPos + 1);
      
      yPos += 20;

      // Interpretation box - Better design
      const interpTitle = avgOverallCoherence > 70 ? "HIGH COHERENCE" : avgOverallCoherence > 40 ? "MODERATE COHERENCE" : "LOW COHERENCE";
      const interpText = avgOverallCoherence > 70
        ? "Agents express views that are consistent with their true beliefs and are highly likely to act accordingly. The opinions gathered are authentic, reliable, and predictable."
        : avgOverallCoherence > 40
        ? "Some degree of social filtering is observed between internal beliefs and public expressions. There may be variations between what agents say and what they ultimately do."
        : "Significant gaps exist between thoughts, words, and actions. Social pressure, strategic behavior, or other factors may be influencing the authenticity of responses.";
      
      const interpColor = avgOverallCoherence > 70 ? colors.success : avgOverallCoherence > 40 ? colors.warning : colors.danger;
      
      // Card with colored left border
      drawBox(20, yPos, pageWidth - 40, 45, colors.lightGray, 4);
      doc.setFillColor(interpColor[0], interpColor[1], interpColor[2]);
      doc.rect(20, yPos, 5, 45, "F");
      
      // Status icon
      doc.setFillColor(interpColor[0], interpColor[1], interpColor[2]);
      doc.circle(35, yPos + 12, 6, "F");
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      const statusIcon = avgOverallCoherence > 70 ? "+" : avgOverallCoherence > 40 ? "!" : "-";
      doc.text(statusIcon, 35, yPos + 14, { align: "center" });
      
      // Title
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(interpColor[0], interpColor[1], interpColor[2]);
      doc.text(interpTitle, 48, yPos + 14);
      
      // Description
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(colors.darkGray[0], colors.darkGray[1], colors.darkGray[2]);
      const interpretLines = doc.splitTextToSize(interpText, pageWidth - 75);
      doc.text(interpretLines, 30, yPos + 26);
    }

    // ============================================
    // FOOTER
    // ============================================
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(colors.mediumGray[0], colors.mediumGray[1], colors.mediumGray[2]);
      doc.text(
        `Page ${i} of ${totalPages} | Generated by Marcus Opinion Simulation Platform`,
        pageWidth / 2,
        pageHeight - 10,
        { align: "center" }
      );
    }

    // Save PDF
    doc.save(`${simulation.title.replace(/\s+/g, "_")}_Report.pdf`);
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="animate-fade-in">
          <p className="text-gray-400">Loading...</p>
        </div>
      </MainLayout>
    );
  }

  if (!simulation) {
    return (
      <MainLayout>
        <div className="animate-fade-in">
          <p className="text-red-400">Simulation not found</p>
          <Link href="/simulations">
            <Button className="mt-4">Back to simulations</Button>
          </Link>
        </div>
      </MainLayout>
    );
  }

  try {
    // Calculate global statistics
    const turn1Scores = simulation.results
      .map(r => r.turns[0]?.stance_score)
      .filter((s): s is number => s !== undefined && !isNaN(s));
    const finalTurnScores = simulation.results
      .map(r => {
        const turns = r.turns;
        return turns[turns.length - 1]?.stance_score;
      })
      .filter((s): s is number => s !== undefined && !isNaN(s));
    
    const avgTurn1 = turn1Scores.length > 0 
      ? turn1Scores.reduce((a, b) => a + b, 0) / turn1Scores.length 
      : 0;
    const avgFinal = finalTurnScores.length > 0 
      ? finalTurnScores.reduce((a, b) => a + b, 0) / finalTurnScores.length 
      : avgTurn1; // Use turn1 if no final turn
    const delta = avgFinal - avgTurn1;

    // Score distribution
    const veryNegative = turn1Scores.filter(s => s < 25).length;
    const negative = turn1Scores.filter(s => s >= 25 && s < 50).length;
    const neutral = turn1Scores.filter(s => s >= 50 && s < 75).length;
    const positive = turn1Scores.filter(s => s >= 75).length;
    const total = Math.max(turn1Scores.length, 1); // Prevent division by zero

    // Most frequent arguments
    const argumentCounts = new Map<string, number>();
    simulation.results.forEach(result => {
      const turn = result.turns[0];
      if (turn?.key_reasons) {
        turn.key_reasons.forEach(reason => {
          argumentCounts.set(reason, (argumentCounts.get(reason) || 0) + 1);
        });
      }
    });
    const mostFrequentArgs = Array.from(argumentCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return (
      <MainLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header with Export Buttons */}
        <div className="flex items-center justify-between">
          <Link href="/simulations">
            <Button variant="ghost" size="sm">
              <ArrowLeftIcon className="w-4 h-4 mr-2 inline" />
              Back
            </Button>
          </Link>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportPDF}>
              Export PDF
            </Button>
            <Button variant="outline" size="sm" onClick={exportJSON}>
              Export JSON
            </Button>
            <Button variant="outline" size="sm" onClick={exportCSV}>
              Export CSV
            </Button>
          </div>
        </div>

        {/* Header */}
        <Card gradient>
          <h1 className="text-3xl font-bold text-white mb-2">{simulation.title}</h1>
          <p className="text-gray-400 mb-4 text-lg">{simulation.scenario}</p>
          <div className="flex items-center gap-4 text-sm text-gray-400">
            <span>
              {simulation.panelSnapshot.length} agent{simulation.panelSnapshot.length > 1 ? "s" : ""}
            </span>
            <span>
              {new Date(simulation.createdAt).toLocaleDateString("en-US", {
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        </Card>

        {/* Executive Summary */}
        {simulation.executiveSummary && (
          <Card>
            <h2 className="text-xl font-semibold text-white mb-4">Executive Summary</h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 leading-relaxed whitespace-pre-line">
                {simulation.executiveSummary}
              </p>
            </div>
          </Card>
        )}

        {/* Global Summary */}
        <Card>
          <h2 className="text-xl font-semibold text-white mb-4">Global Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="p-4 rounded-lg bg-white/5 border border-white/10">
              <p className="text-sm text-gray-400 mb-1">Average Score Turn 1</p>
              <p className="text-2xl font-bold text-white">{avgTurn1.toFixed(1)}</p>
            </div>
            <div className="p-4 rounded-lg bg-white/5 border border-white/10">
              <p className="text-sm text-gray-400 mb-1">Average Score Final Turn</p>
              <p className="text-2xl font-bold text-white">{avgFinal.toFixed(1)}</p>
            </div>
            <div className="p-4 rounded-lg bg-white/5 border border-white/10">
              <p className="text-sm text-gray-400 mb-1">Delta</p>
              <p className={`text-2xl font-bold ${delta >= 0 ? "text-green-400" : "text-red-400"}`}>
                {delta >= 0 ? "+" : ""}{delta.toFixed(1)}
              </p>
            </div>
          </div>

          {/* Score Distribution */}
          <div>
            <h3 className="text-lg font-medium text-white mb-3">Score Distribution (Turn 1)</h3>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-300">Very negative (&lt;25)</span>
                  <span className="text-sm text-white font-medium">{veryNegative} agents</span>
                </div>
                <div className="w-full bg-white/5 rounded-full h-6">
                  <div
                    className="bg-red-500 h-6 rounded-full flex items-center justify-end pr-2"
                    style={{ width: `${total > 0 ? (veryNegative / total) * 100 : 0}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-300">Negative (25-50)</span>
                  <span className="text-sm text-white font-medium">{negative} agents</span>
                </div>
                <div className="w-full bg-white/5 rounded-full h-6">
                  <div
                    className="bg-orange-500 h-6 rounded-full flex items-center justify-end pr-2"
                    style={{ width: `${total > 0 ? (negative / total) * 100 : 0}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-300">Neutral (50-75)</span>
                  <span className="text-sm text-white font-medium">{neutral} agents</span>
                </div>
                <div className="w-full bg-white/5 rounded-full h-6">
                  <div
                    className="bg-yellow-500 h-6 rounded-full flex items-center justify-end pr-2"
                    style={{ width: `${total > 0 ? (neutral / total) * 100 : 0}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-300">Positive (&gt;75)</span>
                  <span className="text-sm text-white font-medium">{positive} agents</span>
                </div>
                <div className="w-full bg-white/5 rounded-full h-6">
                  <div
                    className="bg-green-500 h-6 rounded-full flex items-center justify-end pr-2"
                    style={{ width: `${total > 0 ? (positive / total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Most Frequent Arguments */}
        {mostFrequentArgs.length > 0 && (
          <Card>
            <h2 className="text-xl font-semibold text-white mb-4">Most Frequent Arguments</h2>
            <div className="space-y-2">
              {mostFrequentArgs.map(([arg, count], index) => (
                <div key={index} className="p-3 rounded-lg bg-white/5 border border-white/10">
                  <p className="text-gray-300">
                    {arg} <span className="text-primary-400">({count} mention{count > 1 ? "s" : ""})</span>
                  </p>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Results by Cluster */}
        <Card>
          <h2 className="text-xl font-semibold text-white mb-4">Results by Cluster</h2>
          <div className="space-y-8">
            {simulation.clustersSnapshot.map((cluster) => {
              const clusterResults = simulation.results.filter(r => r.clusterId === cluster.id);
              if (clusterResults.length === 0) return null;

              const clusterScores = clusterResults
                .map(r => r.turns[0]?.stance_score)
                .filter((s): s is number => s !== undefined && !isNaN(s));
              const avgScore = clusterScores.length > 0
                ? clusterScores.reduce((a, b) => a + b, 0) / clusterScores.length
                : 0;
              const minScore = clusterScores.length > 0 ? Math.min(...clusterScores) : 0;
              const maxScore = clusterScores.length > 0 ? Math.max(...clusterScores) : 100;

              // Emotion distribution
              const emotionCounts = new Map<string, number>();
              clusterResults.forEach(r => {
                const emotion = r.turns[0]?.emotion;
                if (emotion) {
                  emotionCounts.set(emotion, (emotionCounts.get(emotion) || 0) + 1);
                }
              });

              // Three Dimensions Analysis
              const trueBeliefs = clusterResults.map(r => r.turns[0]?.true_belief).filter((b): b is NonNullable<typeof b> => b !== undefined);
              const publicExpressions = clusterResults.map(r => r.turns[0]?.public_expression).filter((e): e is NonNullable<typeof e> => e !== undefined);
              const behavioralActions = clusterResults.map(r => r.turns[0]?.behavioral_action).filter((a): a is NonNullable<typeof a> => a !== undefined);

              // Core values aggregation
              const coreValuesCounts = new Map<string, number>();
              trueBeliefs.forEach(tb => {
                if (tb.core_values_impact) {
                  const values = tb.core_values_impact.toLowerCase().split(/[,\s]+/);
                  values.forEach(v => {
                    if (v.length > 3) {
                      coreValuesCounts.set(v, (coreValuesCounts.get(v) || 0) + 1);
                    }
                  });
                }
              });

              // Cognitive biases aggregation
              const biasCounts = new Map<string, number>();
              trueBeliefs.forEach(tb => {
                if (tb.cognitive_biases) {
                  tb.cognitive_biases.forEach(bias => {
                    biasCounts.set(bias, (biasCounts.get(bias) || 0) + 1);
                  });
                }
              });

              // Filter reasons aggregation
              const filterReasonCounts = new Map<string, number>();
              publicExpressions.forEach(pe => {
                if (pe.filter_reasons) {
                  pe.filter_reasons.forEach(reason => {
                    filterReasonCounts.set(reason, (filterReasonCounts.get(reason) || 0) + 1);
                  });
                }
              });

              // Expression context distribution
              const contextCounts = new Map<string, number>();
              publicExpressions.forEach(pe => {
                if (pe.context) {
                  contextCounts.set(pe.context, (contextCounts.get(pe.context) || 0) + 1);
                }
              });

              // Action type distribution
              const actionTypeCounts = new Map<string, number>();
              behavioralActions.forEach(ba => {
                if (ba.action_type) {
                  actionTypeCounts.set(ba.action_type, (actionTypeCounts.get(ba.action_type) || 0) + 1);
                }
              });

              const avgInnerStance = trueBeliefs.length > 0
                ? trueBeliefs.reduce((sum, tb) => sum + (tb.inner_stance_score || 0), 0) / trueBeliefs.length
                : 0;
              const selfAwarenessValues = trueBeliefs.filter(tb => tb.self_awareness !== undefined).map(tb => tb.self_awareness!);
              const avgSelfAwareness = selfAwarenessValues.length > 0
                ? selfAwarenessValues.reduce((sum, val) => sum + val, 0) / selfAwarenessValues.length
                : 0;
              const avgExpressedStance = publicExpressions.length > 0
                ? publicExpressions.reduce((sum, pe) => sum + (pe.expressed_stance_score || 0), 0) / publicExpressions.length
                : 0;
              const modifierValues = publicExpressions.filter(pe => pe.expression_modifier !== undefined).map(pe => pe.expression_modifier!);
              const avgModifier = modifierValues.length > 0
                ? modifierValues.reduce((sum, val) => sum + val, 0) / modifierValues.length
                : 0;
              const avgActionIntensity = behavioralActions.length > 0
                ? behavioralActions.reduce((sum, ba) => sum + (ba.action_intensity || 0), 0) / behavioralActions.length
                : 0;
              const coherenceScores = clusterResults
                .map(r => r.turns[0]?.coherence_score)
                .filter((c): c is number => c !== undefined);
              const avgCoherence = coherenceScores.length > 0
                ? coherenceScores.reduce((sum, c) => sum + c, 0) / coherenceScores.length
                : 0;

              // Sample verbatims
              const verbatims = clusterResults
                .slice(0, 5)
                .map(r => r.turns[0]?.response)
                .filter((r): r is string => r !== undefined);

              return (
                <div key={cluster.id} className="p-6 rounded-lg bg-white/5 border border-white/10">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold text-white">{cluster.name} ({clusterResults.length} agents)</h3>
                    <div className="text-right">
                      <p className="text-lg font-bold text-white">
                        Average Score: {avgScore.toFixed(1)} (Min/Max {minScore.toFixed(0)}/{maxScore.toFixed(0)})
                      </p>
                    </div>
                  </div>

                  {/* Emotion Distribution */}
                  {emotionCounts.size > 0 && (
                    <div className="mb-4">
                      <p className="text-sm text-gray-400 mb-2">Distribution:</p>
                      <div className="flex flex-wrap gap-2">
                        {Array.from(emotionCounts.entries())
                          .sort((a, b) => b[1] - a[1])
                          .map(([emotion, count]) => (
                            <span key={emotion} className="text-xs px-2 py-1 rounded-full bg-primary-500/20 text-primary-300">
                              {emotion}: {count}
                            </span>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Three Dimensions Analysis */}
                  <div className="space-y-6 mt-6">
                    <div>
                      <h4 className="text-lg font-semibold text-white mb-3">Three Dimensions Analysis</h4>
                      
                      {/* 1. What they really think */}
                      <div className="mb-4 p-4 rounded-lg bg-white/5 border border-white/10">
                        <h5 className="font-semibold text-white mb-3">1. What they really think:</h5>
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="text-gray-400">Average score (true belief):</span>
                            <span className="text-white ml-2">{avgInnerStance.toFixed(1)}/100</span>
                          </div>
                          {avgSelfAwareness > 0 && (
                            <div>
                              <span className="text-gray-400">Average self-awareness:</span>
                              <span className="text-white ml-2">{avgSelfAwareness.toFixed(1)}/100</span>
                            </div>
                          )}
                          {coreValuesCounts.size > 0 && (
                            <div>
                              <span className="text-gray-400">Most impactful core values:</span>
                              <div className="flex flex-wrap gap-2 mt-1">
                                {Array.from(coreValuesCounts.entries())
                                  .sort((a, b) => b[1] - a[1])
                                  .slice(0, 5)
                                  .map(([value, count]) => (
                                    <span key={value} className="text-xs px-2 py-1 rounded bg-primary-500/20 text-primary-300">
                                      {value} ({count})
                                    </span>
                                  ))}
                              </div>
                            </div>
                          )}
                          {biasCounts.size > 0 && (
                            <div>
                              <span className="text-gray-400">Most frequent cognitive biases:</span>
                              <div className="flex flex-wrap gap-2 mt-1">
                                {Array.from(biasCounts.entries())
                                  .sort((a, b) => b[1] - a[1])
                                  .slice(0, 3)
                                  .map(([bias, count]) => (
                                    <span key={bias} className="text-xs px-2 py-1 rounded bg-primary-500/20 text-primary-300">
                                      {bias} ({count})
                                    </span>
                                  ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 2. What they will say */}
                      <div className="mb-4 p-4 rounded-lg bg-white/5 border border-white/10">
                        <h5 className="font-semibold text-white mb-3">2. What they will say:</h5>
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="text-gray-400">Average score (public expression):</span>
                            <span className="text-white ml-2">{avgExpressedStance.toFixed(1)}/100</span>
                          </div>
                          {avgModifier !== 0 && (
                            <div>
                              <span className="text-gray-400">Average modifier:</span>
                              <span className="text-white ml-2">{avgModifier >= 0 ? "+" : ""}{avgModifier.toFixed(1)}</span>
                            </div>
                          )}
                          {filterReasonCounts.size > 0 && (
                            <div>
                              <span className="text-gray-400">Filter reasons:</span>
                              <div className="flex flex-wrap gap-2 mt-1">
                                {Array.from(filterReasonCounts.entries())
                                  .sort((a, b) => b[1] - a[1])
                                  .slice(0, 5)
                                  .map(([reason, count]) => (
                                    <span key={reason} className="text-xs px-2 py-1 rounded bg-primary-500/20 text-primary-300">
                                      {reason} ({count})
                                    </span>
                                  ))}
                              </div>
                            </div>
                          )}
                          {contextCounts.size > 0 && (
                            <div>
                              <span className="text-gray-400">Expression context:</span>
                              <div className="flex flex-wrap gap-2 mt-1">
                                {Array.from(contextCounts.entries())
                                  .sort((a, b) => b[1] - a[1])
                                  .map(([context, count]) => (
                                    <span key={context} className="text-xs px-2 py-1 rounded bg-primary-500/20 text-primary-300">
                                      {context} ({count})
                                    </span>
                                  ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 3. What they will do */}
                      <div className="mb-4 p-4 rounded-lg bg-white/5 border border-white/10">
                        <h5 className="font-semibold text-white mb-3">3. What they will do:</h5>
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="text-gray-400">Average action intensity:</span>
                            <span className="text-white ml-2">{avgActionIntensity.toFixed(1)}/100</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Action types:</span>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {Array.from(actionTypeCounts.entries())
                                .sort((a, b) => b[1] - a[1])
                                .map(([actionType, count]) => (
                                  <span key={actionType} className="text-xs px-2 py-1 rounded bg-primary-500/20 text-primary-300">
                                    {actionType.replace(/_/g, " ")} ({count})
                                  </span>
                                ))}
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-400">Average Coherence:</span>
                            <span className="text-white ml-2">{avgCoherence.toFixed(1)}/100</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Action Distribution:</span>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {Array.from(actionTypeCounts.entries())
                                .sort((a, b) => b[1] - a[1])
                                .map(([actionType, count]) => (
                                  <span key={actionType} className="text-xs text-gray-300">
                                    {actionType.replace(/_/g, " ")} ({count})
                                  </span>
                                ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Verbatims */}
                  {verbatims.length > 0 && (
                    <div className="mt-6 pt-6 border-t border-white/10">
                      <h5 className="font-semibold text-white mb-3">Verbatims (sample):</h5>
                      <ul className="space-y-2">
                        {verbatims.map((verbatim, idx) => (
                          <li key={idx} className="text-sm text-gray-300 list-disc list-inside">
                            {verbatim}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      </div>
      </MainLayout>
    );
  } catch (error) {
    console.error("Error rendering simulation details:", error);
    return (
      <MainLayout>
        <div className="animate-fade-in">
          <Card>
            <h1 className="text-2xl font-bold text-white mb-4">Error Loading Simulation</h1>
            <p className="text-red-400 mb-4">
              {error instanceof Error ? error.message : "An unknown error occurred"}
            </p>
            <Link href="/simulations">
              <Button>Back to simulations</Button>
            </Link>
          </Card>
        </div>
      </MainLayout>
    );
  }
}
