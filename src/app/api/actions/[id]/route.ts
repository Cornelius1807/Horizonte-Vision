import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { actionUpdateSchema } from "@/lib/validations";
import { createAuditLog } from "@/lib/audit";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = actionUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const existingAction = await prisma.action.findUnique({
      where: { id },
    });

    if (!existingAction) {
      return NextResponse.json(
        { error: "Acción no encontrada" },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};

    if (data.status) {
      updateData.status = data.status;
      if (data.status === "DONE") {
        updateData.closedAt = new Date();
        if (data.closeComment) updateData.closeComment = data.closeComment;
        if (data.closePhotoUrl) updateData.closePhotoUrl = data.closePhotoUrl;
      }
    }

    const action = await prisma.action.update({
      where: { id },
      data: updateData,
    });

    await createAuditLog({
      entityType: "Action",
      entityId: action.id,
      action: "STATUS_CHANGED",
      actorId: session.user.id,
      payload: { from: existingAction.status, to: data.status },
    });

    return NextResponse.json(action);
  } catch (error) {
    console.error("Action update error:", error);
    return NextResponse.json(
      { error: "Error al actualizar la acción" },
      { status: 500 }
    );
  }
}

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

    const action = await prisma.action.findUnique({
      where: { id },
      include: {
        report: {
          include: { area: true, riskTypeFinal: true },
        },
        assignedTo: { select: { id: true, name: true, role: true } },
        assignedBy: { select: { id: true, name: true } },
      },
    });

    if (!action) {
      return NextResponse.json(
        { error: "Acción no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json(action);
  } catch (error) {
    console.error("Action detail error:", error);
    return NextResponse.json(
      { error: "Error al obtener la acción" },
      { status: 500 }
    );
  }
}
