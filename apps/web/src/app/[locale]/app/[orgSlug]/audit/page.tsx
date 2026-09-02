"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { lintHtml } from "@signatureops/linter";
import { Badge, Button, Card, PageHeading, Textarea } from "@/components/ui";

export default function AuditPage() {
  const t = useTranslations("audit");
  const tc = useTranslations("common");
  const [html, setHtml] = useState("");
  const [result, setResult] = useState<ReturnType<typeof lintHtml> | null>(null);

  const analyze = () => {
    setResult(lintHtml(html, { requiredDisclaimer: false }));
  };

  return (
    <div className="space-y-6">
      <PageHeading title={t("title")} subtitle={t("subtitle")} />
      <p className="mt-1 text-sm text-lead">{t("privacy")}</p>

      <Card>
        <Textarea
          rows={12}
          placeholder={t("paste")}
          value={html}
          onChange={(e) => setHtml(e.target.value)}
        />
        <Button className="mt-4" onClick={analyze} disabled={!html.trim()}>
          {t("analyze")}
        </Button>
      </Card>

      {result && (
        <Card>
          <div className="mb-4 flex items-center gap-3">
            <span className="text-lg font-semibold">{tc("score")}</span>
            <Badge variant={result.passed ? "success" : "warning"}>
              {result.score}/100
            </Badge>
          </div>
          <h3 className="mb-2 font-medium">{t("issues")}</h3>
          {result.issues.length === 0 ? (
            <p className="text-ink">No issues found</p>
          ) : (
            <ul className="space-y-3">
              {result.issues.map((issue) => (
                <li key={issue.id} className="border border-rule p-3">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        issue.severity === "error"
                          ? "error"
                          : issue.severity === "warning"
                            ? "warning"
                            : "default"
                      }
                    >
                      {issue.severity}
                    </Badge>
                    <span className="font-medium">{issue.message}</span>
                  </div>
                  <p className="mt-1 text-sm text-lead">
                    {t("remediation")}: {issue.remediation}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}
