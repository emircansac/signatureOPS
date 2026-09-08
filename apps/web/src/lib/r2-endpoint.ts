const R2_HOST_SUFFIX = ".r2.cloudflarestorage.com";
const ACCOUNT_ID_RE = /^[a-f0-9]{32}(\.[a-z0-9]+)?$/i;

export function sanitizeR2AccountId(raw: string): string {
  let value = raw.trim().replace(/^["']+|["']+$/g, "").trim();
  value = value.replace(/^https?:\/\//i, "");
  value = value.split("/")[0] ?? value;
  value = value.replace(/\s+/g, "");
  value = value.replace(/\.r2\.cloudflarestorage\.com$/i, "");
  return value.replace(/\/+$/, "");
}

export function r2ApiEndpoint(opts: {
  accountId?: string;
  endpoint?: string;
  jurisdiction?: string;
}): string {
  const explicit = opts.endpoint?.trim().replace(/^["']+|["']+$/g, "");
  if (explicit) {
    const withProto = /^https?:\/\//i.test(explicit) ? explicit : `https://${explicit}`;
    return withProto.replace(/\/+$/, "");
  }
  const id = sanitizeR2AccountId(opts.accountId ?? "");
  const jurisdiction = opts.jurisdiction?.trim().toLowerCase();
  if (jurisdiction && !id.includes(".")) {
    return `https://${id}.${jurisdiction}${R2_HOST_SUFFIX}`;
  }
  return `https://${id}${R2_HOST_SUFFIX}`;
}

export function r2EndpointHostname(endpoint: string): string {
  return new URL(endpoint).hostname;
}

export function assertR2Endpoint(opts: { accountId?: string; endpoint?: string; jurisdiction?: string }): string {
  const endpoint = r2ApiEndpoint(opts);
  if (opts.endpoint?.trim()) return endpoint;
  const id = sanitizeR2AccountId(opts.accountId ?? "");
  if (!ACCOUNT_ID_RE.test(id)) {
    throw new Error("R2_ACCOUNT_ID_INVALID");
  }
  return endpoint;
}

export function r2S3ClientOptions(env: {
  R2_ACCOUNT_ID?: string;
  R2_ENDPOINT?: string;
  R2_JURISDICTION?: string;
  R2_ACCESS_KEY_ID: string;
  R2_SECRET_ACCESS_KEY: string;
}) {
  const endpoint = assertR2Endpoint({
    accountId: env.R2_ACCOUNT_ID,
    endpoint: env.R2_ENDPOINT,
    jurisdiction: env.R2_JURISDICTION,
  });
  return {
    region: "auto" as const,
    endpoint,
    forcePathStyle: true,
    requestChecksumCalculation: "WHEN_REQUIRED" as const,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
  };
}
