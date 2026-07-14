import { z } from "zod";

export const LayoutSchema = z.enum(["single-column", "two-column"]);
export type Layout = z.infer<typeof LayoutSchema>;

const VisibleWhenSchema = z.string().optional();

export const IdentityBlockSchema = z.object({
  type: z.literal("identity"),
  fields: z.array(z.string()).min(1),
  visibleWhen: VisibleWhenSchema,
});

export const ContactDetailsBlockSchema = z.object({
  type: z.literal("contact_details"),
  fields: z.array(z.string()).min(1),
  visibleWhen: VisibleWhenSchema,
});

export const CompanyLogoBlockSchema = z.object({
  type: z.literal("company_logo"),
  assetId: z.string().min(1),
  visibleWhen: VisibleWhenSchema,
});

export const ProfilePhotoBlockSchema = z.object({
  type: z.literal("profile_photo"),
  visibleWhen: VisibleWhenSchema,
});

export const SocialLinkSchema = z.object({
  network: z.string().min(1),
  url: z.string().url(),
});

export const SocialLinksBlockSchema = z.object({
  type: z.literal("social_links"),
  links: z.array(SocialLinkSchema).min(1),
  visibleWhen: VisibleWhenSchema,
});

export const CtaButtonBlockSchema = z.object({
  type: z.literal("cta_button"),
  label: z.string().min(1),
  url: z.string().url(),
  visibleWhen: VisibleWhenSchema,
});

export const CampaignBannerBlockSchema = z.object({
  type: z.literal("campaign_banner"),
  campaignId: z.string().min(1),
  visibleWhen: VisibleWhenSchema,
});

export const LegalDisclaimerBlockSchema = z.object({
  type: z.literal("legal_disclaimer"),
  text: z.string().min(1),
  visibleWhen: VisibleWhenSchema,
});

export const CertificationsBlockSchema = z.object({
  type: z.literal("certifications"),
  items: z.array(z.string()).min(1),
  visibleWhen: VisibleWhenSchema,
});

export const CustomTextBlockSchema = z.object({
  type: z.literal("custom_text"),
  text: z.string().min(1),
  visibleWhen: VisibleWhenSchema,
});

export const SpacerBlockSchema = z.object({
  type: z.literal("spacer"),
  visibleWhen: VisibleWhenSchema,
});

export const DividerBlockSchema = z.object({
  type: z.literal("divider"),
  visibleWhen: VisibleWhenSchema,
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
  SpacerBlockSchema,
  DividerBlockSchema,
]);

export type Block = z.infer<typeof BlockSchema>;

export const TemplateDefinitionSchema = z.object({
  layout: LayoutSchema,
  blocks: z.array(BlockSchema).min(1),
});

export type TemplateDefinition = z.infer<typeof TemplateDefinitionSchema>;

export const TemplateCompatibilitySchema = z.object({
  outlookSafe: z.boolean().default(true),
  darkMode: z.boolean().default(false),
  mobileWidth: z.number().int().positive().default(320),
});

export type TemplateCompatibility = z.infer<typeof TemplateCompatibilitySchema>;

export function parseTemplateDefinition(input: unknown): TemplateDefinition {
  return TemplateDefinitionSchema.parse(input);
}

export function safeParseTemplateDefinition(input: unknown) {
  return TemplateDefinitionSchema.safeParse(input);
}
