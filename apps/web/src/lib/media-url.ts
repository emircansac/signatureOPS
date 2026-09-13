export function brandMediaPath(assetId: string): string {
  return `/api/media/${assetId}`;
}

export function brandMediaUrl(assetId: string, baseUrl?: string): string {
  const path = brandMediaPath(assetId);
  const base = (baseUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  return base ? `${base}${path}` : path;
}

export function r2ObjectKeyFromUrl(
  url: string,
  opts: { publicBase?: string; bucket?: string } = {},
): string | null {
  if (url.startsWith("/uploads/")) {
    return url.slice("/uploads/".length) || null;
  }

  try {
    const parsed = new URL(url);
    const pathname = decodeURIComponent(parsed.pathname.replace(/^\/+/, ""));
    const publicBase = opts.publicBase?.replace(/\/$/, "");

    if (publicBase) {
      if (url.startsWith(`${publicBase}/`)) {
        return decodeURIComponent(url.slice(publicBase.length + 1).split("?")[0] ?? "") || null;
      }
      const basePath = new URL(publicBase).pathname.replace(/^\/+|\/+$/g, "");
      if (basePath && pathname.startsWith(`${basePath}/`)) {
        return pathname.slice(basePath.length + 1) || null;
      }
    }

    if (parsed.hostname.endsWith(".r2.cloudflarestorage.com") && opts.bucket) {
      const prefix = `${opts.bucket}/`;
      if (pathname.startsWith(prefix)) return pathname.slice(prefix.length) || null;
    }

    return pathname || null;
  } catch {
    return null;
  }
}
