"use client";

import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc";
import { Card, PageHeading } from "@/components/ui";

export default function CampaignsPage() {
  const t = useTranslations("campaigns");
  const { data: campaigns, isLoading } = trpc.campaigns.list.useQuery();

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <PageHeading title={t("title")} subtitle={t("subtitle")} />

      {campaigns?.length === 0 ? (
        <Card>{t("noCampaigns")}</Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {campaigns?.map((c) => (
            <Card key={c.id}>
              <h3 className="font-semibold">{c.name}</h3>
              <p className="mt-2 text-sm text-lead">
                {t("startDate")}: {new Date(c.startDate).toLocaleDateString()}
              </p>
              <p className="text-sm text-lead">
                {t("endDate")}: {new Date(c.endDate).toLocaleDateString()}
              </p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
