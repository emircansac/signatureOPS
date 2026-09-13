import Google from "next-auth/providers/google";
import type { NextAuthConfig } from "next-auth";
import { authSecret, googleAuthCredentials, sanitizeAuthEnv } from "./lib/auth-env";

sanitizeAuthEnv();

const google = googleAuthCredentials();
const secret = authSecret();

export const authConfig = {
  trustHost: true,
  ...(secret ? { secret } : {}),
  pages: {
    signIn: "/tr/giris",
    error: "/tr/giris",
  },
  providers: google
    ? [
        Google({
          clientId: google.clientId,
          clientSecret: google.clientSecret,
        }),
      ]
    : [],
  session: { strategy: "jwt" },
  callbacks: {
    session({ session, token }) {
      session.adminUserId = token.adminUserId ?? null;
      session.orgId = token.orgId ?? null;
      session.orgSlug = token.orgSlug ?? null;
      session.orgName = token.orgName ?? null;
      session.role = token.role ?? null;
      session.googleSub = token.googleSub ?? null;
      return session;
    },
  },
} satisfies NextAuthConfig;
