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

    const dateFilter: Record<string, unknown> = {};
    if (from) dateFilter.gte = new Date(from);
    if (to) dateFilter.lte = new Date(to);

    const reportWhere: Record<string, unknown> = {};
    if (Object.keys(dateFilter).length > 0) reportWhere.createdAt = dateFilter;
    if (areaId) reportWhere.areaId = areaId;

    // Total reports
    const totalReports = await prisma.report.count({ where: reportWhere });

    // Reports by severity
    const reportsBySeverity = await prisma.report.groupBy({
      by: ["severityFinal"],
      where: reportWhere,
      _count: { id: true },
    });

    // Actions stats
    const actionWhere: Record<string, unknown> = {};
    if (areaId) {
      actionWhere.report = { areaId };
    }

    const totalActions = await prisma.action.count({ where: actionWhere });
    const openActions = await prisma.action.count({
      where: { ...actionWhere, status: "OPEN" },
    });
    const inProgressActions = await prisma.action.count({
      where: { ...actionWhere, status: "IN_PROGRESS" },
    });
    const doneActions = await prisma.action.count({
      where: { ...actionWhere, status: "DONE" },
    });

    // Overdue actions
    const overdueActions = await prisma.action.count({
      where: {
        ...actionWhere,
        status: { not: "DONE" },
        dueDate: { lt: new Date() },
      },
    });

    // % closed on time
    const closedOnTime = await prisma.action.count({
      where: {
        ...actionWhere,
        status: "DONE",
        closedAt: { not: null },
      },
    });

    // Actually check if closed before due date
    const allDoneActions = await prisma.action.findMany({
      where: { ...actionWhere, status: "DONE" },
      select: { closedAt: true, dueDate: true },
    });

    const closedBeforeDue = allDoneActions.filter(
      (a) => a.closedAt && a.closedAt <= a.dueDate
    ).length;

    const closedOnTimePercent =
      allDoneActions.length > 0
        ? Math.round((closedBeforeDue / allDoneActions.length) * 100)
        : 0;

    // Average first response time (hours)
    const reportsWithTouch = await prisma.report.findMany({
      where: { ...reportWhere, firstTouchedAt: { not: null } },
      select: { createdAt: true, firstTouchedAt: true },
    });

    const avgFirstResponseHours =
      reportsWithTouch.length > 0
        ? Math.round(
            reportsWithTouch.reduce((sum, r) => {
              const diff =
                (r.firstTouchedAt!.getTime() - r.createdAt.getTime()) /
                (1000 * 60 * 60);
              return sum + diff;
            }, 0) / reportsWithTouch.length
          )
        : 0;

    return NextResponse.json({
      totalReports,
      reportsBySeverity: reportsBySeverity.map((r) => ({
        severity: r.severityFinal,
        count: r._count.id,
      })),
      totalActions,
      openActions,
      inProgressActions,
      doneActions,
      overdueActions,
      closedOnTimePercent,
      avgFirstResponseHours,
    });
  } catch (error) {
    console.error("KPIs error:", error);
    return NextResponse.json(
      { error: "Error al obtener métricas" },
      { status: 500 }
    );
  }
}
