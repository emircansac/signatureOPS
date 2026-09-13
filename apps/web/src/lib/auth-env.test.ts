import { describe, expect, it } from "vitest";
import { authSecret, googleAuthCredentials, sanitizeAuthEnv } from "./auth-env";

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

  it("fills AUTH_URL from the Vercel host when unset", () => {
    const env: NodeJS.ProcessEnv = {
      VERCEL: "1",
      VERCEL_PROJECT_PRODUCTION_URL: "signature-ops-web-xi.vercel.app",
    };
    sanitizeAuthEnv(env);
    expect(env.AUTH_URL).toBe("https://signature-ops-web-xi.vercel.app");
  });
});

describe("auth credentials", () => {
  it("reads AUTH_SECRET or NEXTAUTH_SECRET", () => {
    expect(authSecret({ AUTH_SECRET: "  secret-value  " })).toBe("secret-value");
    expect(authSecret({ NEXTAUTH_SECRET: "legacy" })).toBe("legacy");
    expect(authSecret({})).toBeUndefined();
  });

  it("ignores blank Google credentials", () => {
    expect(googleAuthCredentials({ GOOGLE_CLIENT_ID: "", GOOGLE_CLIENT_SECRET: "x" })).toBeNull();
    expect(
      googleAuthCredentials({ GOOGLE_CLIENT_ID: "id", GOOGLE_CLIENT_SECRET: "secret" }),
    ).toEqual({ clientId: "id", clientSecret: "secret" });
  });
});
