import type { LintIssue, LintOptions } from "./types.js";

type RuleCheck = (html: string, options: LintOptions) => LintIssue | LintIssue[] | null;

const rules: RuleCheck[] = [
  (html) =>
    /display\s*:\s*flex/i.test(html)
      ? {
          id: "no-flexbox",
          severity: "error",
          category: "rendering_safety",
          message: "Flexbox detected",
          remediation: "+10 points if you replace flexbox with table-based layout",
          deduction: 10,
        }
      : null,
  (html) =>
    /display\s*:\s*grid/i.test(html)
      ? {
          id: "no-grid",
          severity: "error",
          category: "rendering_safety",
          message: "CSS grid detected",
          remediation: "+10 points if you replace grid with table-based layout",
          deduction: 10,
        }
      : null,
  (html) =>
    /<script/i.test(html)
      ? {
          id: "no-script",
          severity: "error",
          category: "rendering_safety",
          message: "Script tag detected",
          remediation: "+15 points if you remove all script tags",
          deduction: 15,
        }
      : null,
  (html) =>
    /<form/i.test(html)
      ? {
          id: "no-form",
          severity: "error",
          category: "rendering_safety",
          message: "Form element detected",
          remediation: "+10 points if you remove form elements",
          deduction: 10,
        }
      : null,
  (html) =>
    /<video/i.test(html)
      ? {
          id: "no-video",
          severity: "error",
          category: "rendering_safety",
          message: "Video element detected",
          remediation: "+10 points if you replace video with static images",
          deduction: 10,
        }
      : null,
  (html) =>
    /<link[^>]+stylesheet/i.test(html) || /@import/i.test(html)
      ? {
          id: "no-external-css",
          severity: "error",
          category: "rendering_safety",
          message: "External stylesheet detected",
          remediation: "+10 points if you use inline styles only",
          deduction: 10,
        }
      : null,
  (html) =>
    /src=["']http:\/\//i.test(html) || /href=["']http:\/\//i.test(html)
      ? {
          id: "no-http",
          severity: "error",
          category: "deployment_readiness",
          message: "Non-HTTPS resource URL detected",
          remediation: "+8 points if you use HTTPS URLs for all resources",
          deduction: 8,
        }
      : null,
  (html) => {
    const imgs = [...html.matchAll(/<img[^>]*>/gi)];
    const missing = imgs.filter((m) => !/\balt=["'][^"']+["']/i.test(m[0] ?? ""));
    return missing.length > 0
      ? {
          id: "missing-alt",
          severity: "warning",
          category: "accessibility",
          message: `${missing.length} image(s) missing alt text`,
          remediation: "+5 points if you add descriptive alt text to every image",
          deduction: 5,
        }
      : null;
  },
  (html) => {
    const imgs = [...html.matchAll(/<img[^>]*>/gi)];
    const missing = imgs.filter(
      (m) => !/\bwidth=["']\d+["']/i.test(m[0] ?? "") || !/\bheight=["']\d+["']/i.test(m[0] ?? ""),
    );
    return missing.length > 0
      ? {
          id: "missing-dimensions",
          severity: "warning",
          category: "rendering_safety",
          message: `${missing.length} image(s) missing width/height`,
          remediation: "+5 points if you set explicit width and height on all images",
          deduction: 5,
        }
      : null;
  },
  (html) => {
    const emptyLinks = [...html.matchAll(/<a[^>]*href=["'](?:#|)["'][^>]*>/gi)];
    return emptyLinks.length > 0
      ? {
          id: "empty-links",
          severity: "warning",
          category: "accessibility",
          message: "Empty or placeholder links detected",
          remediation: "+3 points if you remove empty links or add valid href values",
          deduction: 3,
        }
      : null;
  },
  (html, options) => {
    const widthMatch = html.match(/max-width\s*:\s*(\d+)px/i);
    const width = widthMatch ? parseInt(widthMatch[1] ?? "0", 10) : 0;
    const max = options.maxWidth ?? 600;
    return width > max
      ? {
          id: "excessive-width",
          severity: "warning",
          category: "performance",
          message: `Signature width ${width}px exceeds ${max}px`,
          remediation: `+4 points if you reduce max-width to ${max}px or less`,
          deduction: 4,
        }
      : null;
  },
  (html, options) => {
    const size = new TextEncoder().encode(html).length;
    const max = options.maxSizeBytes ?? 100_000;
    return size > max
      ? {
          id: "oversized-html",
          severity: "warning",
          category: "performance",
          message: `HTML size ${size} bytes exceeds ${max} bytes`,
          remediation: "+5 points if you reduce HTML size by optimizing images and markup",
          deduction: 5,
        }
      : null;
  },
  (html) =>
    /data:image\/[^;]+;base64,[A-Za-z0-9+/=]{50000,}/i.test(html)
      ? {
          id: "oversized-base64",
          severity: "warning",
          category: "performance",
          message: "Oversized base64 image detected",
          remediation: "+5 points if you host images externally instead of embedding base64",
          deduction: 5,
        }
      : null,
  (html) =>
    /<svg/i.test(html)
      ? {
          id: "svg-risk",
          severity: "info",
          category: "rendering_safety",
          message: "SVG detected — limited client support",
          remediation: "+3 points if you replace SVG with PNG images",
          deduction: 3,
        }
      : null,
  (html) =>
    /background-image\s*:/i.test(html)
      ? {
          id: "background-image",
          severity: "warning",
          category: "rendering_safety",
          message: "CSS background-image detected",
          remediation: "+4 points if you use img tags instead of background-image",
          deduction: 4,
        }
      : null,
  (html, options) => {
    if (!options.approvedLogoAssetId) return null;
    const hasApproved = html.includes(options.approvedLogoAssetId);
    return !hasApproved
      ? {
          id: "unapproved-logo",
          severity: "warning",
          category: "brand_compliance",
          message: "Approved logo asset not found",
          remediation: "+8 points if you use the approved logo asset ID in your template",
          deduction: 8,
        }
      : null;
  },
  (html, options) => {
    if (!options.requiredDisclaimer) return null;
    const hasDisclaimer =
      /confidential|disclaimer|legal/i.test(html) || html.includes("legal_disclaimer");
    return !hasDisclaimer
      ? {
          id: "missing-disclaimer",
          severity: "error",
          category: "brand_compliance",
          message: "Required legal disclaimer missing",
          remediation: "+10 points if you add a legal disclaimer block",
          deduction: 10,
        }
      : null;
  },
  (html) => {
    const mailtoInvalid = [...html.matchAll(/href=["']mailto:([^"']*)["']/gi)].filter(
      ([, addr]) => !addr || !addr.includes("@"),
    );
    return mailtoInvalid.length > 0
      ? {
          id: "invalid-mailto",
          severity: "warning",
          category: "data_completeness",
          message: "Invalid mailto link detected",
          remediation: "+3 points if you fix mailto links with valid email addresses",
          deduction: 3,
        }
      : null;
  },
  (html) => {
    const nesting = (html.match(/<table/gi) ?? []).length;
    return nesting > 5
      ? {
          id: "deep-nesting",
          severity: "info",
          category: "rendering_safety",
          message: "Deep table nesting detected",
          remediation: "+2 points if you simplify table structure",
          deduction: 2,
        }
      : null;
  },
];

export function runLintRules(html: string, options: LintOptions = {}): LintIssue[] {
  const issues: LintIssue[] = [];
  for (const rule of rules) {
    const result = rule(html, options);
    if (!result) continue;
    if (Array.isArray(result)) issues.push(...result);
    else issues.push(result);
  }
  return issues;
}
