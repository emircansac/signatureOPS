import { describe, expect, it } from "vitest";
import { compileImageUrl, resolvePublicAssetUrl } from "./asset-url";

describe("compileImageUrl", () => {
  it("uses the stored CDN URL so Gmail does not round-trip through /api/media", () => {
    expect(
      compileImageUrl(
        { id: "banner1", url: "https://assets.example.com/org1/banner.png" },
        "https://app.example.com",
      ),
    ).toBe("https://assets.example.com/org1/banner.png");
  });

  it("absolutizes local uploads for compile", () => {
    expect(
      compileImageUrl({ id: "logo1", url: "/uploads/logo.png" }, "http://localhost:3000"),
    ).toBe("http://localhost:3000/uploads/logo.png");
  });

  it("falls back to the media proxy when the stored URL cannot be fetched directly", () => {
    expect(compileImageUrl({ id: "clogo1", url: "" }, "https://app.example.com")).toBe(
      "https://app.example.com/api/media/clogo1",
    );
  });
});

describe("resolvePublicAssetUrl", () => {
  it("keeps https URLs unchanged", () => {
    expect(resolvePublicAssetUrl("https://cdn.example.com/a.png")).toBe("https://cdn.example.com/a.png");
  });
});
