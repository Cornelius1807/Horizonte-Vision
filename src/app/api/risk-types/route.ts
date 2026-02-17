import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const riskTypes = await prisma.riskType.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(riskTypes);
  } catch (error) {
    console.error("Risk types error:", error);
    return NextResponse.json(
      { error: "Error al obtener tipos de riesgo" },
      { status: 500 }
    );
  }
}
