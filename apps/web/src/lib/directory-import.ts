import { joinDisplayName } from "./person-name";
import { normalizeNationalNumber, normalizeStoredCountry, resolveCountryCode } from "@signatureops/schema";

export const IMPORT_TEMPLATE_HEADERS = [
  "Ad",
  "Soyad",
  "Pozisyon",
  "E-posta",
  "Mobil",
  "Ülke",
  "Departman",
] as const;

export const IMPORT_TEMPLATE_EXAMPLE_ROWS: string[][] = [
  ["Ayşe", "Yılmaz", "Satış Müdürü", "ayse@ornek.com", "5531822664", "TR", "Satış"],
  ["Mehmet", "Demir", "Satış Direktörü", "mehmet@ornek.com", "5559876543", "TR", "Satış"],
];

export const DIRECTORY_FIELDS = [
  "firstName",
  "lastName",
  "jobTitle",
  "email",
  "mobile",
  "country",
  "department",
  "displayName",
] as const;

export type DirectoryField = (typeof DIRECTORY_FIELDS)[number];

export type ColumnMapping = Record<DirectoryField, string | null>;

export type MappedPersonRow = {
  rowNumber: number;
  displayName: string;
  jobTitle: string;
  email: string;
  mobile?: string;
  department?: string;
  country?: string;
};

export type ImportErrorCode =
  | "missingName"
  | "missingFirstName"
  | "missingLastName"
  | "missingTitle"
  | "missingEmail"
  | "missingCountryForMobile"
  | "invalidEmail"
  | "invalidMobile"
  | "unknownCountry"
  | "duplicateEmail";

export type ImportIssueField = "name" | "jobTitle" | "email" | "mobile" | "country";

export type ImportIssue = {
  code: ImportErrorCode;
  field: ImportIssueField;
  value: string;
};

export type ImportRowError = {
  rowNumber: number;
  issues: ImportIssue[];
  codes: ImportErrorCode[];
};

export type ValidatedImportRow = MappedPersonRow & {
  action: "create" | "update";
};

export type ImportPreview = {
  valid: ValidatedImportRow[];
  errors: ImportRowError[];
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const FIELD_ALIASES: Record<DirectoryField, string[]> = {
  firstName: ["first name", "firstname", "given name", "givenname", "isim", "ad"],
  lastName: ["last name", "lastname", "surname", "family name", "soyad", "soy isim"],
  displayName: [
    "full name",
    "fullname",
    "display name",
    "displayname",
    "ad soyad",
    "adsoyad",
    "name",
  ],
  jobTitle: [
    "job title",
    "jobtitle",
    "title",
    "pozisyon",
    "position",
    "unvan",
    "role",
  ],
  email: ["email", "e posta", "eposta", "mail", "e mail", "e-posta"],
  mobile: [
    "mobile",
    "mobil",
    "phone",
    "telefon",
    "tel",
    "cep",
    "cep telefonu",
    "phone number",
  ],
  department: ["department", "departman", "dept", "birim"],
  country: ["country", "ulke", "ulke kodu", "country code"],
};

export function normalizeHeader(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function headerMatchesAlias(normalized: string, alias: string): boolean {
  if (normalized === alias) return true;
  return alias.length >= 4 && normalized.includes(alias);
}

export function emptyColumnMapping(): ColumnMapping {
  return {
    firstName: null,
    lastName: null,
    jobTitle: null,
    email: null,
    mobile: null,
    country: null,
    department: null,
    displayName: null,
  };
}

export function suggestMapping(headers: string[]): ColumnMapping {
  const mapping = emptyColumnMapping();
  const used = new Set<string>();

  for (const field of DIRECTORY_FIELDS) {
    const aliases = FIELD_ALIASES[field];
    const match = headers.find((header) => {
      if (used.has(header)) return false;
      const normalized = normalizeHeader(header);
      if (!normalized) return false;
      return aliases.some((alias) => headerMatchesAlias(normalized, alias));
    });
    if (match) {
      mapping[field] = match;
      used.add(match);
    }
  }

  return mapping;
}

export function requiredFieldsMapped(mapping: ColumnMapping): boolean {
  const hasSplitName = Boolean(mapping.firstName && mapping.lastName);
  const hasFullName = Boolean(mapping.displayName);
  return (hasSplitName || hasFullName) && Boolean(mapping.jobTitle) && Boolean(mapping.email);
}

export function duplicateMappedHeaders(mapping: ColumnMapping): string[] {
  const counts = new Map<string, number>();
  for (const value of Object.values(mapping)) {
    if (!value) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()].filter(([, count]) => count > 1).map(([header]) => header);
}

export function mappingIsReady(mapping: ColumnMapping): boolean {
  return requiredFieldsMapped(mapping) && duplicateMappedHeaders(mapping).length === 0;
}

function cell(row: Record<string, string>, header: string | null): string | undefined {
  if (!header) return undefined;
  return row[header];
}

export function applyMapping(
  headers: string[],
  rows: string[][],
  mapping: ColumnMapping,
  headerRowNumber = 1,
): MappedPersonRow[] {
  return rows.map((values, index) => {
    const record: Record<string, string> = {};
    headers.forEach((header, i) => {
      record[header] = (values[i] ?? "").trim();
    });
    const firstName = cell(record, mapping.firstName) ?? "";
    const lastName = cell(record, mapping.lastName) ?? "";
    const combined = cell(record, mapping.displayName) ?? "";
    const displayName = firstName.trim() || lastName.trim()
      ? joinDisplayName(firstName, lastName)
      : combined;
    const mapped: MappedPersonRow = {
      rowNumber: headerRowNumber + 1 + index,
      displayName,
      jobTitle: cell(record, mapping.jobTitle) ?? "",
      email: cell(record, mapping.email) ?? "",
    };
    if (mapping.mobile) mapped.mobile = cell(record, mapping.mobile) ?? "";
    if (mapping.department) mapped.department = cell(record, mapping.department) ?? "";
    if (mapping.country) mapped.country = cell(record, mapping.country) ?? "";
    return mapped;
  });
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  const trimmed = email.trim();
  if (!trimmed) return false;
  return EMAIL_RE.test(trimmed) && !trimmed.includes(" ");
}

function issue(code: ImportErrorCode, field: ImportIssueField, value: string): ImportIssue {
  return { code, field, value: value.trim() };
}

const IMPORT_ERROR_EXPLAIN = {
  tr: {
    missingName: "Ad Soyad boş. Şablondaki Ad ve Soyad kolonlarını doldurun.",
    missingFirstName: "Ad kolonu boş.",
    missingLastName:
      "Soyad eksik. Hücrede yalnızca “{value}” var; Ad ve Soyad ayrı yazılmalı (ör. Ayşe / Yılmaz).",
    missingTitle: "Pozisyon kolonu boş.",
    missingEmail: "E-posta kolonu boş.",
    missingCountryForMobile:
      "Mobil dolu (“{value}”) ama Ülke boş. Ülke kolonuna TR, US veya DE yazın.",
    invalidEmail: "E-posta geçersiz: “{value}”. Örnek: ayse@ornek.com",
    invalidMobile:
      "Mobil geçersiz: “{value}”. Ülke kodu yazmadan 5531822664 gibi ulusal numara girin.",
    unknownCountry: "Ülke tanınmadı: “{value}”. TR, US, DE gibi kod kullanın.",
    duplicateEmail: "Bu e-posta dosyada birden fazla kez geçiyor: “{value}”.",
  },
  en: {
    missingName: "Full name is empty. Fill the First name and Last name columns.",
    missingFirstName: "First name is empty.",
    missingLastName:
      "Last name is missing. The cell only has “{value}”; put given and family names in separate columns.",
    missingTitle: "Title is empty.",
    missingEmail: "Email is empty.",
    missingCountryForMobile:
      "Mobile is filled (“{value}”) but Country is empty. Use TR, US, or DE in the country column.",
    invalidEmail: "Email is invalid: “{value}”. Example: ayse@ornek.com",
    invalidMobile:
      "Mobile is invalid: “{value}”. Enter the national number without a country code, e.g. 5531822664.",
    unknownCountry: "Unknown country: “{value}”. Use a code such as TR, US, or DE.",
    duplicateEmail: "This email appears more than once in the file: “{value}”.",
  },
} as const;

export function explainImportIssue(issue: ImportIssue, locale: "tr" | "en" = "tr"): string {
  const template = IMPORT_ERROR_EXPLAIN[locale][issue.code];
  const value = issue.value.trim() || (locale === "tr" ? "boş" : "empty");
  return template.replaceAll("{value}", value);
}

export function explainImportRow(issues: ImportIssue[], locale: "tr" | "en" = "tr"): string {
  return issues.map((item) => explainImportIssue(item, locale)).join(" ");
}

export function validateImportRows(
  rows: MappedPersonRow[],
  existingEmails: Iterable<string>,
): ImportPreview {
  const existing = new Set(
    [...existingEmails].map((email) => normalizeEmail(email)).filter(Boolean),
  );
  const seenInFile = new Set<string>();
  const valid: ValidatedImportRow[] = [];
  const errors: ImportRowError[] = [];

  for (const row of rows) {
    const name = row.displayName.trim();
    const title = row.jobTitle.trim();
    const email = row.email.trim();
    const mobileRaw = row.mobile?.trim() ?? "";
    const countryRaw = row.country?.trim() ?? "";
    const department = row.department?.trim() ?? "";

    if (!name && !title && !email && !mobileRaw && !countryRaw && !department) {
      continue;
    }

    const issues: ImportIssue[] = [];
    const parts = name.split(/\s+/).filter(Boolean);
    if (!name) issues.push(issue("missingName", "name", name));
    else if (parts.length < 2) issues.push(issue("missingLastName", "name", name));
    if (!title) issues.push(issue("missingTitle", "jobTitle", title));
    if (!email) issues.push(issue("missingEmail", "email", email));
    else if (!isValidEmail(email)) issues.push(issue("invalidEmail", "email", email));

    const country = countryRaw ? normalizeStoredCountry(countryRaw) : null;
    if (countryRaw && !resolveCountryCode(countryRaw)) {
      issues.push(issue("unknownCountry", "country", countryRaw));
    }

    let mobile: string | undefined;
    if (mobileRaw) {
      if (!countryRaw) issues.push(issue("missingCountryForMobile", "country", mobileRaw));
      const national = normalizeNationalNumber(mobileRaw, country);
      if (national.length < 7 || national.length > 15) {
        issues.push(issue("invalidMobile", "mobile", mobileRaw));
      } else mobile = national;
    }

    const key = normalizeEmail(email);
    if (email && isValidEmail(email) && seenInFile.has(key)) {
      issues.push(issue("duplicateEmail", "email", email));
    }

    if (issues.length > 0) {
      errors.push({
        rowNumber: row.rowNumber,
        issues,
        codes: issues.map((item) => item.code),
      });
      continue;
    }

    seenInFile.add(key);
    valid.push({
      displayName: name,
      jobTitle: title,
      email,
      rowNumber: row.rowNumber,
      ...(mobile ? { mobile } : {}),
      ...(department ? { department } : {}),
      ...(country ? { country } : {}),
      action: existing.has(key) ? "update" : "create",
    });
  }

  return { valid, errors };
}

export function detectCsvDelimiter(headerLine: string): "," | ";" | "\t" {
  let commas = 0;
  let semis = 0;
  let tabs = 0;
  let inQuotes = false;
  for (let i = 0; i < headerLine.length; i++) {
    const c = headerLine[i];
    if (c === '"') {
      if (inQuotes && headerLine[i + 1] === '"') {
        i += 1;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }
    if (inQuotes) continue;
    if (c === ",") commas += 1;
    else if (c === ";") semis += 1;
    else if (c === "\t") tabs += 1;
  }
  if (tabs > commas && tabs > semis) return "\t";
  if (semis > commas) return ";";
  return ",";
}

export function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const src = text.replace(/^\uFEFF/, "");
  const firstLineEnd = src.search(/\r\n|\n|\r/);
  const headerLine = firstLineEnd === -1 ? src : src.slice(0, firstLineEnd);
  const delimiter = detectCsvDelimiter(headerLine);
  const table = parseCsvWithDelimiter(src, delimiter);
  return tableToSheet(table);
}

function parseCsvWithDelimiter(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += c;
      }
      continue;
    }

    if (c === '"') {
      inQuotes = true;
      continue;
    }
    if (c === delimiter) {
      row.push(cell);
      cell = "";
      continue;
    }
    if (c === "\n") {
      row.push(cell);
      cell = "";
      rows.push(row);
      row = [];
      continue;
    }
    if (c === "\r") {
      row.push(cell);
      cell = "";
      rows.push(row);
      row = [];
      if (text[i + 1] === "\n") i += 1;
      continue;
    }
    cell += c;
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}

export function tableToSheet(table: string[][]): { headers: string[]; rows: string[][] } {
  const nonempty = table.filter((row) => row.some((value) => value.trim() !== ""));
  if (nonempty.length === 0) {
    return { headers: [], rows: [] };
  }
  const rawHeaders = nonempty[0]!.map((value) => value.trim());
  const headers = uniquifyHeaders(rawHeaders);
  const width = headers.length;
  const rows = nonempty.slice(1).map((row) => {
    const next = row.slice(0, width).map((value) => value.trim());
    while (next.length < width) next.push("");
    return next;
  });
  return { headers, rows };
}

function uniquifyHeaders(headers: string[]): string[] {
  const seen = new Map<string, number>();
  return headers.map((header, index) => {
    const base = header || `Column ${index + 1}`;
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    return count === 0 ? base : `${base} (${count + 1})`;
  });
}

export function optionalText(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : null;
}
