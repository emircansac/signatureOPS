import { Prisma, type PrismaClient } from "@signatureops/db";
import { joinableEmailDomain, normalizeEmail } from "@/lib/email-domain";
import { pickOrgForJoinDomain } from "@/lib/org-join-select";

export type JoinedOrg = {
  adminId: string;
  orgId: string;
  slug: string;
  name: string;
  role: "SUPER_ADMIN" | "CONTENT_MANAGER";
};

type AdminLookup = {
  email?: string | null;
  googleSub?: string | null;
  name?: string | null;
};

function isUniqueViolation(error: unknown, field: string): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002" &&
    Array.isArray(error.meta?.target) &&
    error.meta.target.includes(field)
  );
}

async function findExistingAdmin(prisma: PrismaClient, input: AdminLookup) {
  const email = input.email ? normalizeEmail(input.email) : undefined;
  const googleSub = input.googleSub || undefined;
  if (!email && !googleSub) return null;

  return prisma.adminUser.findFirst({
    where: {
      OR: [
        ...(googleSub ? [{ googleSub }] : []),
        ...(email ? [{ email: { equals: email, mode: "insensitive" as const } }] : []),
      ],
    },
    select: {
      id: true,
      orgId: true,
      role: true,
      googleSub: true,
      email: true,
      org: { select: { slug: true, name: true, joinDomain: true } },
    },
  });
}

async function findJoinableOrg(prisma: PrismaClient, domain: string) {
  const claimed = await prisma.organization.findMany({
    where: { joinDomain: domain },
    select: {
      id: true,
      name: true,
      slug: true,
      joinDomain: true,
    },
  });
  const picked = pickOrgForJoinDomain(domain, claimed);
  if (picked) return picked;

  const founders = await prisma.adminUser.findMany({
    where: { role: "SUPER_ADMIN" },
    orderBy: { createdAt: "asc" },
    select: {
      email: true,
      org: {
        select: {
          id: true,
          name: true,
          slug: true,
          joinDomain: true,
        },
      },
    },
  });

  const fromFounder = founders
    .filter((admin) => joinableEmailDomain(admin.email) === domain && !admin.org.joinDomain)
    .map((admin) => admin.org);
  return fromFounder[0] ?? null;
}

export async function claimJoinDomainIfVacant(
  prisma: PrismaClient,
  orgId: string,
  email: string,
): Promise<void> {
  const domain = joinableEmailDomain(email);
  if (!domain) return;

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { joinDomain: true },
  });
  if (!org || org.joinDomain) return;

  try {
    await prisma.organization.update({
      where: { id: orgId },
      data: { joinDomain: domain },
    });
  } catch (error) {
    if (!isUniqueViolation(error, "joinDomain")) throw error;
  }
}

async function addContentManager(
  prisma: PrismaClient,
  org: { id: string; slug: string; name: string },
  input: { email: string; name?: string | null; googleSub?: string | null },
): Promise<JoinedOrg> {
  const email = normalizeEmail(input.email);
  try {
    const admin = await prisma.adminUser.create({
      data: {
        orgId: org.id,
        email,
        name: input.name?.trim() || email,
        googleSub: input.googleSub || null,
        role: "CONTENT_MANAGER",
      },
    });
    await claimJoinDomainIfVacant(prisma, org.id, email);
    return {
      adminId: admin.id,
      orgId: org.id,
      slug: org.slug,
      name: org.name,
      role: "CONTENT_MANAGER",
    };
  } catch (error) {
    if (!isUniqueViolation(error, "email")) throw error;
    const existing = await findExistingAdmin(prisma, input);
    if (!existing) throw error;
    return {
      adminId: existing.id,
      orgId: existing.orgId,
      slug: existing.org.slug,
      name: existing.org.name,
      role: existing.role,
    };
  }
}

export async function findMatchingJoinOrg(prisma: PrismaClient, email: string) {
  const domain = joinableEmailDomain(email);
  if (!domain) return null;
  const org = await findJoinableOrg(prisma, domain);
  if (!org) return null;
  return { id: org.id, name: org.name, slug: org.slug, domain };
}

export async function joinMatchingOrg(
  prisma: PrismaClient,
  input: AdminLookup,
): Promise<JoinedOrg | null> {
  const email = input.email ? normalizeEmail(input.email) : "";
  if (!email && !input.googleSub) return null;

  const existing = await findExistingAdmin(prisma, {
    ...input,
    email: email || undefined,
  });
  if (existing) {
    if (input.googleSub && existing.googleSub !== input.googleSub) {
      await prisma.adminUser.update({
        where: { id: existing.id },
        data: { googleSub: input.googleSub },
      });
    }
    if (!existing.org.joinDomain) {
      const founder = await prisma.adminUser.findFirst({
        where: { orgId: existing.orgId, role: "SUPER_ADMIN" },
        orderBy: { createdAt: "asc" },
        select: { email: true },
      });
      if (founder) {
        await claimJoinDomainIfVacant(prisma, existing.orgId, founder.email);
      }
    }
    return {
      adminId: existing.id,
      orgId: existing.orgId,
      slug: existing.org.slug,
      name: existing.org.name,
      role: existing.role,
    };
  }

  if (!email) return null;

  const match = await findMatchingJoinOrg(prisma, email);
  if (!match) return null;
  return addContentManager(
    prisma,
    { id: match.id, slug: match.slug, name: match.name },
    { email, name: input.name, googleSub: input.googleSub },
  );
}
