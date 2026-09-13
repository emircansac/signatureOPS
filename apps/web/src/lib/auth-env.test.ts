import { describe, expect, it } from "vitest";
import { sanitizeAuthEnv } from "./auth-env";

describe("sanitizeAuthEnv", () => {
  it("drops localhost AUTH_URL on Vercel so Auth.js can trust the request host", () => {
    const env: NodeJS.ProcessEnv = {
      VERCEL: "1",
      AUTH_URL: "http://localhost:3000",
      NEXTAUTH_URL: "http://localhost:3000",
    };
    sanitizeAuthEnv(env);
    expect(env.AUTH_URL).toBeUndefined();
    expect(env.NEXTAUTH_URL).toBeUndefined();
    expect(env.AUTH_TRUST_HOST).toBe("true");
  });

  it("keeps a public AUTH_URL", () => {
    const env: NodeJS.ProcessEnv = {
      VERCEL: "1",
      AUTH_URL: "https://signature-ops-web-xi.vercel.app",
    };
    sanitizeAuthEnv(env);
    expect(env.AUTH_URL).toBe("https://signature-ops-web-xi.vercel.app");
  });

  it("does not invent AUTH_URL from VERCEL_URL", () => {
    const env: NodeJS.ProcessEnv = {
      VERCEL: "1",
      VERCEL_URL: "signature-ops-abc123.vercel.app",
      VERCEL_PROJECT_PRODUCTION_URL: "signature-ops-web-xi.vercel.app",
    };
    sanitizeAuthEnv(env);
    expect(env.AUTH_URL).toBeUndefined();
    expect(env.AUTH_TRUST_HOST).toBe("true");
  });
});
