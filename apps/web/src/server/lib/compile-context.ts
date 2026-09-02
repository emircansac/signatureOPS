import type { CompileContext, IdentityCompileContext, TemplateDefinition } from "@signatureops/schema";
import { resolveLogoAsset } from "@signatureops/compiler";
import { parseBrandColors } from "@/lib/identity";
import { resolvePublicAssetUrl } from "@/lib/asset-url";
import { toCompileAssetMap, type AssetRecord } from "./assets";

const DEFAULT_TOKENS = { ink: "#1C2B3A", seal: "#A63D2F", link: "#0066cc" };

type SlotAsset = AssetRecord & { slot?: string | null };

export function buildIdentityCompileContext(input: {
  brandColors?: string | null;
  socialIconMode?: string | null;
  assets: SlotAsset[];
}): IdentityCompileContext {
  const assets = input.assets;
  const bySlot = (slot: string) => assets.find((asset) => asset.slot === slot)?.id;
  return {
    logoSlotIds: {
      default: bySlot("logo"),
      light: bySlot("logo_light"),
      dark: bySlot("logo_dark"),
      mark: bySlot("logo_mark"),
    },
    socialIconMode: input.socialIconMode === "custom" ? "custom" : "standard",
    socialIconAssetIds: {
      linkedin: bySlot("social_linkedin"),
      x: bySlot("social_x"),
      instagram: bySlot("social_instagram"),
      facebook: bySlot("social_facebook"),
      youtube: bySlot("social_youtube"),
    },
    colors: parseBrandColors(input.brandColors ?? "[]").map((color) => ({
      id: color.id ?? color.hex,
      hex: color.hex,
      label: color.label,
    })),
    tokens: DEFAULT_TOKENS,
  };
}

export function buildCompileContext(input: {
  user: CompileContext["user"];
  assets: SlotAsset[];
  campaigns: CompileContext["campaigns"];
  org: { name: string; brandColors?: string | null; socialIconMode?: string | null };
  fallbackPhotoUrl?: string | null;
  baseUrl?: string;
  activeCampaignId?: string;
}): CompileContext {
  const photoUrl = input.user.user.photoUrl || input.fallbackPhotoUrl || undefined;
  return {
    user: {
      ...input.user,
      user: {
        ...input.user.user,
        photoUrl: photoUrl ? resolvePublicAssetUrl(photoUrl, input.baseUrl) : undefined,
      },
    },
    assets: toCompileAssetMap(input.assets, input.baseUrl),
    campaigns: input.campaigns,
    activeCampaignId: input.activeCampaignId,
    identity: buildIdentityCompileContext({
      brandColors: input.org.brandColors,
      socialIconMode: input.org.socialIconMode,
      assets: input.assets,
    }),
  };
}

export function logoResolved(definition: TemplateDefinition, context: CompileContext): boolean | undefined {
  const logo = definition.blocks.find((block) => block.type === "company_logo");
  if (!logo || logo.type !== "company_logo") return undefined;
  return Boolean(resolveLogoAsset(logo, context));
}

export function hasLegalDisclaimerText(definition: TemplateDefinition): boolean {
  return definition.blocks.some(
    (block) => block.type === "legal_disclaimer" && block.text.trim().length > 0,
  );
}
