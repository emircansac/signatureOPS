import Google from "next-auth/providers/google";
import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  trustHost: true,
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
