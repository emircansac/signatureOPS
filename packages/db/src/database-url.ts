/** Neon pooler URLs cannot hold Prisma migrate advisory locks; use the direct host. */
export function resolveDirectDatabaseUrl(): string | undefined {
  const explicit = process.env.DIRECT_URL?.trim();
  if (explicit) return explicit;

  const pooled = process.env.DATABASE_URL?.trim();
  if (!pooled) return undefined;

  if (pooled.includes("-pooler.")) {
    return pooled.replace("-pooler.", ".");
  }
  return pooled;
}

export function ensureDirectUrlEnv(): void {
  if (process.env.DIRECT_URL?.trim()) return;
  const direct = resolveDirectDatabaseUrl();
  if (direct) process.env.DIRECT_URL = direct;
}
