import type {
  CompileContext,
  TemplateDefinition,
  VisibilityContext,
} from "@signatureops/schema";
import { compileBlocks } from "./blocks.js";
import { stripHtml } from "./escape.js";

export type CompileVariant = "default" | "gmail" | "outlook";

export type CompileResult = {
  html: string;
  plainText: string;
  sizeBytes: number;
  variant: CompileVariant;
};

export type CompileOptions = {
  variant?: CompileVariant;
  visibility?: Partial<VisibilityContext>;
  hiddenBlocks?: string[];
};

function applyHiddenBlocks(
  definition: TemplateDefinition,
  hiddenBlocks: string[],
): TemplateDefinition {
  if (hiddenBlocks.length === 0) return definition;
  return {
    ...definition,
    blocks: definition.blocks.filter((b) => !hiddenBlocks.includes(b.type)),
  };
}

function wrapForVariant(html: string, variant: CompileVariant): string {
  if (variant === "gmail") {
    return `<!-- gmail -->\n${html}`;
  }
  if (variant === "outlook") {
    return `<!-- outlook -->\n${html}`;
  }
  return html;
}

export function compile(
  definition: TemplateDefinition,
  context: CompileContext,
  options: CompileOptions = {},
): CompileResult {
  const variant = options.variant ?? "default";
  const visibility: VisibilityContext = {
    ...context.user,
    recipientType: options.visibility?.recipientType,
    messageType: options.visibility?.messageType,
  };

  const filtered = applyHiddenBlocks(definition, options.hiddenBlocks ?? []);
  const html = wrapForVariant(compileBlocks(filtered, context, visibility), variant);
  const plainText = stripHtml(html);
  const sizeBytes = new TextEncoder().encode(html).length;

  return { html, plainText, sizeBytes, variant };
}

export function compileDeterministic(
  definition: TemplateDefinition,
  context: CompileContext,
  options: CompileOptions = {},
): CompileResult {
  return compile(definition, context, options);
}
