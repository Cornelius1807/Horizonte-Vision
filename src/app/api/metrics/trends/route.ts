import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

    const where: Record<string, unknown> = {};
    if (from || to) {
      where.createdAt = {};
      if (from) (where.createdAt as Record<string, unknown>).gte = new Date(from);
      if (to) (where.createdAt as Record<string, unknown>).lte = new Date(to);
    }
    if (areaId) where.areaId = areaId;

    // Reports by area
    const byArea = await prisma.report.groupBy({
      by: ["areaId"],
      where,
      _count: { id: true },
    });

    const areas = await prisma.area.findMany();
    const areaMap = Object.fromEntries(areas.map((a) => [a.id, a.name]));

    const reportsByArea = byArea.map((r) => ({
      area: areaMap[r.areaId] || r.areaId,
      count: r._count.id,
    }));

    // Reports by risk type
    const byRiskType = await prisma.report.groupBy({
      by: ["riskTypeIdFinal"],
      where: { ...where, riskTypeIdFinal: { not: null } },
      _count: { id: true },
    });

    const riskTypes = await prisma.riskType.findMany();
    const riskMap = Object.fromEntries(riskTypes.map((r) => [r.id, r.name]));

    const reportsByRiskType = byRiskType.map((r) => ({
      riskType: riskMap[r.riskTypeIdFinal!] || "Desconocido",
      count: r._count.id,
    }));

    // Monthly trend (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const recentReports = await prisma.report.findMany({
      where: {
        createdAt: { gte: sixMonthsAgo },
        ...(areaId ? { areaId } : {}),
      },
      select: { createdAt: true, severityFinal: true },
    });

    const monthlyTrend: Record<string, { month: string; total: number; high: number; medium: number; low: number }> = {};

    recentReports.forEach((r) => {
      const month = new Intl.DateTimeFormat("es-PE", {
        timeZone: "America/Lima",
        year: "numeric",
        month: "short",
      }).format(r.createdAt);
      if (!monthlyTrend[month]) {
        monthlyTrend[month] = { month, total: 0, high: 0, medium: 0, low: 0 };
      }
      monthlyTrend[month].total++;
      if (r.severityFinal === "HIGH") monthlyTrend[month].high++;
      else if (r.severityFinal === "MEDIUM") monthlyTrend[month].medium++;
      else if (r.severityFinal === "LOW") monthlyTrend[month].low++;
    });

    return NextResponse.json({
      reportsByArea,
      reportsByRiskType,
      monthlyTrend: Object.values(monthlyTrend),
    });
  } catch (error) {
    console.error("Trends error:", error);
    return NextResponse.json(
      { error: "Error al obtener tendencias" },
      { status: 500 }
    );
  }
}
