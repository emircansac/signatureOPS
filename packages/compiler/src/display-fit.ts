export type DisplayBox = { width: number; height: number };
export type LogoSize = "small" | "large";

export const SLOT_DISPLAY_BOX: Record<string, DisplayBox> = {
  logo: { width: 120, height: 40 },
  logo_light: { width: 120, height: 40 },
  logo_dark: { width: 120, height: 40 },
  logo_mark: { width: 40, height: 40 },
  banner: { width: 400, height: 80 },
  profile_fallback: { width: 64, height: 64 },
  cta_icon: { width: 16, height: 16 },
  legal_badge: { width: 24, height: 24 },
  social_linkedin: { width: 16, height: 16 },
  social_x: { width: 16, height: 16 },
  social_instagram: { width: 16, height: 16 },
  social_facebook: { width: 16, height: 16 },
  social_youtube: { width: 16, height: 16 },
  certification: { width: 32, height: 32 },
};

export const LOGO_DISPLAY_BOX: Record<LogoSize, { wordmark: DisplayBox; mark: DisplayBox }> = {
  small: { wordmark: { width: 120, height: 40 }, mark: { width: 40, height: 40 } },
  large: { wordmark: { width: 180, height: 60 }, mark: { width: 60, height: 60 } },
};

export function displayBoxForSlot(slot: string): DisplayBox {
  const known = SLOT_DISPLAY_BOX[slot];
  if (known) return known;
  if (slot.startsWith("logo")) return SLOT_DISPLAY_BOX.logo!;
  if (slot.startsWith("social_")) return { width: 16, height: 16 };
  return SLOT_DISPLAY_BOX.logo!;
}

export function logoDisplayBox(size: LogoSize = "small", mark = false): DisplayBox {
  return mark ? LOGO_DISPLAY_BOX[size].mark : LOGO_DISPLAY_BOX[size].wordmark;
}

export function storageDisplayBoxForSlot(slot: string): DisplayBox {
  if (slot === "logo_mark") return LOGO_DISPLAY_BOX.large.mark;
  if (slot.startsWith("logo")) return LOGO_DISPLAY_BOX.large.wordmark;
  return displayBoxForSlot(slot);
}

export function fitInsideBox(
  srcW: number,
  srcH: number,
  maxW: number,
  maxH: number,
  options?: { allowUpscale?: boolean },
): DisplayBox {
  if (!Number.isFinite(srcW) || !Number.isFinite(srcH) || srcW <= 0 || srcH <= 0) {
    return { width: maxW, height: maxH };
  }
  const cap = options?.allowUpscale ? Number.POSITIVE_INFINITY : 1;
  const scale = Math.min(maxW / srcW, maxH / srcH, cap);
  return {
    width: Math.max(1, Math.round(srcW * scale)),
    height: Math.max(1, Math.round(srcH * scale)),
  };
}

export function fittedDisplaySize(
  slot: string,
  width?: number | null,
  height?: number | null,
): DisplayBox {
  const box = displayBoxForSlot(slot);
  if (!width || !height || width <= 0 || height <= 0) {
    return { width: box.width, height: box.height };
  }
  return fitInsideBox(width, height, box.width, box.height);
}

export function fittedStorageSize(
  slot: string,
  width?: number | null,
  height?: number | null,
): DisplayBox {
  const box = storageDisplayBoxForSlot(slot);
  if (!width || !height || width <= 0 || height <= 0) {
    return { width: box.width, height: box.height };
  }
  return fitInsideBox(width, height, box.width, box.height);
}

export function fittedLogoSize(
  size: LogoSize,
  mark: boolean,
  width?: number | null,
  height?: number | null,
): DisplayBox {
  const box = logoDisplayBox(size, mark);
  if (!width || !height || width <= 0 || height <= 0) {
    return box;
  }
  return fitInsideBox(width, height, box.width, box.height, { allowUpscale: size === "large" });
}
