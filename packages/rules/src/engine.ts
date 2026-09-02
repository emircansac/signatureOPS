import type { RuleCondition, RuleDefinition, RuleLevel } from "@signatureops/schema";

export type SimulationUser = {
  id: string;
  displayName: string;
  email: string;
  jobTitle?: string;
  department?: string;
  country?: string;
  groupIds?: string[];
  sendAsAliases?: string[];
  attributes?: Record<string, string>;
};

export type SimulationContext = {
  user: SimulationUser;
  sendingAlias?: string;
  messageType: "new" | "reply";
  recipientType: "internal" | "external";
  at: Date;
  office?: string;
  brand?: string;
  /** Campaign IDs whose status is active in the org timezone. */
  activeCampaignIds?: string[];
};

export const EXCLUSIVE_ACTION_AXES = [
  "select_template",
  "select_disclaimer",
  "select_banner",
  "override_brand_asset",
] as const;
export type ExclusiveActionAxis = (typeof EXCLUSIVE_ACTION_AXES)[number];
export type ActionAxis = ExclusiveActionAxis | "hide_block" | "show_block";

export type ExplanationStep = {
  ruleId: string;
  ruleName: string;
  level: RuleLevel;
  priority: number;
  matched: boolean;
  excluded: boolean;
  reason: string;
  wonAxes: ActionAxis[];
  excludedAxes: ActionAxis[];
};

export type RuleConflict = {
  level: RuleLevel;
  ruleIds: string[];
  message: string;
  axis?: ActionAxis;
};

export type SimulationActions = {
  templateId?: string;
  disclaimer?: string;
  bannerCampaignId?: string;
  hiddenBlocks: string[];
  brandAssetId?: string;
};

export type SimulateRequest = {
  context: SimulationContext;
  rules: RuleDefinition[];
  defaultTemplateId?: string;
};

export type SimulateResult = {
  selectedTemplateId?: string;
  selectedBanner?: string;
  selectedDisclaimer?: string;
  rulesEvaluated: ExplanationStep[];
  rulesMatched: string[];
  rulesExcluded: string[];
  winningRule?: string;
  conflicts: RuleConflict[];
  missingData: string[];
  actions: SimulationActions;
  renderedHtml?: string;
  plainText?: string;
  lintScore?: number;
};

const LEVEL_ORDER: RuleLevel[] = ["USER", "GROUP", "DEPT_OFFICE", "ORG"];

export function evaluateCondition(
  condition: RuleCondition,
  ctx: SimulationContext,
): boolean {
  const { user } = ctx;

  switch (condition.type) {
    case "user":
      return matchString(user.id, condition.operator, condition.value);
    case "group":
      return matchArray(user.groupIds ?? [], condition.operator, condition.value);
    case "department":
      return matchString(user.department ?? "", condition.operator, condition.value);
    case "office":
      return matchString(ctx.office ?? "", condition.operator, condition.value);
    case "country":
      return matchString(user.country ?? "", condition.operator, condition.value);
    case "brand":
      return matchString(ctx.brand ?? "", condition.operator, condition.value);
    case "job_title":
      return matchString(user.jobTitle ?? "", condition.operator, condition.value);
    case "sending_alias":
      return matchString(ctx.sendingAlias ?? user.email, condition.operator, condition.value);
    case "message_type":
      return matchString(ctx.messageType, condition.operator, condition.value);
    case "recipient_type":
      return matchString(ctx.recipientType, condition.operator, condition.value);
    case "campaign_active":
      return matchArray(ctx.activeCampaignIds ?? [], condition.operator, condition.value);
    default:
      return false;
  }
}

function matchString(
  actual: string,
  operator: RuleCondition["operator"],
  expected: RuleCondition["value"],
): boolean {
  if (typeof expected === "boolean") return false;
  if (Array.isArray(expected)) {
    if (operator === "in") return expected.includes(actual);
    if (operator === "not_in") return !expected.includes(actual);
    return false;
  }
  const exp = String(expected);
  switch (operator) {
    case "eq":
      return actual === exp;
    case "neq":
      return actual !== exp;
    case "contains":
      return actual.toLowerCase().includes(exp.toLowerCase());
    default:
      return false;
  }
}

function matchArray(
  actual: string[],
  operator: RuleCondition["operator"],
  expected: RuleCondition["value"],
): boolean {
  if (typeof expected === "boolean") return false;
  const values = Array.isArray(expected) ? expected : [String(expected)];
  if (operator === "in" || operator === "eq") return values.some((v) => actual.includes(v));
  if (operator === "not_in" || operator === "neq") return !values.some((v) => actual.includes(v));
  return false;
}

export function ruleMatches(rule: RuleDefinition, ctx: SimulationContext): boolean {
  if (!rule.enabled) return false;
  if (rule.conditions.length === 0) return true;
  return rule.conditions.every((c) => evaluateCondition(c, ctx));
}

export function sortRulesByPrecedence(rules: RuleDefinition[]): RuleDefinition[] {
  return [...rules].sort((a, b) => {
    const levelDiff = LEVEL_ORDER.indexOf(a.level) - LEVEL_ORDER.indexOf(b.level);
    if (levelDiff !== 0) return levelDiff;
    return a.priority - b.priority;
  });
}

export function applyActions(
  actions: SimulationActions,
  ruleActions: RuleDefinition["actions"],
): SimulationActions {
  const result = { ...actions, hiddenBlocks: [...actions.hiddenBlocks] };

  for (const action of ruleActions) {
    switch (action.type) {
      case "select_template":
        result.templateId = action.templateId;
        break;
      case "select_disclaimer":
        result.disclaimer = action.text;
        break;
      case "select_banner":
        result.bannerCampaignId = action.campaignId;
        break;
      case "hide_block":
        if (!result.hiddenBlocks.includes(action.blockType)) {
          result.hiddenBlocks.push(action.blockType);
        }
        break;
      case "show_block":
        result.hiddenBlocks = result.hiddenBlocks.filter((b) => b !== action.blockType);
        break;
      case "override_brand_asset":
        result.brandAssetId = action.assetId;
        break;
    }
  }

  return result;
}

export function detectMissingData(ctx: SimulationContext, rules: RuleDefinition[] = []): string[] {
  const missing: string[] = [];
  if (!ctx.user.displayName) missing.push("user.displayName");
  if (!ctx.user.email) missing.push("user.email");
  if (!ctx.user.jobTitle) missing.push("user.jobTitle");
  if (!ctx.user.department) missing.push("user.department");
  if (!ctx.user.country) missing.push("user.country");

  const conditionTypes = new Set(rules.flatMap((rule) => rule.conditions.map((c) => c.type)));
  if (conditionTypes.has("office") && !ctx.office) missing.push("office");
  if (conditionTypes.has("brand") && !ctx.brand) missing.push("brand");
  return missing;
}

function hasActionType(rule: RuleDefinition, type: ActionAxis): boolean {
  return rule.actions.some((action) => action.type === type);
}

function isExclusiveAxis(axis: string): axis is ExclusiveActionAxis {
  return (EXCLUSIVE_ACTION_AXES as readonly string[]).includes(axis);
}

export function runRuleEngine(request: SimulateRequest): SimulateResult {
  const sorted = sortRulesByPrecedence(request.rules);
  const steps: ExplanationStep[] = [];
  const matched: string[] = [];
  const excluded: string[] = [];
  const conflicts: RuleConflict[] = [];
  const matchedRules: RuleDefinition[] = [];

  let actions: SimulationActions = {
    templateId: request.defaultTemplateId,
    hiddenBlocks: [],
  };

  for (const rule of sorted) {
    const isMatch = ruleMatches(rule, request.context);
    const step: ExplanationStep = {
      ruleId: rule.id,
      ruleName: rule.name,
      level: rule.level,
      priority: rule.priority,
      matched: isMatch,
      excluded: !isMatch,
      reason: isMatch
        ? `All ${rule.conditions.length} condition(s) satisfied`
        : `Excluded: conditions not met`,
      wonAxes: [],
      excludedAxes: [],
    };

    if (isMatch) {
      matched.push(rule.id);
      matchedRules.push(rule);
    } else {
      excluded.push(rule.id);
    }

    steps.push(step);
  }

  const stepById = new Map(steps.map((step) => [step.ruleId, step]));

  for (const axis of EXCLUSIVE_ACTION_AXES) {
    let winner: RuleDefinition | undefined;
    for (const level of LEVEL_ORDER) {
      const candidates = matchedRules.filter((rule) => rule.level === level && hasActionType(rule, axis));
      if (candidates.length === 0) continue;
      if (candidates.length > 1) {
        conflicts.push({
          level,
          axis,
          ruleIds: candidates.map((rule) => rule.id),
          message: `Multiple rules matched at ${level} level on ${axis} — highest priority (${candidates[0]!.priority}) wins`,
        });
      }
      winner = candidates[0];
      break;
    }
    if (!winner) continue;

    actions = applyActions(
      actions,
      winner.actions.filter((action) => action.type === axis),
    );

    const winnerStep = stepById.get(winner.id);
    if (winnerStep && !winnerStep.wonAxes.includes(axis)) {
      winnerStep.wonAxes.push(axis);
    }

    for (const rule of matchedRules) {
      if (rule.id === winner.id || !hasActionType(rule, axis)) continue;
      const step = stepById.get(rule.id);
      if (!step) continue;
      if (!step.excludedAxes.includes(axis)) step.excludedAxes.push(axis);
      step.reason =
        rule.level === winner.level
          ? `Excluded: lower priority within ${rule.level} level`
          : `Excluded: lower precedence than ${winner.level} winner`;
    }
  }

  for (const rule of [...matchedRules].reverse()) {
    const visibility = rule.actions.filter(
      (action) => action.type === "hide_block" || action.type === "show_block",
    );
    if (visibility.length === 0) continue;
    actions = applyActions(actions, visibility);
    const step = stepById.get(rule.id);
    if (!step) continue;
    for (const action of visibility) {
      if (!step.wonAxes.includes(action.type)) step.wonAxes.push(action.type);
    }
  }

  for (const step of steps) {
    if (!step.matched) continue;
    if (step.wonAxes.length > 0) {
      step.excluded = false;
      step.reason =
        step.excludedAxes.length > 0
          ? `Won ${step.wonAxes.join(", ")}; excluded from ${step.excludedAxes.join(", ")}: lower precedence`
          : `Won ${step.wonAxes.join(", ")}`;
    } else if (step.excludedAxes.length > 0) {
      step.excluded = true;
      if (!step.reason.includes("lower precedence") && !step.reason.includes("lower priority")) {
        step.reason = `Excluded: lower precedence than more specific winner`;
      }
    }
  }

  const exclusiveWinners = steps
    .filter((step) => step.matched && step.wonAxes.some((axis) => isExclusiveAxis(axis)))
    .sort((a, b) => {
      const levelDiff = LEVEL_ORDER.indexOf(a.level) - LEVEL_ORDER.indexOf(b.level);
      if (levelDiff !== 0) return levelDiff;
      return a.priority - b.priority;
    });

  return {
    selectedTemplateId: actions.templateId,
    selectedBanner: actions.bannerCampaignId,
    selectedDisclaimer: actions.disclaimer,
    rulesEvaluated: steps,
    rulesMatched: matched,
    rulesExcluded: excluded,
    winningRule: exclusiveWinners[0]?.ruleId,
    conflicts,
    missingData: detectMissingData(request.context, request.rules),
    actions,
  };
}
