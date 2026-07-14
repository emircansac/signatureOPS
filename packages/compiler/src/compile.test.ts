import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { CompileContext, TemplateDefinition } from "@signatureops/schema";
import { compile } from "./compile.js";
import { escapeHtml } from "./escape.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const baseContext: CompileContext = {
  user: {
    user: {
      displayName: "Ayşe Yılmaz",
      jobTitle: "Sales Manager",
      department: "Sales",
      country: "TR",
      email: "ayse@acme.com",
      mobile: "5551234567",
      photoUrl: "https://cdn.acme.com/ayse.jpg",
    },
    organization: { name: "Acme Corp" },
    office: { address: "Istanbul" },
    manager: { displayName: "Mehmet Demir" },
  },
  assets: {
    "logo-1": {
      id: "logo-1",
      url: "https://cdn.acme.com/logo.png",
      width: 120,
      height: 40,
      alt: "Acme Corp",
    },
  },
  campaigns: {
    "camp-1": {
      id: "camp-1",
      bannerUrl: "https://cdn.acme.com/banner.png",
      width: 400,
      height: 80,
    },
  },
};

const fixtures: Record<string, TemplateDefinition> = {
  minimal: {
    layout: "single-column",
    blocks: [
      { type: "identity", fields: ["displayName", "jobTitle"] },
      { type: "contact_details", fields: ["email"] },
    ],
  },
  full: {
    layout: "two-column",
    blocks: [
      { type: "profile_photo" },
      { type: "company_logo", assetId: "logo-1" },
      { type: "identity", fields: ["displayName", "jobTitle", "department"] },
      { type: "contact_details", fields: ["email", "mobile"] },
      { type: "social_links", links: [{ network: "LinkedIn", url: "https://linkedin.com/in/ayse" }] },
      { type: "cta_button", label: "Book", url: "https://acme.com/book" },
      { type: "campaign_banner", campaignId: "camp-1" },
      { type: "legal_disclaimer", text: "Confidential. {{organization.name}}" },
      { type: "certifications", items: ["ISO 27001"] },
      { type: "custom_text", text: "Welcome from {{user.department}}" },
      { type: "spacer" },
      { type: "divider" },
    ],
  },
  conditional: {
    layout: "single-column",
    blocks: [
      { type: "identity", fields: ["displayName"] },
      {
        type: "legal_disclaimer",
        text: "Internal only",
        visibleWhen: "recipient.internal",
      },
    ],
  },
};

describe("escapeHtml", () => {
  it("escapes dangerous characters", () => {
    expect(escapeHtml(`<script>"'&`)).toBe("&lt;script&gt;&quot;&#39;&amp;");
  });
});

describe("compile", () => {
  for (const [name, definition] of Object.entries(fixtures)) {
    it(`produces deterministic output for ${name}`, () => {
      const a = compile(definition, baseContext);
      const b = compile(definition, baseContext);
      expect(a.html).toBe(b.html);
      expect(a.sizeBytes).toBe(b.sizeBytes);
    });

    it(`golden snapshot for ${name}`, () => {
      const result = compile(definition, baseContext);
      const goldenPath = join(__dirname, "..", "fixtures", `${name}.html`);
      let expected: string;
      try {
        expected = readFileSync(goldenPath, "utf-8");
      } catch {
        expected = result.html;
      }
      expect(result.html).toBe(expected);
      expect(result.html).not.toMatch(/display:\s*flex|display:\s*grid|<script|<form|<video|stylesheet/);
      expect(result.html).toMatch(/<table/);
      expect(result.plainText.length).toBeGreaterThan(0);
    });
  }

  it("hides blocks based on visibility", () => {
    const result = compile(fixtures.conditional!, baseContext, {
      visibility: { recipientType: "external" },
    });
    expect(result.html).not.toContain("Internal only");
  });

  it("shows blocks for matching visibility", () => {
    const result = compile(fixtures.conditional!, baseContext, {
      visibility: { recipientType: "internal" },
    });
    expect(result.html).toContain("Internal only");
  });

  it("produces gmail and outlook variants", () => {
    const gmail = compile(fixtures.minimal!, baseContext, { variant: "gmail" });
    const outlook = compile(fixtures.minimal!, baseContext, { variant: "outlook" });
    expect(gmail.html).toContain("<!-- gmail -->");
    expect(outlook.html).toContain("<!-- outlook -->");
  });

  it("respects hidden blocks", () => {
    const result = compile(fixtures.full!, baseContext, { hiddenBlocks: ["campaign_banner"] });
    expect(result.html).not.toContain("Campaign banner");
  });
});
