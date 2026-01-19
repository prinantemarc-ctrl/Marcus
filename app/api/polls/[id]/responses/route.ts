import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST - Add responses to a poll
export async function POST(
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
    });

    if (!poll) {
      return NextResponse.json({ error: "Poll not found" }, { status: 404 });
    }

    if (session.user.role !== "ADMIN" && poll.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { responses } = body;

    if (!Array.isArray(responses) || responses.length === 0) {
      return NextResponse.json(
        { error: "Responses data is required" },
        { status: 400 }
      );
    }

    // Create all responses
    const createdResponses = await prisma.$transaction(
      responses.map((r: { agentId: string; response: unknown; reasoning?: string; confidence?: number }) =>
        prisma.pollResponse.create({
          data: {
            pollId: params.id,
            agentId: r.agentId,
            response: r.response,
            reasoning: r.reasoning || null,
            confidence: r.confidence || null,
          },
        })
      )
    );

    // Update poll status to completed
    await prisma.poll.update({
      where: { id: params.id },
      data: { status: "COMPLETED" },
    });

    return NextResponse.json({ responses: createdResponses }, { status: 201 });
  } catch (error) {
    console.error("Error adding poll responses:", error);
    return NextResponse.json(
      { error: "Failed to add poll responses" },
      { status: 500 }
    );
  }
}
