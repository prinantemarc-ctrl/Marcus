import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET - List agents (optionally filtered by clusterId or zoneId)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const clusterId = searchParams.get("clusterId");
    const zoneId = searchParams.get("zoneId");

    const agents = await prisma.agent.findMany({
      where: {
        ...(clusterId && { clusterId }),
        ...(zoneId && { cluster: { zoneId } }),
        cluster: {
          zone: session.user.role === "ADMIN" ? {} : { userId: session.user.id },
        },
      },
      include: {
        cluster: {
          select: { id: true, name: true, zoneId: true }
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ agents });
  } catch (error) {
    console.error("Error fetching agents:", error);
    return NextResponse.json(
      { error: "Failed to fetch agents" },
      { status: 500 }
    );
  }
}

// POST - Create a single agent
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { 
      clusterId, 
      name, 
      age, 
      ageBucketId, 
      regionId, 
      cspId, 
      socioDemoDescription,
      traits,
      priors,
      speakingStyle,
      expressionProfile,
      psychologicalProfile,
    } = body;

    if (!clusterId) {
      return NextResponse.json(
        { error: "Cluster ID is required" },
        { status: 400 }
      );
    }

    // Check cluster ownership
    const cluster = await prisma.cluster.findUnique({
      where: { id: clusterId },
      include: { zone: true },
    });

    if (!cluster) {
      return NextResponse.json({ error: "Cluster not found" }, { status: 404 });
    }

    if (session.user.role !== "ADMIN" && cluster.zone.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get current agent count for numbering
    const agentCount = await prisma.agent.count({
      where: { clusterId },
    });

    const agent = await prisma.agent.create({
      data: {
        agentNumber: agentCount + 1,
        name: name || null,
        age: age || 30,
        ageBucketId: ageBucketId || "default",
        regionId: regionId || "default",
        cspId: cspId || "default",
        socioDemoDescription: socioDemoDescription || "",
        traits: traits || [],
        priors: priors || "",
        speakingStyle: speakingStyle || "",
        expressionProfile: expressionProfile || null,
        psychologicalProfile: psychologicalProfile || null,
        clusterId,
      },
    });

    return NextResponse.json({ agent }, { status: 201 });
  } catch (error) {
    console.error("Error creating agent:", error);
    return NextResponse.json(
      { error: "Failed to create agent" },
      { status: 500 }
    );
  }
}

// PUT - Batch create agents
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { agents: agentsData, clusterId } = body;

    if (!clusterId) {
      return NextResponse.json(
        { error: "Cluster ID is required" },
        { status: 400 }
      );
    }

    if (!Array.isArray(agentsData) || agentsData.length === 0) {
      return NextResponse.json(
        { error: "Agents data is required" },
        { status: 400 }
      );
    }

    // Check cluster ownership
    const cluster = await prisma.cluster.findUnique({
      where: { id: clusterId },
      include: { zone: true },
    });

    if (!cluster) {
      return NextResponse.json({ error: "Cluster not found" }, { status: 404 });
    }

    if (session.user.role !== "ADMIN" && cluster.zone.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get current agent count for numbering
    const currentCount = await prisma.agent.count({
      where: { clusterId },
    });

    // Create all agents
    const createdAgents = await prisma.$transaction(
      agentsData.map((a: any, index: number) =>
        prisma.agent.create({
          data: {
            agentNumber: currentCount + index + 1,
            name: a.name || null,
            age: a.age || 30,
            ageBucketId: a.ageBucketId || "default",
            regionId: a.regionId || "default",
            cspId: a.cspId || "default",
            socioDemoDescription: a.socioDemoDescription || a.socio_demo || "",
            traits: a.traits || [],
            priors: a.priors || "",
            speakingStyle: a.speakingStyle || a.speaking_style || "",
            expressionProfile: a.expressionProfile || a.expression_profile || null,
            psychologicalProfile: a.psychologicalProfile || a.psychological_profile || null,
            clusterId,
          },
        })
      )
    );

    return NextResponse.json({ agents: createdAgents }, { status: 201 });
  } catch (error) {
    console.error("Error batch creating agents:", error);
    return NextResponse.json(
      { error: "Failed to create agents" },
      { status: 500 }
    );
  }
}
