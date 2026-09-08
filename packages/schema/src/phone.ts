/** ISO 3166-1 alpha-2 → ITU calling code (no +). */
export const COUNTRY_DIALS: ReadonlyArray<{ code: string; dial: string }> = [
  { code: "TR", dial: "90" },
  { code: "US", dial: "1" },
  { code: "GB", dial: "44" },
  { code: "DE", dial: "49" },
  { code: "FR", dial: "33" },
  { code: "NL", dial: "31" },
  { code: "BE", dial: "32" },
  { code: "AT", dial: "43" },
  { code: "CH", dial: "41" },
  { code: "IT", dial: "39" },
  { code: "ES", dial: "34" },
  { code: "PT", dial: "351" },
  { code: "GR", dial: "30" },
  { code: "PL", dial: "48" },
  { code: "CZ", dial: "420" },
  { code: "HU", dial: "36" },
  { code: "RO", dial: "40" },
  { code: "BG", dial: "359" },
  { code: "SE", dial: "46" },
  { code: "NO", dial: "47" },
  { code: "DK", dial: "45" },
  { code: "FI", dial: "358" },
  { code: "IE", dial: "353" },
  { code: "LU", dial: "352" },
  { code: "RU", dial: "7" },
  { code: "UA", dial: "380" },
  { code: "AE", dial: "971" },
  { code: "SA", dial: "966" },
  { code: "QA", dial: "974" },
  { code: "KW", dial: "965" },
  { code: "BH", dial: "973" },
  { code: "OM", dial: "968" },
  { code: "IL", dial: "972" },
  { code: "EG", dial: "20" },
  { code: "ZA", dial: "27" },
  { code: "NG", dial: "234" },
  { code: "KE", dial: "254" },
  { code: "IN", dial: "91" },
  { code: "PK", dial: "92" },
  { code: "BD", dial: "880" },
  { code: "CN", dial: "86" },
  { code: "JP", dial: "81" },
  { code: "KR", dial: "82" },
  { code: "SG", dial: "65" },
  { code: "MY", dial: "60" },
  { code: "ID", dial: "62" },
  { code: "TH", dial: "66" },
  { code: "VN", dial: "84" },
  { code: "PH", dial: "63" },
  { code: "AU", dial: "61" },
  { code: "NZ", dial: "64" },
  { code: "CA", dial: "1" },
  { code: "MX", dial: "52" },
  { code: "BR", dial: "55" },
  { code: "AR", dial: "54" },
  { code: "CL", dial: "56" },
  { code: "CO", dial: "57" },
  { code: "AZ", dial: "994" },
  { code: "GE", dial: "995" },
  { code: "KZ", dial: "7" },
  { code: "UZ", dial: "998" },
  { code: "CY", dial: "357" },
  { code: "MT", dial: "356" },
  { code: "HR", dial: "385" },
  { code: "RS", dial: "381" },
  { code: "BA", dial: "387" },
  { code: "SI", dial: "386" },
  { code: "SK", dial: "421" },
  { code: "LT", dial: "370" },
  { code: "LV", dial: "371" },
  { code: "EE", dial: "372" },
  { code: "IS", dial: "354" },
  { code: "MA", dial: "212" },
  { code: "TN", dial: "216" },
  { code: "DZ", dial: "213" },
  { code: "LB", dial: "961" },
  { code: "JO", dial: "962" },
  { code: "IQ", dial: "964" },
  { code: "IR", dial: "98" },
];

const DIAL_BY_CODE = new Map(COUNTRY_DIALS.map((row) => [row.code, row.dial]));

const COUNTRY_ALIASES: Record<string, string> = {
  tr: "TR",
  turkey: "TR",
  turkiye: "TR",
  us: "US",
  usa: "US",
  "united states": "US",
  "united states of america": "US",
  gb: "GB",
  uk: "GB",
  "united kingdom": "GB",
  england: "GB",
  de: "DE",
  germany: "DE",
  deutschland: "DE",
  almanya: "DE",
  fr: "FR",
  france: "FR",
  fransa: "FR",
  nl: "NL",
  netherlands: "NL",
  holland: "NL",
  "the netherlands": "NL",
  it: "IT",
  italy: "IT",
  italya: "IT",
  es: "ES",
  spain: "ES",
  ispanya: "ES",
  ae: "AE",
  uae: "AE",
  "united arab emirates": "AE",
  sa: "SA",
  "saudi arabia": "SA",
  "suudi arabistan": "SA",
  ca: "CA",
  canada: "CA",
  au: "AU",
  australia: "AU",
  avustralya: "AU",
  in: "IN",
  india: "IN",
  hindistan: "IN",
  jp: "JP",
  japan: "JP",
  japonya: "JP",
  cn: "CN",
  china: "CN",
  cin: "CN",
  ch: "CH",
  switzerland: "CH",
  isvicre: "CH",
  at: "AT",
  austria: "AT",
  avusturya: "AT",
  be: "BE",
  belgium: "BE",
  belcika: "BE",
  se: "SE",
  sweden: "SE",
  isvec: "SE",
  no: "NO",
  norway: "NO",
  norvec: "NO",
  dk: "DK",
  denmark: "DK",
  danimarka: "DK",
  pl: "PL",
  poland: "PL",
  polonya: "PL",
  ru: "RU",
  russia: "RU",
  rusya: "RU",
  eg: "EG",
  egypt: "EG",
  misir: "EG",
  qa: "QA",
  qatar: "QA",
};

function foldCountry(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function resolveCountryCode(raw: string | null | undefined): string | undefined {
  if (!raw?.trim()) return undefined;
  const trimmed = raw.trim();
  const upper = trimmed.toUpperCase();
  if (DIAL_BY_CODE.has(upper)) return upper;
  const alias = COUNTRY_ALIASES[foldCountry(trimmed)];
  if (alias) return alias;
  return undefined;
}

export function callingCodeForCountry(raw: string | null | undefined): string | undefined {
  const code = resolveCountryCode(raw);
  if (!code) return undefined;
  return DIAL_BY_CODE.get(code);
}

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

export function normalizeNationalNumber(raw: string, country?: string | null): string {
  let digits = digitsOnly(raw);
  if (!digits) return "";
  const dial = callingCodeForCountry(country);
  if (dial && digits.startsWith(dial) && digits.length - dial.length >= 7) {
    digits = digits.slice(dial.length);
  }
  if (digits.startsWith("0") && digits.length > 1) {
    digits = digits.slice(1);
  }
  return digits;
}

export function normalizeStoredCountry(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  return resolveCountryCode(raw) ?? raw.trim();
}

export function normalizeStoredPhone(raw: string | null | undefined, country?: string | null): string | null {
  if (!raw?.trim()) return null;
  const national = normalizeNationalNumber(raw, country);
  return national || null;
}

function groupNational(digits: string): string {
  if (digits.length === 10) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  }
  const parts: string[] = [];
  for (let i = 0; i < digits.length; i += 3) {
    parts.push(digits.slice(i, i + 3));
  }
  return parts.join(" ");
}

export function formatPhone(value: string, country?: string | null): string {
  const national = normalizeNationalNumber(value, country);
  if (!national) return value.trim();
  const grouped = groupNational(national);
  const dial = callingCodeForCountry(country);
  if (dial) return `+${dial} ${grouped}`;
  return grouped;
}

export function phoneTelHref(value: string, country?: string | null): string {
  const national = normalizeNationalNumber(value, country);
  if (!national) return "";
  const dial = callingCodeForCountry(country);
  return dial ? `+${dial}${national}` : `+${national}`;
}
