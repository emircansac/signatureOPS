import { describe, expect, it } from "vitest";
import {
  parseTemplateDefinition,
  safeParseTemplateDefinition,
  TemplateDefinitionSchema,
} from "./template.js";
import { parseRuleDefinition, safeParseRuleDefinition } from "./rules.js";
import {
  defaultPlaceholderResolver,
  extractPlaceholders,
  formatPhone,
  isKnownPlaceholder,
  resolvePlaceholders,
} from "./placeholders.js";
import { evaluateVisibleWhen } from "./visibility.js";
import type { UserContext } from "./context.js";

const sampleUser: UserContext = {
  user: {
    displayName: "Ayşe Yılmaz",
    jobTitle: "Sales Manager",
    department: "Sales",
    country: "TR",
    email: "ayse@acme.com",
    mobile: "5551234567",
  },
  organization: { name: "Acme Corp" },
  office: { address: "Istanbul, Turkey" },
  manager: { displayName: "Mehmet Demir" },
};

describe("TemplateDefinition", () => {
  const validTemplate = {
    layout: "single-column" as const,
    blocks: [
      { type: "identity" as const, fields: ["displayName", "jobTitle"] },
      { type: "contact_details" as const, fields: ["email", "mobile"] },
      { type: "company_logo" as const, assetId: "logo-1" },
      { type: "profile_photo" as const },
      { type: "social_links" as const, links: [{ network: "linkedin", url: "https://linkedin.com/in/ayse" }] },
      { type: "cta_button" as const, label: "Book a call", url: "https://acme.com/book" },
      { type: "campaign_banner" as const, campaignId: "camp-1" },
      { type: "legal_disclaimer" as const, text: "Confidential" },
      { type: "certifications" as const, items: ["ISO 27001"] },
      { type: "custom_text" as const, text: "Hello" },
      { type: "spacer" as const },
      { type: "divider" as const },
    ],
  };

  it("parses all block variants", () => {
    const parsed = parseTemplateDefinition(validTemplate);
    expect(parsed.blocks).toHaveLength(12);
  });

  it("round-trips through Zod", () => {
    const parsed = parseTemplateDefinition(validTemplate);
    const again = TemplateDefinitionSchema.parse(parsed);
    expect(again).toEqual(parsed);
  });

  it("rejects invalid templates", () => {
    const result = safeParseTemplateDefinition({ layout: "bad", blocks: [] });
    expect(result.success).toBe(false);
  });

  it("rejects empty blocks array", () => {
    const result = safeParseTemplateDefinition({ layout: "single-column", blocks: [] });
    expect(result.success).toBe(false);
  });

  it("normalizes legacy logo and certifications blocks", () => {
    const parsed = parseTemplateDefinition({
      layout: "single-column",
      blocks: [
        { type: "company_logo", assetId: "logo-1", imageUrl: "https://old.example/x.png" },
        { type: "certifications", items: ["ISO 27001"] },
        { type: "campaign_banner", campaignId: "asset:banner-1" },
      ],
    });
    const logo = parsed.blocks[0];
    const certs = parsed.blocks[1];
    const banner = parsed.blocks[2];
    expect(logo?.type === "company_logo" && logo.logoVariant).toBe("default");
    expect(certs?.type === "certifications" && certs.assetIds).toEqual([]);
    expect(certs?.type === "certifications" && certs.migrationWarning).toMatch(/yeniden seçin/);
    expect(banner?.type === "campaign_banner" && banner.assetId).toBe("banner-1");
  });
});

describe("RuleDefinition", () => {
  const validRule = {
    id: "rule-1",
    name: "Sales External",
    level: "DEPT_OFFICE" as const,
    priority: 10,
    conditions: [
      { type: "department" as const, operator: "eq" as const, value: "Sales" },
      { type: "recipient_type" as const, operator: "eq" as const, value: "external" },
    ],
    actions: [{ type: "select_template" as const, templateId: "tpl-sales" }],
    enabled: true,
  };

  it("parses valid rules", () => {
    const parsed = parseRuleDefinition(validRule);
    expect(parsed.name).toBe("Sales External");
  });

  it("rejects invalid rules", () => {
    const result = safeParseRuleDefinition({ ...validRule, actions: [] });
    expect(result.success).toBe(false);
  });
});

describe("placeholders", () => {
  it("resolves known placeholders", () => {
    expect(defaultPlaceholderResolver("user.displayName", sampleUser)).toBe("Ayşe Yılmaz");
    expect(defaultPlaceholderResolver("organization.name", sampleUser)).toBe("Acme Corp");
  });

  it("formats phone numbers", () => {
    expect(formatPhone("5551234567")).toBe("(555) 123-4567");
  });

  it("resolves text with placeholders", () => {
    const result = resolvePlaceholders("{{user.displayName}} - {{user.jobTitle}}", sampleUser);
    expect(result).toBe("Ayşe Yılmaz - Sales Manager");
  });

  it("extracts placeholders from text", () => {
    expect(extractPlaceholders("Hi {{user.displayName}}")).toEqual(["user.displayName"]);
  });

  it("identifies known placeholders", () => {
    expect(isKnownPlaceholder("user.email")).toBe(true);
    expect(isKnownPlaceholder("unknown.field")).toBe(false);
  });
});

describe("visibility", () => {
  it("evaluates recipient conditions", () => {
    expect(
      evaluateVisibleWhen("recipient.external", { ...sampleUser, recipientType: "external" }),
    ).toBe(true);
    expect(
      evaluateVisibleWhen("recipient.internal", { ...sampleUser, recipientType: "external" }),
    ).toBe(false);
  });

  it("evaluates exists conditions", () => {
    expect(evaluateVisibleWhen("user.mobile exists", sampleUser)).toBe(true);
  });

  it("defaults to visible when no expression", () => {
    expect(evaluateVisibleWhen(undefined, sampleUser)).toBe(true);
  });
});
