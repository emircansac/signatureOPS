export type LintSeverity = "error" | "warning" | "info";

export type LintCategory =
  | "rendering_safety"
  | "brand_compliance"
  | "accessibility"
  | "data_completeness"
  | "performance"
  | "deployment_readiness";

export type LintIssue = {
  id: string;
  severity: LintSeverity;
  category: LintCategory;
  message: string;
  remediation: string;
  deduction: number;
};

export type QualityScoreBreakdown = {
  renderingSafety: number;
  brandCompliance: number;
  accessibility: number;
  dataCompleteness: number;
  performance: number;
  deploymentReadiness: number;
};

export type LintResult = {
  issues: LintIssue[];
  score: number;
  breakdown: QualityScoreBreakdown;
  passed: boolean;
};

export type LintOptions = {
  approvedLogoAssetId?: string;
  approvedLogoUrl?: string;
  approvedLogoFound?: boolean;
  allowedPalette?: string[];
  requiredDisclaimer?: boolean;
  hasLegalDisclaimerText?: boolean;
  maxWidth?: number;
  maxSizeBytes?: number;
};

export const CATEGORY_WEIGHTS: Record<LintCategory, number> = {
  rendering_safety: 30,
  brand_compliance: 20,
  accessibility: 15,
  data_completeness: 15,
  performance: 10,
  deployment_readiness: 10,
};

export const CATEGORY_TO_BREAKDOWN: Record<LintCategory, keyof QualityScoreBreakdown> = {
  rendering_safety: "renderingSafety",
  brand_compliance: "brandCompliance",
  accessibility: "accessibility",
  data_completeness: "dataCompleteness",
  performance: "performance",
  deployment_readiness: "deploymentReadiness",
};
