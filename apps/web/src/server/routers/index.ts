import { z } from "zod";
import { compile } from "@signatureops/compiler";
import { lintHtml } from "@signatureops/linter";
import { simulate } from "@signatureops/rules";
import {
  parseTemplateDefinition,
  RuleDefinitionSchema,
  TemplateDefinitionSchema,
  type RuleDefinition,
  type TemplateDefinition,
} from "@signatureops/schema";
import { onboardingProcedure, protectedProcedure, publicProcedure, router } from "../trpc";
import { toCompileAssetMap, type AssetRecord } from "../lib/assets";
import { resolvePublicAssetUrl } from "@/lib/asset-url";
import { isReservedSlug, SlugSchema, slugify } from "@/lib/slug";
import { TRPCError } from "@trpc/server";

function parseJson<T>(value: string): T {
  return JSON.parse(value) as T;
}

async function getOrgId(ctx: { orgId: string | null }) {
  if (!ctx.orgId) throw new Error("No organization found");
  return ctx.orgId;
}

function toRuleDefinition(rule: {
  id: string;
  name: string;
  level: string;
  priority: number;
  conditions: string;
  actions: string;
  enabled: boolean;
}): RuleDefinition {
  return RuleDefinitionSchema.parse({
    id: rule.id,
    name: rule.name,
    level: rule.level,
    priority: rule.priority,
    conditions: parseJson(rule.conditions),
    actions: parseJson(rule.actions),
    enabled: rule.enabled,
  });
}

function toTemplateDefinition(definition: string): TemplateDefinition {
  return parseTemplateDefinition(parseJson(definition));
}

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

function buildCampaignMap(
  campaigns: { id: string; bannerAssetId: string }[],
  assets: AssetRecord[],
  definition?: TemplateDefinition,
) {
  const bannerAssets = assets.filter((a) => a.kind === "BANNER");
  const baseUrl = getBaseUrl();

  const map = Object.fromEntries(
    campaigns.map((c) => {
      const banner = bannerAssets.find((a) => a.id === c.bannerAssetId);
      return [
        c.id,
        {
          id: c.id,
          bannerUrl: banner ? resolvePublicAssetUrl(banner.url, baseUrl) : "",
          width: banner?.width ?? undefined,
          height: banner?.height ?? undefined,
        },
      ];
    }),
  );

  if (definition) {
    for (const block of definition.blocks) {
      if (block.type === "campaign_banner" && block.campaignId.startsWith("asset:")) {
        const assetId = block.campaignId.slice(6);
        const asset = assets.find((a) => a.id === assetId);
        if (asset) {
          map[block.campaignId] = {
            id: block.campaignId,
            bannerUrl: resolvePublicAssetUrl(asset.url, baseUrl),
            width: asset.width ?? undefined,
            height: asset.height ?? undefined,
          };
        }
      }
    }
  }

  return map;
}

export const orgRouter = router({
  get: protectedProcedure.query(async ({ ctx }) => {
    const orgId = await getOrgId(ctx);
    const org = await ctx.prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        _count: {
          select: {
            templates: true,
            rules: true,
            users: true,
            campaigns: true,
          },
        },
      },
    });
    return org;
  }),
});

export const usersRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const orgId = await getOrgId(ctx);
    return ctx.prisma.user.findMany({
      where: { orgId },
      orderBy: { displayName: "asc" },
    });
  }),
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const orgId = await getOrgId(ctx);
      return ctx.prisma.user.findFirst({ where: { id: input.id, orgId } });
    }),
});

export const templatesRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const orgId = await getOrgId(ctx);
    return ctx.prisma.template.findMany({
      where: { orgId },
      orderBy: { updatedAt: "desc" },
    });
  }),
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const orgId = await getOrgId(ctx);
      return ctx.prisma.template.findFirst({ where: { id: input.id, orgId } });
    }),
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        definition: TemplateDefinitionSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = await getOrgId(ctx);
      TemplateDefinitionSchema.parse(input.definition);
      return ctx.prisma.template.create({
        data: {
          orgId,
          name: input.name,
          definition: JSON.stringify(input.definition),
        },
      });
    }),
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        definition: TemplateDefinitionSchema.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = await getOrgId(ctx);
      const existing = await ctx.prisma.template.findFirst({
        where: { id: input.id, orgId },
      });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      const { id, ...data } = input;
      return ctx.prisma.template.update({
        where: { id },
        data: {
          ...(data.name && { name: data.name }),
          ...(data.definition && { definition: JSON.stringify(data.definition) }),
          version: { increment: 1 },
        },
      });
    }),
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const orgId = await getOrgId(ctx);
      const existing = await ctx.prisma.template.findFirst({
        where: { id: input.id, orgId },
      });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.prisma.template.delete({ where: { id: input.id } });
    }),
  compilePreview: protectedProcedure
    .input(
      z.object({
        definition: TemplateDefinitionSchema,
        userId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const orgId = await getOrgId(ctx);
      const user = await ctx.prisma.user.findFirst({
        where: { id: input.userId, orgId },
      });
      const org = await ctx.prisma.organization.findUnique({ where: { id: orgId } });
      const assets = await ctx.prisma.brandAsset.findMany({ where: { orgId } });
      const campaigns = await ctx.prisma.campaign.findMany({ where: { orgId } });

      if (!user || !org) throw new Error("User or org not found");

      const assetMap = toCompileAssetMap(assets as AssetRecord[], getBaseUrl());
      const campaignMap = buildCampaignMap(campaigns, assets as AssetRecord[], input.definition);

      const compiled = compile(
        input.definition,
        {
          user: {
            user: {
              displayName: user.displayName,
              jobTitle: user.jobTitle ?? undefined,
              department: user.department ?? undefined,
              country: user.country ?? undefined,
              email: user.email,
              mobile: user.mobile ?? undefined,
              officePhone: user.officePhone ?? undefined,
              photoUrl: user.photoUrl ?? undefined,
            },
            organization: { name: org.name },
          },
          assets: assetMap,
          campaigns: campaignMap,
        },
      );

      const linted = lintHtml(compiled.html, {
        approvedLogoAssetId: "asset-logo",
        requiredDisclaimer: true,
      });

      return { ...compiled, lint: linted };
    }),
});

export const rulesRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const orgId = await getOrgId(ctx);
    return ctx.prisma.rule.findMany({
      where: { orgId },
      orderBy: [{ level: "asc" }, { priority: "asc" }],
    });
  }),
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.rule.findUnique({ where: { id: input.id } });
    }),
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        level: z.enum(["USER", "GROUP", "DEPT_OFFICE", "ORG"]),
        priority: z.number().int(),
        conditions: z.array(z.any()),
        actions: z.array(z.any()).min(1),
        enabled: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = await getOrgId(ctx);
      RuleDefinitionSchema.parse({ id: "temp", ...input });
      return ctx.prisma.rule.create({
        data: {
          orgId,
          name: input.name,
          level: input.level,
          priority: input.priority,
          conditions: JSON.stringify(input.conditions),
          actions: JSON.stringify(input.actions),
          enabled: input.enabled,
        },
      });
    }),
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        level: z.enum(["USER", "GROUP", "DEPT_OFFICE", "ORG"]).optional(),
        priority: z.number().int().optional(),
        conditions: z.array(z.any()).optional(),
        actions: z.array(z.any()).optional(),
        enabled: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.prisma.rule.update({
        where: { id },
        data: {
          ...(data.name && { name: data.name }),
          ...(data.level && { level: data.level }),
          ...(data.priority !== undefined && { priority: data.priority }),
          ...(data.conditions && { conditions: JSON.stringify(data.conditions) }),
          ...(data.actions && { actions: JSON.stringify(data.actions) }),
          ...(data.enabled !== undefined && { enabled: data.enabled }),
        },
      });
    }),
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.rule.delete({ where: { id: input.id } });
    }),
  reorder: protectedProcedure
    .input(z.object({ id: z.string(), priority: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.rule.update({
        where: { id: input.id },
        data: { priority: input.priority },
      });
    }),
});

export const campaignsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const orgId = await getOrgId(ctx);
    return ctx.prisma.campaign.findMany({
      where: { orgId },
      orderBy: { startDate: "desc" },
    });
  }),
});

export const assetsRouter = router({
  list: protectedProcedure
    .input(z.object({ kind: z.enum(["LOGO", "BANNER", "CERTIFICATION", "PHOTO"]).optional() }).optional())
    .query(async ({ ctx, input }) => {
      const orgId = await getOrgId(ctx);
      return ctx.prisma.brandAsset.findMany({
        where: {
          orgId,
          ...(input?.kind ? { kind: input.kind } : {}),
        },
        orderBy: { id: "desc" },
      });
    }),
  create: protectedProcedure
    .input(
      z.object({
        kind: z.enum(["LOGO", "BANNER", "CERTIFICATION", "PHOTO"]),
        url: z.string().min(1),
        bytes: z.number().int().optional(),
        width: z.number().int().positive().optional(),
        height: z.number().int().positive().optional(),
        alt: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = await getOrgId(ctx);
      if (!input.url.startsWith("https://") && !input.url.startsWith("http://") && !input.url.startsWith("/")) {
        throw new Error("URL https://, http:// veya /uploads/ ile başlamalı");
      }
      return ctx.prisma.brandAsset.create({
        data: {
          orgId,
          kind: input.kind,
          url: input.url,
          bytes: input.bytes ?? 0,
          width: input.width,
          height: input.height,
          alt: input.alt,
        },
      });
    }),
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const orgId = await getOrgId(ctx);
      const asset = await ctx.prisma.brandAsset.findFirst({
        where: { id: input.id, orgId },
      });
      if (!asset) throw new Error("Asset not found");
      return ctx.prisma.brandAsset.delete({ where: { id: input.id } });
    }),
});

export const simulateRouter = router({
  run: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        sendingAlias: z.string().optional(),
        messageType: z.enum(["new", "reply"]).default("new"),
        recipientType: z.enum(["internal", "external"]).default("external"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = await getOrgId(ctx);
      const [user, rules, templates, org, assets, campaigns, groups] = await Promise.all([
        ctx.prisma.user.findFirst({ where: { id: input.userId, orgId } }),
        ctx.prisma.rule.findMany({ where: { orgId, enabled: true } }),
        ctx.prisma.template.findMany({ where: { orgId } }),
        ctx.prisma.organization.findUnique({ where: { id: orgId } }),
        ctx.prisma.brandAsset.findMany({ where: { orgId } }),
        ctx.prisma.campaign.findMany({ where: { orgId } }),
        ctx.prisma.group.findMany({ where: { orgId } }),
      ]);

      if (!user || !org) throw new Error("User or org not found");

      const groupIds = groups
        .filter((g) => parseJson<string[]>(g.memberIds).includes(user.id))
        .map((g) => g.id);

      const templateMap = Object.fromEntries(
        templates.map((t) => [t.id, toTemplateDefinition(t.definition)]),
      );

      const assetMap = toCompileAssetMap(assets as AssetRecord[], getBaseUrl());
      const campaignMap = buildCampaignMap(campaigns, assets as AssetRecord[]);

      const aliases = parseJson<string[]>(user.sendAsAliases);

      return simulate({
        context: {
          user: {
            id: user.id,
            displayName: user.displayName,
            email: user.email,
            jobTitle: user.jobTitle ?? undefined,
            department: user.department ?? undefined,
            country: user.country ?? undefined,
            groupIds,
            sendAsAliases: aliases,
          },
          sendingAlias: input.sendingAlias ?? user.email,
          messageType: input.messageType,
          recipientType: input.recipientType,
          at: new Date(),
        },
        rules: rules.map(toRuleDefinition),
        defaultTemplateId: templates[0]?.id,
        templates: templateMap,
        compileContext: {
          user: {
            user: {
              displayName: user.displayName,
              jobTitle: user.jobTitle ?? undefined,
              department: user.department ?? undefined,
              country: user.country ?? undefined,
              email: user.email,
              mobile: user.mobile ?? undefined,
              officePhone: user.officePhone ?? undefined,
              photoUrl: user.photoUrl ?? undefined,
            },
            organization: { name: org.name },
          },
          assets: assetMap,
          campaigns: campaignMap,
        },
        lintOptions: { approvedLogoAssetId: "asset-logo", requiredDisclaimer: true },
      });
    }),
});

export const lintRouter = router({
  lintHtml: publicProcedure
    .input(z.object({ html: z.string() }))
    .query(({ input }) => lintHtml(input.html)),
});

export const authRouter = router({
  me: publicProcedure.query(({ ctx }) => ctx.session),
  createOrg: onboardingProcedure
    .input(
      z.object({
        name: z.string().min(2).max(80),
        slug: z.string().min(2).max(80),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const slug = slugify(input.slug);
      if (slug.length < SlugSchema.min || !SlugSchema.pattern.test(slug)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid slug" });
      }
      if (isReservedSlug(slug)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Slug is reserved" });
      }
      const taken = await ctx.prisma.organization.findUnique({ where: { slug } });
      if (taken) {
        throw new TRPCError({ code: "CONFLICT", message: "Slug already in use" });
      }

      const email = ctx.session?.email;
      if (!email) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Google account has no email" });
      }

      const org = await ctx.prisma.organization.create({
        data: {
          name: input.name.trim(),
          slug,
          admins: {
            create: {
              email,
              name: ctx.session?.name ?? email,
              googleSub: ctx.session?.googleSub,
              role: "SUPER_ADMIN",
            },
          },
        },
      });

      return { orgId: org.id, slug: org.slug, name: org.name };
    }),
});

export const appRouter = router({
  auth: authRouter,
  org: orgRouter,
  users: usersRouter,
  templates: templatesRouter,
  rules: rulesRouter,
  campaigns: campaignsRouter,
  assets: assetsRouter,
  simulate: simulateRouter,
  lint: lintRouter,
});

export type AppRouter = typeof appRouter;
