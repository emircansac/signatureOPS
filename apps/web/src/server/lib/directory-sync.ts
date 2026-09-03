import { createDelegatedJwt, listWorkspaceGroups, listWorkspaceUsers } from "@signatureops/adapters-google";
import { getGraphToken, listGraphGroups, listGraphUsers } from "@signatureops/adapters-microsoft";
import { prisma } from "@signatureops/db";
import { getServerEnv } from "@/env";

function json(value: unknown): string {
  return JSON.stringify(value);
}

async function upsertPerson(
  orgId: string,
  source: "GOOGLE" | "MICROSOFT",
  person: {
    externalId: string;
    email: string;
    displayName: string;
    jobTitle?: string;
    department?: string;
    country?: string;
    mobile?: string;
    officePhone?: string;
    photoUrl?: string;
    aliases?: string[];
    managerId?: string;
  },
) {
  const existing = await prisma.user.findFirst({
    where: {
      orgId,
      OR: [{ externalId: person.externalId }, { email: { equals: person.email, mode: "insensitive" } }],
    },
  });
  const data = {
    externalId: person.externalId,
    displayName: person.displayName,
    jobTitle: person.jobTitle ?? null,
    department: person.department ?? null,
    country: person.country ?? null,
    email: person.email,
    mobile: person.mobile ?? null,
    officePhone: person.officePhone ?? null,
    photoUrl: person.photoUrl ?? null,
    sendAsAliases: json(person.aliases?.length ? person.aliases : [person.email]),
    source,
    managerId: person.managerId ?? null,
  };
  if (existing) {
    await prisma.user.update({ where: { id: existing.id }, data });
    return existing.id;
  }
  const created = await prisma.user.create({
    data: { orgId, ...data },
  });
  return created.id;
}

export async function syncGoogleDirectory(orgId: string) {
  const env = getServerEnv();
  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!org?.googleImpersonateEmail) {
    throw new Error("Google Workspace admin email is not configured");
  }
  if (!env.GOOGLE_SA_CLIENT_EMAIL || !env.GOOGLE_SA_PRIVATE_KEY) {
    throw new Error("GOOGLE_SA_* platform credentials are not configured");
  }
  const auth = createDelegatedJwt(
    { clientEmail: env.GOOGLE_SA_CLIENT_EMAIL, privateKey: env.GOOGLE_SA_PRIVATE_KEY },
    org.googleImpersonateEmail,
  );
  const people = await listWorkspaceUsers(auth);
  const groups = await listWorkspaceGroups(auth);
  const emailToId = new Map<string, string>();
  for (const person of people) {
    const id = await upsertPerson(orgId, "GOOGLE", person);
    emailToId.set(person.email.toLowerCase(), id);
  }
  for (const group of groups) {
    const memberIds = group.memberEmails
      .map((email) => emailToId.get(email.toLowerCase()))
      .filter((id): id is string => Boolean(id));
    const existing = await prisma.group.findFirst({
      where: { orgId, externalId: group.externalId },
    });
    const payload = {
      name: group.name,
      memberIds: json(memberIds),
      source: "GOOGLE" as const,
    };
    if (existing) {
      await prisma.group.update({ where: { id: existing.id }, data: payload });
    } else {
      await prisma.group.create({
        data: { orgId, externalId: group.externalId, ...payload },
      });
    }
  }
  await prisma.syncState.upsert({
    where: { orgId },
    create: {
      orgId,
      lastGoogleSyncAt: new Date(),
      googleUserCount: people.length,
      googleError: null,
    },
    update: {
      lastGoogleSyncAt: new Date(),
      googleUserCount: people.length,
      googleError: null,
    },
  });
  return { users: people.length, groups: groups.length };
}

export async function syncMicrosoftDirectory(orgId: string) {
  const env = getServerEnv();
  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!org?.microsoftTenantId) throw new Error("Microsoft tenant id is not configured");
  if (!env.MICROSOFT_CLIENT_ID || !env.MICROSOFT_CLIENT_SECRET) {
    throw new Error("MICROSOFT_CLIENT_* platform credentials are not configured");
  }
  const token = await getGraphToken({
    tenantId: org.microsoftTenantId,
    clientId: env.MICROSOFT_CLIENT_ID,
    clientSecret: env.MICROSOFT_CLIENT_SECRET,
  });
  const people = await listGraphUsers(token);
  const groups = await listGraphGroups(token);
  const extToId = new Map<string, string>();
  for (const person of people) {
    const id = await upsertPerson(orgId, "MICROSOFT", person);
    extToId.set(person.externalId, id);
  }
  for (const group of groups) {
    const memberIds = group.memberIds
      .map((externalId) => extToId.get(externalId))
      .filter((id): id is string => Boolean(id));
    const existing = await prisma.group.findFirst({
      where: { orgId, externalId: group.externalId },
    });
    const payload = {
      name: group.name,
      memberIds: json(memberIds),
      source: "MICROSOFT" as const,
    };
    if (existing) {
      await prisma.group.update({ where: { id: existing.id }, data: payload });
    } else {
      await prisma.group.create({
        data: { orgId, externalId: group.externalId, ...payload },
      });
    }
  }
  await prisma.syncState.upsert({
    where: { orgId },
    create: {
      orgId,
      lastMicrosoftSyncAt: new Date(),
      microsoftUserCount: people.length,
      microsoftError: null,
    },
    update: {
      lastMicrosoftSyncAt: new Date(),
      microsoftUserCount: people.length,
      microsoftError: null,
    },
  });
  return { users: people.length, groups: groups.length };
}
