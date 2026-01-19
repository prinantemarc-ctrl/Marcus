import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET - Get a single zone by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const zone = await prisma.zone.findUnique({
      where: { id: params.id },
      include: {
        clusters: {
          include: {
            _count: {
              select: { agents: true }
            }
          },
          orderBy: { createdAt: "asc" }
        },
      },
    });

    if (!zone) {
      return NextResponse.json({ error: "Zone not found" }, { status: 404 });
    }

    // Check ownership (unless admin)
    if (session.user.role !== "ADMIN" && zone.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ zone });
  } catch (error) {
    console.error("Error fetching zone:", error);
    return NextResponse.json(
      { error: "Failed to fetch zone" },
      { status: 500 }
    );
  }
}

// PUT - Update a zone
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const existingZone = await prisma.zone.findUnique({
      where: { id: params.id },
    });

    if (!existingZone) {
      return NextResponse.json({ error: "Zone not found" }, { status: 404 });
    }

    if (session.user.role !== "ADMIN" && existingZone.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { name, description } = body;

    const zone = await prisma.zone.update({
      where: { id: params.id },
      data: {
        ...(name && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
      },
    });

    return NextResponse.json({ zone });
  } catch (error) {
    console.error("Error updating zone:", error);
    return NextResponse.json(
      { error: "Failed to update zone" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a zone
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const existingZone = await prisma.zone.findUnique({
      where: { id: params.id },
    });

    if (!existingZone) {
      return NextResponse.json({ error: "Zone not found" }, { status: 404 });
    }

    if (session.user.role !== "ADMIN" && existingZone.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Delete zone (cascades to clusters, agents, etc.)
    await prisma.zone.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting zone:", error);
    return NextResponse.json(
      { error: "Failed to delete zone" },
      { status: 500 }
    );
  }
}
