import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;

    const report = await prisma.report.findUnique({
      where: { id },
      include: {
        area: true,
        riskTypeFinal: true,
        aiSuggestedRiskType: true,
        createdBy: { select: { id: true, name: true, role: true, email: true } },
        firstTouchedBy: { select: { id: true, name: true } },
        actions: {
          include: {
            assignedTo: { select: { id: true, name: true, role: true } },
            assignedBy: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!report) {
      return NextResponse.json(
        { error: "Reporte no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(report);
  } catch (error) {
    console.error("Report detail error:", error);
    return NextResponse.json(
      { error: "Error al obtener el reporte" },
      { status: 500 }
    );
  }
}
