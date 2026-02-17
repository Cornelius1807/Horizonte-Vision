import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["ADMIN", "CSST"].includes(session.user.role)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const areaId = searchParams.get("areaId");

    const where: Record<string, unknown> = {};
    if (from || to) {
      where.createdAt = {};
      if (from) (where.createdAt as Record<string, unknown>).gte = new Date(from);
      if (to) (where.createdAt as Record<string, unknown>).lte = new Date(to);
    }
    if (areaId) where.areaId = areaId;

    const reports = await prisma.report.findMany({
      where,
      include: {
        area: true,
        riskTypeFinal: true,
        createdBy: { select: { name: true, email: true } },
        actions: {
          include: {
            assignedTo: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Generate CSV
    const header = [
      "ID",
      "Fecha",
      "Área",
      "Tipo de Riesgo",
      "Severidad",
      "Descripción",
      "Anónimo",
      "Reportado por",
      "Acciones Totales",
      "Acciones Cerradas",
      "IA Explicación",
      "IA Confianza",
    ].join(",");

    const rows = reports.map((r) => {
      const closedActions = r.actions.filter((a) => a.status === "DONE").length;
      return [
        r.id,
        r.createdAt.toISOString(),
        `"${r.area.name}"`,
        `"${r.riskTypeFinal?.name || "N/A"}"`,
        r.severityFinal || "N/A",
        `"${r.description.replace(/"/g, '""')}"`,
        r.isAnonymous ? "Sí" : "No",
        r.isAnonymous ? "Anónimo" : `"${r.createdBy.name}"`,
        r.actions.length,
        closedActions,
        `"${(r.aiExplanation || "").replace(/"/g, '""')}"`,
        r.aiConfidenceScore || "N/A",
      ].join(",");
    });

    const csv = [header, ...rows].join("\n");

    // Audit log
    await createAuditLog({
      entityType: "Export",
      entityId: "csv-export",
      action: "CSV_EXPORTED",
      actorId: session.user.id,
      payload: { reportCount: reports.length, filters: { from, to, areaId } },
    });

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="reportes-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error("Export CSV error:", error);
    return NextResponse.json(
      { error: "Error al exportar CSV" },
      { status: 500 }
    );
  }
}
