import { describe, expect, it } from "vitest";
import { mapUploadError } from "./upload-error";

describe("mapUploadError", () => {
  it("keeps type and size validation messages", () => {
    expect(mapUploadError(new Error("TYPE"))).toEqual({
      status: 400,
      error: "Sadece PNG, JPEG, GIF veya WebP yüklenebilir",
    });
    expect(mapUploadError(new Error("SIZE"))).toEqual({
      status: 400,
      error: "Dosya 500 KB'dan küçük olmalı",
    });
  });

  it("maps invalid R2 account ids", () => {
    expect(mapUploadError(new Error("R2_ACCOUNT_ID_INVALID"))).toEqual({
      status: 500,
      error: "R2 Account ID geçersiz. Cloudflare’daki 32 karakterlik Account ID olmalı.",
    });
  });

  it("maps missing R2 config", () => {
    expect(mapUploadError(new Error("R2_REQUIRED"))).toEqual({
      status: 500,
      error: "Dosya deposu yapılandırılmamış (R2)",
    });
  });

  it("maps TLS handshake failures from the S3 client", () => {
    const error = Object.assign(
      new Error("write EPROTO ssl/tls alert handshake failure: SSL alert number 40"),
      { code: "EPROTO" },
    );
    expect(mapUploadError(error)).toEqual({
      status: 502,
      error: "Dosya deposuna bağlanılamadı (TLS). R2 endpoint ayarını kontrol edin.",
    });
  });

  it("maps S3 access and bucket errors", () => {
    expect(mapUploadError(Object.assign(new Error("AccessDenied"), { Code: "AccessDenied" }))).toEqual({
      status: 403,
      error: "Dosya deposu izni reddedildi",
    });
    expect(mapUploadError(Object.assign(new Error("The specified bucket does not exist"), { name: "NoSuchBucket" }))).toEqual({
      status: 500,
      error: "Dosya deposu bucket bulunamadı",
    });
  });

  it("maps database connectivity errors", () => {
    const error = Object.assign(new Error("Can't reach database server"), {
      name: "PrismaClientInitializationError",
    });
    expect(mapUploadError(error)).toEqual({
      status: 503,
      error: "Veritabanına bağlanılamadı",
    });
  });

  it("falls back to the generic upload message", () => {
    expect(mapUploadError(new Error("something else"))).toEqual({
      status: 500,
      error: "Yükleme başarısız",
    });
  });
});
