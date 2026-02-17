import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { actionCreateSchema, actionUpdateSchema } from "@/lib/validations";
import { createAuditLog } from "@/lib/audit";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Only supervisors, CSST, admin can create actions
    if (!["SUPERVISOR", "CSST", "ADMIN"].includes(session.user.role)) {
      return NextResponse.json(
        { error: "No tiene permisos para crear acciones" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = actionCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Check if this is the first action for the report
    const report = await prisma.report.findUnique({
      where: { id: data.reportId },
      select: { firstTouchedAt: true },
    });

    if (!report) {
      return NextResponse.json(
        { error: "Reporte no encontrado" },
        { status: 404 }
      );
    }

    const action = await prisma.action.create({
      data: {
        reportId: data.reportId,
        assignedToId: data.assignedToId,
        assignedById: session.user.id,
        dueDate: new Date(data.dueDate),
        description: data.description,
        status: "OPEN",
      },
    });

    // Set first touch if not already set
    if (!report.firstTouchedAt) {
      await prisma.report.update({
        where: { id: data.reportId },
        data: {
          firstTouchedAt: new Date(),
          firstTouchedById: session.user.id,
        },
      });
    }

    await createAuditLog({
      entityType: "Action",
      entityId: action.id,
      action: "CREATED",
      actorId: session.user.id,
      payload: {
        reportId: data.reportId,
        assignedToId: data.assignedToId,
      },
    });

    return NextResponse.json(action, { status: 201 });
  } catch (error) {
    console.error("Action create error:", error);
    return NextResponse.json(
      { error: "Error al crear la acción" },
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
    const status = searchParams.get("status");
    const assignedToId = searchParams.get("assignedToId");
    const overdue = searchParams.get("overdue");

    const where: Record<string, unknown> = {};

    if (status) where.status = status;
    if (assignedToId) where.assignedToId = assignedToId;
    if (overdue === "true") {
      where.dueDate = { lt: new Date() };
      where.status = { not: "DONE" };
    }

    const actions = await prisma.action.findMany({
      where,
      include: {
        report: {
          include: {
            area: true,
            riskTypeFinal: true,
          },
        },
        assignedTo: { select: { id: true, name: true, role: true } },
        assignedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json(actions);
  } catch (error) {
    console.error("Actions list error:", error);
    return NextResponse.json(
      { error: "Error al obtener acciones" },
      { status: 500 }
    );
  }
}
