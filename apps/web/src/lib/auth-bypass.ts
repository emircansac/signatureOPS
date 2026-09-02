/**
 * Temporary: skip Google login so the signature panel is reachable while we
 * design it. Restore the auth door by setting AUTH_BYPASS=false (or shipping
 * to production, where this is always off).
 */
export function isAuthBypassed(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  return process.env.AUTH_BYPASS !== "false";
}
