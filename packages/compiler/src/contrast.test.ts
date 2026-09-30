import { describe, expect, it } from "vitest";
import { contrastTextColor, ctaForeground, parseHexRgb, relativeLuminance } from "./contrast.js";

describe("parseHexRgb", () => {
  it("parses six-digit and three-digit hex", () => {
    expect(parseHexRgb("#F6F4EF")).toEqual([246, 244, 239]);
    expect(parseHexRgb("#fff")).toEqual([255, 255, 255]);
  });

  it("rejects invalid values", () => {
    expect(parseHexRgb("white")).toBeNull();
    expect(parseHexRgb("#gg0000")).toBeNull();
  });
});

describe("contrastTextColor", () => {
  it("uses dark ink on paper / white / yellow fills", () => {
    expect(contrastTextColor("#F6F4EF")).toBe("#1C2B3A");
    expect(contrastTextColor("#ffffff")).toBe("#1C2B3A");
    expect(contrastTextColor("#FFF")).toBe("#1C2B3A");
    expect(contrastTextColor("#FFD60A")).toBe("#1C2B3A");
  });

  it("keeps white on dark brand fills", () => {
    expect(contrastTextColor("#1C2B3A")).toBe("#ffffff");
    expect(contrastTextColor("#A63D2F")).toBe("#ffffff");
    expect(contrastTextColor("#0066cc")).toBe("#ffffff");
  });

  it("falls back to white when the hex is unusable", () => {
    expect(contrastTextColor("not-a-color")).toBe("#ffffff");
  });
});

describe("ctaForeground", () => {
  it("adds a darkened border only on light fills", () => {
    const light = ctaForeground("#F6F4EF");
    expect(light.color).toBe("#1C2B3A");
    expect(light.border).toMatch(/^#[0-9a-f]{6}$/);
    expect(relativeLuminance(light.border!)).toBeLessThan(relativeLuminance("#F6F4EF")!);

    const dark = ctaForeground("#A63D2F");
    expect(dark.color).toBe("#ffffff");
    expect(dark.border).toBeNull();
  });
});
