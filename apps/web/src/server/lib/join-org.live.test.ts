import { PrismaClient } from "@prisma/client";
import { afterAll, describe, expect, it } from "vitest";
import { joinMatchingOrg } from "./join-org";

const prisma = new PrismaClient();

const hasPostgres = Boolean(process.env.DATABASE_URL?.startsWith("postgresql"));

describe.skipIf(!hasPostgres)("joinMatchingOrg against the database", () => {
  const suffix = Date.now().toString(36);
  const domain = `verify-${suffix}.com`;
  let orgId = "";

  afterAll(async () => {
    if (orgId) {
      await prisma.organization.delete({ where: { id: orgId } }).catch(() => undefined);
    }
    await prisma.$disconnect();
  });

  it("joins the claimed company domain and ignores public or other domains", async () => {
    const org = await prisma.organization.create({
      data: {
        name: "Join Verify",
        slug: `join-verify-${suffix}`,
        joinDomain: domain,
        intro: "Domain join verification workspace.",
        admins: {
          create: {
            email: `founder@${domain}`,
            name: "Founder",
            role: "SUPER_ADMIN",
          },
        },
      },
    });
    orgId = org.id;

    const teammate = await joinMatchingOrg(prisma, {
      email: `Ada@${domain.toUpperCase()}`,
      name: "Ada",
      googleSub: `sub-${suffix}`,
    });
    expect(teammate?.orgId).toBe(org.id);
    expect(teammate?.role).toBe("CONTENT_MANAGER");

    const again = await joinMatchingOrg(prisma, {
      email: `ada@${domain}`,
      googleSub: `sub-${suffix}`,
    });
    expect(again?.adminId).toBe(teammate?.adminId);

    await expect(
      joinMatchingOrg(prisma, { email: "someone.else@gmail.com", name: "Gmail User" }),
    ).resolves.toBeNull();
    await expect(
      joinMatchingOrg(prisma, { email: "ada@other-company.example", name: "Other" }),
    ).resolves.toBeNull();
  });
});
