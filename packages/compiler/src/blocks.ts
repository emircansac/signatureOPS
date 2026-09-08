import type {
  AssetContext,
  Block,
  CompileContext,
  LogoVariant,
  SocialPlatformId,
  TemplateDefinition,
  VisibilityContext,
} from "@signatureops/schema";
import {
  evaluateVisibleWhen,
  normalizeSocialPlatform,
  resolvePlaceholders,
} from "@signatureops/schema";
import { escapeHtml } from "./escape.js";
import { fittedDisplaySize } from "./display-fit.js";

const FIELD_MAP: Record<string, string> = {
  displayName: "user.displayName",
  jobTitle: "user.jobTitle",
  department: "user.department",
  country: "user.country",
  email: "user.email",
  mobile: "user.mobile",
  officePhone: "user.officePhone",
};

export const DEFAULT_TOKENS = {
  ink: "#1C2B3A",
  seal: "#A63D2F",
  link: "#0066cc",
} as const;

const VARIANT_SLOT: Record<Exclude<LogoVariant, "default">, "light" | "dark" | "mark"> = {
  light: "light",
  dark: "dark",
  mark: "mark",
};

const STANDARD_SOCIAL_COLORS: Record<SocialPlatformId, string> = {
  linkedin: "#0A66C2",
  x: "#111111",
  instagram: "#E4405F",
  facebook: "#1877F2",
  youtube: "#FF0000",
};

const STANDARD_SOCIAL_LABELS: Record<SocialPlatformId, string> = {
  linkedin: "in",
  x: "X",
  instagram: "Ig",
  facebook: "f",
  youtube: "Yt",
};

function isBlockVisible(block: Block, context: VisibilityContext): boolean {
  return evaluateVisibleWhen(block.visibleWhen, context);
}

function tokens(context: CompileContext) {
  return context.identity?.tokens ?? DEFAULT_TOKENS;
}

function isAllowedImageUrl(url: string): boolean {
  return (
    url.startsWith("https://") ||
    url.startsWith("http://localhost") ||
    url.startsWith("http://127.0.0.1")
  );
}

export function resolveAsset(
  assetId: string | undefined,
  context: CompileContext,
): AssetContext | undefined {
  if (!assetId) return undefined;
  const asset = context.assets[assetId];
  if (!asset || !isAllowedImageUrl(asset.url)) return undefined;
  return asset;
}

function campaignIsUsable(
  campaign: CompileContext["campaigns"][string] | undefined,
): campaign is CompileContext["campaigns"][string] {
  return Boolean(campaign && campaign.active !== false);
}

function activeCampaign(context: CompileContext) {
  if (!context.activeCampaignId) return undefined;
  const campaign = context.campaigns[context.activeCampaignId];
  return campaignIsUsable(campaign) ? campaign : undefined;
}

export function resolveLogoAsset(
  block: Extract<Block, { type: "company_logo" }>,
  context: CompileContext,
): AssetContext | undefined {
  const overrideId = activeCampaign(context)?.logoOverrideAssetId;
  if (overrideId) {
    const override = resolveAsset(overrideId, context);
    if (override) return override;
  }
  const variant = block.logoVariant ?? "default";
  if (variant !== "default") {
    const slotId = context.identity?.logoSlotIds[VARIANT_SLOT[variant]];
    const variantAsset = resolveAsset(slotId, context);
    if (variantAsset) return variantAsset;
  }
  const selected = resolveAsset(block.assetId, context);
  if (selected) return selected;
  return resolveAsset(context.identity?.logoSlotIds.default, context);
}

function resolveColorHex(colorAssetId: string | null | undefined, context: CompileContext): string {
  const palette = context.identity?.colors ?? [];
  if (colorAssetId) {
    const match = palette.find((color) => color.id === colorAssetId);
    if (match) return match.hex;
  }
  if (context.identity) return tokens(context).seal;
  return DEFAULT_TOKENS.link;
}

function renderImg(
  asset: AssetContext,
  fallbackAlt: string,
  width: number,
  height: number,
  extraStyle = "",
): string {
  const alt = escapeHtml(asset.alt ?? fallbackAlt);
  return `<img src="${escapeHtml(asset.url)}" alt="${alt}" width="${width}" height="${height}" style="display:block;border:0;outline:none;${extraStyle}" />`;
}

function renderIdentity(fields: string[], context: CompileContext): string {
  const lines = fields
    .map((field) => {
      const path = FIELD_MAP[field] ?? `user.${field}`;
      const value = resolvePlaceholders(`{{${path}}}`, context.user);
      if (!value) return "";
      const style =
        field === "displayName"
          ? "font-family:Arial,sans-serif;font-size:14px;font-weight:bold;color:#1a1a1a;margin:0;padding:0;"
          : "font-family:Arial,sans-serif;font-size:12px;color:#555555;margin:0;padding:0;";
      return `<p style="${style}">${escapeHtml(value)}</p>`;
    })
    .filter(Boolean)
    .join("");

  return `<td style="vertical-align:top;padding:0 12px 0 0;">${lines}</td>`;
}

function renderContact(fields: string[], context: CompileContext): string {
  const link = context.identity ? tokens(context).link : DEFAULT_TOKENS.link;
  const lines = fields
    .map((field) => {
      const path = FIELD_MAP[field] ?? `user.${field}`;
      const value = resolvePlaceholders(`{{${path}}}`, context.user);
      if (!value) return "";
      if (field === "email") {
        return `<p style="font-family:Arial,sans-serif;font-size:12px;color:#555555;margin:0;padding:0;"><a href="mailto:${escapeHtml(value)}" style="color:${link};text-decoration:none;">${escapeHtml(value)}</a></p>`;
      }
      if (field === "mobile" || field === "officePhone") {
        const tel = value.replace(/\D/g, "");
        return `<p style="font-family:Arial,sans-serif;font-size:12px;color:#555555;margin:0;padding:0;"><a href="tel:${escapeHtml(tel)}" style="color:${link};text-decoration:none;">${escapeHtml(value)}</a></p>`;
      }
      return `<p style="font-family:Arial,sans-serif;font-size:12px;color:#555555;margin:0;padding:0;">${escapeHtml(value)}</p>`;
    })
    .filter(Boolean)
    .join("");

  return `<td style="vertical-align:top;padding:0;">${lines}</td>`;
}

function renderLogo(block: Extract<Block, { type: "company_logo" }>, context: CompileContext): string {
  const asset = resolveLogoAsset(block, context);
  if (!asset) return "";
  const slot = block.logoVariant === "mark" ? "logo_mark" : "logo";
  const { width, height } = fittedDisplaySize(slot, asset.width, asset.height);
  return `<td style="vertical-align:top;padding:0 12px 8px 0;">${renderImg(asset, "Company logo", width, height)}</td>`;
}

function renderProfilePhoto(context: CompileContext): string {
  const url = context.user.user.photoUrl ?? "";
  if (!url || !isAllowedImageUrl(url)) return "";
  return `<td style="vertical-align:top;padding:0 12px 0 0;"><img src="${escapeHtml(url)}" alt="${escapeHtml(context.user.user.displayName)}" width="64" height="64" style="display:block;border-radius:32px;border:0;outline:none;" /></td>`;
}

function socialEntries(block: Extract<Block, { type: "social_links" }>) {
  const fromLinks = block.links
    .map((link) => {
      const platform = normalizeSocialPlatform(link.network);
      if (!platform || !link.url.startsWith("https://")) return null;
      return { platform, url: link.url, label: link.network };
    })
    .filter((row): row is { platform: SocialPlatformId; url: string; label: string } => Boolean(row));

  const platforms = block.platforms.length > 0 ? block.platforms : fromLinks.map((row) => row.platform);
  return platforms
    .map((platform) => {
      const match = fromLinks.find((row) => row.platform === platform);
      if (!match) return null;
      return match;
    })
    .filter((row): row is { platform: SocialPlatformId; url: string; label: string } => Boolean(row));
}

function renderSocialLinks(
  block: Extract<Block, { type: "social_links" }>,
  context: CompileContext,
): string {
  const entries = socialEntries(block);
  if (entries.length === 0) return "";
  const custom = context.identity?.socialIconMode === "custom";
  const link = tokens(context).link;
  const items = entries
    .map((entry) => {
      const iconId = context.identity?.socialIconAssetIds[entry.platform];
      const icon = custom ? resolveAsset(iconId, context) : undefined;
      if (icon) {
        const { width: w, height: h } = fittedDisplaySize(
          `social_${entry.platform}`,
          icon.width,
          icon.height,
        );
        return `<a href="${escapeHtml(entry.url)}" style="text-decoration:none;margin-right:8px;">${renderImg(icon, entry.label, w, h, "display:inline-block;")}</a>`;
      }
      if (custom) {
        const color = STANDARD_SOCIAL_COLORS[entry.platform];
        const glyph = STANDARD_SOCIAL_LABELS[entry.platform];
        return `<a href="${escapeHtml(entry.url)}" style="font-family:Arial,sans-serif;font-size:10px;color:#ffffff;background-color:${color};text-decoration:none;margin-right:6px;padding:2px 5px;display:inline-block;">${escapeHtml(glyph)}</a>`;
      }
      return `<a href="${escapeHtml(entry.url)}" style="font-family:Arial,sans-serif;font-size:11px;color:${link};text-decoration:none;margin-right:8px;">${escapeHtml(entry.label)}</a>`;
    })
    .join("");
  return `<tr><td colspan="2" style="padding:4px 0;">${items}</td></tr>`;
}

function renderCta(block: Extract<Block, { type: "cta_button" }>, context: CompileContext): string {
  const override = activeCampaign(context)?.ctaOverride;
  const label = override?.text?.trim() || block.label;
  const url = override?.link?.trim() || block.url;
  if (!url.startsWith("https://")) return "";
  const fill = resolveColorHex(block.colorAssetId, context);
  const icon = resolveAsset(block.assetId, context);
  const iconSize = icon ? fittedDisplaySize("cta_icon", icon.width, icon.height) : null;
  const iconHtml =
    icon && iconSize
      ? `${renderImg(icon, label, iconSize.width, iconSize.height, "display:inline-block;vertical-align:middle;margin-right:6px;")} `
      : "";
  return `<tr><td colspan="2" style="padding:8px 0;"><a href="${escapeHtml(url)}" style="font-family:Arial,sans-serif;font-size:12px;color:#ffffff;background-color:${fill};text-decoration:none;padding:6px 12px;display:inline-block;border-radius:4px;">${iconHtml}${escapeHtml(label)}</a></td></tr>`;
}

function renderCampaign(
  block: Extract<Block, { type: "campaign_banner" }>,
  context: CompileContext,
): string {
  const applied = activeCampaign(context);
  const fromBlock = block.campaignId ? context.campaigns[block.campaignId] : undefined;
  const campaign = campaignIsUsable(applied) ? applied : campaignIsUsable(fromBlock) ? fromBlock : undefined;
  if (campaign && isAllowedImageUrl(campaign.bannerUrl)) {
    const { width: w, height: h } = fittedDisplaySize("banner", campaign.width, campaign.height);
    const slogan = campaign.slogan?.trim()
      ? `<p style="font-family:Arial,sans-serif;font-size:11px;color:#555555;margin:6px 0 0 0;padding:0;">${escapeHtml(campaign.slogan.trim())}</p>`
      : "";
    return `<tr><td colspan="2" style="padding:8px 0;"><img src="${escapeHtml(campaign.bannerUrl)}" alt="Campaign banner" width="${w}" height="${h}" style="display:block;border:0;outline:none;max-width:100%;" />${slogan}</td></tr>`;
  }
  const asset = resolveAsset(block.assetId, context);
  if (!asset) return "";
  const { width: w, height: h } = fittedDisplaySize("banner", asset.width, asset.height);
  return `<tr><td colspan="2" style="padding:8px 0;">${renderImg(asset, asset.alt ?? "Banner", w, h, "max-width:100%;")}</td></tr>`;
}

function renderDisclaimer(
  block: Extract<Block, { type: "legal_disclaimer" }>,
  context: CompileContext,
): string {
  const resolved = resolvePlaceholders(block.text, context.user);
  const text = `<p style="font-family:Arial,sans-serif;font-size:10px;color:#888888;margin:0;padding:0;line-height:1.4;">${escapeHtml(resolved)}</p>`;
  const badge = resolveAsset(block.assetId, context);
  const badgeSize = badge ? fittedDisplaySize("legal_badge", badge.width, badge.height) : null;
  if (!badge || !badgeSize) {
    return `<tr><td colspan="2" style="padding:8px 0 0 0;">${text}</td></tr>`;
  }
  return `<tr><td colspan="2" style="padding:8px 0 0 0;"><table cellpadding="0" cellspacing="0" border="0"><tr><td style="vertical-align:top;padding:0 8px 0 0;">${renderImg(badge, "Legal badge", badgeSize.width, badgeSize.height)}</td><td style="vertical-align:top;">${text}</td></tr></table></td></tr>`;
}

function renderCertifications(
  block: Extract<Block, { type: "certifications" }>,
  context: CompileContext,
): string {
  const images = block.assetIds
    .map((id) => resolveAsset(id, context))
    .filter((asset): asset is AssetContext => Boolean(asset));
  if (images.length > 0) {
    const imgs = images
      .map(
        (asset) => {
          const { width, height } = fittedDisplaySize("certification", asset.width, asset.height);
          return `<td style="padding:0 6px 0 0;vertical-align:middle;">${renderImg(asset, asset.alt ?? "Certification", width, height)}</td>`;
        },
      )
      .join("");
    return `<tr><td colspan="2" style="padding:4px 0;"><table cellpadding="0" cellspacing="0" border="0"><tr>${imgs}</tr></table></td></tr>`;
  }
  const items = block.items?.filter(Boolean) ?? [];
  if (items.length === 0) return "";
  const text = items.map((item) => escapeHtml(item)).join(" · ");
  return `<tr><td colspan="2" style="padding:4px 0;"><p style="font-family:Arial,sans-serif;font-size:10px;color:#666666;margin:0;padding:0;">${text}</p></td></tr>`;
}

function renderCustomText(text: string, context: CompileContext): string {
  const resolved = resolvePlaceholders(text, context.user);
  return `<tr><td colspan="2" style="padding:4px 0;"><p style="font-family:Arial,sans-serif;font-size:12px;color:#333333;margin:0;padding:0;">${escapeHtml(resolved)}</p></td></tr>`;
}

function renderSpacer(): string {
  return `<tr><td colspan="2" style="padding:0;height:8px;font-size:0;line-height:0;">&nbsp;</td></tr>`;
}

function renderDivider(): string {
  return `<tr><td colspan="2" style="padding:4px 0;"><table cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td style="border-top:1px solid #dddddd;font-size:0;line-height:0;">&nbsp;</td></tr></table></td></tr>`;
}

export function renderBlock(
  block: Block,
  context: CompileContext,
  visibility: VisibilityContext,
): string {
  if (!isBlockVisible(block, visibility)) return "";

  switch (block.type) {
    case "identity": {
      const html = renderIdentity(block.fields, context);
      return html.includes("<p") ? `<tr>${html}</tr>` : "";
    }
    case "contact_details": {
      const html = renderContact(block.fields, context);
      return html.includes("<p") ? `<tr>${html}</tr>` : "";
    }
    case "company_logo": {
      const html = renderLogo(block, context);
      return html ? `<tr>${html}</tr>` : "";
    }
    case "profile_photo": {
      const html = renderProfilePhoto(context);
      return html ? `<tr>${html}</tr>` : "";
    }
    case "social_links":
      return renderSocialLinks(block, context);
    case "cta_button":
      return renderCta(block, context);
    case "campaign_banner":
      return renderCampaign(block, context);
    case "legal_disclaimer":
      return renderDisclaimer(block, context);
    case "certifications":
      return renderCertifications(block, context);
    case "custom_text":
      return renderCustomText(block.text, context);
    case "spacer":
      return renderSpacer();
    case "divider":
      return renderDivider();
    default:
      return "";
  }
}

export function compileBlocks(
  definition: TemplateDefinition,
  context: CompileContext,
  visibility: VisibilityContext,
): string {
  const rows = definition.blocks
    .map((block) => renderBlock(block, context, visibility))
    .filter(Boolean)
    .join("");

  const layoutStyle =
    definition.layout === "two-column"
      ? "max-width:500px;"
      : "max-width:400px;";

  return `<table cellpadding="0" cellspacing="0" border="0" style="${layoutStyle}font-family:Arial,sans-serif;"><tbody>${rows}</tbody></table>`;
}
