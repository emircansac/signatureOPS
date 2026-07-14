import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import { prisma } from "@signatureops/db";

export const createTRPCContext = async () => {
  const org = await prisma.organization.findFirst({
    include: { admins: true },
  });

  return {
    prisma,
    orgId: org?.id ?? null,
    actor: org?.admins[0]?.email ?? "demo@acme.com",
  };
};

export type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>;

const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;
