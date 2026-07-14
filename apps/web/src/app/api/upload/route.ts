import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);
const MAX_BYTES = 500_000;

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return Response.json({ error: "Dosya bulunamadı" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return Response.json(
        { error: "Sadece PNG, JPEG, GIF veya WebP yüklenebilir" },
        { status: 400 },
      );
    }

    if (file.size > MAX_BYTES) {
      return Response.json({ error: "Dosya 500 KB'dan küçük olmalı" }, { status: 400 });
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const filename = `${randomUUID()}.${ext}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(uploadDir, filename), buffer);

    return Response.json({
      url: `/uploads/${filename}`,
      bytes: file.size,
      filename,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return Response.json({ error: "Yükleme başarısız" }, { status: 500 });
  }
}
