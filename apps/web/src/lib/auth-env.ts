const LOCAL_HOST_RE = /localhost|127\.0\.0\.1/i;

export function sanitizeAuthEnv(env: NodeJS.ProcessEnv = process.env): void {
  const authUrl = env.AUTH_URL ?? env.NEXTAUTH_URL;
  if (env.VERCEL && authUrl && LOCAL_HOST_RE.test(authUrl)) {
    delete env.AUTH_URL;
    delete env.NEXTAUTH_URL;
  }
  if (env.VERCEL && !(env.AUTH_URL ?? env.NEXTAUTH_URL)) {
    const host = env.VERCEL_PROJECT_PRODUCTION_URL || env.VERCEL_URL;
    if (host) {
      env.AUTH_URL = host.startsWith("https://") ? host : `https://${host}`;
    }
  }
  env.AUTH_TRUST_HOST = "true";
}

export function authSecret(env: NodeJS.ProcessEnv = process.env): string | undefined {
  const secret = env.AUTH_SECRET?.trim() || env.NEXTAUTH_SECRET?.trim();
  return secret || undefined;
}

export function googleAuthCredentials(
  env: NodeJS.ProcessEnv = process.env,
): { clientId: string; clientSecret: string } | null {
  const clientId = env.GOOGLE_CLIENT_ID?.trim() ?? "";
  const clientSecret = env.GOOGLE_CLIENT_SECRET?.trim() ?? "";
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}
