import { describe, expect, it } from "vitest";
import { brandMediaUrl, r2ObjectKeyFromUrl } from "./media-url";

describe("brandMediaUrl", () => {
  it("prefixes the app origin so email clients can fetch the logo", () => {
    expect(brandMediaUrl("clogo1", "https://app.example.com")).toBe(
      "https://app.example.com/api/media/clogo1",
    );
  });
});

describe("r2ObjectKeyFromUrl", () => {
  it("strips the configured public base", () => {
    expect(
      r2ObjectKeyFromUrl("https://assets.example.com/org1/logo.png", {
        publicBase: "https://assets.example.com",
      }),
    ).toBe("org1/logo.png");
  });

  it("reads path-style S3 API URLs", () => {
    expect(
      r2ObjectKeyFromUrl(
        "https://abc.r2.cloudflarestorage.com/signatureops-assets/org1/logo.png",
        { bucket: "signatureops-assets" },
      ),
    ).toBe("org1/logo.png");
  });

  it("handles a public base that is actually the API host plus key", () => {
    expect(
      r2ObjectKeyFromUrl("https://abc.r2.cloudflarestorage.com/org1/logo.png", {
        publicBase: "https://abc.r2.cloudflarestorage.com",
        bucket: "signatureops-assets",
      }),
    ).toBe("org1/logo.png");
  });
});
