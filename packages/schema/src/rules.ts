import { z } from "zod";

export const RuleLevelSchema = z.enum(["USER", "GROUP", "DEPT_OFFICE", "ORG"]);
export type RuleLevel = z.infer<typeof RuleLevelSchema>;

export const ConditionTypeSchema = z.enum([
  "user",
  "group",
  "department",
  "office",
  "country",
  "brand",
  "job_title",
  "sending_alias",
  "message_type",
  "recipient_type",
  "campaign_active",
]);

export type ConditionType = z.infer<typeof ConditionTypeSchema>;

export const RuleConditionSchema = z.object({
  type: ConditionTypeSchema,
  operator: z.enum(["eq", "neq", "in", "not_in", "contains"]),
  value: z.union([z.string(), z.array(z.string()), z.boolean()]),
});

export type RuleCondition = z.infer<typeof RuleConditionSchema>;

export const RuleActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("select_template"), templateId: z.string() }),
  z.object({ type: z.literal("select_disclaimer"), text: z.string() }),
  z.object({ type: z.literal("select_banner"), campaignId: z.string() }),
  z.object({
    type: z.literal("hide_block"),
    blockType: z.string(),
  }),
  z.object({
    type: z.literal("show_block"),
    blockType: z.string(),
  }),
  z.object({
    type: z.literal("override_brand_asset"),
    assetId: z.string(),
  }),
]);

export type RuleAction = z.infer<typeof RuleActionSchema>;

export const RuleDefinitionSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  level: RuleLevelSchema,
  priority: z.number().int(),
  conditions: z.array(RuleConditionSchema),
  actions: z.array(RuleActionSchema).min(1),
  enabled: z.boolean().default(true),
});

export type RuleDefinition = z.infer<typeof RuleDefinitionSchema>;

export function parseRuleDefinition(input: unknown): RuleDefinition {
  return RuleDefinitionSchema.parse(input);
}

export function safeParseRuleDefinition(input: unknown) {
  return RuleDefinitionSchema.safeParse(input);
}
