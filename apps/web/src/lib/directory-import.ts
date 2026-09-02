export const DIRECTORY_FIELDS = [
  "displayName",
  "jobTitle",
  "email",
  "mobile",
  "department",
  "country",
  "photoUrl",
] as const;

export type DirectoryField = (typeof DIRECTORY_FIELDS)[number];

export const REQUIRED_DIRECTORY_FIELDS = ["displayName", "jobTitle", "email"] as const;
export type RequiredDirectoryField = (typeof REQUIRED_DIRECTORY_FIELDS)[number];

export type ColumnMapping = Record<DirectoryField, string | null>;

export type MappedPersonRow = {
  rowNumber: number;
  displayName: string;
  jobTitle: string;
  email: string;
  mobile?: string;
  department?: string;
  country?: string;
  photoUrl?: string;
};

export type ImportErrorCode =
  | "missingName"
  | "missingTitle"
  | "missingEmail"
  | "invalidEmail"
  | "duplicateEmail";

export type ImportRowError = {
  rowNumber: number;
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
  displayName: [
    "name",
    "ad",
    "full name",
    "fullname",
    "display name",
    "displayname",
    "ad soyad",
    "adsoyad",
    "isim",
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
  email: ["email", "e posta", "eposta", "mail", "e mail"],
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
  country: ["country", "ulke", "country code"],
  photoUrl: [
    "photo",
    "fotograf",
    "photo url",
    "photourl",
    "image",
    "picture",
    "avatar",
    "foto",
  ],
};

export function normalizeHeader(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function emptyColumnMapping(): ColumnMapping {
  return {
    displayName: null,
    jobTitle: null,
    email: null,
    mobile: null,
    department: null,
    country: null,
    photoUrl: null,
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
      return aliases.some((alias) => normalized === alias || normalized.includes(alias));
    });
    if (match) {
      mapping[field] = match;
      used.add(match);
    }
  }

  return mapping;
}

export function requiredFieldsMapped(mapping: ColumnMapping): boolean {
  return REQUIRED_DIRECTORY_FIELDS.every((field) => Boolean(mapping[field]));
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
    const mapped: MappedPersonRow = {
      rowNumber: headerRowNumber + 1 + index,
      displayName: cell(record, mapping.displayName) ?? "",
      jobTitle: cell(record, mapping.jobTitle) ?? "",
      email: cell(record, mapping.email) ?? "",
    };
    if (mapping.mobile) mapped.mobile = cell(record, mapping.mobile) ?? "";
    if (mapping.department) mapped.department = cell(record, mapping.department) ?? "";
    if (mapping.country) mapped.country = cell(record, mapping.country) ?? "";
    if (mapping.photoUrl) mapped.photoUrl = cell(record, mapping.photoUrl) ?? "";
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
    const codes: ImportErrorCode[] = [];
    const name = row.displayName.trim();
    const title = row.jobTitle.trim();
    const email = row.email.trim();

    if (!name) codes.push("missingName");
    if (!title) codes.push("missingTitle");
    if (!email) codes.push("missingEmail");
    else if (!isValidEmail(email)) codes.push("invalidEmail");

    const key = normalizeEmail(email);
    if (email && isValidEmail(email) && seenInFile.has(key)) {
      codes.push("duplicateEmail");
    }

    if (codes.length > 0) {
      errors.push({ rowNumber: row.rowNumber, codes });
      continue;
    }

    seenInFile.add(key);
    valid.push({
      ...row,
      displayName: name,
      jobTitle: title,
      email,
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
