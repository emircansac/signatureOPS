import { describe, expect, it } from "vitest";
import { displayBoxForSlot, fitInsideBox, fittedDisplaySize, fittedLogoSize, storageDisplayBoxForSlot } from "./display-fit.js";

describe("fitInsideBox", () => {
  it("scales a wide image down to the logo box", () => {
    expect(fitInsideBox(2000, 400, 120, 40)).toEqual({ width: 120, height: 24 });
  });

  it("does not upscale a small image", () => {
    expect(fitInsideBox(80, 20, 120, 40)).toEqual({ width: 80, height: 20 });
  });

  it("fits a square mark into 40×40", () => {
    expect(fitInsideBox(200, 200, 40, 40)).toEqual({ width: 40, height: 40 });
  });

  it("falls back to the box when source size is missing", () => {
    expect(fitInsideBox(0, 0, 120, 40)).toEqual({ width: 120, height: 40 });
  });
});

describe("displayBoxForSlot", () => {
  it("uses 120×40 for wordmarks and 40×40 for marks", () => {
    expect(displayBoxForSlot("logo")).toEqual({ width: 120, height: 40 });
    expect(displayBoxForSlot("logo_light")).toEqual({ width: 120, height: 40 });
    expect(displayBoxForSlot("logo_mark")).toEqual({ width: 40, height: 40 });
    expect(displayBoxForSlot("banner")).toEqual({ width: 400, height: 80 });
  });
});

describe("fittedDisplaySize", () => {
  it("clamps stored natural pixels to the slot box", () => {
    expect(fittedDisplaySize("logo", 2000, 400)).toEqual({ width: 120, height: 24 });
  });

  it("returns the box when dimensions are absent", () => {
    expect(fittedDisplaySize("logo")).toEqual({ width: 120, height: 40 });
  });
});

describe("fittedLogoSize", () => {
  it("keeps the small box without upscaling", () => {
    expect(fittedLogoSize("small", false, 80, 20)).toEqual({ width: 80, height: 20 });
    expect(fittedLogoSize("small", false, 2000, 400)).toEqual({ width: 120, height: 24 });
  });

  it("fills the large box and may upscale a stored small fit", () => {
    expect(fittedLogoSize("large", false, 2000, 400)).toEqual({ width: 180, height: 36 });
    expect(fittedLogoSize("large", false, 120, 24)).toEqual({ width: 180, height: 36 });
    expect(fittedLogoSize("large", true, 40, 40)).toEqual({ width: 60, height: 60 });
  });
});

describe("storageDisplayBoxForSlot", () => {
  it("stores enough pixels for the large signature size", () => {
    expect(storageDisplayBoxForSlot("logo")).toEqual({ width: 180, height: 60 });
    expect(storageDisplayBoxForSlot("logo_mark")).toEqual({ width: 60, height: 60 });
    expect(storageDisplayBoxForSlot("banner")).toEqual({ width: 400, height: 80 });
  });
});
