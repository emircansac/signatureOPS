"use client";

import { useTranslations } from "next-intl";
import { AssetLibrary } from "@/components/asset-library";
import { PageHeading } from "@/components/ui";

export default function AssetsPage() {
  const t = useTranslations("assets");

  return (
    <div className="space-y-6">
      <PageHeading title={t("title")} subtitle={t("pageSubtitle")} />
      <AssetLibrary />
    </div>
  );
}
