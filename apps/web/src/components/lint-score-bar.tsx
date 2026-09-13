"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui";

const SEGMENTS = [
  { key: "renderingSafety", weight: 30 },
  { key: "brandCompliance", weight: 20 },
  { key: "accessibility", weight: 15 },
  { key: "dataCompleteness", weight: 15 },
  { key: "performance", weight: 10 },
  { key: "deploymentReadiness", weight: 10 },
] as const;

type LintBreakdown = {
  renderingSafety: number;
  brandCompliance: number;
  accessibility: number;
  dataCompleteness: number;
  performance: number;
  deploymentReadiness: number;
};

type LintIssueView = {
  id: string;
  message: string;
  deduction: number;
};

export function LintScoreBar({
  score,
  passed,
  breakdown,
  issues,
}: {
  score: number;
  passed: boolean;
  breakdown: LintBreakdown;
  issues: LintIssueView[];
}) {
  const t = useTranslations("templates");

  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="font-medium">{t("lintPanel")}</span>
        <Badge variant={passed ? "success" : "warning"}>{score}/100</Badge>
      </div>

      {issues.length > 0 ? (
        <p className="mt-2 text-[11px] leading-5 text-lead">
          {issues
            .map((issue) => {
              const label = t.has(`lint.issues.${issue.id}`)
                ? t(`lint.issues.${issue.id}`)
                : issue.message;
              return `${label} −${issue.deduction}`;
            })
            .join("  ·  ")}
        </p>
      ) : null}

      <div className="-mx-6 mt-5 border-t border-rule px-6 pt-3">
        <div className="flex" aria-hidden="true">
          {SEGMENTS.map((segment) => (
            <p
              key={segment.key}
              className="min-w-0 truncate pr-1 text-[10px] leading-4 text-lead"
              style={{ flex: `${segment.weight} 1 0%` }}
            >
              {t(`lint.${segment.key}`)}
            </p>
          ))}
        </div>
        <div
          className="mt-1.5 flex h-2 w-full gap-0.5"
          role="img"
          aria-label={`${t("lintPanel")} ${score}/100`}
        >
          {SEGMENTS.map((segment) => {
            const earned = breakdown[segment.key];
            const fill = Math.max(0, Math.min(100, (earned / segment.weight) * 100));
            return (
              <div
                key={segment.key}
                className="min-w-0 bg-wash"
                style={{ flex: `${segment.weight} 1 0%` }}
                title={`${t(`lint.${segment.key}`)} ${earned}/${segment.weight}`}
              >
                <div className="h-full bg-ink" style={{ width: `${fill}%` }} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
