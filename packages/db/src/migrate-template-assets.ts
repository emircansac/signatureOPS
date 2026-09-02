import { PrismaClient, type AssetKind } from "@prisma/client";

const prisma = new PrismaClient();

const IMAGE_KEYS = ["imageUrl", "imageFile", "image", "src"] as const;

function looksLikeImageUrl(value: string): boolean {
  if (value.startsWith("/uploads/")) return true;
  if (value.startsWith("https://") || value.startsWith("http://")) {
    return /\.(png|jpe?g|gif|webp)(\?|$)/i.test(value) || /\/(logo|banner|icon|badge|image)/i.test(value);
  }
  return false;
}

function kindForBlock(type: string): AssetKind {
  if (type === "company_logo") return "LOGO";
  if (type === "campaign_banner") return "BANNER";
  if (type === "certifications") return "CERTIFICATION";
  if (type === "profile_photo") return "PHOTO";
  return "ICON";
}

function collectIds(blocks: Array<Record<string, unknown>>): string[] {
  const ids: string[] = [];
  for (const block of blocks) {
    if (typeof block.assetId === "string" && block.assetId) ids.push(block.assetId);
    if (Array.isArray(block.assetIds)) {
      for (const id of block.assetIds) {
        if (typeof id === "string" && id) ids.push(id);
      }
    }
  }
  return [...new Set(ids)];
}

async function migrateOrg(orgId: string) {
  const templates = await prisma.template.findMany({ where: { orgId } });
  for (const template of templates) {
    const raw = JSON.parse(template.definition) as {
      layout?: string;
      blocks?: Array<Record<string, unknown>>;
    };
    if (!Array.isArray(raw.blocks)) continue;

    for (const block of raw.blocks) {
      const type = typeof block.type === "string" ? block.type : "";
      const leftover = IMAGE_KEYS.map((key) => block[key]).find(
        (value): value is string => typeof value === "string" && value.trim().length > 0,
      );

      if (typeof block.campaignId === "string" && block.campaignId.startsWith("asset:")) {
        block.assetId = block.campaignId.slice("asset:".length);
        block.campaignId = "";
      }

      if (leftover && !(typeof block.assetId === "string" && block.assetId)) {
        if (!looksLikeImageUrl(leftover)) {
          block.migrationWarning = `Bu görsel taşınamadı (${leftover}), lütfen yeniden seçin`;
        } else {
          const created = await prisma.brandAsset.create({
            data: {
              orgId,
              kind: kindForBlock(type),
              url: leftover,
              alt: "Kaynağı belirsiz (migrated)",
              bytes: 0,
            },
          });
          block.assetId = created.id;
          if (type === "certifications") {
            const ids = Array.isArray(block.assetIds) ? (block.assetIds as string[]) : [];
            block.assetIds = [...ids, created.id];
          }
        }
      }

      for (const key of IMAGE_KEYS) delete block[key];
    }

    await prisma.template.update({
      where: { id: template.id },
      data: { definition: JSON.stringify(raw) },
    });
    console.log(`${template.name}: ${collectIds(raw.blocks).length} asset ref(s)`);
  }
}

async function main() {
  const orgs = await prisma.organization.findMany({ select: { id: true, name: true } });
  for (const org of orgs) {
    console.log(`Migrating ${org.name}`);
    await migrateOrg(org.id);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
