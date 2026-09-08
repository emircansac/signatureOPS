import { z } from "zod";

const optionalUrl = z
  .string()
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined));

const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z
    .string()
    .min(1)
    .default("postgresql://postgres:postgres@localhost:5432/signatureops"),
  AUTH_SECRET: z.string().min(16).optional(),
  AUTH_URL: optionalUrl,
  AUTH_TRUST_HOST: z.string().optional(),
  AUTH_BYPASS: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  NEXT_PUBLIC_APP_URL: z.string().default("http://localhost:3000"),
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET: z.string().optional(),
  R2_PUBLIC_BASE_URL: optionalUrl,
  R2_ENDPOINT: optionalUrl,
  R2_JURISDICTION: z.string().optional(),
  GOOGLE_SA_CLIENT_EMAIL: z.string().optional(),
  GOOGLE_SA_PRIVATE_KEY: z.string().optional(),
  GOOGLE_SA_CLIENT_ID: z.string().optional(),
  MICROSOFT_CLIENT_ID: z.string().optional(),
  MICROSOFT_CLIENT_SECRET: z.string().optional(),
  INNGEST_EVENT_KEY: z.string().optional(),
  INNGEST_SIGNING_KEY: z.string().optional(),
  SENTRY_DSN: optionalUrl,
  PORT: z.string().optional(),
});

export type ServerEnv = z.infer<typeof serverSchema>;

let cached: ServerEnv | undefined;

export function getServerEnv(): ServerEnv {
  if (cached) return cached;
  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Invalid environment: ${parsed.error.message}`);
  }
  const env = parsed.data;
  const isBuild = process.env.NEXT_PHASE === "phase-production-build";
  if (env.NODE_ENV === "production" && !isBuild) {
    const missing: string[] = [];
    if (!env.AUTH_SECRET) missing.push("AUTH_SECRET");
    if (!env.GOOGLE_CLIENT_ID) missing.push("GOOGLE_CLIENT_ID");
    if (!env.GOOGLE_CLIENT_SECRET) missing.push("GOOGLE_CLIENT_SECRET");
    if (!env.R2_ACCOUNT_ID || !env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY || !env.R2_BUCKET) {
      missing.push("R2_*");
    }
    if (!env.R2_PUBLIC_BASE_URL?.startsWith("https://")) missing.push("R2_PUBLIC_BASE_URL");
    if (!env.NEXT_PUBLIC_APP_URL.startsWith("https://") && !env.NEXT_PUBLIC_APP_URL.includes("localhost")) {
      missing.push("NEXT_PUBLIC_APP_URL");
    }
    if (missing.length) {
      throw new Error(`Production env missing: ${missing.join(", ")}`);
    }
  }
  cached = env;
  return env;
}

export function appBaseUrl(): string {
  return getServerEnv().NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
}

export function r2Configured(): boolean {
  const env = getServerEnv();
  return Boolean(
    env.R2_ACCOUNT_ID &&
      env.R2_ACCESS_KEY_ID &&
      env.R2_SECRET_ACCESS_KEY &&
      env.R2_BUCKET &&
      env.R2_PUBLIC_BASE_URL,
  );
}

export function googleWorkspaceConfigured(): boolean {
  const env = getServerEnv();
  return Boolean(env.GOOGLE_SA_CLIENT_EMAIL && env.GOOGLE_SA_PRIVATE_KEY);
}

export function microsoftGraphConfigured(): boolean {
  const env = getServerEnv();
  return Boolean(env.MICROSOFT_CLIENT_ID && env.MICROSOFT_CLIENT_SECRET);
}
