import { auth } from "@/auth";
import { parseCsv, tableToSheet } from "@/lib/directory-import";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_EXT = new Set(["csv", "xlsx"]);

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.orgId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return Response.json({ error: "Dosya bulunamadı" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return Response.json({ error: "Dosya 5 MB'dan küçük olmalı" }, { status: 400 });
    }

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!ALLOWED_EXT.has(ext)) {
      return Response.json({ error: "Sadece .csv veya .xlsx kabul edilir" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed =
      ext === "csv"
        ? parseCsv(buffer.toString("utf8"))
        : await parseXlsx(buffer);

    if (parsed.headers.length === 0) {
      return Response.json({ error: "Dosyada başlık satırı yok" }, { status: 400 });
    }

    return Response.json(parsed);
  } catch (error) {
    console.error("Directory parse error:", error);
    return Response.json({ error: "Dosya okunamadı" }, { status: 500 });
  }
}

async function parseXlsx(buffer: Buffer): Promise<{ headers: string[]; rows: string[][] }> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: false, raw: false });
  const first = workbook.SheetNames[0];
  if (!first) return { headers: [], rows: [] };
  const sheet = workbook.Sheets[first];
  if (!sheet) return { headers: [], rows: [] };
  const table = XLSX.utils.sheet_to_json<string[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
    blankrows: false,
  });
  return tableToSheet(table.map((row) => row.map((value) => String(value ?? ""))));
}
