import { describe, expect, it } from "vitest";
import {
  callingCodeForCountry,
  formatPhone,
  normalizeNationalNumber,
  normalizeStoredCountry,
  phoneTelHref,
  resolveCountryCode,
} from "./phone.js";

describe("resolveCountryCode", () => {
  it("maps ISO codes and common names", () => {
    expect(resolveCountryCode("TR")).toBe("TR");
    expect(resolveCountryCode("Türkiye")).toBe("TR");
    expect(resolveCountryCode("Germany")).toBe("DE");
    expect(resolveCountryCode("UK")).toBe("GB");
  });
});

describe("normalizeNationalNumber", () => {
  it("keeps a local Turkish mobile", () => {
    expect(normalizeNationalNumber("5531822664", "TR")).toBe("5531822664");
  });

  it("strips +90, spaces, and a leading zero", () => {
    expect(normalizeNationalNumber("+90 553 182 2664", "TR")).toBe("5531822664");
    expect(normalizeNationalNumber("05531822664", "TR")).toBe("5531822664");
    expect(normalizeNationalNumber("905531822664", "TR")).toBe("5531822664");
  });
});

describe("formatPhone", () => {
  it("prefixes the calling code from the country", () => {
    expect(formatPhone("5531822664", "TR")).toBe("+90 553 182 2664");
    expect(formatPhone("5554445566", "US")).toBe("+1 555 444 5566");
    expect(formatPhone("1701234567", "DE")).toBe("+49 170 123 4567");
  });

  it("groups digits when the country is missing", () => {
    expect(formatPhone("5551234567")).toBe("555 123 4567");
  });
});

describe("phoneTelHref", () => {
  it("builds E.164 tel targets", () => {
    expect(phoneTelHref("5531822664", "TR")).toBe("+905531822664");
    expect(phoneTelHref("5554445566", "United States")).toBe("+15554445566");
  });
});

describe("callingCodeForCountry", () => {
  it("returns the dial code", () => {
    expect(callingCodeForCountry("TR")).toBe("90");
    expect(callingCodeForCountry("US")).toBe("1");
    expect(normalizeStoredCountry("Türkiye")).toBe("TR");
  });
});
