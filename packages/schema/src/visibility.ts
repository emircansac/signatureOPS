import type { UserContext } from "./context.js";

export type VisibilityContext = UserContext & {
  recipientType?: "internal" | "external";
  messageType?: "new" | "reply";
};

export function evaluateVisibleWhen(
  expression: string | undefined,
  context: VisibilityContext,
): boolean {
  if (!expression || expression.trim() === "") return true;

  const trimmed = expression.trim();

  if (trimmed === "recipient.internal") return context.recipientType === "internal";
  if (trimmed === "recipient.external") return context.recipientType === "external";
  if (trimmed === "message.new") return context.messageType === "new";
  if (trimmed === "message.reply") return context.messageType === "reply";

  const eqMatch = trimmed.match(/^(\w+(?:\.\w+)*)\s*==\s*["']?([^"']+)["']?$/);
  if (eqMatch) {
    const [, path, expected] = eqMatch;
    const actual = getPathValue(context, path ?? "");
    return actual === expected;
  }

  const existsMatch = trimmed.match(/^(\w+(?:\.\w+)*)\s+exists$/);
  if (existsMatch) {
    const path = existsMatch[1] ?? "";
    const val = getPathValue(context, path);
    return val != null && val !== "";
  }

  return true;
}

function getPathValue(obj: unknown, path: string): string | undefined {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  if (current == null) return undefined;
  return String(current);
}
