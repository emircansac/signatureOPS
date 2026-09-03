import { JWT } from "google-auth-library";
import { GOOGLE_DWD_SCOPES, type GoogleServiceAccount } from "./types.js";

export function createDelegatedJwt(
  account: GoogleServiceAccount,
  subject: string,
  scopes: readonly string[] = GOOGLE_DWD_SCOPES,
): JWT {
  const key = account.privateKey.replace(/\\n/g, "\n");
  return new JWT({
    email: account.clientEmail,
    key,
    scopes: [...scopes],
    subject,
  });
}

export async function googleAccessToken(auth: JWT): Promise<string> {
  const token = await auth.getAccessToken();
  if (!token.token) throw new Error("Google access token missing");
  return token.token;
}
