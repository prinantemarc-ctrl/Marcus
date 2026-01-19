import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET - List clusters (optionally filtered by zoneId)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const zoneId = searchParams.get("zoneId");

    const clusters = await prisma.cluster.findMany({
      where: {
        ...(zoneId && { zoneId }),
        zone: session.user.role === "ADMIN" ? {} : { userId: session.user.id },
      },
      include: {
        zone: {
          select: { id: true, name: true }
        },
        _count: {
          select: { agents: true }
        }
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ clusters });
  } catch (error) {
    console.error("Error fetching clusters:", error);
    return NextResponse.json(
      { error: "Failed to fetch clusters" },
      { status: 500 }
    );
  }
}

// POST - Create a new cluster
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, descriptionPrompt, weight, zoneId } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { error: "Cluster name is required" },
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

    const cluster = await prisma.cluster.create({
      data: {
        name: name.trim(),
        descriptionPrompt: descriptionPrompt?.trim() || "",
        weight: weight || 0,
        zoneId,
      },
    });

    return NextResponse.json({ cluster }, { status: 201 });
  } catch (error) {
    console.error("Error creating cluster:", error);
    return NextResponse.json(
      { error: "Failed to create cluster" },
      { status: 500 }
    );
  }
}

// POST - Batch create clusters
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { clusters: clustersData, zoneId } = body;

    if (!zoneId) {
      return NextResponse.json(
        { error: "Zone ID is required" },
        { status: 400 }
      );
    }

    if (!Array.isArray(clustersData) || clustersData.length === 0) {
      return NextResponse.json(
        { error: "Clusters data is required" },
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

    // Create all clusters
    const clusters = await prisma.cluster.createMany({
      data: clustersData.map((c: { name: string; descriptionPrompt: string; weight: number }) => ({
        name: c.name.trim(),
        descriptionPrompt: c.descriptionPrompt?.trim() || "",
        weight: c.weight || 0,
        zoneId,
      })),
    });

    // Fetch the created clusters
    const createdClusters = await prisma.cluster.findMany({
      where: { zoneId },
      orderBy: { createdAt: "desc" },
      take: clustersData.length,
    });

    return NextResponse.json({ clusters: createdClusters }, { status: 201 });
  } catch (error) {
    console.error("Error batch creating clusters:", error);
    return NextResponse.json(
      { error: "Failed to create clusters" },
      { status: 500 }
    );
  }
}
