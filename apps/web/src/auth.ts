import NextAuth from "next-auth";
import type { Session } from "next-auth";
import type { JWT } from "next-auth/jwt";
import { prisma } from "@signatureops/db";
import { authConfig } from "./auth.config";
import { isAuthBypassed } from "@/lib/auth-bypass";

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

const nextAuth = NextAuth({
  ...authConfig,
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account?.provider === "google" && profile?.sub) {
        token.googleSub = profile.sub;
        if (profile.email) token.email = profile.email;
        if (profile.name) token.name = profile.name;
      }
      if (token.googleSub || token.email) {
        return attachOrg(token);
      }
      return token;
    },
    session: authConfig.callbacks?.session,
  },
});

export const { handlers, signIn, signOut } = nextAuth;

async function getDevBypassSession(): Promise<Session | null> {
  try {
    const admin = await prisma.adminUser.findFirst({
      include: { org: true },
      orderBy: { createdAt: "asc" },
    });
    if (!admin) return null;
    return {
      user: { email: admin.email, name: admin.name },
      expires: "2099-12-31T23:59:59.999Z",
      adminUserId: admin.id,
      orgId: admin.orgId,
      orgSlug: admin.org.slug,
      orgName: admin.org.name,
      role: admin.role,
      googleSub: admin.googleSub,
    };
  } catch {
    return null;
  }
}

export async function auth() {
  if (isAuthBypassed()) {
    const bypass = await getDevBypassSession();
    if (bypass) return bypass;
  }
  return nextAuth.auth();
}
