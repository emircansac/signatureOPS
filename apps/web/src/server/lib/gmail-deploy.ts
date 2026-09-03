import {
  createDelegatedJwt,
  diffSanitizedHtml,
  updateSendAsSignature,
} from "@signatureops/adapters-google";
import { prisma } from "@signatureops/db";
import { getServerEnv } from "@/env";
import { hashHtml } from "@/lib/crypto-token";
import { compileUserSignature } from "@/server/lib/compile-user-signature";

export async function deployGmailSignatures(orgId: string, userIds?: string[]) {
  const env = getServerEnv();
  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!org?.googleImpersonateEmail) {
    throw new Error("Google Workspace admin email is not configured");
  }
  if (!env.GOOGLE_SA_CLIENT_EMAIL || !env.GOOGLE_SA_PRIVATE_KEY) {
    throw new Error("GOOGLE_SA_* platform credentials are not configured");
  }

  const users = await prisma.user.findMany({
    where: {
      orgId,
      ...(userIds?.length ? { id: { in: userIds } } : {}),
    },
  });

  let ok = 0;
  let failed = 0;

  for (const user of users) {
    const compiled = await compileUserSignature(prisma, {
      orgId,
      userId: user.id,
      sendingAlias: user.email,
    });
    const html = compiled?.result.renderedHtml;
    if (!html) {
      await prisma.deployment.create({
        data: {
          orgId,
          userId: user.id,
          provider: "GOOGLE",
          status: "FAILED",
          error: "No compiled HTML (missing template or rule result)",
          sendAsEmail: user.email,
        },
      });
      failed += 1;
      continue;
    }

    const aliases: string[] = (() => {
      try {
        const parsed = JSON.parse(user.sendAsAliases) as string[];
        return parsed.length ? parsed : [user.email];
      } catch {
        return [user.email];
      }
    })();

    for (const alias of aliases) {
      const row = await prisma.deployment.create({
        data: {
          orgId,
          userId: user.id,
          provider: "GOOGLE",
          status: "RUNNING",
          compiledHtmlHash: hashHtml(html),
          sendAsEmail: alias,
          attempt: 1,
        },
      });
      try {
        const userAuth = createDelegatedJwt(
          { clientEmail: env.GOOGLE_SA_CLIENT_EMAIL, privateKey: env.GOOGLE_SA_PRIVATE_KEY },
          user.email,
        );
        const { submitted, stored } = await updateSendAsSignature(userAuth, user.email, alias, html);
        const diff = diffSanitizedHtml(submitted, stored);
        await prisma.deployment.update({
          where: { id: row.id },
          data: {
            status: "OK",
            sanitizedDiff: JSON.stringify(diff),
            error: null,
          },
        });
        ok += 1;
      } catch (err) {
        await prisma.deployment.update({
          where: { id: row.id },
          data: {
            status: "FAILED",
            error: err instanceof Error ? err.message : "Gmail deploy failed",
          },
        });
        failed += 1;
      }
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  return { users: users.length, ok, failed };
}
