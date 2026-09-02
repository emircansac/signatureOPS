import NextAuth from "next-auth";
import type { JWT } from "next-auth/jwt";
import { prisma } from "@signatureops/db";
import { authConfig } from "./auth.config";

async function attachOrg(token: JWT): Promise<JWT> {
  const googleSub = typeof token.googleSub === "string" ? token.googleSub : undefined;
  const email = typeof token.email === "string" ? token.email : undefined;
  if (!googleSub && !email) return token;

  const admin = await prisma.adminUser.findFirst({
    where: {
      OR: [...(googleSub ? [{ googleSub }] : []), ...(email ? [{ email }] : [])],
    },
    include: { org: true },
  });

  if (!admin) {
    token.adminUserId = null;
    token.orgId = null;
    token.orgSlug = null;
    token.orgName = null;
    token.role = null;
    return token;
  }

  if (googleSub && admin.googleSub !== googleSub) {
    await prisma.adminUser.update({
      where: { id: admin.id },
      data: { googleSub },
    });
  }

  token.adminUserId = admin.id;
  token.orgId = admin.orgId;
  token.orgSlug = admin.org.slug;
  token.orgName = admin.org.name;
  token.role = admin.role;
  return token;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    async jwt({ token, account, profile, trigger }) {
      if (account?.provider === "google" && profile?.sub) {
        token.googleSub = profile.sub;
        if (profile.email) token.email = profile.email;
        if (profile.name) token.name = profile.name;
        return attachOrg(token);
      }
      if (trigger === "update") {
        return attachOrg(token);
      }
      return token;
    },
    session: authConfig.callbacks?.session,
  },
});
