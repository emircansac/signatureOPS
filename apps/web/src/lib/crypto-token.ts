import { createHash, randomBytes } from "node:crypto";

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function newInviteToken(): { token: string; tokenHash: string } {
  const token = randomBytes(24).toString("base64url");
  return { token, tokenHash: hashToken(token) };
}

export function hashHtml(html: string): string {
  return createHash("sha256").update(html).digest("hex");
}
