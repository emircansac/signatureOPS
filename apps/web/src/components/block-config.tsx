"use client";

import { useTranslations } from "next-intl";
import { SOCIAL_PLATFORM_IDS, type Block } from "@signatureops/schema";
import { trpc } from "@/lib/trpc";
import { AssetPicker } from "@/components/asset-picker";
import { PaletteColorPicker } from "@/components/palette-color-picker";
import { Input, Label } from "@/components/ui";
import { cn } from "@/lib/utils";

const IDENTITY_FIELDS = ["displayName", "jobTitle", "department", "country"] as const;
const CONTACT_FIELDS = ["email", "mobile", "officePhone"] as const;
const LOGO_VARIANTS = ["default", "light", "dark", "mark"] as const;

function assetMissing(assetId: string | undefined, ids: Set<string>): boolean {
  return Boolean(assetId) && !ids.has(assetId!);
}

export function BlockConfig({
  block,
  index,
  onChange,
}: {
  block: Block;
  index: number;
  onChange: (index: number, block: Block) => void;
}) {
  const t = useTranslations("templates");
  const ti = useTranslations("identity");
  const { data: assets } = trpc.assets.list.useQuery(undefined);
  const { data: campaigns } = trpc.campaigns.list.useQuery();
  const { data: identity } = trpc.identity.get.useQuery();
  const knownIds = new Set((assets ?? []).map((asset) => asset.id));

  const update = (updated: Block) => onChange(index, updated);

  const warning = block.migrationWarning ? (
    <p className="text-sm text-seal">{block.migrationWarning}</p>
  ) : null;

  switch (block.type) {
    case "company_logo": {
      const missing = assetMissing(block.assetId, knownIds);
      return (
        <div className="mt-2 space-y-3 border-t border-rule pt-2">
          {warning}
          <Label>{t("selectImage")}</Label>
          <AssetPicker
            kind="logo"
            value={block.assetId}
            missing={missing}
            onChange={(assetId) => update({ ...block, assetId, migrationWarning: undefined })}
          />
          <div>
            <Label>{t("logoVariant")}</Label>
            <div className="mt-1 flex flex-wrap border border-rule">
              {LOGO_VARIANTS.map((variant) => (
                <button
                  key={variant}
                  type="button"
                  onClick={() => update({ ...block, logoVariant: variant })}
                  className={cn(
                    "flex-1 px-2 py-1.5 text-xs",
                    block.logoVariant === variant ? "bg-ink text-paper" : "text-lead hover:text-ink",
                  )}
                >
                  {t(`logoVariants.${variant}`)}
                </button>
              ))}
            </div>
          </div>
        </div>
      );
    }

    case "campaign_banner": {
      const missing = assetMissing(block.assetId, knownIds);
      return (
        <div className="mt-2 space-y-3 border-t border-rule pt-2">
          {warning}
          <Label>{t("selectImage")}</Label>
          <AssetPicker
            kind="banner"
            value={block.assetId}
            missing={missing}
            onChange={(assetId) =>
              update({ ...block, assetId, campaignId: "", migrationWarning: undefined })
            }
          />
          <Label>{t("selectCampaign")}</Label>
          <select
            className="w-full border border-rule bg-paper px-3 py-2 text-sm text-ink"
            value={block.campaignId}
            onChange={(e) =>
              update({
                ...block,
                campaignId: e.target.value,
                assetId: e.target.value ? "" : block.assetId,
              })
            }
          >
            <option value="">{t("chooseCampaign")}</option>
            {campaigns?.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.name}
              </option>
            ))}
          </select>
        </div>
      );
    }

    case "certifications": {
      const missing = block.assetIds.some((id) => !knownIds.has(id));
      return (
        <div className="mt-2 space-y-3 border-t border-rule pt-2">
          {warning}
          {missing ? <p className="text-sm text-seal">{t("assetMissing")}</p> : null}
          <Label>{t("selectImage")}</Label>
          <AssetPicker
            kind="certification"
            multiple
            values={block.assetIds}
            onChangeMany={(assetIds) => update({ ...block, assetIds, migrationWarning: undefined })}
          />
        </div>
      );
    }

    case "profile_photo":
      return (
        <p className="mt-2 border-t border-rule pt-2 text-xs text-lead">{t("profilePhotoHint")}</p>
      );

    case "cta_button": {
      const missing = assetMissing(block.assetId, knownIds);
      return (
        <div className="mt-2 space-y-3 border-t border-rule pt-2">
          {warning}
          <div>
            <Label>{t("buttonLabel")}</Label>
            <Input
              value={block.label}
              onChange={(e) => update({ ...block, label: e.target.value })}
            />
          </div>
          <div>
            <Label>URL</Label>
            <Input
              value={block.url}
              onChange={(e) => update({ ...block, url: e.target.value })}
            />
          </div>
          <div>
            <Label>{t("ctaColor")}</Label>
            <PaletteColorPicker
              value={block.colorAssetId}
              onChange={(colorAssetId) => update({ ...block, colorAssetId })}
            />
          </div>
          <div>
            <Label>{t("ctaIcon")}</Label>
            <AssetPicker
              kind="cta_icon"
              value={block.assetId}
              missing={missing}
              onChange={(assetId) => update({ ...block, assetId, migrationWarning: undefined })}
            />
          </div>
        </div>
      );
    }

    case "legal_disclaimer": {
      const missing = assetMissing(block.assetId, knownIds);
      return (
        <div className="mt-2 space-y-3 border-t border-rule pt-2">
          {warning}
          <Label>{t("text")}</Label>
          <Input
            value={block.text}
            onChange={(e) => update({ ...block, text: e.target.value })}
          />
          <Label>{t("legalBadge")}</Label>
          <AssetPicker
            kind="legal_badge"
            value={block.assetId}
            missing={missing}
            onChange={(assetId) => update({ ...block, assetId, migrationWarning: undefined })}
          />
        </div>
      );
    }

    case "social_links": {
      const selected = new Set(block.platforms);
      return (
        <div className="mt-2 space-y-3 border-t border-rule pt-2">
          {warning}
          <p className="text-xs text-lead">
            {identity?.socialIconMode === "custom" ? t("socialIconsCustom") : t("socialIconsStandard")}
          </p>
          {SOCIAL_PLATFORM_IDS.map((platform) => {
            const checked = selected.has(platform);
            const link = block.links.find((item) => item.network.toLowerCase() === platform);
            return (
              <div key={platform} className="space-y-1">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      const platforms = e.target.checked
                        ? [...block.platforms, platform]
                        : block.platforms.filter((id) => id !== platform);
                      const links = e.target.checked
                        ? block.links.some((item) => item.network.toLowerCase() === platform)
                          ? block.links
                          : [...block.links, { network: platform, url: "https://example.com" }]
                        : block.links.filter((item) => item.network.toLowerCase() !== platform);
                      update({ ...block, platforms, links });
                    }}
                  />
                  {ti(`platforms.${platform}`)}
                </label>
                {checked ? (
                  <Input
                    placeholder="https://"
                    value={link?.url ?? ""}
                    onChange={(e) => {
                      const links = [...block.links];
                      const idx = links.findIndex((item) => item.network.toLowerCase() === platform);
                      if (idx >= 0) {
                        links[idx] = { network: platform, url: e.target.value };
                      } else {
                        links.push({ network: platform, url: e.target.value });
                      }
                      update({ ...block, links });
                    }}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      );
    }

    case "identity":
      return (
        <div className="mt-2 space-y-1 border-t border-rule pt-2">
          <Label>{t("fields")}</Label>
          {IDENTITY_FIELDS.map((field) => (
            <label key={field} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={block.fields.includes(field)}
                onChange={(e) => {
                  const fields = e.target.checked
                    ? [...block.fields, field]
                    : block.fields.filter((f) => f !== field);
                  update({ ...block, fields });
                }}
              />
              {field}
            </label>
          ))}
        </div>
      );

    case "contact_details":
      return (
        <div className="mt-2 space-y-1 border-t border-rule pt-2">
          <Label>{t("fields")}</Label>
          {CONTACT_FIELDS.map((field) => (
            <label key={field} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={block.fields.includes(field)}
                onChange={(e) => {
                  const fields = e.target.checked
                    ? [...block.fields, field]
                    : block.fields.filter((f) => f !== field);
                  update({ ...block, fields });
                }}
              />
              {field}
            </label>
          ))}
        </div>
      );

    case "custom_text":
      return (
        <div className="mt-2 border-t border-rule pt-2">
          <Label>{t("text")}</Label>
          <Input
            value={block.text}
            onChange={(e) => update({ ...block, text: e.target.value })}
          />
        </div>
      );

    default:
      return warning;
  }
}
