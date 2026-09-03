import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getServerEnv, r2Configured } from "@/env";

const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);
const MAX_BYTES = 500_000;

export { ALLOWED_TYPES, MAX_BYTES };

export type StoredUpload = {
  url: string;
  bytes: number;
  filename: string;
};

function extFor(type: string, originalName: string): string {
  if (type === "image/png") return "png";
  if (type === "image/jpeg") return "jpg";
  if (type === "image/gif") return "gif";
  if (type === "image/webp") return "webp";
  return originalName.split(".").pop()?.toLowerCase() || "png";
}

export async function storeUpload(file: File, orgId: string): Promise<StoredUpload> {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error("TYPE");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("SIZE");
  }

  const ext = extFor(file.type, file.name);
  const filename = `${randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const env = getServerEnv();

  if (r2Configured()) {
    const client = new S3Client({
      region: "auto",
      endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID!,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY!,
      },
    });
    const key = `${orgId}/${filename}`;
    await client.send(
      new PutObjectCommand({
        Bucket: env.R2_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: file.type,
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
    const base = env.R2_PUBLIC_BASE_URL!.replace(/\/$/, "");
    return { url: `${base}/${key}`, bytes: file.size, filename };
  }

  if (env.NODE_ENV === "production") {
    throw new Error("R2_REQUIRED");
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, filename), buffer);
  return { url: `/uploads/${filename}`, bytes: file.size, filename };
}
