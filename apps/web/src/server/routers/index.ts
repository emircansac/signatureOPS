import { z } from "zod";
import { compile, fittedDisplaySize } from "@signatureops/compiler";
import { lintHtml } from "@signatureops/linter";
import {
  collectTemplateAssetIds,
  parseTemplateDefinition,
  RuleDefinitionSchema,
  TemplateDefinitionInputSchema,
  TemplateDefinitionSchema,
  normalizeStoredCountry,
  normalizeStoredPhone,
  type TemplateDefinition,
} from "@signatureops/schema";
import { onboardingProcedure, protectedProcedure, publicProcedure, signedInProcedure, superAdminProcedure, router, type TRPCContext } from "../trpc";
import { type AssetRecord } from "../lib/assets";
import { isAllowedAssetUrl, resolvePublicAssetUrl } from "@/lib/asset-url";
import { connectionsRouter, deployRouter, invitesRouter } from "./ops";
import { hashToken } from "@/lib/crypto-token";
import { buildCampaignMap, compileUserSignature, parseJson } from "../lib/compile-user-signature";
import { appBaseUrl } from "@/env";
import {
  buildCompileContext,
  hasLegalDisclaimerText,
  logoResolved,
} from "../lib/compile-context";
import { isReservedSlug, SlugSchema, slugify } from "@/lib/slug";
import { isPersonTitleComplete } from "@/lib/onboarding";
import {
  optionalText,
  validateImportRows,
  type MappedPersonRow,
} from "@/lib/directory-import";
import {
  CampaignInputSchema,
  CampaignUpdateSchema,
  campaignStatus,
  findActiveCampaignForTemplate,
  fromCampaignDate,
  overlappingCampaign,
  parseTemplateIds,
  toCampaignDate,
} from "@signatureops/schema";
import {
  BrandColorsSchema,
  SocialIconModeSchema,
  isUniqueSlot,
  kindForSlot,
  parseBrandColors,
  type IdentitySlot,
} from "@/lib/identity";
import { TRPCError } from "@trpc/server";

async function getOrgId(ctx: { orgId: string | null }) {
  if (!ctx.orgId) throw new Error("No organization found");
  return ctx.orgId;
}

function getBaseUrl() {
  return appBaseUrl();
}

function assetIdsInTemplate(definition: string): string[] {
  try {
    return collectTemplateAssetIds(parseTemplateDefinition(parseJson(definition)));
  } catch {
    return [];
  }
}

export const orgRouter = router({
  dashboard: protectedProcedure.query(async ({ ctx }) => {
    const orgId = await getOrgId(ctx);
    const [org, logoCount, people] = await Promise.all([
      ctx.prisma.organization.findUnique({
        where: { id: orgId },
        select: {
          onboardingSkipCampaign: true,
          _count: { select: { templates: true, users: true, campaigns: true } },
        },
      }),
      ctx.prisma.brandAsset.count({ where: { orgId, kind: "LOGO" } }),
      ctx.prisma.user.findMany({ where: { orgId }, select: { jobTitle: true } }),
    ]);
    if (!org) throw new TRPCError({ code: "NOT_FOUND" });

    return {
      templateCount: org._count.templates,
      userCount: org._count.users,
      hasLogo: logoCount > 0,
      hasPersonWithTitle: people.some((person) => isPersonTitleComplete(person.jobTitle)),
      hasCampaign: org._count.campaigns > 0,
      hasTemplate: org._count.templates > 0,
      skipCampaign: org.onboardingSkipCampaign,
    };
  }),
  skipCampaignOnboarding: protectedProcedure.mutation(async ({ ctx }) => {
    const orgId = await getOrgId(ctx);
    await ctx.prisma.organization.update({
      where: { id: orgId },
      data: { onboardingSkipCampaign: true },
    });
    return { skipCampaign: true };
  }),
});

const PersonFieldsSchema = z.object({
  displayName: z.string().trim().min(1),
  jobTitle: z.string().trim().min(1),
  email: z.string().trim().email(),
  mobile: z.string().trim().optional().nullable(),
  department: z.string().trim().optional().nullable(),
  country: z.string().trim().optional().nullable(),
  photoUrl: z.string().trim().optional().nullable(),
});

const ImportRowSchema = z.object({
  rowNumber: z.number().int().positive(),
  displayName: z.string(),
  jobTitle: z.string(),
  email: z.string(),
  mobile: z.string().optional(),
  department: z.string().optional(),
  country: z.string().optional(),
  photoUrl: z.string().optional(),
});

function emptyToNull(value: string | null | undefined): string | null {
  return optionalText(value);
}

function assertPersonPhotoUrl(url: string | null) {
  if (!url) return;
  if (!isAllowedAssetUrl(url, process.env.NODE_ENV === "production")) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Fotoğraf URL'si https:// ile başlamalı",
    });
  }
}

async function findUserByEmail(
  prisma: TRPCContext["prisma"],
  orgId: string,
  email: string,
  excludeId?: string,
) {
  const needle = email.trim().toLowerCase();
  const users = await prisma.user.findMany({
    where: { orgId, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { id: true, email: true },
  });
  return users.find((user) => user.email.toLowerCase() === needle) ?? null;
}

export const usersRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const orgId = await getOrgId(ctx);
    return ctx.prisma.user.findMany({
      where: { orgId },
      orderBy: { displayName: "asc" },
    });
  }),
  create: protectedProcedure.input(PersonFieldsSchema).mutation(async ({ ctx, input }) => {
    const orgId = await getOrgId(ctx);
    const photoUrl = emptyToNull(input.photoUrl);
    assertPersonPhotoUrl(photoUrl);
    const taken = await findUserByEmail(ctx.prisma, orgId, input.email);
    if (taken) {
      throw new TRPCError({ code: "CONFLICT", message: "EMAIL_TAKEN" });
    }
    const email = input.email.trim();
    return ctx.prisma.user.create({
      data: {
        orgId,
        externalId: `dir:${email.toLowerCase()}`,
        displayName: input.displayName.trim(),
        jobTitle: input.jobTitle.trim(),
        email,
        mobile: normalizeStoredPhone(input.mobile, input.country),
        department: emptyToNull(input.department),
        country: normalizeStoredCountry(input.country),
        photoUrl,
        sendAsAliases: JSON.stringify([email]),
      },
    });
  }),
  update: protectedProcedure
    .input(PersonFieldsSchema.extend({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const orgId = await getOrgId(ctx);
      const existing = await ctx.prisma.user.findFirst({ where: { id: input.id, orgId } });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Person not found" });
      }
      const photoUrl = emptyToNull(input.photoUrl);
      assertPersonPhotoUrl(photoUrl);
      const taken = await findUserByEmail(ctx.prisma, orgId, input.email, input.id);
      if (taken) {
        throw new TRPCError({ code: "CONFLICT", message: "EMAIL_TAKEN" });
      }
      return ctx.prisma.user.update({
        where: { id: input.id },
        data: {
          displayName: input.displayName.trim(),
          jobTitle: input.jobTitle.trim(),
          email: input.email.trim(),
          mobile: normalizeStoredPhone(input.mobile, input.country),
          department: emptyToNull(input.department),
          country: normalizeStoredCountry(input.country),
          photoUrl,
        },
      });
    }),
  delete: superAdminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const orgId = await getOrgId(ctx);
      const existing = await ctx.prisma.user.findFirst({ where: { id: input.id, orgId } });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Person not found" });
      }
      await ctx.prisma.user.delete({ where: { id: input.id } });
      return { ok: true };
    }),
  importRows: protectedProcedure
    .input(z.object({ rows: z.array(ImportRowSchema).max(5000) }))
    .mutation(async ({ ctx, input }) => {
      const orgId = await getOrgId(ctx);
      const existing = await ctx.prisma.user.findMany({
        where: { orgId },
        select: { id: true, email: true },
      });
      const preview = validateImportRows(input.rows as MappedPersonRow[], existing.map((u) => u.email));
      const byEmail = new Map(existing.map((u) => [u.email.toLowerCase(), u.id]));
      let created = 0;
      let updated = 0;

      for (const row of preview.valid) {
        const photoUrl = row.photoUrl !== undefined ? emptyToNull(row.photoUrl) : undefined;
        if (photoUrl) assertPersonPhotoUrl(photoUrl);
        const email = row.email.trim();
        const country = row.country !== undefined ? normalizeStoredCountry(row.country) : undefined;
        const mobile =
          row.mobile !== undefined ? normalizeStoredPhone(row.mobile, country ?? row.country) : undefined;
        const data = {
          displayName: row.displayName.trim(),
          jobTitle: row.jobTitle.trim(),
          email,
          ...(mobile !== undefined ? { mobile } : {}),
          ...(row.department !== undefined ? { department: emptyToNull(row.department) } : {}),
          ...(country !== undefined ? { country } : {}),
          ...(row.photoUrl !== undefined ? { photoUrl } : {}),
        };

        if (row.action === "update") {
          const id = byEmail.get(email.toLowerCase());
          if (!id) continue;
          await ctx.prisma.user.update({ where: { id }, data });
          updated += 1;
        } else {
          const createdUser = await ctx.prisma.user.create({
            data: {
              orgId,
              externalId: `dir:${email.toLowerCase()}`,
              sendAsAliases: JSON.stringify([email]),
              ...data,
              photoUrl: photoUrl ?? null,
              mobile: data.mobile ?? null,
              department: data.department ?? null,
              country: data.country ?? null,
            },
          });
          byEmail.set(email.toLowerCase(), createdUser.id);
          created += 1;
        }
      }

      return {
        created,
        updated,
        failed: preview.errors.length,
        errors: preview.errors,
      };
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
        definition: TemplateDefinitionInputSchema,
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
        definition: TemplateDefinitionInputSchema.optional(),
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
  compilePreview: protectedProcedure
    .input(
      z.object({
        definition: TemplateDefinitionInputSchema,
        userId: z.string(),
        templateId: z.string().optional(),
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

      const campaignMap = buildCampaignMap(campaigns, assets as AssetRecord[], input.definition);
      const active = findActiveCampaignForTemplate(campaigns, input.templateId);
      const fallbackPhoto = assets.find((asset) => asset.slot === "profile_fallback");
      const compileContext = buildCompileContext({
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
        assets: assets as AssetRecord[],
        campaigns: campaignMap,
        org,
        fallbackPhotoUrl: fallbackPhoto?.url,
        baseUrl: getBaseUrl(),
        activeCampaignId: active?.id,
      });

      const compiled = compile(input.definition, compileContext);
      const approvedLogoFound = logoResolved(input.definition, compileContext);
      const linted = lintHtml(compiled.html, {
        requiredDisclaimer: true,
        hasLegalDisclaimerText: hasLegalDisclaimerText(input.definition),
        ...(approvedLogoFound === undefined ? {} : { approvedLogoFound }),
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
  create: superAdminProcedure
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
  update: superAdminProcedure
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
      const orgId = await getOrgId(ctx);
      const existing = await ctx.prisma.rule.findFirst({ where: { id: input.id, orgId } });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      const next = {
        id: existing.id,
        name: input.name ?? existing.name,
        level: input.level ?? existing.level,
        priority: input.priority ?? existing.priority,
        conditions: input.conditions ?? parseJson(existing.conditions),
        actions: input.actions ?? parseJson(existing.actions),
        enabled: input.enabled ?? existing.enabled,
      };
      RuleDefinitionSchema.parse(next);
      return ctx.prisma.rule.update({
        where: { id: input.id },
        data: {
          name: next.name,
          level: next.level,
          priority: next.priority,
          conditions: JSON.stringify(next.conditions),
          actions: JSON.stringify(next.actions),
          enabled: next.enabled,
        },
      });
    }),
  delete: superAdminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const orgId = await getOrgId(ctx);
      const existing = await ctx.prisma.rule.findFirst({ where: { id: input.id, orgId } });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      await ctx.prisma.rule.delete({ where: { id: input.id } });
      return { ok: true };
    }),
});

export const groupsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const orgId = await getOrgId(ctx);
    return ctx.prisma.group.findMany({
      where: { orgId },
      orderBy: { name: "asc" },
    });
  }),
});

function presentCampaign(campaign: {
  id: string;
  orgId: string;
  name: string;
  bannerAssetId: string;
  startDate: Date;
  endDate: Date;
  slogan: string | null;
  ctaText: string | null;
  ctaLink: string | null;
  logoOverrideAssetId: string | null;
  templateIds: string;
}) {
  const startDate = fromCampaignDate(campaign.startDate);
  const endDate = fromCampaignDate(campaign.endDate);
  return {
    id: campaign.id,
    orgId: campaign.orgId,
    name: campaign.name,
    bannerAssetId: campaign.bannerAssetId,
    startDate,
    endDate,
    slogan: campaign.slogan,
    logoOverrideAssetId: campaign.logoOverrideAssetId,
    templateIds: parseTemplateIds(campaign.templateIds),
    ctaOverride:
      campaign.ctaText?.trim() && campaign.ctaLink?.trim()
        ? { text: campaign.ctaText.trim(), link: campaign.ctaLink.trim() }
        : null,
    status: campaignStatus(startDate, endDate),
  };
}

function campaignWriteData(input: {
  name: string;
  startDate: string;
  endDate: string;
  bannerAssetId: string;
  slogan?: string;
  ctaOverride?: { text: string; link: string };
  logoOverrideAssetId?: string;
  templateIds: string[];
}) {
  return {
    name: input.name.trim(),
    bannerAssetId: input.bannerAssetId,
    startDate: toCampaignDate(input.startDate),
    endDate: toCampaignDate(input.endDate),
    slogan: input.slogan?.trim() || null,
    ctaText: input.ctaOverride?.text.trim() || null,
    ctaLink: input.ctaOverride?.link.trim() || null,
    logoOverrideAssetId: input.logoOverrideAssetId || null,
    templateIds: JSON.stringify(input.templateIds),
  };
}

export const campaignsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const orgId = await getOrgId(ctx);
    const campaigns = await ctx.prisma.campaign.findMany({
      where: { orgId },
      orderBy: { startDate: "desc" },
    });
    return campaigns.map(presentCampaign);
  }),
  create: protectedProcedure.input(CampaignInputSchema).mutation(async ({ ctx, input }) => {
    const orgId = await getOrgId(ctx);
    await assertCampaignAssets(ctx.prisma, orgId, input);
    const existing = await ctx.prisma.campaign.findMany({ where: { orgId } });
    const conflict = overlappingCampaign(existing, input.templateIds, input.startDate, input.endDate);
    if (conflict) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "TEMPLATE_OVERLAP",
      });
    }
    const created = await ctx.prisma.campaign.create({
      data: { orgId, ...campaignWriteData(input) },
    });
    return presentCampaign(created);
  }),
  update: protectedProcedure
    .input(CampaignUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const orgId = await getOrgId(ctx);
      const existingRow = await ctx.prisma.campaign.findFirst({ where: { id: input.id, orgId } });
      if (!existingRow) throw new TRPCError({ code: "NOT_FOUND", message: "Campaign not found" });
      await assertCampaignAssets(ctx.prisma, orgId, input);
      const existing = await ctx.prisma.campaign.findMany({ where: { orgId } });
      const conflict = overlappingCampaign(
        existing,
        input.templateIds,
        input.startDate,
        input.endDate,
        input.id,
      );
      if (conflict) {
        throw new TRPCError({ code: "CONFLICT", message: "TEMPLATE_OVERLAP" });
      }
      const updated = await ctx.prisma.campaign.update({
        where: { id: input.id },
        data: campaignWriteData(input),
      });
      return presentCampaign(updated);
    }),
  delete: superAdminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const orgId = await getOrgId(ctx);
      const existing = await ctx.prisma.campaign.findFirst({ where: { id: input.id, orgId } });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Campaign not found" });
      await ctx.prisma.campaign.delete({ where: { id: input.id } });
      return { ok: true };
    }),
});

async function assertCampaignAssets(
  prisma: TRPCContext["prisma"],
  orgId: string,
  input: z.infer<typeof CampaignInputSchema>,
) {
  const banner = await prisma.brandAsset.findFirst({ where: { id: input.bannerAssetId, orgId } });
  if (!banner || (banner.kind !== "BANNER" && banner.slot !== "banner")) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Banner asset not found" });
  }
  if (input.logoOverrideAssetId) {
    const logo = await prisma.brandAsset.findFirst({
      where: { id: input.logoOverrideAssetId, orgId },
    });
    if (!logo || (logo.kind !== "LOGO" && !logo.slot?.startsWith("logo"))) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Logo asset not found" });
    }
  }
}

const AssetKindSchema = z.enum(["LOGO", "BANNER", "CERTIFICATION", "PHOTO", "ICON"]);
const IdentitySlotSchema = z.enum([
  "logo",
  "logo_light",
  "logo_dark",
  "logo_mark",
  "banner",
  "certification",
  "profile_fallback",
  "cta_icon",
  "legal_badge",
  "social_linkedin",
  "social_x",
  "social_instagram",
  "social_facebook",
  "social_youtube",
]);

async function ensureIdentitySlots(
  prisma: TRPCContext["prisma"],
  orgId: string,
) {
  const assets = await prisma.brandAsset.findMany({ where: { orgId } });
  const slotted = new Set(assets.map((asset) => asset.slot).filter(Boolean));
  if (!slotted.has("logo")) {
    const logo = assets.find((asset) => asset.kind === "LOGO" && !asset.slot);
    if (logo) {
      await prisma.brandAsset.update({ where: { id: logo.id }, data: { slot: "logo" } });
    }
  }
  if (!slotted.has("banner")) {
    const banner = assets.find((asset) => asset.kind === "BANNER" && !asset.slot);
    if (banner) {
      await prisma.brandAsset.update({ where: { id: banner.id }, data: { slot: "banner" } });
    }
  }
}

function assertAssetUrl(url: string) {
  if (!isAllowedAssetUrl(url, process.env.NODE_ENV === "production")) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "URL https:// ile başlamalı",
    });
  }
}

export const identityRouter = router({
  get: protectedProcedure.query(async ({ ctx }) => {
    const orgId = await getOrgId(ctx);
    await ensureIdentitySlots(ctx.prisma, orgId);
    const [org, assets, templates, campaigns] = await Promise.all([
      ctx.prisma.organization.findUnique({ where: { id: orgId } }),
      ctx.prisma.brandAsset.findMany({ where: { orgId }, orderBy: { createdAt: "desc" } }),
      ctx.prisma.template.findMany({
        where: { orgId },
        select: { id: true, name: true, definition: true },
      }),
      ctx.prisma.campaign.findMany({
        where: { orgId },
        select: { id: true, name: true, bannerAssetId: true, logoOverrideAssetId: true },
      }),
    ]);
    if (!org) throw new TRPCError({ code: "NOT_FOUND" });

    const withUsage = assets.map((asset) => ({
      ...asset,
      usedIn: {
        templates: templates
          .filter((tpl) => assetIdsInTemplate(tpl.definition).includes(asset.id))
          .map(({ id, name }) => ({ id, name })),
        campaigns: campaigns
          .filter(
            (campaign) =>
              campaign.bannerAssetId === asset.id || campaign.logoOverrideAssetId === asset.id,
          )
          .map(({ id, name }) => ({ id, name })),
      },
    }));

    const slots = Object.fromEntries(
      withUsage.filter((asset) => asset.slot && isUniqueSlot(asset.slot)).map((asset) => [asset.slot, asset]),
    );

    return {
      colors: parseBrandColors(org.brandColors),
      socialIconMode: SocialIconModeSchema.catch("standard").parse(org.socialIconMode),
      slots,
      certifications: withUsage.filter((asset) => asset.slot === "certification"),
    };
  }),
  setColors: protectedProcedure.input(BrandColorsSchema).mutation(async ({ ctx, input }) => {
    const orgId = await getOrgId(ctx);
    await ctx.prisma.organization.update({
      where: { id: orgId },
      data: { brandColors: JSON.stringify(input) },
    });
    return input;
  }),
  setSocialIconMode: protectedProcedure
    .input(z.object({ mode: SocialIconModeSchema }))
    .mutation(async ({ ctx, input }) => {
      const orgId = await getOrgId(ctx);
      await ctx.prisma.organization.update({
        where: { id: orgId },
        data: { socialIconMode: input.mode },
      });
      return input.mode;
    }),
});

export const assetsRouter = router({
  list: protectedProcedure
    .input(z.object({ kind: AssetKindSchema.optional() }).optional())
    .query(async ({ ctx, input }) => {
      const orgId = await getOrgId(ctx);
      const [assets, templates, campaigns] = await Promise.all([
        ctx.prisma.brandAsset.findMany({
          where: {
            orgId,
            ...(input?.kind ? { kind: input.kind } : {}),
          },
          orderBy: { createdAt: "desc" },
        }),
        ctx.prisma.template.findMany({
          where: { orgId },
          select: { id: true, name: true, definition: true },
        }),
        ctx.prisma.campaign.findMany({
          where: { orgId },
          select: { id: true, name: true, bannerAssetId: true, logoOverrideAssetId: true },
        }),
      ]);

      return assets.map((asset) => ({
        ...asset,
        usedIn: {
          templates: templates
            .filter((tpl) => assetIdsInTemplate(tpl.definition).includes(asset.id))
            .map(({ id, name }) => ({ id, name })),
          campaigns: campaigns
            .filter(
              (campaign) =>
                campaign.bannerAssetId === asset.id || campaign.logoOverrideAssetId === asset.id,
            )
            .map(({ id, name }) => ({ id, name })),
        },
      }));
    }),
  upsertSlot: protectedProcedure
    .input(
      z.object({
        slot: IdentitySlotSchema,
        url: z.string().min(1),
        bytes: z.number().int().optional(),
        width: z.number().int().positive().optional(),
        height: z.number().int().positive().optional(),
        alt: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = await getOrgId(ctx);
      assertAssetUrl(input.url);
      const kind = kindForSlot(input.slot as IdentitySlot);
      const display = fittedDisplaySize(input.slot, input.width, input.height);
      const data = {
        kind,
        url: input.url,
        bytes: input.bytes ?? 0,
        width: display.width,
        height: display.height,
        alt: input.alt,
        slot: input.slot,
      };

      if (input.slot === "certification" || !isUniqueSlot(input.slot)) {
        return ctx.prisma.brandAsset.create({ data: { ...data, orgId } });
      }

      const existing = await ctx.prisma.brandAsset.findFirst({
        where: { orgId, slot: input.slot },
      });
      if (existing) {
        return ctx.prisma.brandAsset.update({
          where: { id: existing.id },
          data,
        });
      }
      return ctx.prisma.brandAsset.create({ data: { ...data, orgId } });
    }),
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        kind: AssetKindSchema.optional(),
        alt: z.string().optional(),
        width: z.number().int().positive().nullable().optional(),
        height: z.number().int().positive().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = await getOrgId(ctx);
      const asset = await ctx.prisma.brandAsset.findFirst({
        where: { id: input.id, orgId },
      });
      if (!asset) throw new TRPCError({ code: "NOT_FOUND", message: "Asset not found" });
      return ctx.prisma.brandAsset.update({
        where: { id: input.id },
        data: {
          ...(input.kind ? { kind: input.kind } : {}),
          ...(input.alt !== undefined ? { alt: input.alt || null } : {}),
          ...(input.width !== undefined ? { width: input.width } : {}),
          ...(input.height !== undefined ? { height: input.height } : {}),
        },
      });
    }),
  delete: superAdminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const orgId = await getOrgId(ctx);
      const asset = await ctx.prisma.brandAsset.findFirst({
        where: { id: input.id, orgId },
      });
      if (!asset) throw new TRPCError({ code: "NOT_FOUND", message: "Asset not found" });
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
      const compiled = await compileUserSignature(ctx.prisma, {
        orgId,
        userId: input.userId,
        sendingAlias: input.sendingAlias,
        messageType: input.messageType,
        recipientType: input.recipientType,
      });
      if (!compiled) throw new Error("User or org not found");
      return compiled.result;
    }),
});

export const authRouter = router({
  createOrg: onboardingProcedure
    .input(
      z.object({
        name: z.string().min(2).max(80),
        slug: z.string().min(2).max(80),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const session = ctx.session;
      const email = session?.email;
      if (!session || !email) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Google account has no email" });
      }

      const existingAdmin = await ctx.prisma.adminUser.findFirst({
        where: {
          OR: [
            ...(session.googleSub ? [{ googleSub: session.googleSub }] : []),
            { email },
          ],
        },
        include: { org: true },
      });
      if (existingAdmin) {
        return {
          orgId: existingAdmin.org.id,
          slug: existingAdmin.org.slug,
          name: existingAdmin.org.name,
        };
      }

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

      const org = await ctx.prisma.organization.create({
        data: {
          name: input.name.trim(),
          slug,
          admins: {
            create: {
              email,
              name: session.name ?? email,
              googleSub: session.googleSub,
              role: "SUPER_ADMIN",
            },
          },
        },
      });

      return { orgId: org.id, slug: org.slug, name: org.name };
    }),
  previewInvite: publicProcedure
    .input(z.object({ token: z.string().min(8) }))
    .query(async ({ ctx, input }) => {
      const invite = await ctx.prisma.adminInvite.findUnique({
        where: { tokenHash: hashToken(input.token) },
        include: { org: { select: { name: true, slug: true } } },
      });
      if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
        throw new TRPCError({ code: "NOT_FOUND", message: "INVITE_INVALID" });
      }
      const sessionEmail = ctx.session?.email?.toLowerCase();
      return {
        email: invite.email,
        role: invite.role,
        orgName: invite.org.name,
        orgSlug: invite.org.slug,
        matchesSession: Boolean(sessionEmail && sessionEmail === invite.email.toLowerCase()),
      };
    }),
  acceptInvite: signedInProcedure
    .input(z.object({ token: z.string().min(8) }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.session?.orgId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Already in an organization" });
      }
      const email = ctx.session?.email;
      if (!email) throw new TRPCError({ code: "BAD_REQUEST", message: "Google account has no email" });
      const invite = await ctx.prisma.adminInvite.findUnique({
        where: { tokenHash: hashToken(input.token) },
      });
      if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
        throw new TRPCError({ code: "NOT_FOUND", message: "INVITE_INVALID" });
      }
      if (invite.email.toLowerCase() !== email.toLowerCase()) {
        throw new TRPCError({ code: "FORBIDDEN", message: "INVITE_EMAIL_MISMATCH" });
      }
      await ctx.prisma.$transaction([
        ctx.prisma.adminUser.create({
          data: {
            orgId: invite.orgId,
            email,
            name: ctx.session?.name ?? email,
            googleSub: ctx.session?.googleSub,
            role: invite.role,
          },
        }),
        ctx.prisma.adminInvite.update({
          where: { id: invite.id },
          data: { acceptedAt: new Date() },
        }),
      ]);
      const org = await ctx.prisma.organization.findUniqueOrThrow({
        where: { id: invite.orgId },
        select: { slug: true, name: true },
      });
      return { orgId: invite.orgId, slug: org.slug, name: org.name };
    }),
});

export const appRouter = router({
  auth: authRouter,
  org: orgRouter,
  users: usersRouter,
  groups: groupsRouter,
  templates: templatesRouter,
  rules: rulesRouter,
  campaigns: campaignsRouter,
  assets: assetsRouter,
  identity: identityRouter,
  simulate: simulateRouter,
  connections: connectionsRouter,
  deploy: deployRouter,
  invites: invitesRouter,
});

export type AppRouter = typeof appRouter;
