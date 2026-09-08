import { describe, expect, it } from "vitest";
import {
  applyMapping,
  detectCsvDelimiter,
  duplicateMappedHeaders,
  explainImportIssue,
  explainImportRow,
  IMPORT_TEMPLATE_EXAMPLE_ROWS,
  IMPORT_TEMPLATE_HEADERS,
  isValidEmail,
  mappingIsReady,
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
  it("maps the official Turkish template headers", () => {
    const mapping = suggestMapping([...IMPORT_TEMPLATE_HEADERS]);
    expect(mapping.firstName).toBe("Ad");
    expect(mapping.lastName).toBe("Soyad");
    expect(mapping.jobTitle).toBe("Pozisyon");
    expect(mapping.email).toBe("E-posta");
    expect(mapping.mobile).toBe("Mobil");
    expect(mapping.country).toBe("Ülke");
    expect(mapping.department).toBe("Departman");
    expect(mappingIsReady(mapping)).toBe(true);
  });

  it("maps similar English headers to a combined name column", () => {
    const mapping = suggestMapping(["Email", "Full Name", "Job Title", "Phone", "Departman", "Ülke"]);
    expect(mapping.email).toBe("Email");
    expect(mapping.displayName).toBe("Full Name");
    expect(mapping.jobTitle).toBe("Job Title");
    expect(mapping.mobile).toBe("Phone");
    expect(mapping.department).toBe("Departman");
    expect(mapping.country).toBe("Ülke");
    expect(mappingIsReady(mapping)).toBe(true);
  });
});

describe("mappingIsReady", () => {
  it("rejects the same file column mapped twice", () => {
    const mapping = suggestMapping(["Ad", "Soyad", "Pozisyon", "E-posta"]);
    mapping.lastName = "Ad";
    expect(duplicateMappedHeaders(mapping)).toEqual(["Ad"]);
    expect(mappingIsReady(mapping)).toBe(false);
  });
});

describe("validateImportRows", () => {
  it("accepts the official template example rows", () => {
    const mapping = suggestMapping([...IMPORT_TEMPLATE_HEADERS]);
    const mapped = applyMapping(
      [...IMPORT_TEMPLATE_HEADERS],
      IMPORT_TEMPLATE_EXAMPLE_ROWS.map((row) => [...row]),
      mapping,
    );
    const preview = validateImportRows(mapped, []);
    expect(preview.errors).toEqual([]);
    expect(preview.valid).toHaveLength(2);
    expect(preview.valid[0]?.displayName).toBe("Ayşe Yılmaz");
    expect(preview.valid[0]?.mobile).toBe("5531822664");
    expect(preview.valid[0]?.country).toBe("TR");
  });

  it("classifies missing required fields, invalid emails, duplicates, and upserts", () => {
    const mapping = suggestMapping(["Full Name", "Job Title", "Email", "Phone", "Ülke"]);
    const { rows } = parseCsv(
      [
        "Full Name,Job Title,Email,Phone,Ülke",
        "New Person,Engineer,new@acme.com,5551112233,TR",
        "Ayşe Yılmaz,Sales Manager,ayse@acme.com,5559990000,TR",
        "Bad,Title,not-an-email,,TR",
        ",Engineer,missing-name@acme.com,,TR",
        "No Title,,nobody@acme.com,,TR",
        "Dup Person,Engineer,new@acme.com,5551112233,TR",
        "OnlyFirst,Engineer,oneword@acme.com,,TR",
        "Has Phone,Engineer,nophone@acme.com,5531112233,",
      ].join("\n"),
    );
    const mapped = applyMapping(["Full Name", "Job Title", "Email", "Phone", "Ülke"], rows, mapping);
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
    expect(byRow[8]).toContain("missingLastName");
    expect(byRow[9]).toContain("missingCountryForMobile");

    const emailError = preview.errors.find((row) => row.rowNumber === 4);
    expect(explainImportRow(emailError!.issues, "tr")).toContain("not-an-email");
    const mobileError = preview.errors.find((row) => row.rowNumber === 9);
    expect(explainImportRow(mobileError!.issues, "tr")).toContain("5531112233");
  });

  it("explains the failing field and value", () => {
    expect(
      explainImportIssue({ code: "unknownCountry", field: "country", value: "XX" }, "tr"),
    ).toContain("XX");
  });

  it("accepts a well-formed email", () => {
    expect(isValidEmail("ada@example.com")).toBe(true);
    expect(isValidEmail("ada")).toBe(false);
    expect(isValidEmail("ada@x")).toBe(false);
  });
});
