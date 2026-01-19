import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST - Add results to a simulation
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const simulation = await prisma.simulation.findUnique({
      where: { id: params.id },
    });

    if (!simulation) {
      return NextResponse.json({ error: "Simulation not found" }, { status: 404 });
    }

    if (session.user.role !== "ADMIN" && simulation.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { results } = body;

    if (!Array.isArray(results) || results.length === 0) {
      return NextResponse.json(
        { error: "Results data is required" },
        { status: 400 }
      );
    }

    // Create all results
    const createdResults = await prisma.$transaction(
      results.map((r: { agentId: string; clusterId: string; turns: unknown }) =>
        prisma.simulationResult.create({
          data: {
            simulationId: params.id,
            agentId: r.agentId,
            clusterId: r.clusterId,
            turns: r.turns,
          },
        })
      )
    );

    // Update simulation status to completed
    await prisma.simulation.update({
      where: { id: params.id },
      data: { status: "COMPLETED" },
    });

    return NextResponse.json({ results: createdResults }, { status: 201 });
  } catch (error) {
    console.error("Error adding simulation results:", error);
    return NextResponse.json(
      { error: "Failed to add simulation results" },
      { status: 500 }
    );
  }
}
