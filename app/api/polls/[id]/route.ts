import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET - Get a single poll with responses
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const poll = await prisma.poll.findUnique({
      where: { id: params.id },
      include: {
        zone: true,
        responses: true,
      },
    });

    if (!poll) {
      return NextResponse.json({ error: "Poll not found" }, { status: 404 });
    }

    if (session.user.role !== "ADMIN" && poll.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ poll });
  } catch (error) {
    console.error("Error fetching poll:", error);
    return NextResponse.json(
      { error: "Failed to fetch poll" },
      { status: 500 }
    );
  }
}

// PUT - Update a poll (status, statistics, etc.)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const existingPoll = await prisma.poll.findUnique({
      where: { id: params.id },
    });

    if (!existingPoll) {
      return NextResponse.json({ error: "Poll not found" }, { status: 404 });
    }

    if (session.user.role !== "ADMIN" && existingPoll.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { status, statistics } = body;

    const poll = await prisma.poll.update({
      where: { id: params.id },
      data: {
        ...(status && { status }),
        ...(statistics !== undefined && { statistics }),
      },
    });

    return NextResponse.json({ poll });
  } catch (error) {
    console.error("Error updating poll:", error);
    return NextResponse.json(
      { error: "Failed to update poll" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a poll
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const existingPoll = await prisma.poll.findUnique({
      where: { id: params.id },
    });

    if (!existingPoll) {
      return NextResponse.json({ error: "Poll not found" }, { status: 404 });
    }

    if (session.user.role !== "ADMIN" && existingPoll.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.poll.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting poll:", error);
    return NextResponse.json(
      { error: "Failed to delete poll" },
      { status: 500 }
    );
  }
}
