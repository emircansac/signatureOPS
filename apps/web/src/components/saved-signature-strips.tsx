"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc";
import { copySignatureHtml } from "@/lib/copy-signature";
import { Link, useRouter } from "@/i18n/routing";
import { orgPath, useOrgSlug } from "@/lib/org-path";
import { Button, Card } from "@/components/ui";
import { cn } from "@/lib/utils";

export function SavedSignatureStrips({ currentTemplateId }: { currentTemplateId?: string }) {
  const t = useTranslations("templates");
  const tc = useTranslations("common");
  const orgSlug = useOrgSlug();
  const router = useRouter();
  const utils = trpc.useUtils();
  const { data: strips, isLoading } = trpc.templates.listCompiled.useQuery();
  const [copied, setCopied] = useState<{ id: string; mode: "rich" | "source" } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    name: string;
    usedIn: string[];
  } | null>(null);

  const deleteMutation = trpc.templates.delete.useMutation({
    onSuccess: async (_, input) => {
      await Promise.all([
        utils.templates.list.invalidate(),
        utils.templates.listCompiled.invalidate(),
        utils.templates.get.invalidate(),
      ]);
      setPendingDelete(null);
      if (currentTemplateId && input.id === currentTemplateId) {
        router.push(orgPath(orgSlug, "/templates"));
      }
    },
  });

  const copyHtml = async (id: string, html: string, mode: "rich" | "source") => {
    if (!html) return;
    await copySignatureHtml(html, mode);
    setCopied({ id, mode });
    setTimeout(() => setCopied(null), 2000);
  };

  if (isLoading) return <p className="text-sm text-lead">{tc("loading")}</p>;
  if (!strips?.length) return <p className="text-sm text-lead">{t("noTemplates")}</p>;

  return (
    <div className="space-y-2">
      {strips.map((strip) => {
        const usedIn = [...strip.usedIn.rules, ...strip.usedIn.campaigns];
        return (
          <div
            key={strip.id}
            className={cn(
              "border border-rule bg-paper p-3",
              currentTemplateId === strip.id && "border-ink",
            )}
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <Link
                href={orgPath(orgSlug, `/templates/${strip.id}`)}
                className="truncate text-[13px] font-medium text-ink hover:underline"
              >
                {strip.name}
              </Link>
              <Button
                type="button"
                variant="ghost"
                className="px-2 py-1 text-xs"
                onClick={() => setPendingDelete({ id: strip.id, name: strip.name, usedIn })}
              >
                {tc("delete")}
              </Button>
            </div>
            <div className="mb-2 max-h-24 overflow-hidden border border-rule bg-paper p-2">
              {strip.html ? (
                <div
                  className="origin-top-left pointer-events-none scale-[0.72]"
                  dangerouslySetInnerHTML={{ __html: strip.html }}
                />
              ) : (
                <p className="text-[11px] text-lead">{t("previewEmpty")}</p>
              )}
            </div>
            <div className="flex flex-wrap gap-1">
              <Button
                type="button"
                variant="secondary"
                className="px-2 py-1 text-xs"
                disabled={!strip.html}
                onClick={() => void copyHtml(strip.id, strip.html, "rich")}
              >
                {copied?.id === strip.id && copied.mode === "rich" ? tc("copied") : t("copyForGmail")}
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="px-2 py-1 text-xs"
                disabled={!strip.html}
                onClick={() => void copyHtml(strip.id, strip.html, "source")}
              >
                {copied?.id === strip.id && copied.mode === "source" ? tc("copied") : t("copyHtmlSource")}
              </Button>
            </div>
          </div>
        );
      })}

      {pendingDelete ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-ink/40 p-4 pt-24"
          role="dialog"
          aria-modal="true"
          aria-label={t("deleteConfirm")}
        >
          <Card className="w-full max-w-md space-y-3">
            <p className="text-sm text-ink">{t("deleteConfirm")}</p>
            <p className="text-sm text-lead">{pendingDelete.name}</p>
            {pendingDelete.usedIn.length > 0 ? (
              <p className="text-sm text-seal">
                {t("deleteInUse", { names: pendingDelete.usedIn.join(", ") })}
              </p>
            ) : null}
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
