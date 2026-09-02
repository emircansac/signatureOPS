import { describe, expect, it } from "vitest";
import type { RuleDefinition } from "@signatureops/schema";
import { runRuleEngine, sortRulesByPrecedence } from "./engine.js";
import { simulate } from "./simulate.js";

const orgDefault: RuleDefinition = {
  id: "rule-org",
  name: "Org Default",
  level: "ORG",
  priority: 100,
  conditions: [],
  actions: [{ type: "select_template", templateId: "tpl-default" }],
  enabled: true,
};

const deptSales: RuleDefinition = {
  id: "rule-dept-sales",
  name: "Sales Department",
  level: "DEPT_OFFICE",
  priority: 50,
  conditions: [
    { type: "department", operator: "eq", value: "Sales" },
    { type: "recipient_type", operator: "eq", value: "external" },
  ],
  actions: [{ type: "select_template", templateId: "tpl-sales" }],
  enabled: true,
};

const userOverride: RuleDefinition = {
  id: "rule-user-ayse",
  name: "Ayşe Override",
  level: "USER",
  priority: 10,
  conditions: [{ type: "user", operator: "eq", value: "user-ayse" }],
  actions: [
    { type: "select_template", templateId: "tpl-executive" },
    { type: "select_disclaimer", text: "Executive confidential" },
  ],
  enabled: true,
};

const groupMarketing: RuleDefinition = {
  id: "rule-group-mkt",
  name: "Marketing Group",
  level: "GROUP",
  priority: 20,
  conditions: [{ type: "group", operator: "in", value: ["grp-marketing"] }],
  actions: [{ type: "select_banner", campaignId: "camp-spring" }],
  enabled: true,
};

const context = {
  user: {
    id: "user-ayse",
    displayName: "Ayşe Yılmaz",
    email: "ayse@acme.com",
    jobTitle: "Sales Manager",
    department: "Sales",
    country: "TR",
    groupIds: ["grp-marketing"],
    sendAsAliases: ["ayse@acme.com", "sales@acme.com"],
  },
  sendingAlias: "ayse@acme.com",
  messageType: "new" as const,
  recipientType: "external" as const,
  at: new Date("2026-03-15T10:00:00Z"),
};

describe("rule engine", () => {
  it("sorts by precedence level then priority", () => {
    const sorted = sortRulesByPrecedence([orgDefault, userOverride, deptSales]);
    expect(sorted[0]!.level).toBe("USER");
    expect(sorted[2]!.level).toBe("ORG");
  });

  it("user rule wins over dept and org", () => {
    const result = runRuleEngine({
      context,
      rules: [orgDefault, deptSales, userOverride, groupMarketing],
      defaultTemplateId: "tpl-default",
    });

    expect(result.winningRule).toBe("rule-user-ayse");
    expect(result.selectedTemplateId).toBe("tpl-executive");
    expect(result.selectedDisclaimer).toBe("Executive confidential");
    expect(result.selectedBanner).toBe("camp-spring");

    const userStep = result.rulesEvaluated.find((s) => s.ruleId === "rule-user-ayse");
    expect(userStep?.wonAxes).toEqual(["select_template", "select_disclaimer"]);
    expect(userStep?.excludedAxes).toEqual([]);
    expect(userStep?.excluded).toBe(false);

    const groupStep = result.rulesEvaluated.find((s) => s.ruleId === "rule-group-mkt");
    expect(groupStep?.wonAxes).toEqual(["select_banner"]);
    expect(groupStep?.excluded).toBe(false);
  });

  it("independent axes: user template override does not suppress group banner", () => {
    const result = runRuleEngine({
      context,
      rules: [orgDefault, deptSales, userOverride, groupMarketing],
      defaultTemplateId: "tpl-default",
    });
    expect(result.selectedTemplateId).toBe("tpl-executive");
    expect(result.selectedDisclaimer).toBe("Executive confidential");
    expect(result.selectedBanner).toBe("camp-spring");
  });

  it("emits explanation trace for every rule", () => {
    const result = runRuleEngine({
      context,
      rules: [orgDefault, deptSales, userOverride],
    });

    expect(result.rulesEvaluated).toHaveLength(3);
    expect(result.rulesEvaluated.every((s) => s.reason.length > 0)).toBe(true);
  });

  it("marks lower-priority matches as excluded within winning level", () => {
    const result = runRuleEngine({
      context: { ...context, user: { ...context.user, id: "user-other" } },
      rules: [orgDefault, deptSales],
    });

    expect(result.winningRule).toBe("rule-dept-sales");
    const orgStep = result.rulesEvaluated.find((s) => s.ruleId === "rule-org");
    expect(orgStep?.matched).toBe(true);
    expect(orgStep?.excluded).toBe(true);
    expect(orgStep?.reason).toContain("lower precedence");
  });

  it("detects missing data", () => {
    const result = runRuleEngine({
      context: {
        ...context,
        user: { id: "u1", displayName: "", email: "" },
      },
      rules: [orgDefault],
    });
    expect(result.missingData).toContain("user.displayName");
    expect(result.missingData).toContain("user.email");
    expect(result.missingData).toContain("user.country");
  });

  it("reports office and brand only when a rule actually uses them", () => {
    const officeRule: RuleDefinition = {
      ...orgDefault,
      id: "rule-office",
      conditions: [{ type: "office", operator: "eq", value: "Istanbul" }],
    };
    const withoutOffice = runRuleEngine({ context, rules: [orgDefault] });
    expect(withoutOffice.missingData).not.toContain("office");

    const withOffice = runRuleEngine({ context, rules: [officeRule] });
    expect(withOffice.missingData).toContain("office");
  });

  it("does not treat same-level rules on different axes as a conflict", () => {
    const groupTemplate: RuleDefinition = {
      id: "rule-group-tpl",
      name: "Marketing Template",
      level: "GROUP",
      priority: 21,
      conditions: [{ type: "group", operator: "in", value: ["grp-marketing"] }],
      actions: [{ type: "select_template", templateId: "tpl-mkt" }],
      enabled: true,
    };
    const result = runRuleEngine({
      context: { ...context, user: { ...context.user, id: "user-other" } },
      rules: [groupMarketing, groupTemplate],
    });
    expect(result.conflicts).toHaveLength(0);
    expect(result.selectedTemplateId).toBe("tpl-mkt");
    expect(result.selectedBanner).toBe("camp-spring");
  });

  it("reports a conflict only when the same axis collides at the same level", () => {
    const otherBanner: RuleDefinition = {
      id: "rule-group-banner-2",
      name: "Other Banner",
      level: "GROUP",
      priority: 30,
      conditions: [{ type: "group", operator: "in", value: ["grp-marketing"] }],
      actions: [{ type: "select_banner", campaignId: "camp-other" }],
      enabled: true,
    };
    const result = runRuleEngine({
      context: { ...context, user: { ...context.user, id: "user-other" } },
      rules: [groupMarketing, otherBanner],
    });
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0]?.axis).toBe("select_banner");
    expect(result.selectedBanner).toBe("camp-spring");
  });

  it("applies hide then show from general to specific", () => {
    const orgHide: RuleDefinition = {
      id: "rule-org-hide",
      name: "Org hide banner",
      level: "ORG",
      priority: 100,
      conditions: [],
      actions: [{ type: "hide_block", blockType: "campaign_banner" }],
      enabled: true,
    };
    const userShow: RuleDefinition = {
      id: "rule-user-show",
      name: "User show banner",
      level: "USER",
      priority: 10,
      conditions: [{ type: "user", operator: "eq", value: "user-ayse" }],
      actions: [{ type: "show_block", blockType: "campaign_banner" }],
      enabled: true,
    };

    const hidden = runRuleEngine({ context, rules: [orgHide] });
    expect(hidden.actions.hiddenBlocks).toContain("campaign_banner");

    const shown = runRuleEngine({ context, rules: [orgHide, userShow] });
    expect(shown.actions.hiddenBlocks).not.toContain("campaign_banner");
    expect(shown.rulesEvaluated.find((s) => s.ruleId === "rule-org-hide")?.wonAxes).toContain("hide_block");
    expect(shown.rulesEvaluated.find((s) => s.ruleId === "rule-user-show")?.wonAxes).toContain("show_block");
  });

  it("campaign_active matches live campaign ids, not a static boolean", () => {
    const campaignRule: RuleDefinition = {
      id: "rule-camp",
      name: "Spring if active",
      level: "ORG",
      priority: 80,
      conditions: [{ type: "campaign_active", operator: "eq", value: "camp-spring" }],
      actions: [{ type: "select_banner", campaignId: "camp-spring" }],
      enabled: true,
    };

    const inactive = runRuleEngine({
      context: { ...context, activeCampaignIds: [] },
      rules: [campaignRule],
    });
    expect(inactive.selectedBanner).toBeUndefined();
    expect(inactive.rulesEvaluated[0]?.matched).toBe(false);

    const active = runRuleEngine({
      context: { ...context, activeCampaignIds: ["camp-spring"] },
      rules: [campaignRule],
    });
    expect(active.selectedBanner).toBe("camp-spring");
    expect(active.rulesEvaluated[0]?.matched).toBe(true);
  });
});

describe("simulate", () => {
  const templates = {
    "tpl-executive": {
      layout: "single-column" as const,
      blocks: [
        { type: "identity" as const, fields: ["displayName", "jobTitle"] },
        { type: "contact_details" as const, fields: ["email"] },
      ],
    },
  };

  const compileContext = {
    user: {
      user: {
        displayName: "Ayşe Yılmaz",
        jobTitle: "Sales Manager",
        email: "ayse@acme.com",
      },
      organization: { name: "Acme Corp" },
    },
    assets: {},
    campaigns: {
      "camp-spring": {
        id: "camp-spring",
        bannerUrl: "https://cdn.acme.com/campaign-banner.png",
        width: 400,
        height: 80,
      },
      "camp-existing": {
        id: "camp-existing",
        bannerUrl: "https://cdn.acme.com/existing-banner.png",
        width: 400,
        height: 80,
      },
    },
  };

  it("renders HTML via compiler", () => {
    const result = simulate({
      context,
      rules: [userOverride],
      templates,
      compileContext,
    });

    expect(result.renderedHtml).toContain("Ayşe Yılmaz");
    expect(result.plainText).toBeTruthy();
    expect(result.lintScore).toBeGreaterThan(0);
  });

  it("does not duplicate banner when template already has campaign_banner block", () => {
    const templateWithBanner = {
      layout: "single-column" as const,
      blocks: [
        { type: "identity" as const, fields: ["displayName"] },
        { type: "campaign_banner" as const, campaignId: "camp-existing", assetId: "asset-banner-1" },
      ],
    };
    const result = simulate({
      context,
      rules: [groupMarketing],
      templates: { "tpl-x": templateWithBanner },
      defaultTemplateId: "tpl-x",
      compileContext,
      activeCampaignIdForTemplate: { "tpl-x": "camp-existing" },
    });
    const bannerOccurrences = (result.renderedHtml?.match(/campaign-banner/g) ?? []).length;
    expect(bannerOccurrences).toBe(1);
    expect((result.renderedHtml?.match(/alt="Campaign banner"/g) ?? []).length).toBe(1);
    expect(result.renderedHtml).not.toContain("existing-banner.png");
  });

  it("does not add banner block when template has none", () => {
    const templateWithoutBanner = {
      layout: "single-column" as const,
      blocks: [{ type: "identity" as const, fields: ["displayName"] }],
    };
    const result = simulate({
      context,
      rules: [groupMarketing],
      templates: { "tpl-y": templateWithoutBanner },
      defaultTemplateId: "tpl-y",
      compileContext,
    });
    expect(result.selectedBanner).toBe("camp-spring");
    expect(result.renderedHtml).not.toContain("campaign-banner");
    expect(result.renderedHtml).not.toContain("Campaign banner");
  });

  it("overrides an existing disclaimer instead of injecting a second block", () => {
    const templateWithDisclaimer = {
      layout: "single-column" as const,
      blocks: [
        { type: "identity" as const, fields: ["displayName"] },
        { type: "legal_disclaimer" as const, text: "Template disclaimer", assetId: "" },
      ],
    };
    const result = simulate({
      context,
      rules: [userOverride],
      templates: { "tpl-executive": templateWithDisclaimer },
      compileContext,
    });
    expect(result.renderedHtml).toContain("Executive confidential");
    expect(result.renderedHtml).not.toContain("Template disclaimer");
    expect((result.renderedHtml?.match(/Executive confidential/g) ?? []).length).toBe(1);
  });

  it("injects a disclaimer when the template has none", () => {
    const result = simulate({
      context,
      rules: [userOverride],
      templates,
      compileContext,
    });
    expect(result.renderedHtml).toContain("Executive confidential");
  });
});
