import type { UserContext } from "./context.js";

const PLACEHOLDER_PATTERN = /\{\{([^}]+)\}\}/g;

const KNOWN_PATHS = new Set([
  "user.displayName",
  "user.jobTitle",
  "user.department",
  "user.country",
  "user.email",
  "user.mobile",
  "user.officePhone",
  "user.photoUrl",
  "organization.name",
  "office.address",
  "manager.displayName",
]);

export type PlaceholderResolver = (token: string, context: UserContext) => string;

function getNestedValue(obj: unknown, path: string): string | undefined {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  if (current == null) return undefined;
  return String(current);
}

export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return value;
}

export const defaultPlaceholderResolver: PlaceholderResolver = (token, context) => {
  const trimmed = token.trim();
  if (!KNOWN_PATHS.has(trimmed)) return "";

  const raw = getNestedValue(
    {
      user: context.user,
      organization: context.organization,
      office: context.office,
      manager: context.manager,
    },
    trimmed,
  );

  if (raw == null || raw === "") return "";

  if (trimmed === "user.mobile" || trimmed === "user.officePhone") {
    return formatPhone(raw);
  }

  if (trimmed === "user.email") {
    return raw;
  }

  return raw;
};

export function resolvePlaceholders(
  text: string,
  context: UserContext,
  resolver: PlaceholderResolver = defaultPlaceholderResolver,
): string {
  return text.replace(PLACEHOLDER_PATTERN, (_match, token: string) => resolver(token, context));
}

export function extractPlaceholders(text: string): string[] {
  const matches = [...text.matchAll(PLACEHOLDER_PATTERN)];
  return matches.map((m) => m[1]?.trim() ?? "").filter(Boolean);
}

export function isKnownPlaceholder(token: string): boolean {
  return KNOWN_PATHS.has(token.trim());
}
