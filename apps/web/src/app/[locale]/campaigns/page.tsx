"use client";

import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui";

export default function CampaignsPage() {
  const t = useTranslations("campaigns");
  const { data: campaigns, isLoading } = trpc.campaigns.list.useQuery();

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-zinc-500">{t("subtitle")}</p>
      </div>

      {campaigns?.length === 0 ? (
        <Card>{t("noCampaigns")}</Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {campaigns?.map((c) => (
            <Card key={c.id}>
              <h3 className="font-semibold">{c.name}</h3>
              <p className="mt-2 text-sm text-zinc-500">
                {t("startDate")}: {new Date(c.startDate).toLocaleDateString()}
              </p>
              <p className="text-sm text-zinc-500">
                {t("endDate")}: {new Date(c.endDate).toLocaleDateString()}
              </p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
