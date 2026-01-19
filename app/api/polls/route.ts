import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET - List polls
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const zoneId = searchParams.get("zoneId");

    const polls = await prisma.poll.findMany({
      where: {
        ...(zoneId && { zoneId }),
        ...(session.user.role !== "ADMIN" && { userId: session.user.id }),
      },
      include: {
        zone: {
          select: { id: true, name: true }
        },
        _count: {
          select: { responses: true }
        }
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ polls });
  } catch (error) {
    console.error("Error fetching polls:", error);
    return NextResponse.json(
      { error: "Failed to fetch polls" },
      { status: 500 }
    );
  }
}

// POST - Create a new poll
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { title, question, options, responseMode, zoneId } = body;

    if (!title?.trim()) {
      return NextResponse.json(
        { error: "Poll title is required" },
        { status: 400 }
      );
    }

    if (!question?.trim()) {
      return NextResponse.json(
        { error: "Question is required" },
        { status: 400 }
      );
    }

    if (!zoneId) {
      return NextResponse.json(
        { error: "Zone ID is required" },
        { status: 400 }
      );
    }

    if (!Array.isArray(options) || options.length < 2) {
      return NextResponse.json(
        { error: "At least 2 options are required" },
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

    const poll = await prisma.poll.create({
      data: {
        title: title.trim(),
        question: question.trim(),
        options,
        responseMode: responseMode || "choice",
        status: "PENDING",
        zoneId,
        userId: session.user.id,
      },
    });

    return NextResponse.json({ poll }, { status: 201 });
  } catch (error) {
    console.error("Error creating poll:", error);
    return NextResponse.json(
      { error: "Failed to create poll" },
      { status: 500 }
    );
  }
}
