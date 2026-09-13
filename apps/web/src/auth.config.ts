import Google from "next-auth/providers/google";
import type { NextAuthConfig } from "next-auth";
import { sanitizeAuthEnv } from "./lib/auth-env";

sanitizeAuthEnv();

export const authConfig = {
  trustHost: true,
  pages: {
    signIn: "/tr/giris",
    error: "/tr/giris",
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
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
