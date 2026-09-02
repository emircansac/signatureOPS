"use client";

import { useTranslations } from "next-intl";

export function EmailComposePreview({
  html,
  fromName,
}: {
  html?: string;
  fromName?: string;
}) {
  const t = useTranslations("templates");

  return (
    <div>
      <p className="mb-2 text-sm text-lead">{t("livePreview")}</p>
      <div className="border border-rule bg-paper lg:sticky lg:top-24">
        <div className="flex h-9 items-center justify-between bg-ink px-3">
          <span className="text-[13px] font-medium text-paper">{t("newMessage")}</span>
          <div className="flex items-center gap-3 text-paper" aria-hidden>
            <span className="block h-px w-2.5 bg-paper" />
            <span className="block h-2 w-2 border border-paper" />
            <span className="block text-[12px] leading-none">×</span>
          </div>
        </div>

        {fromName ? (
          <div className="flex items-baseline gap-3 border-b border-rule px-3 py-2 text-[13px] text-ink">
            <span className="text-lead">{t("from")}</span>
            {fromName}
          </div>
        ) : null}
        <div className="border-b border-rule px-3 py-2 text-[13px] text-lead">{t("to")}</div>
        <div className="border-b border-rule px-3 py-2 text-[13px] text-lead">{t("subject")}</div>

        <div className="min-h-[280px] px-3 py-3">
          <p className="whitespace-pre-line text-[13px] leading-6 text-ink">{t("previewBody")}</p>

          <div className="mt-5 font-mono">
            <div className="mb-2.5 h-px w-10 bg-seal" />
            {html ? (
              <div className="overflow-auto" dangerouslySetInnerHTML={{ __html: html }} />
            ) : (
              <p className="text-[12px] text-lead">{t("previewEmpty")}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
