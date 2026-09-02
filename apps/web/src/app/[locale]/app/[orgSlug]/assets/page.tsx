"use client";

import { useTranslations } from "next-intl";
import { IdentityPanel } from "@/components/identity-panel";
import { PageHeading } from "@/components/ui";

export default function AssetsPage() {
  const t = useTranslations("identity");

  return (
    <div className="space-y-6">
      <PageHeading title={t("title")} subtitle={t("subtitle")} />
      <IdentityPanel />
    </div>
  );
}
