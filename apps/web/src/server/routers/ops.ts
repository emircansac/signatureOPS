import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, superAdminProcedure, router } from "../trpc";
import { inngest } from "@/inngest/client";
import { writeAudit } from "@/lib/audit";
import { newInviteToken, hashToken } from "@/lib/crypto-token";
import { appBaseUrl, getServerEnv, googleWorkspaceConfigured, microsoftGraphConfigured } from "@/env";
import { GOOGLE_DWD_SCOPES } from "@signatureops/adapters-google";
import { rateLimit } from "@/lib/rate-limit";

function actor(ctx: { session: { email: string | null; adminUserId: string | null } }) {
  return ctx.session.email ?? ctx.session.adminUserId ?? "unknown";
}

export const connectionsRouter = router({
  get: protectedProcedure.query(async ({ ctx }) => {
    const org = await ctx.prisma.organization.findUnique({
      where: { id: ctx.orgId! },
      select: {
        googleWorkspaceDomain: true,
        googleImpersonateEmail: true,
        microsoftTenantId: true,
        slug: true,
      },
    });
    const env = getServerEnv();
    return {
      googleWorkspaceDomain: org?.googleWorkspaceDomain ?? "",
      googleImpersonateEmail: org?.googleImpersonateEmail ?? "",
      microsoftTenantId: org?.microsoftTenantId ?? "",
      platform: {
        googleServiceAccountReady: googleWorkspaceConfigured(),
        googleServiceAccountClientId: env.GOOGLE_SA_CLIENT_ID ?? "",
        googleScopes: GOOGLE_DWD_SCOPES,
        microsoftAppReady: microsoftGraphConfigured(),
      },
      addin: {
        unifiedManifestUrl: `${appBaseUrl()}/api/addin/manifest/${org?.slug}.xml`,
        addinOnlyManifestUrl: `${appBaseUrl()}/api/addin/manifest/${org?.slug}.addin-only.xml`,
      },
    };
  }),
  save: superAdminProcedure
    .input(
      z.object({
        googleWorkspaceDomain: z.string().trim().max(253).optional(),
        googleImpersonateEmail: z.string().trim().email().optional().or(z.literal("")),
        microsoftTenantId: z.string().trim().max(64).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = ctx.orgId!;
      await ctx.prisma.organization.update({
        where: { id: orgId },
        data: {
          googleWorkspaceDomain: input.googleWorkspaceDomain?.trim() || null,
          googleImpersonateEmail: input.googleImpersonateEmail?.trim() || null,
          microsoftTenantId: input.microsoftTenantId?.trim() || null,
        },
      });
      await writeAudit(ctx.prisma, {
        orgId,
        actor: actor(ctx),
        action: "connections.save",
      });
      return { ok: true };
    }),
});

export const deployRouter = router({
  syncGoogle: superAdminProcedure.mutation(async ({ ctx }) => {
    const orgId = ctx.orgId!;
    if (!rateLimit(`sync-google:${orgId}`, 3, 60_000)) {
      throw new TRPCError({ code: "TOO_MANY_REQUESTS" });
    }
    await inngest.send({ name: "directory/google.sync", data: { orgId } });
    await writeAudit(ctx.prisma, {
      orgId,
      actor: actor(ctx),
      action: "directory.google.sync",
    });
    return { queued: true };
  }),
  syncMicrosoft: superAdminProcedure.mutation(async ({ ctx }) => {
    const orgId = ctx.orgId!;
    if (!rateLimit(`sync-ms:${orgId}`, 3, 60_000)) {
      throw new TRPCError({ code: "TOO_MANY_REQUESTS" });
    }
    await inngest.send({ name: "directory/microsoft.sync", data: { orgId } });
    await writeAudit(ctx.prisma, {
      orgId,
      actor: actor(ctx),
      action: "directory.microsoft.sync",
    });
    return { queued: true };
  }),
  gmail: superAdminProcedure
    .input(z.object({ userIds: z.array(z.string()).optional() }).optional())
    .mutation(async ({ ctx, input }) => {
      const orgId = ctx.orgId!;
      if (!rateLimit(`gmail-deploy:${orgId}`, 2, 60_000)) {
        throw new TRPCError({ code: "TOO_MANY_REQUESTS" });
      }
      const running = await ctx.prisma.deployment.count({
        where: { orgId, provider: "GOOGLE", status: { in: ["PENDING", "RUNNING"] } },
      });
      if (running > 0) {
        throw new TRPCError({ code: "CONFLICT", message: "DEPLOY_IN_PROGRESS" });
      }
      await inngest.send({
        name: "gmail/deploy",
        data: { orgId, userIds: input?.userIds },
      });
      await writeAudit(ctx.prisma, {
        orgId,
        actor: actor(ctx),
        action: "gmail.deploy",
        payload: { userIds: input?.userIds ?? null },
      });
      return { queued: true };
    }),
  health: protectedProcedure.query(async ({ ctx }) => {
    const orgId = ctx.orgId!;
    const [users, deployments, sync, missing, broken] = await Promise.all([
      ctx.prisma.user.count({ where: { orgId } }),
      ctx.prisma.deployment.findMany({
        where: { orgId },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { user: { select: { displayName: true, email: true } } },
      }),
      ctx.prisma.syncState.findUnique({ where: { orgId } }),
      ctx.prisma.user.findMany({
        where: {
          orgId,
          OR: [{ jobTitle: null }, { jobTitle: "" }, { photoUrl: null }, { photoUrl: "" }],
        },
        select: { id: true, displayName: true, email: true, jobTitle: true, photoUrl: true },
        take: 50,
      }),
      ctx.prisma.brandAsset.findMany({
        where: { orgId, NOT: { url: { startsWith: "https://" } } },
        select: { id: true, url: true, slot: true, kind: true },
      }),
    ]);
    const gmail = deployments.filter((row) => row.provider === "GOOGLE");
    const ok = gmail.filter((row) => row.status === "OK").length;
    const failed = gmail.filter((row) => row.status === "FAILED").length;
    const diffs = gmail
      .filter((row) => row.sanitizedDiff)
      .map((row) => {
        try {
          return {
            id: row.id,
            email: row.sendAsEmail,
            user: row.user?.displayName,
            diff: JSON.parse(row.sanitizedDiff!) as {
              changed: boolean;
              summary: string;
            },
          };
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    return {
      usersDiscovered: users,
      gmailOk: ok,
      gmailFailed: failed,
      lastSync: {
        google: sync?.lastGoogleSyncAt ?? null,
        microsoft: sync?.lastMicrosoftSyncAt ?? null,
        googleError: sync?.googleError ?? null,
        microsoftError: sync?.microsoftError ?? null,
        googleUserCount: sync?.googleUserCount ?? 0,
        microsoftUserCount: sync?.microsoftUserCount ?? 0,
      },
      missingFields: missing,
      nonHttpsAssets: broken,
      recent: deployments.map((row) => ({
        id: row.id,
        provider: row.provider,
        status: row.status,
        email: row.sendAsEmail,
        user: row.user?.displayName ?? null,
        error: row.error,
        attempt: row.attempt,
        updatedAt: row.updatedAt,
        diffChanged: row.sanitizedDiff?.includes('"changed":true') ?? false,
      })),
      sanitizationDiffs: diffs,
      addin: {
        note: "Outlook add-in is applied at compose time in supported clients. Mac/mobile use the add-in-only manifest.",
        assigned: Boolean(
          (await ctx.prisma.organization.findUnique({
            where: { id: orgId },
            select: { microsoftTenantId: true },
          }))?.microsoftTenantId,
        ),
      },
    };
  }),
});

export const invitesRouter = router({
  list: superAdminProcedure.query(async ({ ctx }) => {
    const [admins, invites] = await Promise.all([
      ctx.prisma.adminUser.findMany({
        where: { orgId: ctx.orgId! },
        orderBy: { createdAt: "asc" },
        select: { id: true, email: true, name: true, role: true, createdAt: true },
      }),
      ctx.prisma.adminInvite.findMany({
        where: { orgId: ctx.orgId!, acceptedAt: null },
        orderBy: { createdAt: "desc" },
        select: { id: true, email: true, role: true, expiresAt: true, createdAt: true },
      }),
    ]);
    return { admins, invites };
  }),
  create: superAdminProcedure
    .input(
      z.object({
        email: z.string().trim().email(),
        role: z.enum(["SUPER_ADMIN", "CONTENT_MANAGER"]).default("CONTENT_MANAGER"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = ctx.orgId!;
      const email = input.email.toLowerCase();
      const existingAdmin = await ctx.prisma.adminUser.findFirst({
        where: { orgId, email },
      });
      if (existingAdmin) {
        throw new TRPCError({ code: "CONFLICT", message: "ALREADY_ADMIN" });
      }
      const { token, tokenHash } = newInviteToken();
      const invite = await ctx.prisma.adminInvite.create({
        data: {
          orgId,
          email,
          role: input.role,
          tokenHash,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          createdBy: actor(ctx),
        },
      });
      await writeAudit(ctx.prisma, {
        orgId,
        actor: actor(ctx),
        action: "admin.invite",
        payload: { email, role: input.role },
      });
      return {
        id: invite.id,
        url: `${appBaseUrl()}/tr/davet/${token}`,
      };
    }),
  revoke: superAdminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const invite = await ctx.prisma.adminInvite.findFirst({
        where: { id: input.id, orgId: ctx.orgId! },
      });
      if (!invite) throw new TRPCError({ code: "NOT_FOUND" });
      await ctx.prisma.adminInvite.delete({ where: { id: input.id } });
      return { ok: true };
    }),
});
