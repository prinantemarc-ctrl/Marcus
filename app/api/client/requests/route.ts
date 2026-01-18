import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const requestSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(20, "Description must be at least 20 characters"),
  targetAudience: z.string().optional(),
  objectives: z.string().optional(),
  additionalNotes: z.string().optional(),
});

// GET - List user's requests
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const requests = await prisma.simulationRequest.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ requests });
  } catch (error) {
    console.error("Error fetching requests:", error);
    return NextResponse.json(
      { error: "Failed to fetch requests" },
      { status: 500 }
    );
  }
}

// POST - Create new request
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    
    // Validate input
    const result = requestSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      );
    }

    const { title, description, targetAudience, objectives } = result.data;

    // Create the request
    const simulationRequest = await prisma.simulationRequest.create({
      data: {
        userId: session.user.id,
        title,
        description,
        targetAudience,
        objectives,
        status: "PENDING",
      },
    });

    return NextResponse.json(
      { 
        message: "Request submitted successfully",
        request: simulationRequest 
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating request:", error);
    return NextResponse.json(
      { error: "Failed to submit request" },
      { status: 500 }
    );
  }
}
