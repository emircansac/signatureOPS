import type { AdminRole } from "@prisma/client";
import { TRPCError } from "@trpc/server";

export function isSuperAdmin(role: AdminRole | null | undefined): boolean {
  return role === "SUPER_ADMIN";
}

export function assertSuperAdmin(role: AdminRole | null | undefined): void {
  if (!isSuperAdmin(role)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "SUPER_ADMIN_REQUIRED",
    });
  }
}
