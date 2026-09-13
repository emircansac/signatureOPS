import { GetObjectCommand } from "@aws-sdk/client-s3";
import { prisma } from "@signatureops/db";
import { appBaseUrl, getServerEnv, r2Configured } from "@/env";
import { r2ObjectKeyFromUrl } from "@/lib/media-url";
import { createR2S3Client } from "@/lib/r2-client";
import { resolvePublicAssetUrl } from "@/lib/asset-url";

export const runtime = "nodejs";

const ASSET_ID_RE = /^[a-z0-9]{8,}$/i;

export async function GET(
  _req: Request,
  context: { params: Promise<{ assetId: string }> },
) {
  const { assetId } = await context.params;
  if (!ASSET_ID_RE.test(assetId)) {
    return new Response("Not found", { status: 404 });
  }

  const asset = await prisma.brandAsset.findUnique({
    where: { id: assetId },
    select: { url: true },
  });
  if (!asset) return new Response("Not found", { status: 404 });

  if (asset.url.startsWith("/uploads/")) {
    return Response.redirect(`${appBaseUrl()}${asset.url}`, 302);
  }

  const env = getServerEnv();
  if (r2Configured()) {
    const key = r2ObjectKeyFromUrl(asset.url, {
      publicBase: env.R2_PUBLIC_BASE_URL,
      bucket: env.R2_BUCKET,
    });
    if (key && !key.includes("..")) {
      try {
        const client = createR2S3Client({
          R2_ACCOUNT_ID: env.R2_ACCOUNT_ID,
          R2_ENDPOINT: env.R2_ENDPOINT,
          R2_JURISDICTION: env.R2_JURISDICTION,
          R2_ACCESS_KEY_ID: env.R2_ACCESS_KEY_ID!,
          R2_SECRET_ACCESS_KEY: env.R2_SECRET_ACCESS_KEY!,
        });
        const object = await client.send(
          new GetObjectCommand({ Bucket: env.R2_BUCKET, Key: key }),
        );
        const bytes = await object.Body?.transformToByteArray();
        if (bytes) {
          return new Response(Buffer.from(bytes), {
            headers: {
              "Content-Type": object.ContentType ?? "image/png",
              "Cache-Control": "public, max-age=31536000, immutable",
            },
          });
        }
      } catch (error) {
        console.error("R2 GetObject failed for media route", { assetId, key });
        void error;
      }
    }
  }

  const target = resolvePublicAssetUrl(asset.url, appBaseUrl());
  if (!target.startsWith("https://") && !target.startsWith("http://localhost") && !target.startsWith("http://127.0.0.1")) {
    return new Response("Not found", { status: 404 });
  }
  return Response.redirect(target, 302);
}
