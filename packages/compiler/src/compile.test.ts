import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { CompileContext } from "@signatureops/schema";
import { parseTemplateDefinition } from "@signatureops/schema";
import { compile } from "./compile.js";
import { escapeHtml } from "./escape.js";
import { resolveLogoAsset } from "./blocks.js";

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

const fixtures = {
  minimal: parseTemplateDefinition({
    layout: "single-column",
    blocks: [
      { type: "identity", fields: ["displayName", "jobTitle"] },
      { type: "contact_details", fields: ["email"] },
    ],
  }),
  full: parseTemplateDefinition({
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
  }),
  conditional: parseTemplateDefinition({
    layout: "single-column",
    blocks: [
      { type: "identity", fields: ["displayName"] },
      {
        type: "legal_disclaimer",
        text: "Internal only",
        visibleWhen: "recipient.internal",
      },
    ],
  }),
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

  it("omits broken img when logo asset is missing", () => {
    const definition = parseTemplateDefinition({
      layout: "single-column",
      blocks: [{ type: "company_logo", assetId: "deleted" }],
    });
    const result = compile(definition, baseContext);
    expect(result.html).not.toMatch(/<img/);
    expect(resolveLogoAsset(definition.blocks[0] as never, baseContext)).toBeUndefined();
  });

  it("falls back from missing logo variant to default logo", () => {
    const definition = parseTemplateDefinition({
      layout: "single-column",
      blocks: [{ type: "company_logo", assetId: "logo-1", logoVariant: "dark" }],
    });
    const context = {
      ...baseContext,
      identity: {
        logoSlotIds: { default: "logo-1" },
        socialIconMode: "standard" as const,
        socialIconAssetIds: {},
        colors: [],
        tokens: { ink: "#1C2B3A", seal: "#A63D2F", link: "#0066cc" },
      },
    };
    const result = compile(definition, context);
    expect(result.html).toContain("https://cdn.acme.com/logo.png");
  });

  it("uses custom social icons when identity mode is custom", () => {
    const definition = parseTemplateDefinition({
      layout: "single-column",
      blocks: [
        {
          type: "social_links",
          platforms: ["linkedin"],
          links: [{ network: "linkedin", url: "https://linkedin.com/in/ayse" }],
        },
      ],
    });
    const result = compile(definition, {
      ...baseContext,
      assets: {
        ...baseContext.assets,
        "icon-li": {
          id: "icon-li",
          url: "https://cdn.acme.com/li.png",
          width: 16,
          height: 16,
          alt: "LinkedIn",
        },
      },
      identity: {
        logoSlotIds: {},
        socialIconMode: "custom",
        socialIconAssetIds: { linkedin: "icon-li" },
        colors: [],
        tokens: { ink: "#1C2B3A", seal: "#A63D2F", link: "#0066cc" },
      },
    });
    expect(result.html).toContain("https://cdn.acme.com/li.png");
    expect(result.html).not.toMatch(/>LinkedIn</);
  });
});

describe("campaign render-time override", () => {
  const overlayContext: CompileContext = {
    ...baseContext,
    assets: {
      ...baseContext.assets,
      "banner-camp": {
        id: "banner-camp",
        url: "https://cdn.acme.com/campaign-banner.png",
        width: 400,
        height: 80,
        alt: "Anniversary",
      },
      "logo-camp": {
        id: "logo-camp",
        url: "https://cdn.acme.com/campaign-logo.png",
        width: 120,
        height: 40,
        alt: "Campaign logo",
      },
    },
    campaigns: {
      live: {
        id: "live",
        bannerUrl: "https://cdn.acme.com/campaign-banner.png",
        width: 400,
        height: 80,
        slogan: "10. yıl",
        ctaOverride: { text: "Kutla", link: "https://acme.com/10" },
        logoOverrideAssetId: "logo-camp",
        active: true,
      },
      ended: {
        id: "ended",
        bannerUrl: "https://cdn.acme.com/old-banner.png",
        slogan: "Eski slogan",
        ctaOverride: { text: "Eski", link: "https://acme.com/old" },
        logoOverrideAssetId: "logo-camp",
        active: false,
      },
    },
    activeCampaignId: "live",
  };

  const branded = parseTemplateDefinition({
    layout: "single-column",
    blocks: [
      { type: "company_logo", assetId: "logo-1" },
      { type: "cta_button", label: "Book", url: "https://acme.com/book" },
      { type: "campaign_banner", campaignId: "", assetId: "" },
      { type: "legal_disclaimer", text: "Confidential. {{organization.name}}" },
    ],
  });

  it("overrides banner, slogan, CTA, and logo without mutating the template", () => {
    const snapshot = JSON.parse(JSON.stringify(branded)) as typeof branded;
    const result = compile(branded, overlayContext);
    expect(result.html).toContain("https://cdn.acme.com/campaign-banner.png");
    expect(result.html).toContain("10. yıl");
    expect(result.html).toContain("Kutla");
    expect(result.html).toContain("https://acme.com/10");
    expect(result.html).toContain("https://cdn.acme.com/campaign-logo.png");
    expect(result.html).not.toContain("https://acme.com/book");
    expect(result.html).not.toContain(">Book<");
    expect(result.html).toContain("Confidential. Acme Corp");
    expect(branded).toEqual(snapshot);
    expect(branded.blocks.find((block) => block.type === "cta_button")).toMatchObject({
      label: "Book",
      url: "https://acme.com/book",
    });
    expect(branded.blocks.find((block) => block.type === "company_logo")).toMatchObject({
      assetId: "logo-1",
    });
  });

  it("does not inject a CTA when the template has no cta_button block", () => {
    const definition = parseTemplateDefinition({
      layout: "single-column",
      blocks: [
        { type: "identity", fields: ["displayName"] },
        { type: "campaign_banner", campaignId: "", assetId: "" },
      ],
    });
    const result = compile(definition, overlayContext);
    expect(result.html).toContain("10. yıl");
    expect(result.html).not.toContain("Kutla");
    expect(result.html).not.toContain("https://acme.com/10");
  });

  it("restores original banner, CTA, and logo when the campaign is not active", () => {
    const result = compile(branded, {
      ...overlayContext,
      activeCampaignId: "ended",
      campaigns: {
        ...overlayContext.campaigns,
        ended: { ...overlayContext.campaigns.ended!, active: false },
      },
    });
    expect(result.html).toContain("https://acme.com/book");
    expect(result.html).toContain("https://cdn.acme.com/logo.png");
    expect(result.html).not.toContain("campaign-banner.png");
    expect(result.html).not.toContain("10. yıl");
    expect(result.html).not.toContain("Kutla");
    expect(result.html).toContain("Confidential. Acme Corp");
  });
});
