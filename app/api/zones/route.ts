import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET - List all zones for the current user (or all for admin)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const zones = await prisma.zone.findMany({
      where: session.user.role === "ADMIN" ? {} : { userId: session.user.id },
      include: {
        clusters: {
          include: {
            _count: {
              select: { agents: true }
            }
          }
        },
        _count: {
          select: { simulations: true, polls: true }
        }
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ zones });
  } catch (error) {
    console.error("Error fetching zones:", error);
    return NextResponse.json(
      { error: "Failed to fetch zones" },
      { status: 500 }
    );
  }
}

// POST - Create a new zone
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, description } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { error: "Zone name is required" },
        { status: 400 }
      );
    }

    const zone = await prisma.zone.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        userId: session.user.id,
      },
    });

    return NextResponse.json({ zone }, { status: 201 });
  } catch (error) {
    console.error("Error creating zone:", error);
    return NextResponse.json(
      { error: "Failed to create zone" },
      { status: 500 }
    );
  }
}
