import { PrismaClient, Role } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  const adminEmail = process.env.ADMIN_USER || "admin@horizontevision.pe";
  const adminPass = process.env.ADMIN_PASS || "Hv$ecur3!Adm1n2026";

  // Create users
  const users = [
    {
      email: "trabajador@horizontevision.pe",
      name: "Carlos Mendoza",
      role: Role.WORKER,
      password: "Worker2026!",
    },
    {
      email: "supervisor@horizontevision.pe",
      name: "María López",
      role: Role.SUPERVISOR,
      password: "Super2026!",
    },
    {
      email: "csst@horizontevision.pe",
      name: "Jorge Ramírez",
      role: Role.CSST,
      password: "Csst2026!",
    },
    {
      email: adminEmail,
      name: "Administrador",
      role: Role.ADMIN,
      password: adminPass,
    },
  ];

  for (const u of users) {
    const passwordHash = await hash(u.password, 12);
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        email: u.email,
        name: u.name,
        role: u.role,
        passwordHash,
      },
    });
    console.log(`  ✅ User: ${u.email} (${u.role})`);
  }

  // Create areas
  const areas = [
    "Almacén Central",
    "Planta de Producción",
    "Oficinas Administrativas",
    "Zona de Carga",
    "Taller de Mantenimiento",
    "Comedor",
  ];

  for (const name of areas) {
    await prisma.area.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    console.log(`  ✅ Area: ${name}`);
  }

  // Create risk types
  const riskTypes = [
    {
      code: "RISK_OBSTRUCTION",
      name: "Obstrucción / Tropiezo",
      description:
        "Objetos que obstruyen pasillos, salidas de emergencia o zonas de tránsito, generando riesgo de tropiezo o caída.",
      recommendationsJson: JSON.stringify([
        "Retirar objetos del área de tránsito inmediatamente",
        "Señalizar la zona temporalmente",
        "Verificar que las salidas de emergencia estén despejadas",
        "Capacitar al personal sobre orden en pasillos",
      ]),
    },
    {
      code: "RISK_HOUSEKEEPING",
      name: "Orden y limpieza deficiente",
      description:
        "Alta cantidad o variedad de objetos dispersos en el área, indicando falta de orden y limpieza adecuada.",
      recommendationsJson: JSON.stringify([
        "Implementar programa 5S en el área",
        "Asignar responsables de orden por turno",
        "Proveer estanterías y contenedores adecuados",
        "Realizar inspecciones periódicas de orden y limpieza",
      ]),
    },
  ];

  for (const rt of riskTypes) {
    await prisma.riskType.upsert({
      where: { code: rt.code },
      update: {},
      create: rt,
    });
    console.log(`  ✅ RiskType: ${rt.code}`);
  }

  // Create default rule config
  const existingRule = await prisma.ruleConfig.findFirst();
  if (!existingRule) {
    await prisma.ruleConfig.create({
      data: {
        isEnabled: true,
        minConfidenceForAutoSuggest: 0.5,
        severityThresholdsJson: JSON.stringify({
          high: { minObjects: 5, minAvgScore: 0.7 },
          medium: { minObjects: 3, minAvgScore: 0.5 },
          low: { minObjects: 1, minAvgScore: 0.3 },
        }),
      },
    });
    console.log("  ✅ RuleConfig created (default)");
  }

  console.log("\n🎉 Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
