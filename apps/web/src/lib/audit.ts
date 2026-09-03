import type { PrismaClient } from "@signatureops/db";

export async function writeAudit(
  prisma: PrismaClient,
  input: { orgId: string; actor: string; action: string; payload?: unknown },
) {
  await prisma.auditEvent.create({
    data: {
      orgId: input.orgId,
      actor: input.actor,
      action: input.action,
      payload: JSON.stringify(input.payload ?? {}),
    },
  });
}
