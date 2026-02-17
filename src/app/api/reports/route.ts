import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { reportCreateSchema } from "@/lib/validations";
import { createAuditLog } from "@/lib/audit";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = reportCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const report = await prisma.report.create({
      data: {
        createdById: session.user.id,
        areaId: data.areaId,
        description: data.description,
        photoUrl: data.photoUrl,
        isAnonymous: data.isAnonymous,
        riskTypeIdFinal: data.riskTypeIdFinal,
        severityFinal: data.severityFinal,
        aiSuggestedRiskTypeId: data.aiSuggestedRiskTypeId || null,
        aiSuggestedSeverity: data.aiSuggestedSeverity || null,
        aiDetectionsJson: data.aiDetectionsJson || null,
        aiExplanation: data.aiExplanation || null,
        aiConfidenceScore: data.aiConfidenceScore || null,
      },
    });

    await createAuditLog({
      entityType: "Report",
      entityId: report.id,
      action: "CREATED",
      actorId: session.user.id,
      payload: { areaId: data.areaId, severity: data.severityFinal },
    });

    return NextResponse.json(report, { status: 201 });
  } catch (error) {
    console.error("Report create error:", error);
    return NextResponse.json(
      { error: "Error al crear el reporte" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const areaId = searchParams.get("areaId");
    const riskTypeId = searchParams.get("riskTypeId");
    const severity = searchParams.get("severity");

    const where: Record<string, unknown> = {};

    if (from || to) {
      where.createdAt = {};
      if (from) (where.createdAt as Record<string, unknown>).gte = new Date(from);
      if (to) (where.createdAt as Record<string, unknown>).lte = new Date(to);
    }
    if (areaId) where.areaId = areaId;
    if (riskTypeId) where.riskTypeIdFinal = riskTypeId;
    if (severity) where.severityFinal = severity;

    // Workers only see their own reports
    if (session.user.role === "WORKER") {
      where.createdById = session.user.id;
    }

    const reports = await prisma.report.findMany({
      where,
      include: {
        area: true,
        riskTypeFinal: true,
        createdBy: { select: { id: true, name: true, role: true } },
        _count: { select: { actions: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json(reports);
  } catch (error) {
    console.error("Reports list error:", error);
    return NextResponse.json(
      { error: "Error al obtener reportes" },
      { status: 500 }
    );
  }
}
