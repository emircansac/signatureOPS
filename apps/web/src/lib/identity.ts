import { z } from "zod";

export type AssetKindName = "LOGO" | "BANNER" | "CERTIFICATION" | "PHOTO" | "ICON";

export const SOCIAL_PLATFORMS = ["linkedin", "x", "instagram", "facebook", "youtube"] as const;
export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

export const UNIQUE_SLOTS = [
  "logo",
  "logo_light",
  "logo_dark",
  "logo_mark",
  "banner",
  "profile_fallback",
  "cta_icon",
  "legal_badge",
  "social_linkedin",
  "social_x",
  "social_instagram",
  "social_facebook",
  "social_youtube",
] as const;

export type UniqueSlot = (typeof UNIQUE_SLOTS)[number];
export type IdentitySlot = UniqueSlot | "certification";

export const HEX_COLOR_RE = /^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/;

export const BrandColorSchema = z.object({
  id: z.string().min(1).optional(),
  hex: z.string().regex(HEX_COLOR_RE),
  label: z.string().max(40).optional(),
});

export const BrandColorsSchema = z.array(BrandColorSchema).max(6);
export type BrandColor = z.infer<typeof BrandColorSchema>;

export const SocialIconModeSchema = z.enum(["standard", "custom"]);
export type SocialIconMode = z.infer<typeof SocialIconModeSchema>;

export function kindForSlot(slot: IdentitySlot): AssetKindName {
  if (slot === "banner") return "BANNER";
  if (slot === "certification") return "CERTIFICATION";
  if (slot === "profile_fallback") return "PHOTO";
  if (slot.startsWith("logo")) return "LOGO";
  return "ICON";
}

export function isUniqueSlot(slot: string): slot is UniqueSlot {
  return (UNIQUE_SLOTS as readonly string[]).includes(slot);
}

export function normalizeHex(value: string): string | null {
  const trimmed = value.trim().startsWith("#") ? value.trim() : `#${value.trim()}`;
  if (!HEX_COLOR_RE.test(trimmed)) return null;
  const body = trimmed.slice(1);
  const hex =
    body.length === 3
      ? `#${body[0]}${body[0]}${body[1]}${body[1]}${body[2]}${body[2]}`
      : trimmed;
  return hex.toUpperCase();
}

export function ensureColorId(color: BrandColor, index = 0): string {
  if (color.id) return color.id;
  const body = normalizeHex(color.hex)?.slice(1).toLowerCase() ?? `idx${index}`;
  return `color-${body}`;
}

export function withColorIds(colors: BrandColor[]): BrandColor[] {
  return colors.map((color, index) => ({ ...color, id: ensureColorId(color, index) }));
}

export function parseBrandColors(raw: string | null | undefined): BrandColor[] {
  try {
    return withColorIds(BrandColorsSchema.parse(JSON.parse(raw || "[]")));
  } catch {
    return [];
  }
}
