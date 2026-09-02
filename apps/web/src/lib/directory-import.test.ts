import { describe, expect, it } from "vitest";
import {
  applyMapping,
  detectCsvDelimiter,
  isValidEmail,
  parseCsv,
  suggestMapping,
  validateImportRows,
} from "./directory-import";

describe("parseCsv", () => {
  it("reads comma-separated headers and rows", () => {
    const csv = "Full Name,Email,Job Title\nAda Lovelace,ada@example.com,Engineer\n";
    const parsed = parseCsv(csv);
    expect(parsed.headers).toEqual(["Full Name", "Email", "Job Title"]);
    expect(parsed.rows).toEqual([["Ada Lovelace", "ada@example.com", "Engineer"]]);
  });

  it("detects semicolon delimiters and quoted cells", () => {
    expect(detectCsvDelimiter("Ad;E-posta;Pozisyon")).toBe(";");
    const parsed = parseCsv('Ad;E-posta;Pozisyon\n"Yılmaz, Ayşe";ayse@acme.com;Satış');
    expect(parsed.headers).toEqual(["Ad", "E-posta", "Pozisyon"]);
    expect(parsed.rows[0]).toEqual(["Yılmaz, Ayşe", "ayse@acme.com", "Satış"]);
  });

  it("strips a UTF-8 BOM", () => {
    const parsed = parseCsv("\uFEFFEmail,Name\na@b.com,A");
    expect(parsed.headers[0]).toBe("Email");
  });
});

describe("suggestMapping", () => {
  it("maps similar English and Turkish headers", () => {
    const mapping = suggestMapping(["Email", "Full Name", "Job Title", "Phone", "Departman", "Ülke", "Photo"]);
    expect(mapping.email).toBe("Email");
    expect(mapping.displayName).toBe("Full Name");
    expect(mapping.jobTitle).toBe("Job Title");
    expect(mapping.mobile).toBe("Phone");
    expect(mapping.department).toBe("Departman");
    expect(mapping.country).toBe("Ülke");
    expect(mapping.photoUrl).toBe("Photo");
  });
});

describe("validateImportRows", () => {
  it("classifies missing required fields, invalid emails, duplicates, and upserts", () => {
    const mapping = suggestMapping(["Full Name", "Job Title", "Email", "Phone"]);
    const { rows } = parseCsv(
      [
        "Full Name,Job Title,Email,Phone",
        "New Person,Engineer,new@acme.com,5551112233",
        "Ayşe Yılmaz,Sales Manager,ayse@acme.com,5559990000",
        "Bad,Title,not-an-email,",
        ",Engineer,missing-name@acme.com,",
        "No Title,,nobody@acme.com,",
        "Dup,Engineer,new@acme.com,",
      ].join("\n"),
    );
    const mapped = applyMapping(["Full Name", "Job Title", "Email", "Phone"], rows, mapping);
    const preview = validateImportRows(mapped, ["ayse@acme.com"]);

    expect(preview.valid).toHaveLength(2);
    expect(preview.valid[0]?.action).toBe("create");
    expect(preview.valid[0]?.email).toBe("new@acme.com");
    expect(preview.valid[1]?.action).toBe("update");
    expect(preview.valid[1]?.email).toBe("ayse@acme.com");

    const byRow = Object.fromEntries(preview.errors.map((row) => [row.rowNumber, row.codes]));
    expect(byRow[4]).toContain("invalidEmail");
    expect(byRow[5]).toContain("missingName");
    expect(byRow[6]).toContain("missingTitle");
    expect(byRow[7]).toContain("duplicateEmail");
  });

  it("accepts a well-formed email", () => {
    expect(isValidEmail("ada@example.com")).toBe(true);
    expect(isValidEmail("ada")).toBe(false);
    expect(isValidEmail("ada@x")).toBe(false);
  });
});
