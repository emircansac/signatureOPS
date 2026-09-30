/** Default CTA label on dark fills — matches historical compiler output. */
export const CTA_TEXT_ON_DARK = "#ffffff";
/** Default CTA label on light fills — brand ink. */
export const CTA_TEXT_ON_LIGHT = "#1C2B3A";

export function parseHexRgb(hex: string): [number, number, number] | null {
  const raw = hex.trim();
  const match = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(raw);
  if (!match) return null;
  let body = match[1]!;
  if (body.length === 3) {
    body = `${body[0]}${body[0]}${body[1]}${body[1]}${body[2]}${body[2]}`;
  }
  return [
    Number.parseInt(body.slice(0, 2), 16),
    Number.parseInt(body.slice(2, 4), 16),
    Number.parseInt(body.slice(4, 6), 16),
  ];
}

function srgbChannelToLinear(channel: number): number {
  const s = channel / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: string): number | null {
  const rgb = parseHexRgb(hex);
  if (!rgb) return null;
  const [r, g, b] = rgb;
  return 0.2126 * srgbChannelToLinear(r) + 0.7152 * srgbChannelToLinear(g) + 0.0722 * srgbChannelToLinear(b);
}

function contrastRatio(l1: number, l2: number): number {
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function mixTowardBlack(hex: string, amount: number): string | null {
  const rgb = parseHexRgb(hex);
  if (!rgb) return null;
  const factor = 1 - amount;
  return `#${rgb.map((channel) => Math.round(channel * factor).toString(16).padStart(2, "0")).join("")}`;
}

/**
 * Picks white or ink so a CTA label stays readable on `backgroundHex`.
 * Invalid hex falls back to white (previous compiler behavior).
 */
export function contrastTextColor(
  backgroundHex: string,
  options?: { onDark?: string; onLight?: string },
): string {
  const onDark = options?.onDark ?? CTA_TEXT_ON_DARK;
  const onLight = options?.onLight ?? CTA_TEXT_ON_LIGHT;
  const background = relativeLuminance(backgroundHex);
  const darkText = relativeLuminance(onLight);
  const lightText = relativeLuminance(onDark);
  if (background == null || darkText == null || lightText == null) return onDark;
  return contrastRatio(background, lightText) >= contrastRatio(background, darkText) ? onDark : onLight;
}

export function ctaForeground(
  backgroundHex: string,
  options?: { onDark?: string; onLight?: string },
): { color: string; border: string | null } {
  const color = contrastTextColor(backgroundHex, options);
  if (color.toLowerCase() === (options?.onDark ?? CTA_TEXT_ON_DARK).toLowerCase()) {
    return { color, border: null };
  }
  return { color, border: mixTowardBlack(backgroundHex, 0.18) };
}
