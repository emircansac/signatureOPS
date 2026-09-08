import { describe, expect, it } from "vitest";
import { r2ApiEndpoint, r2S3ClientOptions, sanitizeR2AccountId, assertR2Endpoint } from "./r2-endpoint";

describe("sanitizeR2AccountId", () => {
  it("strips quotes and whitespace from env pastes", () => {
    expect(sanitizeR2AccountId('"abcdef0123456789abcdef0123456789"\n')).toBe(
      "abcdef0123456789abcdef0123456789",
    );
  });

  it("strips https and the r2 hostname suffix", () => {
    expect(sanitizeR2AccountId("https://abcdef0123456789abcdef0123456789.r2.cloudflarestorage.com")).toBe(
      "abcdef0123456789abcdef0123456789",
    );
  });

  it("keeps a jurisdiction prefix after stripping the hostname", () => {
    expect(
      sanitizeR2AccountId("https://abcdef0123456789abcdef0123456789.eu.r2.cloudflarestorage.com/"),
    ).toBe("abcdef0123456789abcdef0123456789.eu");
  });
});

describe("r2ApiEndpoint", () => {
  it("builds the default account endpoint", () => {
    expect(r2ApiEndpoint({ accountId: "abcdef0123456789abcdef0123456789" })).toBe(
      "https://abcdef0123456789abcdef0123456789.r2.cloudflarestorage.com",
    );
  });

  it("normalizes a pasted hostname into the same API URL", () => {
    const fromId = r2ApiEndpoint({ accountId: "abcdef0123456789abcdef0123456789" });
    const fromUrl = r2ApiEndpoint({
      accountId: "https://abcdef0123456789abcdef0123456789.r2.cloudflarestorage.com",
    });
    expect(fromUrl).toBe(fromId);
  });

  it("rejects a non-account-id value", () => {
    expect(() => assertR2Endpoint({ accountId: "signatureops-assets" })).toThrow("R2_ACCOUNT_ID_INVALID");
  });

  it("prefers an explicit endpoint", () => {
    expect(
      r2ApiEndpoint({
        accountId: "abcdef0123456789abcdef0123456789",
        endpoint: "https://abcdef0123456789abcdef0123456789.eu.r2.cloudflarestorage.com/",
      }),
    ).toBe("https://abcdef0123456789abcdef0123456789.eu.r2.cloudflarestorage.com");
  });
});

describe("r2S3ClientOptions", () => {
  it("forces path-style addressing", () => {
    const options = r2S3ClientOptions({
      R2_ACCOUNT_ID: "abcdef0123456789abcdef0123456789",
      R2_ACCESS_KEY_ID: "key",
      R2_SECRET_ACCESS_KEY: "secret",
    });
    expect(options.forcePathStyle).toBe(true);
    expect(options.requestChecksumCalculation).toBe("WHEN_REQUIRED");
    expect(options.endpoint).toBe("https://abcdef0123456789abcdef0123456789.r2.cloudflarestorage.com");
  });
});
