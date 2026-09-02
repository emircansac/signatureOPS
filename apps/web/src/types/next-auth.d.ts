import type { AdminRole } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    adminUserId?: string | null;
    orgId?: string | null;
    orgSlug?: string | null;
    orgName?: string | null;
    role?: AdminRole | null;
    googleSub?: string | null;
    user: DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    googleSub?: string | null;
    adminUserId?: string | null;
    orgId?: string | null;
    orgSlug?: string | null;
    orgName?: string | null;
    role?: AdminRole | null;
  }
}
