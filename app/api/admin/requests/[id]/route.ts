import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  status: z.enum(["PENDING", "IN_REVIEW", "APPROVED", "REJECTED", "IN_PROGRESS", "COMPLETED"]).optional(),
  adminNotes: z.string().optional(),
  simulationId: z.string().optional(),
});

// GET - Get single request
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const simulationRequest = await prisma.simulationRequest.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            company: true,
          },
        },
      },
    });

    if (!simulationRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    return NextResponse.json({ request: simulationRequest });
  } catch (error) {
    console.error("Error fetching request:", error);
    return NextResponse.json(
      { error: "Failed to fetch request" },
      { status: 500 }
    );
  }
}

// PATCH - Update request status
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    
    const result = updateSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      );
    }

    const { status, adminNotes, simulationId } = result.data;

    const updated = await prisma.simulationRequest.update({
      where: { id: params.id },
      data: {
        ...(status && { status }),
        ...(adminNotes !== undefined && { adminNotes }),
        ...(simulationId && { simulationId }),
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            company: true,
          },
        },
      },
    });

    return NextResponse.json({ 
      message: "Request updated successfully",
      request: updated 
    });
  } catch (error) {
    console.error("Error updating request:", error);
    return NextResponse.json(
      { error: "Failed to update request" },
      { status: 500 }
    );
  }
}
