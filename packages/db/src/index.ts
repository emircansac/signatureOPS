import { PrismaClient } from "@prisma/client";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function resolveDatabaseUrl(): string | undefined {
  const envUrl = process.env.DATABASE_URL;
  if (!envUrl) return undefined;
  if (envUrl.startsWith("file:") && !envUrl.startsWith("file:/")) {
    const relative = envUrl.replace("file:", "");
    const schemaDir = join(dirname(fileURLToPath(import.meta.url)), "..", "prisma");
    return `file:${join(schemaDir, relative.replace(/^\.\//, ""))}`;
  }
  return envUrl;
}

const databaseUrl = resolveDatabaseUrl();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    ...(databaseUrl ? { datasources: { db: { url: databaseUrl } } } : {}),
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export * from "@prisma/client";
