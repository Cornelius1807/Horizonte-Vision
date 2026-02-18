import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

export async function POST(req: Request) {
  const secret = req.headers.get("x-seed-secret");
  if (secret !== process.env.NEXTAUTH_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const prisma = new PrismaClient();
  try {
    // Use the literal password, not from env var (to avoid $ interpolation issues)
    const password = "Hv$ecur3!Adm1n2026";
    const passwordHash = await hash(password, 12);
    
    const user = await prisma.user.update({
      where: { email: "admin@horizontevision.pe" },
      data: { passwordHash },
    });

    return NextResponse.json({ 
      success: true, 
      email: user.email,
      message: "Admin password reset"
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
