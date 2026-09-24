import { describe, expect, it } from "vitest";
import { emailDomain, isPublicEmailDomain, joinableEmailDomain, normalizeEmail } from "./email-domain";

describe("normalizeEmail", () => {
  it("trims and lowercases", () => {
    expect(normalizeEmail("  Ada@Acme.COM ")).toBe("ada@acme.com");
  });
});

describe("emailDomain", () => {
  it("reads the domain after the last @", () => {
    expect(emailDomain("ada@acme.com")).toBe("acme.com");
    expect(emailDomain("Ada@Acme.COM")).toBe("acme.com");
    expect(emailDomain("a@sales.acme.com")).toBe("sales.acme.com");
  });

  it("rejects incomplete addresses", () => {
    expect(emailDomain("")).toBeNull();
    expect(emailDomain("ada")).toBeNull();
    expect(emailDomain("ada@")).toBeNull();
    expect(emailDomain("@acme.com")).toBeNull();
    expect(emailDomain("ada@localhost")).toBeNull();
  });
});

describe("isPublicEmailDomain", () => {
  it("treats consumer mailboxes as public", () => {
    expect(isPublicEmailDomain("gmail.com")).toBe(true);
    expect(isPublicEmailDomain("Outlook.com")).toBe(true);
    expect(isPublicEmailDomain("hotmail.com.tr")).toBe(true);
  });

  it("leaves company domains joinable", () => {
    expect(isPublicEmailDomain("acme.com")).toBe(false);
    expect(isPublicEmailDomain("sirket.com.tr")).toBe(false);
  });
});

describe("joinableEmailDomain", () => {
  it("returns company domains and ignores public ones", () => {
    expect(joinableEmailDomain("ada@acme.com")).toBe("acme.com");
    expect(joinableEmailDomain("ada@gmail.com")).toBeNull();
    expect(joinableEmailDomain("ada@outlook.com")).toBeNull();
  });
});
