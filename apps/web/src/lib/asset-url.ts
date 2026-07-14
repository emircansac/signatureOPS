export function resolvePublicAssetUrl(url: string, baseUrl?: string): string {
  if (url.startsWith("https://") || url.startsWith("http://")) return url;
  if (url.startsWith("/")) {
    const base = baseUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    return `${base.replace(/\/$/, "")}${url}`;
  }
  return url;
}

export function isRenderableImageUrl(url: string): boolean {
  return (
    url.startsWith("https://") ||
    url.startsWith("http://localhost") ||
    url.startsWith("http://127.0.0.1") ||
    url.startsWith("/uploads/")
  );
}
