import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { processUploadImage, STORE_PIXEL_DENSITY } from "./process-image";

describe("processUploadImage", () => {
  it("normalizes logos to a fixed canvas matching display aspect ratio", async () => {
    const buffer = await sharp({
      create: { width: 200, height: 50, channels: 4, background: { r: 20, g: 40, b: 60, alpha: 1 } },
    })
      .png()
      .toBuffer();

    const result = await processUploadImage(buffer, "image/png", "logo");
    expect(result.displayWidth).toBe(180);
    expect(result.displayHeight).toBe(45);
    expect(result.mime).toBe("image/png");
    expect(result.buffer.equals(buffer)).toBe(false);

    const meta = await sharp(result.buffer).metadata();
    expect(meta.width).toBe(result.displayWidth * STORE_PIXEL_DENSITY);
    expect(meta.height).toBe(result.displayHeight * STORE_PIXEL_DENSITY);
    expect((meta.width ?? 0) / (meta.height ?? 1)).toBeCloseTo(
      result.displayWidth / result.displayHeight,
      5,
    );
  });

  it("downscales huge logos onto the same fixed canvas", async () => {
    const buffer = await sharp({
      create: { width: 2000, height: 400, channels: 3, background: { r: 20, g: 40, b: 60 } },
    })
      .png()
      .toBuffer();

    const result = await processUploadImage(buffer, "image/png", "logo");
    expect(result.displayWidth).toBe(180);
    expect(result.displayHeight).toBe(36);

    const meta = await sharp(result.buffer).metadata();
    expect(meta.width).toBe(result.displayWidth * STORE_PIXEL_DENSITY);
    expect(meta.height).toBe(result.displayHeight * STORE_PIXEL_DENSITY);
  });

  it("trims excess transparent padding before fitting marks", async () => {
    const buffer = await sharp({
      create: { width: 120, height: 120, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    })
      .composite([
        {
          input: await sharp({
            create: { width: 48, height: 48, channels: 4, background: { r: 200, g: 40, b: 40, alpha: 1 } },
          })
            .png()
            .toBuffer(),
          left: 36,
          top: 36,
        },
      ])
      .png()
      .toBuffer();

    const result = await processUploadImage(buffer, "image/png", "logo_mark");
    expect(result.displayWidth).toBeLessThanOrEqual(60);
    expect(result.displayHeight).toBeLessThanOrEqual(60);
    expect(result.displayWidth).toBe(result.displayHeight);

    const meta = await sharp(result.buffer).metadata();
    expect(meta.width).toBe(result.displayWidth * STORE_PIXEL_DENSITY);
    expect(meta.height).toBe(result.displayHeight * STORE_PIXEL_DENSITY);
  });

  it("does not transcode a JPEG banner that already fits", async () => {
    const buffer = await sharp({
      create: { width: 180, height: 40, channels: 3, background: { r: 200, g: 40, b: 40 } },
    })
      .jpeg({ quality: 95 })
      .toBuffer();

    const result = await processUploadImage(buffer, "image/jpeg", "banner");
    expect(result.mime).toBe("image/jpeg");
    expect(result.buffer.equals(buffer)).toBe(true);
  });
});
