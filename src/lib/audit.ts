import { prisma } from "@/lib/prisma";

export async function createAuditLog({
  entityType,
  entityId,
  action,
  actorId,
  payload,
}: {
  entityType: string;
  entityId: string;
  action: string;
  actorId?: string;
  payload?: Record<string, unknown>;
}) {
  await prisma.auditLog.create({
    data: {
      entityType,
      entityId,
      action,
      actorId: actorId || null,
      payloadJson: payload ? JSON.stringify(payload) : null,
    },
  });
}
