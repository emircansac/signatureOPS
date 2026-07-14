import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const defaultTemplate = {
  layout: "single-column",
  blocks: [
    { type: "identity", fields: ["displayName", "jobTitle"] },
    { type: "contact_details", fields: ["email", "mobile"] },
    { type: "company_logo", assetId: "asset-logo" },
    { type: "legal_disclaimer", text: "Bu e-posta gizlidir. {{organization.name}}" },
  ],
};

const salesTemplate = {
  layout: "two-column",
  blocks: [
    { type: "company_logo", assetId: "asset-logo" },
    { type: "identity", fields: ["displayName", "jobTitle", "department"] },
    { type: "contact_details", fields: ["email", "mobile"] },
    { type: "cta_button", label: "Demo Talep Et", url: "https://acme.com/demo" },
    { type: "legal_disclaimer", text: "Satış iletişimi — {{organization.name}}" },
  ],
};

const executiveTemplate = {
  layout: "single-column",
  blocks: [
    { type: "profile_photo" },
    { type: "identity", fields: ["displayName", "jobTitle"] },
    { type: "contact_details", fields: ["email", "officePhone"] },
    { type: "company_logo", assetId: "asset-logo" },
    { type: "certifications", items: ["ISO 27001", "SOC 2"] },
    { type: "legal_disclaimer", text: "Yönetici iletişimi — gizlidir." },
  ],
};

async function main() {
  await prisma.auditEvent.deleteMany();
  await prisma.deployment.deleteMany();
  await prisma.rule.deleteMany();
  await prisma.template.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.brandAsset.deleteMany();
  await prisma.group.deleteMany();
  await prisma.user.deleteMany();
  await prisma.adminUser.deleteMany();
  await prisma.organization.deleteMany();

  const org = await prisma.organization.create({
    data: {
      name: "Acme Corp",
      provider: "BOTH",
    },
  });

  await prisma.adminUser.create({
    data: {
      orgId: org.id,
      email: "admin@acme.com",
      name: "Demo Admin",
      role: "SUPER_ADMIN",
    },
  });

  await prisma.brandAsset.create({
    data: {
      id: "asset-logo",
      orgId: org.id,
      kind: "LOGO",
      url: "https://cdn.acme.com/logo.png",
      bytes: 12000,
      width: 120,
      height: 40,
      alt: "Acme Corp",
    },
  });

  await prisma.brandAsset.create({
    data: {
      id: "asset-banner",
      orgId: org.id,
      kind: "BANNER",
      url: "https://cdn.acme.com/spring-banner.png",
      bytes: 45000,
      width: 400,
      height: 80,
      alt: "Spring Campaign",
    },
  });

  const campaign = await prisma.campaign.create({
    data: {
      id: "camp-spring",
      orgId: org.id,
      name: "Spring 2026",
      bannerAssetId: "asset-banner",
      startDate: new Date("2026-03-01"),
      endDate: new Date("2026-06-30"),
      targeting: JSON.stringify({ departments: ["Marketing", "Sales"] }),
    },
  });

  const users = [
    { externalId: "g-001", displayName: "Ayşe Yılmaz", jobTitle: "Sales Manager", department: "Sales", country: "TR", email: "ayse@acme.com", mobile: "5551234567", photoUrl: "https://cdn.acme.com/ayse.jpg" },
    { externalId: "g-002", displayName: "Mehmet Demir", jobTitle: "VP Sales", department: "Sales", country: "TR", email: "mehmet@acme.com", mobile: "5559876543" },
    { externalId: "g-003", displayName: "Zeynep Kaya", jobTitle: "Marketing Lead", department: "Marketing", country: "TR", email: "zeynep@acme.com", mobile: "5551112233" },
    { externalId: "g-004", displayName: "John Smith", jobTitle: "Account Executive", department: "Sales", country: "US", email: "john@acme.com", mobile: "5554445566" },
    { externalId: "g-005", displayName: "Anna Müller", jobTitle: "HR Manager", department: "HR", country: "DE", email: "anna@acme.com" },
    { externalId: "g-006", displayName: "Can Öztürk", jobTitle: "Engineer", department: "Engineering", country: "TR", email: "can@acme.com" },
    { externalId: "g-007", displayName: "Elif Arslan", jobTitle: "Designer", department: "Marketing", country: "TR", email: "elif@acme.com" },
    { externalId: "g-008", displayName: "David Lee", jobTitle: "Support Lead", department: "Support", country: "US", email: "david@acme.com" },
    { externalId: "g-009", displayName: "Selin Ak", jobTitle: "Finance Analyst", department: "Finance", country: "TR", email: "selin@acme.com" },
    { externalId: "g-010", displayName: "Burak Yıldız", jobTitle: "CTO", department: "Engineering", country: "TR", email: "burak@acme.com", officePhone: "5550001122" },
  ];

  const createdUsers = [];
  for (const u of users) {
    const user = await prisma.user.create({
      data: {
        orgId: org.id,
        externalId: u.externalId,
        displayName: u.displayName,
        jobTitle: u.jobTitle,
        department: u.department,
        country: u.country,
        email: u.email,
        mobile: u.mobile,
        officePhone: u.officePhone,
        photoUrl: u.photoUrl,
        sendAsAliases: JSON.stringify([u.email]),
        attributes: JSON.stringify({}),
      },
    });
    createdUsers.push(user);
  }

  await prisma.group.create({
    data: {
      id: "grp-sales",
      orgId: org.id,
      externalId: "grp-sales-ext",
      name: "Sales Team",
      memberIds: JSON.stringify([createdUsers[0]!.id, createdUsers[1]!.id, createdUsers[3]!.id]),
    },
  });

  await prisma.group.create({
    data: {
      id: "grp-marketing",
      orgId: org.id,
      externalId: "grp-mkt-ext",
      name: "Marketing Team",
      memberIds: JSON.stringify([createdUsers[2]!.id, createdUsers[6]!.id]),
    },
  });

  const tplDefault = await prisma.template.create({
    data: {
      id: "tpl-default",
      orgId: org.id,
      name: "Default Signature",
      definition: JSON.stringify(defaultTemplate),
      compatibility: JSON.stringify({ outlookSafe: true, darkMode: false, mobileWidth: 320 }),
    },
  });

  const tplSales = await prisma.template.create({
    data: {
      id: "tpl-sales",
      orgId: org.id,
      name: "Sales External",
      definition: JSON.stringify(salesTemplate),
      compatibility: JSON.stringify({ outlookSafe: true, darkMode: false, mobileWidth: 400 }),
    },
  });

  await prisma.template.create({
    data: {
      id: "tpl-executive",
      orgId: org.id,
      name: "Executive",
      definition: JSON.stringify(executiveTemplate),
      compatibility: JSON.stringify({ outlookSafe: true, darkMode: true, mobileWidth: 320 }),
    },
  });

  const rules = [
    {
      id: "rule-org",
      name: "Org Default",
      level: "ORG" as const,
      priority: 100,
      conditions: [],
      actions: [{ type: "select_template", templateId: tplDefault.id }],
    },
    {
      id: "rule-dept-sales",
      name: "Sales External",
      level: "DEPT_OFFICE" as const,
      priority: 50,
      conditions: [
        { type: "department", operator: "eq", value: "Sales" },
        { type: "recipient_type", operator: "eq", value: "external" },
      ],
      actions: [{ type: "select_template", templateId: tplSales.id }],
    },
    {
      id: "rule-user-ayse",
      name: "Ayşe Executive Override",
      level: "USER" as const,
      priority: 10,
      conditions: [{ type: "user", operator: "eq", value: createdUsers[0]!.id }],
      actions: [
        { type: "select_template", templateId: "tpl-executive" },
        { type: "select_disclaimer", text: "Yönetici gizlilik bildirimi" },
      ],
    },
    {
      id: "rule-group-mkt",
      name: "Marketing Banner",
      level: "GROUP" as const,
      priority: 20,
      conditions: [{ type: "group", operator: "in", value: ["grp-marketing"] }],
      actions: [{ type: "select_banner", campaignId: campaign.id }],
    },
    {
      id: "rule-internal",
      name: "Internal Simplified",
      level: "DEPT_OFFICE" as const,
      priority: 60,
      conditions: [{ type: "recipient_type", operator: "eq", value: "internal" }],
      actions: [{ type: "hide_block", blockType: "legal_disclaimer" }],
    },
  ];

  for (const r of rules) {
    await prisma.rule.create({
      data: {
        id: r.id,
        orgId: org.id,
        name: r.name,
        level: r.level,
        priority: r.priority,
        conditions: JSON.stringify(r.conditions),
        actions: JSON.stringify(r.actions),
        enabled: true,
      },
    });
  }

  console.log(`Seeded org: ${org.name} (${org.id})`);
  console.log(`Users: ${createdUsers.length}, Templates: 3, Rules: ${rules.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
