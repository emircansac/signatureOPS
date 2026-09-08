export type DisplayBox = { width: number; height: number };

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

export function displayBoxForSlot(slot: string): DisplayBox {
  const known = SLOT_DISPLAY_BOX[slot];
  if (known) return known;
  if (slot.startsWith("logo")) return SLOT_DISPLAY_BOX.logo!;
  if (slot.startsWith("social_")) return { width: 16, height: 16 };
  return SLOT_DISPLAY_BOX.logo!;
}

export function fitInsideBox(srcW: number, srcH: number, maxW: number, maxH: number): DisplayBox {
  if (!Number.isFinite(srcW) || !Number.isFinite(srcH) || srcW <= 0 || srcH <= 0) {
    return { width: maxW, height: maxH };
  }
  const scale = Math.min(maxW / srcW, maxH / srcH, 1);
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
