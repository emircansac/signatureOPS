import { auth } from "@/auth";
import { storeUpload } from "@/lib/storage";
import { rateLimit, rateLimitOrgUploads } from "@/lib/rate-limit";
import { prisma } from "@signatureops/db";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.orgId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!rateLimit(`upload:${session.orgId}`, 20, 60_000)) {
      return Response.json({ error: "Too many uploads" }, { status: 429 });
    }
    const allowed = await rateLimitOrgUploads(prisma, session.orgId);
    if (!allowed) {
      return Response.json({ error: "Too many uploads" }, { status: 429 });
    }

    const formData = await req.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return Response.json({ error: "Dosya bulunamadı" }, { status: 400 });
    }

    const stored = await storeUpload(file, session.orgId);
    return Response.json(stored);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "TYPE") {
      return Response.json(
        { error: "Sadece PNG, JPEG, GIF veya WebP yüklenebilir" },
        { status: 400 },
      );
    }
    if (message === "SIZE") {
      return Response.json({ error: "Dosya 500 KB'dan küçük olmalı" }, { status: 400 });
    }
    console.error("Upload error:", error);
    return Response.json({ error: "Yükleme başarısız" }, { status: 500 });
  }
}
