export type MappedUploadError = {
  status: number;
  error: string;
};

function collectErrorParts(error: unknown): { message: string; code: string; name: string } {
  const messages: string[] = [];
  let code = "";
  let name = "";
  let current: unknown = error;
  for (let hops = 0; current && hops < 6; hops += 1) {
    if (current instanceof Error) {
      messages.push(current.message);
      name ||= current.name;
      const withCode = current as { code?: unknown };
      if (typeof withCode.code === "string" && withCode.code) code ||= withCode.code;
      current = current.cause;
      continue;
    }
    if (typeof current === "object") {
      const obj = current as {
        message?: unknown;
        code?: unknown;
        Code?: unknown;
        name?: unknown;
        cause?: unknown;
      };
      if (typeof obj.message === "string") messages.push(obj.message);
      if (typeof obj.code === "string" && obj.code) code ||= obj.code;
      if (typeof obj.Code === "string" && obj.Code) code ||= obj.Code;
      if (typeof obj.name === "string" && obj.name) name ||= obj.name;
      current = obj.cause;
      continue;
    }
    break;
  }
  return { message: messages.join(" "), code, name };
}

export function mapUploadError(error: unknown): MappedUploadError {
  if (error instanceof Error && error.message === "TYPE") {
    return { status: 400, error: "Sadece PNG, JPEG, GIF veya WebP yüklenebilir" };
  }
  if (error instanceof Error && error.message === "SIZE") {
    return { status: 400, error: "Dosya 500 KB'dan küçük olmalı" };
  }
  if (error instanceof Error && error.message === "R2_REQUIRED") {
    return { status: 500, error: "Dosya deposu yapılandırılmamış (R2)" };
  }

  const { message, code, name } = collectErrorParts(error);
  const combined = `${name} ${code} ${message}`;

  if (code === "EPROTO" || /handshake failure|sslv3 alert|ssl\/tls alert/i.test(combined)) {
    return {
      status: 502,
      error: "Dosya deposuna bağlanılamadı (TLS). R2 endpoint ayarını kontrol edin.",
    };
  }
  if (/AccessDenied/i.test(combined) || code === "AccessDenied") {
    return { status: 403, error: "Dosya deposu izni reddedildi" };
  }
  if (/NoSuchBucket/i.test(combined) || code === "NoSuchBucket") {
    return { status: 500, error: "Dosya deposu bucket bulunamadı" };
  }
  if (
    /PrismaClient/i.test(combined) ||
    /^P100\d$/.test(code) ||
    /Can't reach database|ECONNREFUSED/i.test(combined)
  ) {
    return { status: 503, error: "Veritabanına bağlanılamadı" };
  }

  return { status: 500, error: "Yükleme başarısız" };
}
