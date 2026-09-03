import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { prisma } from "@signatureops/db";
import { auth } from "@/auth";
import type { Session } from "next-auth";
import { isSuperAdmin } from "@/lib/rbac";

export type SessionUser = {
  adminUserId: string | null;
  orgId: string | null;
  orgSlug: string | null;
  orgName: string | null;
  role: Session["role"];
  email: string | null;
  name: string | null;
  googleSub: string | null;
};

export const createTRPCContext = async (opts?: { req?: Request }) => {
  const session = await auth();
  const headerSlug = opts?.req?.headers.get("x-org-slug");

  const sessionUser: SessionUser | null = session?.user
    ? {
        adminUserId: session.adminUserId ?? null,
        orgId: session.orgId ?? null,
        orgSlug: session.orgSlug ?? null,
        orgName: session.orgName ?? null,
        role: session.role ?? null,
        email: session.user.email ?? null,
        name: session.user.name ?? null,
        googleSub: session.googleSub ?? null,
      }
    : null;

  return {
    prisma,
    orgId: sessionUser?.orgId ?? null,
    session: sessionUser,
    headerSlug,
  };
};

export type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>;

const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session?.email && !ctx.session?.googleSub) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  if (!ctx.orgId || !ctx.session.orgSlug) {
    throw new TRPCError({ code: "FORBIDDEN", message: "No organization" });
  }
  if (ctx.headerSlug && ctx.headerSlug !== ctx.session.orgSlug) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Organization mismatch" });
  }
  return next({
    ctx: {
      ...ctx,
      orgId: ctx.orgId,
      session: ctx.session,
    },
  });
});

export const superAdminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!isSuperAdmin(ctx.session.role)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "SUPER_ADMIN_REQUIRED" });
  }
  return next({ ctx });
});

export const signedInProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session?.email && !ctx.session?.googleSub) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx });
});

export const onboardingProcedure = signedInProcedure.use(({ ctx, next }) => {
  if (!ctx.session?.email && !ctx.session?.googleSub) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  if (ctx.session.orgId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Already in an organization",
    });
  }
  return next({ ctx });
});
