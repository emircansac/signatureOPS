"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CAMPAIGN_SLOGAN_MAX, addDaysYmd, campaignYmd } from "@signatureops/schema";
import { trpc } from "@/lib/trpc";
import { AssetPicker } from "@/components/asset-picker";
import { Button, Card, Input, Label } from "@/components/ui";

export type CampaignRecord = {
  id: string;
  name: string;
  bannerAssetId: string;
  startDate: string;
  endDate: string;
  slogan: string | null;
  logoOverrideAssetId: string | null;
  templateIds: string[];
  ctaOverride: { text: string; link: string } | null;
  status: "scheduled" | "active" | "ended";
};

function todayYmd() {
  return campaignYmd(new Date());
}

function plusDaysYmd(days: number) {
  return addDaysYmd(todayYmd(), days);
}

export function CampaignForm({
  campaign,
  onClose,
}: {
  campaign: CampaignRecord | null;
  onClose: () => void;
}) {
  const t = useTranslations("campaigns");
  const tc = useTranslations("common");
  const utils = trpc.useUtils();
  const { data: templates } = trpc.templates.list.useQuery();
  const editing = Boolean(campaign);

  const [name, setName] = useState(campaign?.name ?? "");
  const [startDate, setStartDate] = useState(campaign?.startDate ?? todayYmd());
  const [endDate, setEndDate] = useState(campaign?.endDate ?? plusDaysYmd(30));
  const [bannerAssetId, setBannerAssetId] = useState(campaign?.bannerAssetId ?? "");
  const [slogan, setSlogan] = useState(campaign?.slogan ?? "");
  const [ctaOpen, setCtaOpen] = useState(Boolean(campaign?.ctaOverride));
  const [ctaText, setCtaText] = useState(campaign?.ctaOverride?.text ?? "");
  const [ctaLink, setCtaLink] = useState(campaign?.ctaOverride?.link ?? "");
  const [logoOpen, setLogoOpen] = useState(Boolean(campaign?.logoOverrideAssetId));
  const [logoOverrideAssetId, setLogoOverrideAssetId] = useState(campaign?.logoOverrideAssetId ?? "");
  const [templateIds, setTemplateIds] = useState<string[]>(campaign?.templateIds ?? []);
  const [error, setError] = useState("");

  const createMutation = trpc.campaigns.create.useMutation();
  const updateMutation = trpc.campaigns.update.useMutation();
  const pending = createMutation.isPending || updateMutation.isPending;

  function toggleTemplate(id: string) {
    setTemplateIds((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );
  }

  const save = async () => {
    setError("");
    if (!name.trim()) {
      setError(t("errors.name"));
      return;
    }
    if (endDate < startDate) {
      setError(t("errors.dateOrder"));
      return;
    }
    if (!bannerAssetId) {
      setError(t("errors.banner"));
      return;
    }
    if (ctaOpen && (ctaText.trim() || ctaLink.trim())) {
      if (!ctaText.trim() || !ctaLink.trim().startsWith("https://")) {
        setError(t("errors.cta"));
        return;
      }
    }
    const payload = {
      name: name.trim(),
      startDate,
      endDate,
      bannerAssetId,
      slogan: slogan.trim() || undefined,
      ctaOverride:
        ctaOpen && ctaText.trim() && ctaLink.trim()
          ? { text: ctaText.trim(), link: ctaLink.trim() }
          : undefined,
      logoOverrideAssetId: logoOpen && logoOverrideAssetId ? logoOverrideAssetId : undefined,
      templateIds,
    };
    try {
      if (campaign) {
        await updateMutation.mutateAsync({ id: campaign.id, ...payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      await Promise.all([
        utils.campaigns.list.invalidate(),
        utils.templates.compilePreview.invalidate(),
        utils.assets.list.invalidate(),
      ]);
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      setError(message.includes("TEMPLATE_OVERLAP") ? t("errors.overlap") : message || t("saveFailed"));
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/40 p-4 pt-12"
      role="dialog"
      aria-modal="true"
      aria-label={editing ? t("edit") : t("create")}
    >
      <Card className="w-full max-w-2xl space-y-4">
        <div className="flex items-start justify-between gap-4">
          <h2 className="font-serif text-xl font-medium text-ink">{editing ? t("edit") : t("create")}</h2>
          <Button type="button" variant="ghost" onClick={onClose}>
            {tc("cancel")}
          </Button>
        </div>

        <div>
          <Label htmlFor="campaign-name">
            {t("name")} <span className="text-lead">*</span>
          </Label>
          <Input id="campaign-name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="campaign-start">
              {t("startDate")} <span className="text-lead">*</span>
            </Label>
            <Input
              id="campaign-start"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="campaign-end">
              {t("endDate")} <span className="text-lead">*</span>
            </Label>
            <Input
              id="campaign-end"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
        <p className="text-xs text-lead">{t("dateHint")}</p>

        <div>
          <Label>
            {t("banner")} <span className="text-lead">*</span>
          </Label>
          <AssetPicker kind="banner" value={bannerAssetId} onChange={setBannerAssetId} />
        </div>

        <div>
          <Label htmlFor="campaign-slogan">{t("slogan")}</Label>
          <Input
            id="campaign-slogan"
            value={slogan}
            maxLength={CAMPAIGN_SLOGAN_MAX}
            onChange={(e) => setSlogan(e.target.value)}
          />
          <p className="mt-1 text-xs text-lead">
            {t("sloganHint", { max: CAMPAIGN_SLOGAN_MAX, count: slogan.length })}
          </p>
        </div>

        <div className="border border-rule p-4">
          <button type="button" className="text-sm font-medium text-ink" onClick={() => setCtaOpen((v) => !v)}>
            {ctaOpen ? t("hideCta") : t("showCta")}
          </button>
          {ctaOpen ? (
            <div className="mt-3 space-y-3">
              <div>
                <Label htmlFor="campaign-cta-text">{t("ctaText")}</Label>
                <Input
                  id="campaign-cta-text"
                  value={ctaText}
                  maxLength={40}
                  onChange={(e) => setCtaText(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="campaign-cta-link">{t("ctaLink")}</Label>
                <Input
                  id="campaign-cta-link"
                  placeholder="https://"
                  value={ctaLink}
                  onChange={(e) => setCtaLink(e.target.value)}
                />
              </div>
              <p className="text-xs leading-5 text-lead">{t("ctaHint")}</p>
            </div>
          ) : null}
        </div>

        <div className="border border-rule p-4">
          <button type="button" className="text-sm font-medium text-ink" onClick={() => setLogoOpen((v) => !v)}>
            {logoOpen ? t("hideLogo") : t("showLogo")}
          </button>
          {logoOpen ? (
            <div className="mt-3">
              <Label>{t("logoOverride")}</Label>
              <AssetPicker
                kind="logo"
                value={logoOverrideAssetId}
                allowClear
                onChange={setLogoOverrideAssetId}
              />
            </div>
          ) : null}
        </div>

        <div>
          <Label>{t("templates")}</Label>
          <p className="mb-2 text-xs text-lead">{t("templatesHint")}</p>
          {templates?.length ? (
            <ul className="space-y-2">
              {templates.map((template) => (
                <li key={template.id}>
                  <label className="flex items-center gap-2 text-sm text-ink">
                    <input
                      type="checkbox"
                      checked={templateIds.includes(template.id)}
                      onChange={() => toggleTemplate(template.id)}
                    />
                    {template.name}
                  </label>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-lead">{t("noTemplates")}</p>
          )}
        </div>

        {error ? <p className="text-sm text-seal">{error}</p> : null}

        <div className="flex gap-2">
          <Button type="button" onClick={() => void save()} disabled={pending}>
            {pending ? tc("loading") : tc("save")}
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            {tc("cancel")}
          </Button>
        </div>
      </Card>
    </div>
  );
}
