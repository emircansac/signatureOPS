import type { JWT } from "google-auth-library";
import { googleAccessToken } from "./auth.js";
import type { SendAsSignature } from "./types.js";

async function gmailJson<T>(
  auth: JWT,
  url: string,
  init?: RequestInit,
): Promise<T> {
  const token = await googleAccessToken(auth);
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gmail API ${res.status}: ${body.slice(0, 500)}`);
  }
  if (res.status === 204) return {} as T;
  return (await res.json()) as T;
}

function sendAsUrl(userEmail: string, sendAsEmail: string): string {
  return `https://gmail.googleapis.com/gmail/v1/users/${encodeURIComponent(userEmail)}/settings/sendAs/${encodeURIComponent(sendAsEmail)}`;
}

export async function listSendAs(
  auth: JWT,
  userEmail: string,
): Promise<SendAsSignature[]> {
  const data = await gmailJson<{ sendAs?: SendAsSignature[] }>(
    auth,
    `https://gmail.googleapis.com/gmail/v1/users/${encodeURIComponent(userEmail)}/settings/sendAs`,
  );
  return data.sendAs ?? [];
}

export async function getSendAsSignature(
  auth: JWT,
  userEmail: string,
  sendAsEmail: string,
): Promise<string> {
  const data = await gmailJson<{ signature?: string }>(auth, sendAsUrl(userEmail, sendAsEmail));
  return data.signature ?? "";
}

/**
 * Writes a Gmail signature for one sendAs alias, then reads it back.
 * Gmail sanitizes HTML on save — never assume stored === submitted.
 */
export async function updateSendAsSignature(
  auth: JWT,
  userEmail: string,
  sendAsEmail: string,
  html: string,
): Promise<{ submitted: string; stored: string }> {
  await gmailJson(auth, sendAsUrl(userEmail, sendAsEmail), {
    method: "PATCH",
    body: JSON.stringify({ signature: html }),
  });
  const stored = await getSendAsSignature(auth, userEmail, sendAsEmail);
  return { submitted: html, stored };
}
