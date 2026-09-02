import {
  ConditionTypeSchema,
  RuleActionSchema,
  RuleConditionSchema,
  type ConditionType,
  type RuleAction,
  type RuleCondition,
  type RuleLevel,
} from "@signatureops/schema";

export const CONDITION_TYPES = ConditionTypeSchema.options;
export type { ConditionType };

export const RULE_LEVELS = ["USER", "GROUP", "DEPT_OFFICE", "ORG"] as const satisfies readonly RuleLevel[];

export const ACTION_TYPES = [
  "select_template",
  "select_disclaimer",
  "select_banner",
  "hide_block",
  "show_block",
  "override_brand_asset",
] as const;
export type ActionType = (typeof ACTION_TYPES)[number];

export const BLOCK_TYPES = [
  "identity",
  "contact_details",
  "company_logo",
  "profile_photo",
  "social_links",
  "cta_button",
  "campaign_banner",
  "legal_disclaimer",
  "certifications",
  "custom_text",
  "spacer",
  "divider",
] as const;
export type BlockType = (typeof BLOCK_TYPES)[number];

export type ConditionOperator = RuleCondition["operator"];

export type ConditionDraft = {
  key: string;
  type: ConditionType;
  operator: ConditionOperator;
  value: string | string[];
};

export type ActionDraft = {
  key: string;
  type: ActionType;
  templateId: string;
  text: string;
  campaignId: string;
  blockType: string;
  assetId: string;
};

export type RuleFormValue = {
  name: string;
  level: RuleLevel;
  priority: number;
  enabled: boolean;
  conditions: ConditionDraft[];
  actions: ActionDraft[];
};

let draftKey = 0;
export function nextDraftKey(prefix: string) {
  draftKey += 1;
  return `${prefix}-${draftKey}`;
}

export function operatorsFor(type: ConditionType): ConditionOperator[] {
  switch (type) {
    case "message_type":
    case "recipient_type":
      return ["eq", "neq"];
    case "user":
    case "group":
    case "campaign_active":
      return ["eq", "neq", "in", "not_in"];
    default:
      return ["eq", "neq", "contains", "in", "not_in"];
  }
}

export function isMultiValueOperator(operator: ConditionOperator): boolean {
  return operator === "in" || operator === "not_in";
}

export function defaultValueFor(type: ConditionType, operator: ConditionOperator): string | string[] {
  if (isMultiValueOperator(operator)) return [];
  if (type === "message_type") return "new";
  if (type === "recipient_type") return "external";
  return "";
}

export function emptyCondition(type: ConditionType = "department"): ConditionDraft {
  const operator = operatorsFor(type)[0] ?? "eq";
  return {
    key: nextDraftKey("cond"),
    type,
    operator,
    value: defaultValueFor(type, operator),
  };
}

export function emptyAction(type: ActionType = "select_template"): ActionDraft {
  return {
    key: nextDraftKey("act"),
    type,
    templateId: "",
    text: "",
    campaignId: "",
    blockType: "legal_disclaimer",
    assetId: "",
  };
}

export function coerceConditionValue(
  type: ConditionType,
  operator: ConditionOperator,
  previous: string | string[],
): string | string[] {
  const fallback = defaultValueFor(type, operator);
  if (isMultiValueOperator(operator)) {
    if (Array.isArray(previous)) return previous;
    return previous ? [previous] : [];
  }
  if (Array.isArray(previous)) return previous[0] ?? (typeof fallback === "string" ? fallback : "");
  if (type === "message_type" && previous !== "new" && previous !== "reply") return "new";
  if (type === "recipient_type" && previous !== "internal" && previous !== "external") {
    return "external";
  }
  return previous;
}

export function uniqueNonEmpty(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))].sort(
    (a, b) => a.localeCompare(b),
  );
}

export function parseJsonArray<T>(raw: string, fallback: T[]): T[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : fallback;
  } catch {
    return fallback;
  }
}

export function conditionFromStored(condition: unknown, key?: string): ConditionDraft {
  const parsed = RuleConditionSchema.parse(condition);
  const operator = operatorsFor(parsed.type).includes(parsed.operator)
    ? parsed.operator
    : (operatorsFor(parsed.type)[0] ?? "eq");
  let value: string | string[];
  if (typeof parsed.value === "boolean") {
    value = defaultValueFor(parsed.type, operator);
  } else if (Array.isArray(parsed.value)) {
    value = isMultiValueOperator(operator) ? parsed.value.map(String) : (parsed.value[0] ?? "");
  } else {
    value = isMultiValueOperator(operator) ? [String(parsed.value)] : String(parsed.value);
  }
  return {
    key: key ?? nextDraftKey("cond"),
    type: parsed.type,
    operator,
    value,
  };
}

export function actionFromStored(action: unknown, key?: string): ActionDraft {
  const parsed = RuleActionSchema.parse(action);
  const draft = emptyAction(parsed.type);
  if (key) draft.key = key;
  switch (parsed.type) {
    case "select_template":
      draft.templateId = parsed.templateId;
      break;
    case "select_disclaimer":
      draft.text = parsed.text;
      break;
    case "select_banner":
      draft.campaignId = parsed.campaignId;
      break;
    case "hide_block":
    case "show_block":
      draft.blockType = parsed.blockType;
      break;
    case "override_brand_asset":
      draft.assetId = parsed.assetId;
      break;
  }
  return draft;
}

export function ruleFormFromStored(input: {
  name: string;
  level: RuleLevel;
  priority: number;
  enabled: boolean;
  conditions: unknown;
  actions: unknown;
}): RuleFormValue {
  const conditions = Array.isArray(input.conditions)
    ? input.conditions.map((condition) => conditionFromStored(condition))
    : [];
  const actions = Array.isArray(input.actions) ? input.actions.map((action) => actionFromStored(action)) : [];
  return {
    name: input.name,
    level: input.level,
    priority: input.priority,
    enabled: input.enabled,
    conditions,
    actions: actions.length > 0 ? actions : [emptyAction()],
  };
}

export function emptyRuleForm(): RuleFormValue {
  return {
    name: "",
    level: "DEPT_OFFICE",
    priority: 50,
    enabled: true,
    conditions: [],
    actions: [emptyAction()],
  };
}

export function toStoredCondition(draft: ConditionDraft): RuleCondition {
  const value = isMultiValueOperator(draft.operator)
    ? (Array.isArray(draft.value) ? draft.value.map(String).filter(Boolean) : draft.value ? [String(draft.value)] : [])
    : Array.isArray(draft.value)
      ? (draft.value[0] ?? "")
      : String(draft.value);
  return RuleConditionSchema.parse({
    type: draft.type,
    operator: draft.operator,
    value,
  });
}

export function toStoredAction(draft: ActionDraft): RuleAction {
  switch (draft.type) {
    case "select_template":
      return RuleActionSchema.parse({ type: "select_template", templateId: draft.templateId });
    case "select_disclaimer":
      return RuleActionSchema.parse({ type: "select_disclaimer", text: draft.text });
    case "select_banner":
      return RuleActionSchema.parse({ type: "select_banner", campaignId: draft.campaignId });
    case "hide_block":
      return RuleActionSchema.parse({ type: "hide_block", blockType: draft.blockType });
    case "show_block":
      return RuleActionSchema.parse({ type: "show_block", blockType: draft.blockType });
    case "override_brand_asset":
      return RuleActionSchema.parse({ type: "override_brand_asset", assetId: draft.assetId });
  }
}

export type RuleFormIssue = "name" | "actions" | "actionValue" | "conditionValue";

export function validateRuleForm(form: RuleFormValue): RuleFormIssue | null {
  if (!form.name.trim()) return "name";
  if (form.actions.length === 0) return "actions";
  for (const condition of form.conditions) {
    const value = toStoredCondition(condition).value;
    if (Array.isArray(value) ? value.length === 0 : String(value).trim().length === 0) {
      return "conditionValue";
    }
  }
  for (const action of form.actions) {
    try {
      const stored = toStoredAction(action);
      if (stored.type === "select_template" && !stored.templateId.trim()) return "actionValue";
      if (stored.type === "select_disclaimer" && !stored.text.trim()) return "actionValue";
      if (stored.type === "select_banner" && !stored.campaignId.trim()) return "actionValue";
      if ((stored.type === "hide_block" || stored.type === "show_block") && !stored.blockType.trim()) {
        return "actionValue";
      }
      if (stored.type === "override_brand_asset" && !stored.assetId.trim()) return "actionValue";
    } catch {
      return "actionValue";
    }
  }
  return null;
}

export function toRulePayload(form: RuleFormValue) {
  return {
    name: form.name.trim(),
    level: form.level,
    priority: form.priority,
    enabled: form.enabled,
    conditions: form.conditions.map(toStoredCondition),
    actions: form.actions.map(toStoredAction),
  };
}
