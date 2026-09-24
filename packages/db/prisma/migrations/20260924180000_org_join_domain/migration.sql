-- AlterTable
ALTER TABLE "Organization" ADD COLUMN "joinDomain" TEXT;

-- Backfill from the first SUPER_ADMIN email domain when it is not a public mailbox.
WITH first_admin AS (
  SELECT DISTINCT ON ("orgId")
    "orgId",
    lower(split_part(email, '@', 2)) AS domain
  FROM "AdminUser"
  WHERE role = 'SUPER_ADMIN'
  ORDER BY "orgId", "createdAt" ASC
),
claimable AS (
  SELECT "orgId", domain
  FROM first_admin
  WHERE domain <> ''
    AND domain NOT IN (
      'aol.com',
      'gmail.com',
      'googlemail.com',
      'hotmail.com',
      'hotmail.com.tr',
      'icloud.com',
      'live.com',
      'mac.com',
      'mail.com',
      'me.com',
      'msn.com',
      'outlook.com',
      'outlook.com.tr',
      'proton.me',
      'protonmail.com',
      'yahoo.com',
      'ymail.com'
    )
),
unique_domains AS (
  SELECT domain
  FROM claimable
  GROUP BY domain
  HAVING COUNT(*) = 1
)
UPDATE "Organization" AS org
SET "joinDomain" = claimable.domain
FROM claimable
JOIN unique_domains ON unique_domains.domain = claimable.domain
WHERE org.id = claimable."orgId"
  AND org."joinDomain" IS NULL;

-- Claim leftover orgs from the Workspace domain field when still vacant.
UPDATE "Organization" AS org
SET "joinDomain" = lower(org."googleWorkspaceDomain")
WHERE org."joinDomain" IS NULL
  AND org."googleWorkspaceDomain" IS NOT NULL
  AND org."googleWorkspaceDomain" <> ''
  AND lower(org."googleWorkspaceDomain") NOT IN (
    'aol.com',
    'gmail.com',
    'googlemail.com',
    'hotmail.com',
    'hotmail.com.tr',
    'icloud.com',
    'live.com',
    'mac.com',
    'mail.com',
    'me.com',
    'msn.com',
    'outlook.com',
    'outlook.com.tr',
    'proton.me',
    'protonmail.com',
    'yahoo.com',
    'ymail.com'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM "Organization" AS other
    WHERE other."joinDomain" = lower(org."googleWorkspaceDomain")
  );

-- CreateIndex
CREATE UNIQUE INDEX "Organization_joinDomain_key" ON "Organization"("joinDomain");
