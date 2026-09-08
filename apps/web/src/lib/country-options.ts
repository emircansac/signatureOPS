import { COUNTRY_DIALS, callingCodeForCountry } from "@signatureops/schema";

export function countrySelectLabel(code: string, locale: string): string {
  let name = code;
  try {
    name = new Intl.DisplayNames([locale], { type: "region" }).of(code) ?? code;
  } catch {
    name = code;
  }
  const dial = callingCodeForCountry(code);
  return dial ? `${name} (+${dial})` : name;
}

export function countrySelectOptions(locale: string): { code: string; label: string }[] {
  const rest = COUNTRY_DIALS.filter((row) => row.code !== "TR")
    .map((row) => ({ code: row.code, label: countrySelectLabel(row.code, locale) }))
    .sort((a, b) => a.label.localeCompare(b.label, locale));
  return [{ code: "TR", label: countrySelectLabel("TR", locale) }, ...rest];
}
