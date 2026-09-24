const PUBLIC_EMAIL_DOMAINS = new Set([
  "aol.com",
  "fastmail.com",
  "gmx.com",
  "gmx.net",
  "gmail.com",
  "googlemail.com",
  "hey.com",
  "hotmail.com",
  "hotmail.com.tr",
  "icloud.com",
  "live.com",
  "mac.com",
  "mail.com",
  "me.com",
  "msn.com",
  "outlook.com",
  "outlook.com.tr",
  "pm.me",
  "proton.me",
  "protonmail.com",
  "qq.com",
  "tutanota.com",
  "yahoo.com",
  "yandex.com",
  "yandex.ru",
  "ymail.com",
  "zoho.com",
]);

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function emailDomain(email: string): string | null {
  const normalized = normalizeEmail(email);
  const at = normalized.lastIndexOf("@");
  if (at <= 0 || at === normalized.length - 1) return null;
  const domain = normalized.slice(at + 1);
  if (!domain.includes(".") || domain.startsWith(".") || domain.endsWith(".")) return null;
  return domain;
}

export function isPublicEmailDomain(domain: string): boolean {
  return PUBLIC_EMAIL_DOMAINS.has(domain.trim().toLowerCase());
}

export function joinableEmailDomain(email: string): string | null {
  const domain = emailDomain(email);
  if (!domain || isPublicEmailDomain(domain)) return null;
  return domain;
}
