export function resolvePublicAssetUrl(url: string, baseUrl?: string): string {
  if (url.startsWith("https://")) return url;
  if (url.startsWith("http://localhost") || url.startsWith("http://127.0.0.1")) return url;
  if (url.startsWith("http://")) {
    if (process.env.NODE_ENV === "production") {
      return url.replace(/^http:\/\//, "https://");
    }
    return url;
  }
  if (url.startsWith("/")) {
    const base = baseUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    return `${base.replace(/\/$/, "")}${url}`;
  }
  return url;
}

export function isRenderableImageUrl(url: string): boolean {
  if (url.startsWith("https://")) return true;
  if (url.startsWith("/uploads/")) return true;
  if (url.startsWith("http://localhost") || url.startsWith("http://127.0.0.1")) return true;
  return false;
}

export function isAllowedAssetUrl(url: string, production: boolean): boolean {
  if (url.startsWith("https://")) return true;
  if (url.startsWith("/uploads/") || url.startsWith("/")) return !production;
  if (url.startsWith("http://localhost") || url.startsWith("http://127.0.0.1")) return !production;
  return false;
}
