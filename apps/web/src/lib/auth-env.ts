const LOCAL_HOST_RE = /localhost|127\.0\.0\.1/i;

/** Auth.js uses AUTH_URL over the request host. A localhost leftover or a
 * deployment-specific VERCEL_URL breaks Google callback cookies. */
export function sanitizeAuthEnv(env: NodeJS.ProcessEnv = process.env): void {
  const authUrl = env.AUTH_URL ?? env.NEXTAUTH_URL;
  if (env.VERCEL && authUrl && LOCAL_HOST_RE.test(authUrl)) {
    delete env.AUTH_URL;
    delete env.NEXTAUTH_URL;
  }
  env.AUTH_TRUST_HOST = "true";
}
