"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc";
import { Badge, Button, Card, PageHeading } from "@/components/ui";
import { CampaignForm, type CampaignRecord } from "@/components/campaign-form";
import { consumeCreateQuery } from "@/lib/create-query";

const STATUS_VARIANT = {
  scheduled: "default",
  active: "success",
  ended: "warning",
} as const;

export default function CampaignsPage() {
  const t = useTranslations("campaigns");
  const tc = useTranslations("common");
  const utils = trpc.useUtils();
  const { data: campaigns, isLoading } = trpc.campaigns.list.useQuery();
  const [editing, setEditing] = useState<CampaignRecord | null | "new">(null);
  const [pendingDelete, setPendingDelete] = useState<CampaignRecord | null>(null);

  useEffect(() => {
    if (consumeCreateQuery()) setEditing("new");
  }, []);

  const deleteMutation = trpc.campaigns.delete.useMutation({
    onSuccess: () => {
      utils.campaigns.list.invalidate();
      utils.templates.compilePreview.invalidate();
      utils.assets.list.invalidate();
      setPendingDelete(null);
    },
  });

  if (isLoading) return <div className="text-lead">{tc("loading")}</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <PageHeading title={t("title")} subtitle={t("subtitle")} />
        <Button type="button" onClick={() => setEditing("new")}>
          {t("create")}
        </Button>
      </div>

      {editing !== null ? (
        <CampaignForm campaign={editing === "new" ? null : editing} onClose={() => setEditing(null)} />
      ) : null}

      {campaigns?.length === 0 ? (
        <Card>{t("noCampaigns")}</Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {campaigns?.map((campaign) => (
            <Card key={campaign.id} className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-semibold">{campaign.name}</h3>
                <Badge variant={STATUS_VARIANT[campaign.status]}>{t(`status.${campaign.status}`)}</Badge>
              </div>
              <p className="text-sm text-lead">
                {t("startDate")}: {campaign.startDate}
              </p>
              <p className="text-sm text-lead">
                {t("endDate")}: {campaign.endDate}
              </p>
              {campaign.slogan ? <p className="text-sm text-ink">{campaign.slogan}</p> : null}
              <div className="flex gap-2">
                <Button type="button" variant="secondary" onClick={() => setEditing(campaign)}>
                  {tc("edit")}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setPendingDelete(campaign)}>
                  {tc("delete")}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {pendingDelete ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-ink/40 p-4 pt-24"
          role="dialog"
          aria-modal="true"
          aria-label={t("deleteConfirm")}
        >
          <Card className="w-full max-w-md space-y-3">
            <p className="text-sm text-ink">
              {pendingDelete.status === "active" ? t("deleteActiveConfirm") : t("deleteConfirm")}
            </p>
            <p className="text-sm text-lead">{pendingDelete.name}</p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => deleteMutation.mutate({ id: pendingDelete.id })}
                disabled={deleteMutation.isPending}
              >
                {t("confirmDelete")}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setPendingDelete(null)}>
                {tc("cancel")}
              </Button>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
