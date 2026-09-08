import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { processUploadImage, STORE_PIXEL_DENSITY } from "./process-image";

describe("processUploadImage", () => {
  it("keeps original bytes when the file already fits the 3× cap", async () => {
    const buffer = await sharp({
      create: { width: 200, height: 50, channels: 3, background: { r: 20, g: 40, b: 60 } },
    })
      .png()
      .toBuffer();

    const result = await processUploadImage(buffer, "image/png", "logo");
    expect(result.displayWidth).toBe(120);
    expect(result.displayHeight).toBe(30);
    expect(result.mime).toBe("image/png");
    expect(result.buffer.equals(buffer)).toBe(true);
  });

  it("downscales only huge logos and keeps 3× pixels for sharpness", async () => {
    const buffer = await sharp({
      create: { width: 2000, height: 400, channels: 3, background: { r: 20, g: 40, b: 60 } },
    })
      .png()
      .toBuffer();

    const result = await processUploadImage(buffer, "image/png", "logo");
    expect(result.displayWidth).toBe(120);
    expect(result.displayHeight).toBe(24);
    expect(result.mime).toBe("image/png");

    const meta = await sharp(result.buffer).metadata();
    expect(meta.width).toBe(result.displayWidth * STORE_PIXEL_DENSITY);
    expect(meta.height).toBe(result.displayHeight * STORE_PIXEL_DENSITY);
  });

  it("does not transcode a JPEG that already fits", async () => {
    const buffer = await sharp({
      create: { width: 180, height: 40, channels: 3, background: { r: 200, g: 40, b: 40 } },
    })
      .jpeg({ quality: 95 })
      .toBuffer();

    const result = await processUploadImage(buffer, "image/jpeg", "logo");
    expect(result.mime).toBe("image/jpeg");
    expect(result.buffer.equals(buffer)).toBe(true);
  });
});
