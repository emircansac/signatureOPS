"use client";

import { useTranslations } from "next-intl";
import type { Block } from "@signatureops/schema";
import { trpc } from "@/lib/trpc";
import { Input, Label, Select } from "@/components/ui";

const IDENTITY_FIELDS = ["displayName", "jobTitle", "department", "country"] as const;
const CONTACT_FIELDS = ["email", "mobile", "officePhone"] as const;

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
  const { data: assets } = trpc.assets.list.useQuery(undefined);
  const { data: campaigns } = trpc.campaigns.list.useQuery();

  const logoAssets = assets?.filter((a) => a.kind === "LOGO" || a.kind === "PHOTO") ?? [];
  const bannerAssets = assets?.filter((a) => a.kind === "BANNER") ?? [];

  const update = (updated: Block) => onChange(index, updated);

  switch (block.type) {
    case "company_logo":
      return (
        <div className="mt-2 space-y-2 border-t border-zinc-100 pt-2">
          <Label>{t("selectImage")}</Label>
          <Select
            value={block.assetId}
            onChange={(e) => update({ ...block, assetId: e.target.value })}
          >
            <option value="">{t("chooseImage")}</option>
            {logoAssets.map((a) => (
              <option key={a.id} value={a.id}>
                {a.alt ?? a.id} ({a.kind})
              </option>
            ))}
          </Select>
          {logoAssets.length === 0 && (
            <p className="text-xs text-amber-600">{t("noImagesYet")}</p>
          )}
        </div>
      );

    case "campaign_banner":
      return (
        <div className="mt-2 space-y-2 border-t border-zinc-100 pt-2">
          <Label>{t("selectCampaign")}</Label>
          <Select
            value={block.campaignId}
            onChange={(e) => update({ ...block, campaignId: e.target.value })}
          >
            <option value="">{t("chooseCampaign")}</option>
            {campaigns?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Label>{t("orBannerImage")}</Label>
          <Select
            value={bannerAssets.find((a) => a.id === block.campaignId) ? block.campaignId : ""}
            onChange={(e) => {
              if (e.target.value) update({ ...block, campaignId: `asset:${e.target.value}` });
            }}
          >
            <option value="">{t("chooseImage")}</option>
            {bannerAssets.map((a) => (
              <option key={a.id} value={a.id}>
                {a.alt ?? a.id}
              </option>
            ))}
          </Select>
        </div>
      );

    case "identity":
      return (
        <div className="mt-2 space-y-1 border-t border-zinc-100 pt-2">
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
        <div className="mt-2 space-y-1 border-t border-zinc-100 pt-2">
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

    case "legal_disclaimer":
    case "custom_text":
      return (
        <div className="mt-2 border-t border-zinc-100 pt-2">
          <Label>{t("text")}</Label>
          <Input
            value={block.text}
            onChange={(e) => update({ ...block, text: e.target.value })}
          />
        </div>
      );

    case "cta_button":
      return (
        <div className="mt-2 space-y-2 border-t border-zinc-100 pt-2">
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
        </div>
      );

    case "social_links":
      return (
        <div className="mt-2 space-y-2 border-t border-zinc-100 pt-2">
          {block.links.map((link, li) => (
            <div key={li} className="grid grid-cols-2 gap-2">
              <Input
                placeholder="LinkedIn"
                value={link.network}
                onChange={(e) => {
                  const links = [...block.links];
                  links[li] = { ...link, network: e.target.value };
                  update({ ...block, links });
                }}
              />
              <Input
                placeholder="https://"
                value={link.url}
                onChange={(e) => {
                  const links = [...block.links];
                  links[li] = { ...link, url: e.target.value };
                  update({ ...block, links });
                }}
              />
            </div>
          ))}
        </div>
      );

    case "certifications":
      return (
        <div className="mt-2 border-t border-zinc-100 pt-2">
          <Label>{t("items")}</Label>
          <Input
            value={block.items.join(", ")}
            onChange={(e) =>
              update({
                ...block,
                items: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
              })
            }
          />
        </div>
      );

    case "profile_photo":
      return (
        <p className="mt-2 border-t border-zinc-100 pt-2 text-xs text-zinc-500">
          {t("profilePhotoHint")}
        </p>
      );

    default:
      return null;
  }
}
