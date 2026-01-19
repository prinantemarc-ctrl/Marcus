import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET - Get a single cluster by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const cluster = await prisma.cluster.findUnique({
      where: { id: params.id },
      include: {
        zone: true,
        agents: true,
        _count: {
          select: { agents: true }
        }
      },
    });

    if (!cluster) {
      return NextResponse.json({ error: "Cluster not found" }, { status: 404 });
    }

    // Check ownership
    if (session.user.role !== "ADMIN" && cluster.zone.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ cluster });
  } catch (error) {
    console.error("Error fetching cluster:", error);
    return NextResponse.json(
      { error: "Failed to fetch cluster" },
      { status: 500 }
    );
  }
}

// PUT - Update a cluster
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const existingCluster = await prisma.cluster.findUnique({
      where: { id: params.id },
      include: { zone: true },
    });

    if (!existingCluster) {
      return NextResponse.json({ error: "Cluster not found" }, { status: 404 });
    }

    if (session.user.role !== "ADMIN" && existingCluster.zone.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { name, descriptionPrompt, weight } = body;

    const cluster = await prisma.cluster.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(descriptionPrompt !== undefined && { descriptionPrompt: descriptionPrompt.trim() }),
        ...(weight !== undefined && { weight }),
      },
    });

    return NextResponse.json({ cluster });
  } catch (error) {
    console.error("Error updating cluster:", error);
    return NextResponse.json(
      { error: "Failed to update cluster" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a cluster
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const existingCluster = await prisma.cluster.findUnique({
      where: { id: params.id },
      include: { zone: true },
    });

    if (!existingCluster) {
      return NextResponse.json({ error: "Cluster not found" }, { status: 404 });
    }

    if (session.user.role !== "ADMIN" && existingCluster.zone.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.cluster.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting cluster:", error);
    return NextResponse.json(
      { error: "Failed to delete cluster" },
      { status: 500 }
    );
  }
}
