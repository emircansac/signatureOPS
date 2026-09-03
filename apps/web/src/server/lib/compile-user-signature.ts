import { simulate } from "@signatureops/rules";
import {
  parseTemplateDefinition,
  RuleDefinitionSchema,
  campaignStatus,
  findActiveCampaignForTemplate,
  fromCampaignDate,
  type RuleDefinition,
  type TemplateDefinition,
} from "@signatureops/schema";
import type { PrismaClient } from "@signatureops/db";
import { resolvePublicAssetUrl } from "@/lib/asset-url";
import { type AssetRecord } from "@/server/lib/assets";
import { buildCompileContext } from "@/server/lib/compile-context";
import { appBaseUrl } from "@/env";

function parseJson<T>(value: string): T {
  return JSON.parse(value) as T;
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

export function buildCampaignMap(
  campaigns: {
    id: string;
    bannerAssetId: string;
    slogan?: string | null;
    ctaText?: string | null;
    ctaLink?: string | null;
    logoOverrideAssetId?: string | null;
    startDate: Date;
    endDate: Date;
  }[],
  assets: AssetRecord[],
  definition?: TemplateDefinition,
) {
  const bannerAssets = assets.filter((a) => a.kind === "BANNER");
  const baseUrl = appBaseUrl();

  const map = Object.fromEntries(
    campaigns.map((c) => {
      const banner = bannerAssets.find((a) => a.id === c.bannerAssetId);
      const status = campaignStatus(fromCampaignDate(c.startDate), fromCampaignDate(c.endDate));
      return [
        c.id,
        {
          id: c.id,
          bannerUrl: banner ? resolvePublicAssetUrl(banner.url, baseUrl) : "",
          width: banner?.width ?? undefined,
          height: banner?.height ?? undefined,
          slogan: c.slogan?.trim() || undefined,
          ctaOverride:
            c.ctaText?.trim() && c.ctaLink?.trim()
              ? { text: c.ctaText.trim(), link: c.ctaLink.trim() }
              : undefined,
          logoOverrideAssetId: c.logoOverrideAssetId || undefined,
          active: status === "active",
        },
      ];
    }),
  );

  if (definition) {
    for (const block of definition.blocks) {
      if (block.type !== "campaign_banner") continue;
      const prefixed = block.campaignId.startsWith("asset:") ? block.campaignId.slice(6) : "";
      const assetId = block.assetId || prefixed;
      if (!assetId) continue;
      const asset = assets.find((a) => a.id === assetId);
      if (!asset) continue;
      map[block.campaignId || assetId] = {
        id: block.campaignId || assetId,
        bannerUrl: resolvePublicAssetUrl(asset.url, baseUrl),
        width: asset.width ?? undefined,
        height: asset.height ?? undefined,
        slogan: undefined,
        ctaOverride: undefined,
        logoOverrideAssetId: undefined,
        active: true,
      };
    }
  }

  return map;
}

export async function compileUserSignature(
  prisma: PrismaClient,
  input: {
    orgId: string;
    userId?: string;
    email?: string;
    sendingAlias?: string;
    messageType?: "new" | "reply";
    recipientType?: "internal" | "external";
  },
) {
  const user = input.userId
    ? await prisma.user.findFirst({ where: { id: input.userId, orgId: input.orgId } })
    : input.email
      ? await prisma.user.findFirst({
          where: { orgId: input.orgId, email: { equals: input.email, mode: "insensitive" } },
        })
      : null;

  const [rules, templates, org, assets, campaigns, groups] = await Promise.all([
    prisma.rule.findMany({ where: { orgId: input.orgId, enabled: true } }),
    prisma.template.findMany({ where: { orgId: input.orgId } }),
    prisma.organization.findUnique({ where: { id: input.orgId } }),
    prisma.brandAsset.findMany({ where: { orgId: input.orgId } }),
    prisma.campaign.findMany({ where: { orgId: input.orgId } }),
    prisma.group.findMany({ where: { orgId: input.orgId } }),
  ]);

  if (!user || !org) return null;

  const groupIds = groups
    .filter((g) => parseJson<string[]>(g.memberIds).includes(user.id))
    .map((g) => g.id);

  const templateMap = Object.fromEntries(
    templates.map((t) => [t.id, toTemplateDefinition(t.definition)]),
  );
  const campaignMap = buildCampaignMap(campaigns, assets as AssetRecord[]);
  const fallbackPhoto = assets.find((asset) => asset.slot === "profile_fallback");
  const activeCampaignIdForTemplate = Object.fromEntries(
    templates.flatMap((template) => {
      const active = findActiveCampaignForTemplate(campaigns, template.id);
      return active ? [[template.id, active.id] as const] : [];
    }),
  );
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
    baseUrl: appBaseUrl(),
  });

  const aliases = parseJson<string[]>(user.sendAsAliases);
  const result = simulate({
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
      messageType: input.messageType ?? "new",
      recipientType: input.recipientType ?? "external",
      at: new Date(),
      activeCampaignIds: campaigns
        .filter(
          (campaign) =>
            campaignStatus(fromCampaignDate(campaign.startDate), fromCampaignDate(campaign.endDate)) ===
            "active",
        )
        .map((campaign) => campaign.id),
    },
    rules: rules.map(toRuleDefinition),
    defaultTemplateId: templates[0]?.id,
    templates: templateMap,
    compileContext,
    activeCampaignIdForTemplate,
    lintOptions: { requiredDisclaimer: true },
  });

  return { user, org, aliases, result };
}

export { toRuleDefinition, toTemplateDefinition, parseJson };
