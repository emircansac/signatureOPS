import { describe, expect, it } from "vitest";
import {
  actionFromStored,
  coerceConditionValue,
  conditionFromStored,
  operatorsFor,
  ruleFormFromStored,
  toRulePayload,
  toStoredAction,
  toStoredCondition,
  validateRuleForm,
} from "./rule-form";

describe("operatorsFor", () => {
  it("limits message_type and recipient_type to eq/neq", () => {
    expect(operatorsFor("message_type")).toEqual(["eq", "neq"]);
    expect(operatorsFor("recipient_type")).toEqual(["eq", "neq"]);
  });

  it("allows in/not_in for department and campaign_active", () => {
    expect(operatorsFor("department")).toContain("contains");
    expect(operatorsFor("department")).toContain("in");
    expect(operatorsFor("campaign_active")).toEqual(["eq", "neq", "in", "not_in"]);
  });
});

describe("seed rules round-trip", () => {
  it("opens Org Default with no conditions", () => {
    const form = ruleFormFromStored({
      name: "Org Default",
      level: "ORG",
      priority: 100,
      enabled: true,
      conditions: [],
      actions: [{ type: "select_template", templateId: "tpl-default" }],
    });
    expect(form.conditions).toEqual([]);
    expect(form.actions[0]?.type).toBe("select_template");
    expect(toRulePayload(form).conditions).toEqual([]);
    expect(validateRuleForm(form)).toBeNull();
  });

  it("opens Sales External with two AND conditions", () => {
    const form = ruleFormFromStored({
      name: "Sales External",
      level: "DEPT_OFFICE",
      priority: 50,
      enabled: true,
      conditions: [
        { type: "department", operator: "eq", value: "Sales" },
        { type: "recipient_type", operator: "eq", value: "external" },
      ],
      actions: [{ type: "select_template", templateId: "tpl-sales" }],
    });
    expect(form.conditions).toHaveLength(2);
    expect(toRulePayload(form).conditions).toEqual([
      { type: "department", operator: "eq", value: "Sales" },
      { type: "recipient_type", operator: "eq", value: "external" },
    ]);
  });

  it("opens Ayşe Executive Override with template + disclaimer", () => {
    const form = ruleFormFromStored({
      name: "Ayşe Executive Override",
      level: "USER",
      priority: 10,
      enabled: true,
      conditions: [{ type: "user", operator: "eq", value: "user-ayse" }],
      actions: [
        { type: "select_template", templateId: "tpl-executive" },
        { type: "select_disclaimer", text: "Yönetici gizlilik bildirimi" },
      ],
    });
    expect(form.conditions[0]).toMatchObject({ type: "user", operator: "eq", value: "user-ayse" });
    expect(form.actions.map((action) => action.type)).toEqual(["select_template", "select_disclaimer"]);
    expect(toRulePayload(form).actions).toEqual([
      { type: "select_template", templateId: "tpl-executive" },
      { type: "select_disclaimer", text: "Yönetici gizlilik bildirimi" },
    ]);
  });

  it("opens Marketing Banner with group in + banner action", () => {
    const form = ruleFormFromStored({
      name: "Marketing Banner",
      level: "GROUP",
      priority: 20,
      enabled: true,
      conditions: [{ type: "group", operator: "in", value: ["grp-marketing"] }],
      actions: [{ type: "select_banner", campaignId: "camp-spring" }],
    });
    expect(form.conditions[0]?.value).toEqual(["grp-marketing"]);
    expect(toStoredCondition(form.conditions[0]!)).toEqual({
      type: "group",
      operator: "in",
      value: ["grp-marketing"],
    });
    expect(toStoredAction(form.actions[0]!)).toEqual({
      type: "select_banner",
      campaignId: "camp-spring",
    });
  });

  it("opens Internal Simplified hide_block", () => {
    const form = ruleFormFromStored({
      name: "Internal Simplified",
      level: "DEPT_OFFICE",
      priority: 60,
      enabled: true,
      conditions: [{ type: "recipient_type", operator: "eq", value: "internal" }],
      actions: [{ type: "hide_block", blockType: "legal_disclaimer" }],
    });
    expect(toRulePayload(form).actions).toEqual([{ type: "hide_block", blockType: "legal_disclaimer" }]);
    expect(validateRuleForm(form)).toBeNull();
  });
});

describe("coerceConditionValue", () => {
  it("wraps a scalar when switching to in", () => {
    expect(coerceConditionValue("department", "in", "Sales")).toEqual(["Sales"]);
  });

  it("unwraps an array when switching to eq", () => {
    expect(coerceConditionValue("department", "eq", ["Sales", "HR"])).toBe("Sales");
  });
});

describe("validateRuleForm", () => {
  it("requires a name and at least one complete action", () => {
    const form = ruleFormFromStored({
      name: "",
      level: "ORG",
      priority: 1,
      enabled: true,
      conditions: [],
      actions: [{ type: "select_template", templateId: "" }],
    });
    expect(validateRuleForm(form)).toBe("name");
    form.name = "X";
    expect(validateRuleForm(form)).toBe("actionValue");
  });
});

describe("stored parsers", () => {
  it("accepts override_brand_asset and show_block", () => {
    expect(actionFromStored({ type: "override_brand_asset", assetId: "asset-logo" }).assetId).toBe("asset-logo");
    expect(actionFromStored({ type: "show_block", blockType: "cta_button" }).blockType).toBe("cta_button");
  });

  it("normalizes campaign_active eq from a string", () => {
    const draft = conditionFromStored({ type: "campaign_active", operator: "eq", value: "camp-spring" });
    expect(draft.value).toBe("camp-spring");
  });
});
