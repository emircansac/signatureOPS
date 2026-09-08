export function sanitizeR2AccountId(raw: string): string {
  let value = raw.trim();
  value = value.replace(/^https?:\/\//i, "");
  value = value.split("/")[0] ?? value;
  value = value.replace(/\.r2\.cloudflarestorage\.com$/i, "");
  return value.replace(/\/+$/, "");
}

export function r2ApiEndpoint(opts: { accountId?: string; endpoint?: string }): string {
  const explicit = opts.endpoint?.trim();
  if (explicit) {
    const withProto = /^https?:\/\//i.test(explicit) ? explicit : `https://${explicit}`;
    return withProto.replace(/\/+$/, "");
  }
  const id = sanitizeR2AccountId(opts.accountId ?? "");
  return `https://${id}.r2.cloudflarestorage.com`;
}

export function r2S3ClientOptions(env: {
  R2_ACCOUNT_ID?: string;
  R2_ENDPOINT?: string;
  R2_ACCESS_KEY_ID: string;
  R2_SECRET_ACCESS_KEY: string;
}) {
  return {
    region: "auto" as const,
    endpoint: r2ApiEndpoint({ accountId: env.R2_ACCOUNT_ID, endpoint: env.R2_ENDPOINT }),
    forcePathStyle: true,
    requestChecksumCalculation: "WHEN_REQUIRED" as const,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
  };
}
