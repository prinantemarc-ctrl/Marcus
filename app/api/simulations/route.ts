import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET - List simulations
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const zoneId = searchParams.get("zoneId");

    const simulations = await prisma.simulation.findMany({
      where: {
        ...(zoneId && { zoneId }),
        ...(session.user.role !== "ADMIN" && { userId: session.user.id }),
      },
      include: {
        zone: {
          select: { id: true, name: true }
        },
        _count: {
          select: { results: true }
        }
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ simulations });
  } catch (error) {
    console.error("Error fetching simulations:", error);
    return NextResponse.json(
      { error: "Failed to fetch simulations" },
      { status: 500 }
    );
  }
}

// POST - Create a new simulation
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { title, scenario, zoneId, clustersSnapshot, panelSnapshot } = body;

    if (!title?.trim()) {
      return NextResponse.json(
        { error: "Simulation title is required" },
        { status: 400 }
      );
    }

    if (!scenario?.trim()) {
      return NextResponse.json(
        { error: "Scenario is required" },
        { status: 400 }
      );
    }

    if (!zoneId) {
      return NextResponse.json(
        { error: "Zone ID is required" },
        { status: 400 }
      );
    }

    // Check zone ownership
    const zone = await prisma.zone.findUnique({
      where: { id: zoneId },
    });

    if (!zone) {
      return NextResponse.json({ error: "Zone not found" }, { status: 404 });
    }

    if (session.user.role !== "ADMIN" && zone.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const simulation = await prisma.simulation.create({
      data: {
        title: title.trim(),
        scenario: scenario.trim(),
        status: "PENDING",
        zoneId,
        userId: session.user.id,
        clustersSnapshot: clustersSnapshot || null,
        panelSnapshot: panelSnapshot || null,
      },
    });

    return NextResponse.json({ simulation }, { status: 201 });
  } catch (error) {
    console.error("Error creating simulation:", error);
    return NextResponse.json(
      { error: "Failed to create simulation" },
      { status: 500 }
    );
  }
}
