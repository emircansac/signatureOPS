import sharp from "sharp";
import { displayBoxForSlot, fitInsideBox } from "@signatureops/compiler";

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

export async function processUploadImage(
  buffer: Buffer,
  mime: string,
  slot: string,
): Promise<ProcessedUpload> {
  const meta = await sharp(buffer, { animated: false, pages: 1, failOn: "none" }).metadata();
  const srcW = meta.width ?? 0;
  const srcH = meta.height ?? 0;
  const box = displayBoxForSlot(slot);
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
