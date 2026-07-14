import { resolvePublicAssetUrl } from "@/lib/asset-url";

export type AssetRecord = {
  id: string;
  url: string;
  width?: number | null;
  height?: number | null;
  alt?: string | null;
  kind: string;
};

export function toCompileAssetMap(assets: AssetRecord[], baseUrl?: string) {
  return Object.fromEntries(
    assets.map((a) => [
      a.id,
      {
        id: a.id,
        url: resolvePublicAssetUrl(a.url, baseUrl),
        width: a.width ?? undefined,
        height: a.height ?? undefined,
        alt: a.alt ?? undefined,
      },
    ]),
  );
}
