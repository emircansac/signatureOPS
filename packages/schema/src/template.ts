import { z } from "zod";

export const LayoutSchema = z.enum(["single-column", "two-column"]);
export type Layout = z.infer<typeof LayoutSchema>;

export const TemplateColumnSchema = z.union([z.literal(1), z.literal(2), z.literal("below")]);
export type TemplateColumn = z.infer<typeof TemplateColumnSchema>;
const ColumnFieldSchema = TemplateColumnSchema.optional();

export const LogoVariantSchema = z.enum(["default", "light", "dark", "mark"]);
export type LogoVariant = z.infer<typeof LogoVariantSchema>;

export const LogoSizeSchema = z.enum(["small", "large"]);
export type LogoSize = z.infer<typeof LogoSizeSchema>;

export const SOCIAL_PLATFORM_IDS = [
  "linkedin",
  "x",
  "instagram",
  "facebook",
  "youtube",
] as const;
export type SocialPlatformId = (typeof SOCIAL_PLATFORM_IDS)[number];
export const SocialPlatformIdSchema = z.enum(SOCIAL_PLATFORM_IDS);

const VisibleWhenSchema = z.string().optional();
const MigrationWarningSchema = z.string().optional();
const OptionalAssetIdSchema = z.string().optional().default("");

export const IdentityBlockSchema = z.object({
  type: z.literal("identity"),
  fields: z.array(z.string()).min(1),
  visibleWhen: VisibleWhenSchema,
  migrationWarning: MigrationWarningSchema,
  column: ColumnFieldSchema,
});

export const ContactDetailsBlockSchema = z.object({
  type: z.literal("contact_details"),
  fields: z.array(z.string()).min(1),
  visibleWhen: VisibleWhenSchema,
  migrationWarning: MigrationWarningSchema,
  column: ColumnFieldSchema,
});

export const CompanyLogoBlockSchema = z.object({
  type: z.literal("company_logo"),
  assetId: z.string().default(""),
  logoVariant: LogoVariantSchema.default("default"),
  logoSize: LogoSizeSchema.default("small"),
  visibleWhen: VisibleWhenSchema,
  migrationWarning: MigrationWarningSchema,
  column: ColumnFieldSchema,
});

export const ProfilePhotoBlockSchema = z.object({
  type: z.literal("profile_photo"),
  visibleWhen: VisibleWhenSchema,
  migrationWarning: MigrationWarningSchema,
  column: ColumnFieldSchema,
});

export const SocialLinkSchema = z.object({
  network: z.string().min(1),
  url: z.string().min(1),
});

export const SocialLinksBlockSchema = z.object({
  type: z.literal("social_links"),
  platforms: z.array(SocialPlatformIdSchema).default([]),
  links: z.array(SocialLinkSchema).default([]),
  visibleWhen: VisibleWhenSchema,
  migrationWarning: MigrationWarningSchema,
  column: ColumnFieldSchema,
});

export const CtaButtonBlockSchema = z.object({
  type: z.literal("cta_button"),
  label: z.string().min(1),
  url: z.string().url(),
  assetId: OptionalAssetIdSchema,
  colorAssetId: z.string().nullable().optional(),
  visibleWhen: VisibleWhenSchema,
  migrationWarning: MigrationWarningSchema,
  column: ColumnFieldSchema,
});

export const CampaignBannerBlockSchema = z.object({
  type: z.literal("campaign_banner"),
  campaignId: OptionalAssetIdSchema,
  assetId: OptionalAssetIdSchema,
  visibleWhen: VisibleWhenSchema,
  migrationWarning: MigrationWarningSchema,
  column: ColumnFieldSchema,
});

export const LegalDisclaimerBlockSchema = z.object({
  type: z.literal("legal_disclaimer"),
  text: z.string().min(1),
  assetId: OptionalAssetIdSchema,
  visibleWhen: VisibleWhenSchema,
  migrationWarning: MigrationWarningSchema,
  column: ColumnFieldSchema,
});

export const CertificationsBlockSchema = z.object({
  type: z.literal("certifications"),
  assetIds: z.array(z.string()).default([]),
  items: z.array(z.string()).optional(),
  visibleWhen: VisibleWhenSchema,
  migrationWarning: MigrationWarningSchema,
  column: ColumnFieldSchema,
});

export const CustomTextBlockSchema = z.object({
  type: z.literal("custom_text"),
  text: z.string().min(1),
  visibleWhen: VisibleWhenSchema,
  migrationWarning: MigrationWarningSchema,
  column: ColumnFieldSchema,
});

export const OrgIntroBlockSchema = z.object({
  type: z.literal("org_intro"),
  visibleWhen: VisibleWhenSchema,
  migrationWarning: MigrationWarningSchema,
  column: ColumnFieldSchema,
});

export const SpacerBlockSchema = z.object({
  type: z.literal("spacer"),
  visibleWhen: VisibleWhenSchema,
  migrationWarning: MigrationWarningSchema,
  column: ColumnFieldSchema,
});

export const DividerBlockSchema = z.object({
  type: z.literal("divider"),
  visibleWhen: VisibleWhenSchema,
  migrationWarning: MigrationWarningSchema,
  column: ColumnFieldSchema,
});

export const BlockSchema = z.discriminatedUnion("type", [
  IdentityBlockSchema,
  ContactDetailsBlockSchema,
  CompanyLogoBlockSchema,
  ProfilePhotoBlockSchema,
  SocialLinksBlockSchema,
  CtaButtonBlockSchema,
  CampaignBannerBlockSchema,
  LegalDisclaimerBlockSchema,
  CertificationsBlockSchema,
  CustomTextBlockSchema,
  OrgIntroBlockSchema,
  SpacerBlockSchema,
  DividerBlockSchema,
]);

export type Block = z.infer<typeof BlockSchema>;

export const TemplateDefinitionSchema = z.object({
  layout: LayoutSchema,
  columnDivider: z.boolean().optional(),
  blocks: z.array(BlockSchema).min(1),
});

export type TemplateDefinition = z.infer<typeof TemplateDefinitionSchema>;

const SOCIAL_ALIASES: Record<string, SocialPlatformId> = {
  linkedin: "linkedin",
  "linked-in": "linkedin",
  li: "linkedin",
  x: "x",
  twitter: "x",
  instagram: "instagram",
  ig: "instagram",
  facebook: "facebook",
  fb: "facebook",
  youtube: "youtube",
  yt: "youtube",
};

export function normalizeSocialPlatform(value: string): SocialPlatformId | null {
  const key = value.trim().toLowerCase().replace(/\s+/g, "");
  return SOCIAL_ALIASES[key] ?? null;
}

function rawImageUrl(block: Record<string, unknown>): string | undefined {
  for (const key of ["imageUrl", "imageFile", "image", "src", "url"] as const) {
    if (key === "url" && (block.type === "cta_button" || block.type === "social_links")) continue;
    const value = block[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function unresolvedWarning(url: string): string {
  return `Bu görsel taşınamadı (${url}), lütfen yeniden seçin`;
}

function coerceBlock(input: unknown): unknown {
  if (!input || typeof input !== "object") return input;
  const block = { ...(input as Record<string, unknown>) };
  const type = block.type;
  const leftover = rawImageUrl(block);

  if (type === "company_logo") {
    if (typeof block.assetId !== "string") block.assetId = "";
    if (!block.logoVariant) block.logoVariant = "default";
    if (!block.logoSize) block.logoSize = "small";
    if (leftover && !block.assetId) {
      block.migrationWarning =
        typeof block.migrationWarning === "string" ? block.migrationWarning : unresolvedWarning(leftover);
    }
  }

  if (type === "campaign_banner") {
    if (typeof block.campaignId === "string" && block.campaignId.startsWith("asset:")) {
      block.assetId = block.campaignId.slice("asset:".length);
      block.campaignId = "";
    }
    if (typeof block.assetId !== "string") block.assetId = "";
    if (typeof block.campaignId !== "string") block.campaignId = "";
    if (leftover && !block.assetId && !block.campaignId) {
      block.migrationWarning =
        typeof block.migrationWarning === "string" ? block.migrationWarning : unresolvedWarning(leftover);
    }
  }

  if (type === "certifications") {
    if (!Array.isArray(block.assetIds)) block.assetIds = [];
    if (Array.isArray(block.items) && (block.assetIds as unknown[]).length === 0 && block.items.length > 0) {
      const labels = (block.items as unknown[]).filter((item): item is string => typeof item === "string");
      if (labels.length && typeof block.migrationWarning !== "string") {
        block.migrationWarning = `Bu görsel taşınamadı, lütfen yeniden seçin (${labels.join(", ")})`;
      }
    }
  }

  if (type === "cta_button" || type === "legal_disclaimer") {
    if (typeof block.assetId !== "string") block.assetId = "";
    if (leftover && !block.assetId && typeof block.migrationWarning !== "string") {
      block.migrationWarning = unresolvedWarning(leftover);
    }
  }

  if (type === "social_links") {
    const links = Array.isArray(block.links) ? block.links : [];
    if (!Array.isArray(block.platforms) || (block.platforms as unknown[]).length === 0) {
      const derived = links
        .map((link) => {
          if (!link || typeof link !== "object") return null;
          const network = (link as { network?: unknown }).network;
          return typeof network === "string" ? normalizeSocialPlatform(network) : null;
        })
        .filter((id): id is SocialPlatformId => Boolean(id));
      block.platforms = [...new Set(derived)];
    }
  }

  delete block.imageUrl;
  delete block.imageFile;
  delete block.image;
  if (type !== "cta_button" && type !== "social_links") delete block.src;

  return block;
}

export function normalizeTemplateInput(input: unknown): unknown {
  if (!input || typeof input !== "object") return input;
  const raw = input as { layout?: unknown; blocks?: unknown };
  if (!Array.isArray(raw.blocks)) return input;
  return {
    ...raw,
    blocks: raw.blocks.map(coerceBlock),
  };
}

export const TemplateDefinitionInputSchema = z.preprocess(
  normalizeTemplateInput,
  TemplateDefinitionSchema,
);

export function parseTemplateDefinition(input: unknown): TemplateDefinition {
  return TemplateDefinitionSchema.parse(normalizeTemplateInput(input));
}

export function safeParseTemplateDefinition(input: unknown) {
  return TemplateDefinitionSchema.safeParse(normalizeTemplateInput(input));
}

export function collectTemplateAssetIds(definition: TemplateDefinition): string[] {
  const ids: string[] = [];
  for (const block of definition.blocks) {
    if ("assetId" in block && block.assetId) ids.push(block.assetId);
    if (block.type === "certifications") ids.push(...block.assetIds);
  }
  return [...new Set(ids)];
}

const LEFT_COLUMN_TYPES = new Set<Block["type"]>(["company_logo", "profile_photo"]);
const BELOW_COLUMN_TYPES = new Set<Block["type"]>([
  "org_intro",
  "legal_disclaimer",
  "campaign_banner",
]);

export function defaultStackedColumn(type: Block["type"]): 1 | 2 {
  return LEFT_COLUMN_TYPES.has(type) ? 1 : 2;
}

export function defaultBlockColumn(type: Block["type"]): TemplateColumn {
  if (BELOW_COLUMN_TYPES.has(type)) return "below";
  return defaultStackedColumn(type);
}

export function blockColumn(block: Block, layout: Layout): TemplateColumn {
  if (layout !== "two-column") return 1;
  if (block.column === 1 || block.column === 2 || block.column === "below") return block.column;
  return defaultBlockColumn(block.type);
}

export function assignMissingColumns(definition: TemplateDefinition): TemplateDefinition {
  if (definition.layout !== "two-column") return definition;
  return {
    ...definition,
    blocks: definition.blocks.map((block) =>
      block.column === 1 || block.column === 2 || block.column === "below"
        ? block
        : { ...block, column: defaultBlockColumn(block.type) },
    ),
  };
}
