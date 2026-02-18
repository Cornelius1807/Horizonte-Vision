import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ruleConfigUpdateSchema } from "@/lib/validations";
import { createAuditLog } from "@/lib/audit";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const rule = await prisma.ruleConfig.findFirst();
    return NextResponse.json(rule);
  } catch (error) {
    console.error("Rules GET error:", error);
    return NextResponse.json(
      { error: "Error al obtener reglas" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = ruleConfigUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Validate JSON
    try {
      JSON.parse(data.severityThresholdsJson);
    } catch {
      return NextResponse.json(
        { error: "JSON de umbrales inválido" },
        { status: 400 }
      );
    }

    const existing = await prisma.ruleConfig.findFirst();

    let rule;
    if (existing) {
      rule = await prisma.ruleConfig.update({
        where: { id: existing.id },
        data: {
          isEnabled: data.isEnabled,
          minConfidenceForAutoSuggest: data.minConfidenceForAutoSuggest,
          severityThresholdsJson: data.severityThresholdsJson,
          updatedById: session.user.id,
        },
      });
    } else {
      rule = await prisma.ruleConfig.create({
        data: {
          isEnabled: data.isEnabled,
          minConfidenceForAutoSuggest: data.minConfidenceForAutoSuggest,
          severityThresholdsJson: data.severityThresholdsJson,
          updatedById: session.user.id,
        },
      });
    }

    await createAuditLog({
      entityType: "RuleConfig",
      entityId: rule.id,
      action: "UPDATED",
      actorId: session.user.id,
      payload: data,
    });

    return NextResponse.json(rule);
  } catch (error) {
    console.error("Rules PUT error:", error);
    return NextResponse.json(
      { error: "Error al actualizar reglas" },
      { status: 500 }
    );
  }
}
