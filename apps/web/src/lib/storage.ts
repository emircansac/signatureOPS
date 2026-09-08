import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getServerEnv, r2Configured } from "@/env";
import { processUploadImage } from "@/lib/process-image";
import { r2S3ClientOptions } from "@/lib/r2-endpoint";

const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);
const MAX_BYTES = 500_000;

export { ALLOWED_TYPES, MAX_BYTES };

export type StoredUpload = {
  url: string;
  bytes: number;
  filename: string;
  width?: number;
  height?: number;
};

function extFor(type: string, originalName: string): string {
  if (type === "image/png") return "png";
  if (type === "image/jpeg") return "jpg";
  if (type === "image/gif") return "gif";
  if (type === "image/webp") return "webp";
  return originalName.split(".").pop()?.toLowerCase() || "png";
}

export async function storeUpload(
  file: File,
  orgId: string,
  options?: { slot?: string },
): Promise<StoredUpload> {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error("TYPE");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("SIZE");
  }

  let body = Buffer.from(await file.arrayBuffer());
  let contentType = file.type;
  let ext = extFor(file.type, file.name);
  let width: number | undefined;
  let height: number | undefined;

  if (options?.slot) {
    const processed = await processUploadImage(body, file.type, options.slot);
    body = Buffer.from(processed.buffer);
    contentType = processed.mime;
    ext = processed.ext;
    width = processed.displayWidth;
    height = processed.displayHeight;
  }

  const filename = `${randomUUID()}.${ext}`;
  const env = getServerEnv();

  if (r2Configured()) {
    const client = new S3Client(
      r2S3ClientOptions({
        R2_ACCOUNT_ID: env.R2_ACCOUNT_ID,
        R2_ENDPOINT: env.R2_ENDPOINT,
        R2_ACCESS_KEY_ID: env.R2_ACCESS_KEY_ID!,
        R2_SECRET_ACCESS_KEY: env.R2_SECRET_ACCESS_KEY!,
      }),
    );
    const key = `${orgId}/${filename}`;
    await client.send(
      new PutObjectCommand({
        Bucket: env.R2_BUCKET,
        Key: key,
        Body: body,
        ContentType: contentType,
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
    const base = env.R2_PUBLIC_BASE_URL!.replace(/\/$/, "");
    return { url: `${base}/${key}`, bytes: body.length, filename, width, height };
  }

  if (env.NODE_ENV === "production") {
    throw new Error("R2_REQUIRED");
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, filename), body);
  return { url: `/uploads/${filename}`, bytes: body.length, filename, width, height };
}
