import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET - Get a single simulation with results
export async function GET(
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
      include: {
        zone: true,
        results: {
          include: {
            agent: true,
            cluster: true,
          },
        },
      },
    });

    if (!simulation) {
      return NextResponse.json({ error: "Simulation not found" }, { status: 404 });
    }

    if (session.user.role !== "ADMIN" && simulation.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ simulation });
  } catch (error) {
    console.error("Error fetching simulation:", error);
    return NextResponse.json(
      { error: "Failed to fetch simulation" },
      { status: 500 }
    );
  }
}

// PUT - Update a simulation (status, executive summary, etc.)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const existingSimulation = await prisma.simulation.findUnique({
      where: { id: params.id },
    });

    if (!existingSimulation) {
      return NextResponse.json({ error: "Simulation not found" }, { status: 404 });
    }

    if (session.user.role !== "ADMIN" && existingSimulation.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { status, executiveSummary, clustersSnapshot, panelSnapshot } = body;

    const simulation = await prisma.simulation.update({
      where: { id: params.id },
      data: {
        ...(status && { status }),
        ...(executiveSummary !== undefined && { executiveSummary }),
        ...(clustersSnapshot !== undefined && { clustersSnapshot }),
        ...(panelSnapshot !== undefined && { panelSnapshot }),
      },
    });

    return NextResponse.json({ simulation });
  } catch (error) {
    console.error("Error updating simulation:", error);
    return NextResponse.json(
      { error: "Failed to update simulation" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a simulation
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const existingSimulation = await prisma.simulation.findUnique({
      where: { id: params.id },
    });

    if (!existingSimulation) {
      return NextResponse.json({ error: "Simulation not found" }, { status: 404 });
    }

    if (session.user.role !== "ADMIN" && existingSimulation.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.simulation.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting simulation:", error);
    return NextResponse.json(
      { error: "Failed to delete simulation" },
      { status: 500 }
    );
  }
}
