import { prisma } from "@signatureops/db";
import { outlookManifestXml } from "@/lib/outlook-manifest";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ orgSlug: string }> },
) {
  const { orgSlug } = await params;
  const slug = orgSlug.replace(/\.xml$/i, "").replace(/\.addin-only$/i, "");
  const addinOnly = orgSlug.includes("addin-only");
  const org = await prisma.organization.findUnique({ where: { slug } });
  if (!org) return new Response("unknown org", { status: 404 });

  const xml = outlookManifestXml({
    orgSlug: org.slug,
    orgName: org.name,
    variant: addinOnly ? "addin-only" : "unified",
  });

  return new Response(xml, {
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="signatureops-${org.slug}${addinOnly ? "-mac-mobile" : ""}.xml"`,
    },
  });
}
