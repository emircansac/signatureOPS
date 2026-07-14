import type {
  Block,
  CompileContext,
  TemplateDefinition,
  VisibilityContext,
} from "@signatureops/schema";
import {
  evaluateVisibleWhen,
  resolvePlaceholders,
} from "@signatureops/schema";
import { escapeHtml } from "./escape.js";

const FIELD_MAP: Record<string, string> = {
  displayName: "user.displayName",
  jobTitle: "user.jobTitle",
  department: "user.department",
  country: "user.country",
  email: "user.email",
  mobile: "user.mobile",
  officePhone: "user.officePhone",
};

function isBlockVisible(block: Block, context: VisibilityContext): boolean {
  return evaluateVisibleWhen(block.visibleWhen, context);
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
  const lines = fields
    .map((field) => {
      const path = FIELD_MAP[field] ?? `user.${field}`;
      const value = resolvePlaceholders(`{{${path}}}`, context.user);
      if (!value) return "";
      if (field === "email") {
        return `<p style="font-family:Arial,sans-serif;font-size:12px;color:#555555;margin:0;padding:0;"><a href="mailto:${escapeHtml(value)}" style="color:#0066cc;text-decoration:none;">${escapeHtml(value)}</a></p>`;
      }
      if (field === "mobile" || field === "officePhone") {
        const tel = value.replace(/\D/g, "");
        return `<p style="font-family:Arial,sans-serif;font-size:12px;color:#555555;margin:0;padding:0;"><a href="tel:${escapeHtml(tel)}" style="color:#0066cc;text-decoration:none;">${escapeHtml(value)}</a></p>`;
      }
      return `<p style="font-family:Arial,sans-serif;font-size:12px;color:#555555;margin:0;padding:0;">${escapeHtml(value)}</p>`;
    })
    .filter(Boolean)
    .join("");

  return `<td style="vertical-align:top;padding:0;">${lines}</td>`;
}

function isAllowedImageUrl(url: string): boolean {
  return (
    url.startsWith("https://") ||
    url.startsWith("http://localhost") ||
    url.startsWith("http://127.0.0.1")
  );
}

function renderLogo(assetId: string, context: CompileContext): string {
  const asset = context.assets[assetId];
  if (!asset) return "";
  const w = asset.width ?? 120;
  const h = asset.height ?? 40;
  const alt = escapeHtml(asset.alt ?? "Company logo");
  const url = isAllowedImageUrl(asset.url) ? asset.url : "";
  if (!url) return "";
  return `<td style="vertical-align:top;padding:0 12px 8px 0;"><img src="${escapeHtml(url)}" alt="${alt}" width="${w}" height="${h}" style="display:block;border:0;outline:none;" /></td>`;
}

function renderProfilePhoto(context: CompileContext): string {
  const url = context.user.user.photoUrl ?? "";
  if (!url || !isAllowedImageUrl(url)) return "";
  return `<td style="vertical-align:top;padding:0 12px 0 0;"><img src="${escapeHtml(url)}" alt="${escapeHtml(context.user.user.displayName)}" width="64" height="64" style="display:block;border-radius:32px;border:0;outline:none;" /></td>`;
}

function renderSocialLinks(
  links: { network: string; url: string }[],
): string {
  const items = links
    .filter((l) => l.url.startsWith("https://"))
    .map(
      (l) =>
        `<a href="${escapeHtml(l.url)}" style="font-family:Arial,sans-serif;font-size:11px;color:#0066cc;text-decoration:none;margin-right:8px;">${escapeHtml(l.network)}</a>`,
    )
    .join("");
  return `<tr><td colspan="2" style="padding:4px 0;">${items}</td></tr>`;
}

function renderCta(label: string, url: string): string {
  if (!url.startsWith("https://")) return "";
  return `<tr><td colspan="2" style="padding:8px 0;"><a href="${escapeHtml(url)}" style="font-family:Arial,sans-serif;font-size:12px;color:#ffffff;background-color:#0066cc;text-decoration:none;padding:6px 12px;display:inline-block;border-radius:4px;">${escapeHtml(label)}</a></td></tr>`;
}

function renderCampaign(campaignId: string, context: CompileContext): string {
  const campaign = context.campaigns[campaignId];
  if (!campaign || !isAllowedImageUrl(campaign.bannerUrl)) return "";
  const w = campaign.width ?? 400;
  const h = campaign.height ?? 80;
  return `<tr><td colspan="2" style="padding:8px 0;"><img src="${escapeHtml(campaign.bannerUrl)}" alt="Campaign banner" width="${w}" height="${h}" style="display:block;border:0;outline:none;max-width:100%;" /></td></tr>`;
}

function renderDisclaimer(text: string, context: CompileContext): string {
  const resolved = resolvePlaceholders(text, context.user);
  return `<tr><td colspan="2" style="padding:8px 0 0 0;"><p style="font-family:Arial,sans-serif;font-size:10px;color:#888888;margin:0;padding:0;line-height:1.4;">${escapeHtml(resolved)}</p></td></tr>`;
}

function renderCertifications(items: string[]): string {
  const text = items.map((i) => escapeHtml(i)).join(" · ");
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
    case "identity":
      return `<tr>${renderIdentity(block.fields, context)}</tr>`;
    case "contact_details":
      return `<tr>${renderContact(block.fields, context)}</tr>`;
    case "company_logo":
      return `<tr>${renderLogo(block.assetId, context)}</tr>`;
    case "profile_photo":
      return `<tr>${renderProfilePhoto(context)}</tr>`;
    case "social_links":
      return renderSocialLinks(block.links);
    case "cta_button":
      return renderCta(block.label, block.url);
    case "campaign_banner":
      return renderCampaign(block.campaignId, context);
    case "legal_disclaimer":
      return renderDisclaimer(block.text, context);
    case "certifications":
      return renderCertifications(block.items);
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
