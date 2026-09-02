"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { trpc } from "@/lib/trpc";
import { resolvePublicAssetUrl } from "@/lib/asset-url";
import { useOrgSlug, orgPath } from "@/lib/org-path";
import { cn } from "@/lib/utils";

export type AssetPickerKind = "logo" | "banner" | "certification" | "cta_icon" | "legal_badge" | "any";

type ListedAsset = {
  id: string;
  url: string;
  alt: string | null;
  kind: string;
  slot: string | null;
  width: number | null;
  height: number | null;
};

function matchesKind(asset: ListedAsset, kind: AssetPickerKind): boolean {
  switch (kind) {
    case "any":
      return true;
    case "logo":
      return asset.kind === "LOGO" || Boolean(asset.slot?.startsWith("logo"));
    case "banner":
      return asset.kind === "BANNER" || asset.slot === "banner";
    case "certification":
      return asset.kind === "CERTIFICATION" || asset.slot === "certification";
    case "cta_icon":
      return asset.slot === "cta_icon";
    case "legal_badge":
      return asset.slot === "legal_badge";
  }
}

function labelFor(asset: ListedAsset, tSlot: (key: string) => string): string {
  if (asset.slot === "logo_light") return tSlot("logoLight");
  if (asset.slot === "logo_dark") return tSlot("logoDark");
  if (asset.slot === "logo_mark") return tSlot("logoMark");
  if (asset.slot === "logo") return tSlot("logo");
  if (asset.slot === "banner") return tSlot("banner");
  if (asset.slot === "cta_icon") return tSlot("ctaIcon");
  if (asset.slot === "legal_badge") return tSlot("legalBadge");
  return asset.alt?.trim() || asset.id;
}

export function AssetPicker({
  kind,
  value,
  values,
  multiple = false,
  onChange,
  onChangeMany,
  missing = false,
  allowClear = false,
}: {
  kind: AssetPickerKind;
  value?: string;
  values?: string[];
  multiple?: boolean;
  onChange?: (assetId: string) => void;
  onChangeMany?: (assetIds: string[]) => void;
  missing?: boolean;
  allowClear?: boolean;
}) {
  const t = useTranslations("templates");
  const ti = useTranslations("identity");
  const orgSlug = useOrgSlug();
  const { data: assets, isLoading } = trpc.assets.list.useQuery(undefined);

  const filtered = (assets ?? []).filter((asset) => matchesKind(asset, kind));
  const selected = new Set(multiple ? (values ?? []) : value ? [value] : []);
  const identityHref = orgPath(orgSlug, "/assets");

  if (isLoading) {
    return <p className="text-xs text-lead">{t("loadingAssets")}</p>;
  }

  if (filtered.length === 0) {
    return (
      <div className="space-y-1">
        <p className="text-sm text-seal">{t("noApprovedAssets")}</p>
        <Link href={identityHref} className="text-sm text-ink underline">
          {t("goToIdentity")}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {missing ? <p className="text-sm text-seal">{t("assetMissing")}</p> : null}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {filtered.map((asset) => {
          const active = selected.has(asset.id);
          const src = resolvePublicAssetUrl(asset.url);
          return (
            <button
              key={asset.id}
              type="button"
              onClick={() => {
                if (multiple) {
                  const next = active
                    ? (values ?? []).filter((id) => id !== asset.id)
                    : [...(values ?? []), asset.id];
                  onChangeMany?.(next);
                  return;
                }
                if (active && allowClear) {
                  onChange?.("");
                  return;
                }
                onChange?.(asset.id);
              }}
              className={cn(
                "flex flex-col items-center gap-2 border p-2 text-left text-xs",
                active ? "border-ink" : "border-rule hover:border-ink",
              )}
            >
              <span className="flex h-14 w-full items-center justify-center overflow-hidden bg-paper">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="max-h-full max-w-full object-contain" />
              </span>
              <span className="w-full truncate text-ink">{labelFor(asset, ti)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
