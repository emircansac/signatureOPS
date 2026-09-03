import type { PrismaClient } from "@signatureops/db";

const windows = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const current = windows.get(key);
  if (!current || current.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (current.count >= limit) return false;
  current.count += 1;
  return true;
}

export async function rateLimitOrgUploads(prisma: PrismaClient, orgId: string): Promise<boolean> {
  const since = new Date(Date.now() - 60_000);
  const count = await prisma.brandAsset.count({
    where: { orgId, createdAt: { gte: since } },
  });
  return count < 20;
}
