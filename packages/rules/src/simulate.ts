import { compile, resolveLogoAsset } from "@signatureops/compiler";
import { lintHtml } from "@signatureops/linter";
import type {
  CompileContext,
  TemplateDefinition,
} from "@signatureops/schema";
import { runRuleEngine, type SimulateRequest, type SimulateResult } from "./engine.js";

export type FullSimulateInput = SimulateRequest & {
  templates: Record<string, TemplateDefinition>;
  compileContext?: CompileContext;
  lintOptions?: Parameters<typeof lintHtml>[1];
  activeCampaignIdForTemplate?: Record<string, string>;
};

/**
 * Banner / CTA / logo: never inject a missing block — only override if the
 * template already has one (`activeCampaignId` overlay).
 *
 * Disclaimer: compliance exception. If the template already has a
 * `legal_disclaimer` block, override its text. If it has none, inject one so a
 * required legal notice can still appear.
 */
function applyDisclaimerOverlay(
  template: TemplateDefinition,
  selectedDisclaimer: string | undefined,
): TemplateDefinition {
  if (!selectedDisclaimer) return template;

  const hasDisclaimer = template.blocks.some((block) => block.type === "legal_disclaimer");
  if (hasDisclaimer) {
    return {
      ...template,
      blocks: template.blocks.map((block) =>
        block.type === "legal_disclaimer" ? { ...block, text: selectedDisclaimer } : block,
      ),
    };
  }

  return {
    ...template,
    blocks: [
      ...template.blocks,
      { type: "legal_disclaimer" as const, text: selectedDisclaimer, assetId: "" },
    ],
  };
}

function resolveActiveCampaignId(
  engineResult: SimulateResult,
  input: FullSimulateInput,
): string | undefined {
  if (!input.compileContext) return undefined;
  // Rule-engine banner is more specific than a template-wide active campaign.
  return (
    engineResult.selectedBanner ??
    (engineResult.selectedTemplateId
      ? (input.activeCampaignIdForTemplate?.[engineResult.selectedTemplateId] ??
        input.compileContext.activeCampaignId)
      : input.compileContext.activeCampaignId)
  );
}

export function simulate(input: FullSimulateInput): SimulateResult {
  const engineResult = runRuleEngine(input);

  if (!engineResult.selectedTemplateId || !input.compileContext) {
    return engineResult;
  }

  const template = input.templates[engineResult.selectedTemplateId];
  if (!template) {
    return {
      ...engineResult,
      missingData: [...engineResult.missingData, `template:${engineResult.selectedTemplateId}`],
    };
  }

  const definition = applyDisclaimerOverlay(template, engineResult.selectedDisclaimer);

  const compileContext = {
    ...input.compileContext,
    activeCampaignId: resolveActiveCampaignId(engineResult, input),
  };

  const compiled = compile(definition, compileContext, {
    hiddenBlocks: engineResult.actions.hiddenBlocks,
    visibility: {
      recipientType: input.context.recipientType,
      messageType: input.context.messageType,
    },
  });

  const logo = definition.blocks.find((block) => block.type === "company_logo");
  const approvedLogoFound =
    logo && logo.type === "company_logo"
      ? Boolean(resolveLogoAsset(logo, compileContext))
      : undefined;
  const hasLegalDisclaimerText = definition.blocks.some(
    (block) => block.type === "legal_disclaimer" && block.text.trim().length > 0,
  );

  const linted = lintHtml(compiled.html, {
    ...input.lintOptions,
    requiredDisclaimer: input.lintOptions?.requiredDisclaimer ?? true,
    hasLegalDisclaimerText,
    ...(approvedLogoFound === undefined ? {} : { approvedLogoFound }),
  });

  return {
    ...engineResult,
    renderedHtml: compiled.html,
    plainText: compiled.plainText,
    lintScore: linted.score,
  };
}
