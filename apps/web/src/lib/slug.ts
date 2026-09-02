const RESERVED = new Set([
  "app",
  "giris",
  "onboarding",
  "api",
  "login",
  "signup",
  "templates",
  "assets",
  "audit",
  "directory",
  "campaigns",
  "rules",
  "simulate",
]);

export function slugify(input: string): string {
  const slug = input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return slug || "org";
}

export function isReservedSlug(slug: string): boolean {
  return RESERVED.has(slug);
}

export const SlugSchema = {
  min: 2,
  max: 48,
  pattern: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
};
