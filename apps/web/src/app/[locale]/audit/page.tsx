"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { lintHtml } from "@signatureops/linter";
import { Badge, Button, Card, Textarea } from "@/components/ui";

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
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-zinc-500">{t("subtitle")}</p>
        <p className="mt-1 text-sm text-green-700">{t("privacy")}</p>
      </div>

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
            <p className="text-green-700">No issues found</p>
          ) : (
            <ul className="space-y-3">
              {result.issues.map((issue) => (
                <li key={issue.id} className="rounded-md border border-zinc-100 p-3">
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
                  <p className="mt-1 text-sm text-zinc-500">
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
