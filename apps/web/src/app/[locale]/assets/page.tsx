"use client";

import { useTranslations } from "next-intl";
import { AssetLibrary } from "@/components/asset-library";

export default function AssetsPage() {
  const t = useTranslations("assets");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-zinc-500">{t("pageSubtitle")}</p>
      </div>
      <AssetLibrary />
    </div>
  );
}
