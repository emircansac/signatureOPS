import { compile } from "@signatureops/compiler";
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
};

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

  let definition = { ...template };
  if (engineResult.selectedDisclaimer) {
    definition = {
      ...definition,
      blocks: [
        ...definition.blocks,
        { type: "legal_disclaimer" as const, text: engineResult.selectedDisclaimer },
      ],
    };
  }
  if (engineResult.selectedBanner) {
    definition = {
      ...definition,
      blocks: [
        ...definition.blocks,
        {
          type: "campaign_banner" as const,
          campaignId: engineResult.selectedBanner,
        },
      ],
    };
  }

  const compiled = compile(definition, input.compileContext, {
    hiddenBlocks: engineResult.actions.hiddenBlocks,
    visibility: {
      recipientType: input.context.recipientType,
      messageType: input.context.messageType,
    },
  });

  const linted = lintHtml(compiled.html, input.lintOptions);

  return {
    ...engineResult,
    renderedHtml: compiled.html,
    plainText: compiled.plainText,
    lintScore: linted.score,
  };
}
