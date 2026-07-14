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
};

export type ExplanationStep = {
  ruleId: string;
  ruleName: string;
  level: RuleLevel;
  priority: number;
  matched: boolean;
  excluded: boolean;
  reason: string;
};

export type RuleConflict = {
  level: RuleLevel;
  ruleIds: string[];
  message: string;
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
      return condition.value === true;
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
  if (operator === "in") return values.some((v) => actual.includes(v));
  if (operator === "not_in") return !values.some((v) => actual.includes(v));
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

export function detectMissingData(ctx: SimulationContext): string[] {
  const missing: string[] = [];
  if (!ctx.user.displayName) missing.push("user.displayName");
  if (!ctx.user.email) missing.push("user.email");
  if (!ctx.user.jobTitle) missing.push("user.jobTitle");
  if (!ctx.user.department) missing.push("user.department");
  return missing;
}

export function runRuleEngine(request: SimulateRequest): SimulateResult {
  const sorted = sortRulesByPrecedence(request.rules);
  const steps: ExplanationStep[] = [];
  const matched: string[] = [];
  const excluded: string[] = [];
  const conflicts: RuleConflict[] = [];

  let actions: SimulationActions = {
    templateId: request.defaultTemplateId,
    hiddenBlocks: [],
  };

  const matchedByLevel = new Map<RuleLevel, RuleDefinition[]>();

  for (const rule of sorted) {
    const isMatch = ruleMatches(rule, request.context);
    const step: ExplanationStep = {
      ruleId: rule.id,
      ruleName: rule.name,
      level: rule.level,
      priority: rule.priority,
      matched: isMatch,
      excluded: false,
      reason: isMatch
        ? `All ${rule.conditions.length} condition(s) satisfied`
        : `One or more conditions not satisfied`,
    };

    if (isMatch) {
      matched.push(rule.id);
      const levelRules = matchedByLevel.get(rule.level) ?? [];
      levelRules.push(rule);
      matchedByLevel.set(rule.level, levelRules);
    } else {
      excluded.push(rule.id);
      step.excluded = true;
      step.reason = `Excluded: conditions not met`;
    }

    steps.push(step);
  }

  let winningRule: RuleDefinition | undefined;
  let winningLevelIndex = -1;

  for (let i = 0; i < LEVEL_ORDER.length; i++) {
    const level = LEVEL_ORDER[i]!;
    const levelMatches = matchedByLevel.get(level);
    if (!levelMatches || levelMatches.length === 0) continue;

    if (levelMatches.length > 1) {
      conflicts.push({
        level,
        ruleIds: levelMatches.map((r) => r.id),
        message: `Multiple rules matched at ${level} level — highest priority (${levelMatches[0]!.priority}) wins`,
      });
    }

    const winner = levelMatches[0]!;
    winningRule = winner;
    winningLevelIndex = i;
    actions = applyActions(actions, winner.actions);

    for (const step of steps) {
      if (step.level === level && step.matched && step.ruleId !== winner.id) {
        step.excluded = true;
        step.reason = `Excluded: lower priority within ${level} level`;
      }
    }
    break;
  }

  if (winningLevelIndex >= 0) {
    for (const step of steps) {
      if (!step.matched || step.excluded) continue;
      const stepLevelIndex = LEVEL_ORDER.indexOf(step.level);
      if (stepLevelIndex > winningLevelIndex) {
        step.excluded = true;
        step.reason = `Excluded: lower precedence than ${LEVEL_ORDER[winningLevelIndex]} winner`;
      }
    }
  }

  return {
    selectedTemplateId: actions.templateId,
    selectedBanner: actions.bannerCampaignId,
    selectedDisclaimer: actions.disclaimer,
    rulesEvaluated: steps,
    rulesMatched: matched,
    rulesExcluded: excluded,
    winningRule: winningRule?.id,
    conflicts,
    missingData: detectMissingData(request.context),
    actions,
  };
}
