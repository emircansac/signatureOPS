import { auth } from "@/auth";
import { storeUpload } from "@/lib/storage";
import { mapUploadError } from "@/lib/upload-error";
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

    const slotRaw = formData.get("slot");
    const slot = typeof slotRaw === "string" && slotRaw.length > 0 ? slotRaw : undefined;
    const stemRaw = formData.get("filenameStem");
    const filenameStem = typeof stemRaw === "string" && stemRaw.length > 0 ? stemRaw : undefined;
    const stored = await storeUpload(file, session.orgId, { slot, filenameStem });
    return Response.json(stored);
  } catch (error) {
    console.error("Upload error:", error);
    const mapped = mapUploadError(error);
    return Response.json({ error: mapped.error }, { status: mapped.status });
  }
}
