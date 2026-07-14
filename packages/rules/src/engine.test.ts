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
    campaigns: {},
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
});
