import { inngest } from "./client";
import { deployGmailSignatures } from "@/server/lib/gmail-deploy";
import { syncGoogleDirectory, syncMicrosoftDirectory } from "@/server/lib/directory-sync";
import { prisma } from "@signatureops/db";

async function recordGoogleSyncError(orgId: string, message: string) {
  await prisma.syncState.upsert({
    where: { orgId },
    create: { orgId, googleError: message },
    update: { googleError: message },
  });
}

async function recordMicrosoftSyncError(orgId: string, message: string) {
  await prisma.syncState.upsert({
    where: { orgId },
    create: { orgId, microsoftError: message },
    update: { microsoftError: message },
  });
}

export const googleDirectorySync = inngest.createFunction(
  { id: "google-directory-sync", retries: 3 },
  { event: "directory/google.sync" },
  async ({ event }) => {
    const { orgId } = event.data as { orgId: string };
    try {
      return await syncGoogleDirectory(orgId);
    } catch (err) {
      await recordGoogleSyncError(orgId, err instanceof Error ? err.message : "Google sync failed");
      throw err;
    }
  },
);

export const microsoftDirectorySync = inngest.createFunction(
  { id: "microsoft-directory-sync", retries: 3 },
  { event: "directory/microsoft.sync" },
  async ({ event }) => {
    const { orgId } = event.data as { orgId: string };
    try {
      return await syncMicrosoftDirectory(orgId);
    } catch (err) {
      await recordMicrosoftSyncError(
        orgId,
        err instanceof Error ? err.message : "Microsoft sync failed",
      );
      throw err;
    }
  },
);

export const gmailDeploy = inngest.createFunction(
  { id: "gmail-deploy", retries: 4, concurrency: { limit: 1 } },
  { event: "gmail/deploy" },
  async ({ event }) => {
    const { orgId, userIds } = event.data as { orgId: string; userIds?: string[] };
    return deployGmailSignatures(orgId, userIds);
  },
);

export const inngestFunctions = [googleDirectorySync, microsoftDirectorySync, gmailDeploy];
