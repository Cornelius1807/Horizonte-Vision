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

    const areas = await prisma.area.findMany({
      orderBy: { name: "asc" },
    });

    return NextResponse.json(areas);
  } catch (error) {
    console.error("Areas error:", error);
    return NextResponse.json(
      { error: "Error al obtener áreas" },
      { status: 500 }
    );
  }
}
