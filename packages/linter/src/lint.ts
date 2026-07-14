import type { LintIssue, LintOptions, LintResult } from "./types.js";
import { CATEGORY_TO_BREAKDOWN, CATEGORY_WEIGHTS } from "./types.js";
import { runLintRules } from "./rules.js";

function computeBreakdown(issues: LintIssue[]) {
  const breakdown = {
    renderingSafety: CATEGORY_WEIGHTS.rendering_safety,
    brandCompliance: CATEGORY_WEIGHTS.brand_compliance,
    accessibility: CATEGORY_WEIGHTS.accessibility,
    dataCompleteness: CATEGORY_WEIGHTS.data_completeness,
    performance: CATEGORY_WEIGHTS.performance,
    deploymentReadiness: CATEGORY_WEIGHTS.deployment_readiness,
  };

  for (const issue of issues) {
    const key = CATEGORY_TO_BREAKDOWN[issue.category];
    breakdown[key] = Math.max(0, breakdown[key] - issue.deduction);
  }

  return breakdown;
}

export function lintHtml(html: string, options: LintOptions = {}): LintResult {
  const issues = runLintRules(html, options);
  const breakdown = computeBreakdown(issues);
  const score = Object.values(breakdown).reduce((sum, v) => sum + v, 0);
  const hasErrors = issues.some((i) => i.severity === "error");

  return {
    issues,
    score,
    breakdown,
    passed: !hasErrors && score >= 70,
  };
}

export function lintTemplateHtml(
  html: string,
  options: LintOptions = {},
): LintResult {
  return lintHtml(html, options);
}
