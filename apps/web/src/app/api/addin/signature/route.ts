import { prisma } from "@signatureops/db";
import { compileUserSignature } from "@/server/lib/compile-user-signature";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const orgSlug = url.searchParams.get("org")?.trim() ?? "";
  const email = url.searchParams.get("email")?.trim() ?? "";
  if (!orgSlug || !email) {
    return new Response("org and email required", { status: 400 });
  }

  const org = await prisma.organization.findUnique({ where: { slug: orgSlug } });
  if (!org) return new Response("unknown org", { status: 404 });

  const compiled = await compileUserSignature(prisma, {
    orgId: org.id,
    email,
    messageType: "new",
    recipientType: "external",
  });
  if (!compiled?.result.renderedHtml) {
    return new Response("no signature for this mailbox", { status: 404 });
  }

  return new Response(compiled.result.renderedHtml, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, max-age=60",
    },
  });
}
