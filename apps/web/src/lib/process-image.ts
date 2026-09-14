import sharp from "sharp";
import { storageDisplayBoxForSlot, fitInsideBox } from "@signatureops/compiler";

/** Extra pixels kept in the file so HiDPI clients stay sharp. HTML width/height stay 1×. */
export const STORE_PIXEL_DENSITY = 3;

export type ProcessedUpload = {
  buffer: Buffer;
  mime: string;
  ext: string;
  displayWidth: number;
  displayHeight: number;
};

function extForMime(mime: string): string {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/gif") return "gif";
  if (mime === "image/webp") return "webp";
  return "png";
}

function needsEmailSafeRaster(mime: string): boolean {
  return mime === "image/gif" || mime === "image/webp";
}

function isLogoSlot(slot: string): boolean {
  return slot === "logo_mark" || slot.startsWith("logo");
}

/** Logos are normalized so file pixels match displayWidth/Height × density (no client stretch). */
async function processLogoUpload(buffer: Buffer, slot: string): Promise<ProcessedUpload> {
  const box = storageDisplayBoxForSlot(slot);
  let pipeline = sharp(buffer, { animated: false, pages: 1, failOn: "none" }).rotate().trim({
    threshold: 12,
  });

  const trimmed = await pipeline.metadata();
  const srcW = trimmed.width ?? 0;
  const srcH = trimmed.height ?? 0;
  const display = fitInsideBox(srcW || box.width, srcH || box.height, box.width, box.height);
  const pixelW = display.width * STORE_PIXEL_DENSITY;
  const pixelH = display.height * STORE_PIXEL_DENSITY;

  const out = await pipeline
    .resize(pixelW, pixelH, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      kernel: sharp.kernel.lanczos3,
    })
    .png({ compressionLevel: 6, adaptiveFiltering: true, palette: false })
    .toBuffer();

  const outMeta = await sharp(out).metadata();
  const displayWidth = Math.max(1, Math.round((outMeta.width ?? pixelW) / STORE_PIXEL_DENSITY));
  const displayHeight = Math.max(1, Math.round((outMeta.height ?? pixelH) / STORE_PIXEL_DENSITY));

  return {
    buffer: out,
    mime: "image/png",
    ext: "png",
    displayWidth,
    displayHeight,
  };
}

const PROBE_MAX_BYTES = 500_000;

/** Read pixel size after EXIF rotation (for URL imports without client-side dimensions). */
export async function probeImagePixelSize(url: string): Promise<{ width: number; height: number } | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length === 0 || buf.length > PROBE_MAX_BYTES) return null;
    const meta = await sharp(buf, { animated: false, pages: 1, failOn: "none" }).rotate().metadata();
    if (!meta.width || !meta.height) return null;
    return { width: meta.width, height: meta.height };
  } catch {
    return null;
  }
}

export async function processUploadImage(
  buffer: Buffer,
  mime: string,
  slot: string,
): Promise<ProcessedUpload> {
  if (isLogoSlot(slot)) {
    return processLogoUpload(buffer, slot);
  }

  const meta = await sharp(buffer, { animated: false, pages: 1, failOn: "none" }).metadata();
  const srcW = meta.width ?? 0;
  const srcH = meta.height ?? 0;
  const box = storageDisplayBoxForSlot(slot);
  const display = fitInsideBox(srcW || box.width, srcH || box.height, box.width, box.height);

  const maxPixelW = display.width * STORE_PIXEL_DENSITY;
  const maxPixelH = display.height * STORE_PIXEL_DENSITY;
  const needsResize = srcW > maxPixelW || srcH > maxPixelH;
  const needsRotate = Boolean(meta.orientation && meta.orientation !== 1);
  const convertForClients = needsEmailSafeRaster(mime);

  if (!needsResize && !needsRotate && !convertForClients) {
    return {
      buffer,
      mime,
      ext: extForMime(mime),
      displayWidth: display.width,
      displayHeight: display.height,
    };
  }

  let pipeline = sharp(buffer, { animated: false, pages: 1, failOn: "none" }).rotate();
  if (needsResize) {
    pipeline = pipeline.resize({
      width: maxPixelW,
      height: maxPixelH,
      fit: "inside",
      withoutEnlargement: true,
      kernel: sharp.kernel.lanczos3,
    });
  }

  if (mime === "image/jpeg" && !convertForClients) {
    const out = await pipeline
      .jpeg({ quality: 95, chromaSubsampling: "4:4:4", mozjpeg: true })
      .toBuffer();
    return {
      buffer: out,
      mime: "image/jpeg",
      ext: "jpg",
      displayWidth: display.width,
      displayHeight: display.height,
    };
  }

  const out = await pipeline
    .png({ compressionLevel: 6, adaptiveFiltering: true, palette: false })
    .toBuffer();
  return {
    buffer: out,
    mime: "image/png",
    ext: "png",
    displayWidth: display.width,
    displayHeight: display.height,
  };
}
