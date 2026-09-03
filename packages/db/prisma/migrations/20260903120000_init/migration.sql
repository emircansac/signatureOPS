-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "RuleLevel" AS ENUM ('USER', 'GROUP', 'DEPT_OFFICE', 'ORG');

-- CreateEnum
CREATE TYPE "AssetKind" AS ENUM ('LOGO', 'BANNER', 'CERTIFICATION', 'PHOTO', 'ICON');

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('SUPER_ADMIN', 'CONTENT_MANAGER');

-- CreateEnum
CREATE TYPE "DirectorySource" AS ENUM ('MANUAL', 'GOOGLE', 'MICROSOFT');

-- CreateEnum
CREATE TYPE "Provider" AS ENUM ('GOOGLE', 'MICROSOFT');

-- CreateEnum
CREATE TYPE "DeployStatus" AS ENUM ('PENDING', 'RUNNING', 'OK', 'FAILED', 'PARTIAL');

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "brandColors" TEXT NOT NULL DEFAULT '[]',
    "socialIconMode" TEXT NOT NULL DEFAULT 'standard',
    "onboardingSkipCampaign" BOOLEAN NOT NULL DEFAULT false,
    "googleWorkspaceDomain" TEXT,
    "googleImpersonateEmail" TEXT,
    "microsoftTenantId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "googleSub" TEXT,
    "role" "AdminRole" NOT NULL DEFAULT 'CONTENT_MANAGER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminInvite" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'CONTENT_MANAGER',
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "jobTitle" TEXT,
    "department" TEXT,
    "country" TEXT,
    "email" TEXT NOT NULL,
    "mobile" TEXT,
    "officePhone" TEXT,
    "photoUrl" TEXT,
    "sendAsAliases" TEXT NOT NULL DEFAULT '[]',
    "source" "DirectorySource" NOT NULL DEFAULT 'MANUAL',
    "managerId" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Group" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "memberIds" TEXT NOT NULL DEFAULT '[]',
    "source" "DirectorySource" NOT NULL DEFAULT 'MANUAL',

    CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Template" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "definition" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rule" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" "RuleLevel" NOT NULL,
    "priority" INTEGER NOT NULL,
    "conditions" TEXT NOT NULL,
    "actions" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bannerAssetId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "slogan" TEXT,
    "ctaText" TEXT,
    "ctaLink" TEXT,
    "logoOverrideAssetId" TEXT,
    "templateIds" TEXT NOT NULL DEFAULT '[]',

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandAsset" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "kind" "AssetKind" NOT NULL,
    "slot" TEXT,
    "url" TEXT NOT NULL,
    "bytes" INTEGER NOT NULL DEFAULT 0,
    "width" INTEGER,
    "height" INTEGER,
    "alt" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BrandAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deployment" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "userId" TEXT,
    "provider" "Provider" NOT NULL,
    "status" "DeployStatus" NOT NULL DEFAULT 'PENDING',
    "compiledHtmlHash" TEXT,
    "sanitizedDiff" TEXT,
    "error" TEXT,
    "attempt" INTEGER NOT NULL DEFAULT 0,
    "sendAsEmail" TEXT,
    "inngestRunId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Deployment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "payload" TEXT NOT NULL DEFAULT '{}',
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncState" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "lastGoogleSyncAt" TIMESTAMP(3),
    "lastMicrosoftSyncAt" TIMESTAMP(3),
    "googleError" TEXT,
    "microsoftError" TEXT,
    "googleUserCount" INTEGER NOT NULL DEFAULT 0,
    "microsoftUserCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SyncState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE INDEX "AdminUser_googleSub_idx" ON "AdminUser"("googleSub");

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_orgId_email_key" ON "AdminUser"("orgId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "AdminInvite_tokenHash_key" ON "AdminInvite"("tokenHash");

-- CreateIndex
CREATE INDEX "AdminInvite_orgId_email_idx" ON "AdminInvite"("orgId", "email");

-- CreateIndex
CREATE INDEX "User_orgId_email_idx" ON "User"("orgId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "User_orgId_externalId_key" ON "User"("orgId", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "Group_orgId_externalId_key" ON "Group"("orgId", "externalId");

-- CreateIndex
CREATE INDEX "BrandAsset_orgId_slot_idx" ON "BrandAsset"("orgId", "slot");

-- CreateIndex
CREATE INDEX "Deployment_orgId_provider_status_idx" ON "Deployment"("orgId", "provider", "status");

-- CreateIndex
CREATE INDEX "Deployment_orgId_createdAt_idx" ON "Deployment"("orgId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditEvent_orgId_at_idx" ON "AuditEvent"("orgId", "at");

-- CreateIndex
CREATE UNIQUE INDEX "SyncState_orgId_key" ON "SyncState"("orgId");

-- AddForeignKey
ALTER TABLE "AdminUser" ADD CONSTRAINT "AdminUser_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminInvite" ADD CONSTRAINT "AdminInvite_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Group" ADD CONSTRAINT "Group_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Template" ADD CONSTRAINT "Template_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rule" ADD CONSTRAINT "Rule_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandAsset" ADD CONSTRAINT "BrandAsset_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deployment" ADD CONSTRAINT "Deployment_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deployment" ADD CONSTRAINT "Deployment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncState" ADD CONSTRAINT "SyncState_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

