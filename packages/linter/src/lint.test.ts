import { describe, expect, it } from "vitest";
import { lintHtml } from "./lint.js";

const safeHtml = `<table cellpadding="0" cellspacing="0" border="0" style="max-width:400px;">
<tr><td><img src="https://cdn.example.com/logo.png" alt="Logo" width="120" height="40" /></td></tr>
<tr><td><p style="font-size:12px;">Confidential disclaimer text</p></td></tr>
</table>`;

const badHtml = `<div style="display:flex">
<script>alert(1)</script>
<img src="http://insecure.com/img.png" />
<a href="#">empty</a>
</div>`;

describe("lintHtml", () => {
  it("passes safe HTML with high score", () => {
    const result = lintHtml(safeHtml, { requiredDisclaimer: true });
    expect(result.score).toBeGreaterThanOrEqual(85);
    expect(result.passed).toBe(true);
  });

  it("flags flexbox, script, http resources", () => {
    const result = lintHtml(badHtml);
    const ids = result.issues.map((i) => i.id);
    expect(ids).toContain("no-flexbox");
    expect(ids).toContain("no-script");
    expect(ids).toContain("no-http");
    expect(result.passed).toBe(false);
  });

  it("is reproducible", () => {
    const a = lintHtml(safeHtml);
    const b = lintHtml(safeHtml);
    expect(a.score).toBe(b.score);
    expect(a.issues).toEqual(b.issues);
  });

  it("provides remediation for each issue", () => {
    const result = lintHtml(badHtml);
    for (const issue of result.issues) {
      expect(issue.remediation).toMatch(/\+[\d]+ points if you/);
    }
  });

  it("deducts for missing disclaimer when required", () => {
    const without = `<table><tr><td>Name</td></tr></table>`;
    const result = lintHtml(without, { requiredDisclaimer: true });
    expect(result.issues.some((i) => i.id === "missing-disclaimer")).toBe(true);
  });
});
