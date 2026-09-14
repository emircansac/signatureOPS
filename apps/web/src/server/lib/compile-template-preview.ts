import { compile } from "@signatureops/compiler";
import { lintHtml } from "@signatureops/linter";
import { findActiveCampaignForTemplate, type TemplateDefinition } from "@signatureops/schema";
import { brandMediaUrl } from "@/lib/media-url";
import { appBaseUrl } from "@/env";
import { type AssetRecord } from "./assets";
import { buildCampaignMap } from "./compile-user-signature";
import { buildCompileContext, hasLegalDisclaimerText, logoResolved } from "./compile-context";

export type PreviewUser = {
  displayName: string;
  jobTitle: string | null;
  department: string | null;
  country: string | null;
  email: string;
  mobile: string | null;
  officePhone: string | null;
  photoUrl: string | null;
};

export type PreviewOrg = {
  name: string;
  intro?: string | null;
  legalDisclaimer?: string | null;
  brandColors?: string | null;
  socialIconMode?: string | null;
};

export type PreviewCampaign = {
  id: string;
  bannerAssetId: string;
  slogan?: string | null;
  ctaText?: string | null;
  ctaLink?: string | null;
  logoOverrideAssetId?: string | null;
  startDate: Date;
  endDate: Date;
  templateIds: string[] | string;
};

export type PreviewAsset = AssetRecord & { slot?: string | null };

export function compileTemplatePreview(input: {
  definition: TemplateDefinition;
  user: PreviewUser;
  org: PreviewOrg;
  assets: PreviewAsset[];
  campaigns: PreviewCampaign[];
  templateId?: string;
}) {
  const campaignMap = buildCampaignMap(input.campaigns, input.assets, input.definition);
  const active = findActiveCampaignForTemplate(input.campaigns, input.templateId);
  const fallbackPhoto = input.assets.find((asset) => asset.slot === "profile_fallback");
  const baseUrl = appBaseUrl();
  const compileContext = buildCompileContext({
    user: {
      user: {
        displayName: input.user.displayName,
        jobTitle: input.user.jobTitle ?? undefined,
        department: input.user.department ?? undefined,
        country: input.user.country ?? undefined,
        email: input.user.email,
        mobile: input.user.mobile ?? undefined,
        officePhone: input.user.officePhone ?? undefined,
        photoUrl: input.user.photoUrl ?? undefined,
      },
      organization: { name: input.org.name },
    },
    assets: input.assets,
    campaigns: campaignMap,
    org: input.org,
    fallbackPhotoUrl: fallbackPhoto ? brandMediaUrl(fallbackPhoto.id, baseUrl) : undefined,
    baseUrl,
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
}
