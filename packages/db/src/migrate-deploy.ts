import { spawnSync } from "node:child_process";
import { ensureDirectUrlEnv } from "./database-url.js";

function main() {
  ensureDirectUrlEnv();
  if (!process.env.DIRECT_URL?.trim()) {
    console.error("migrate:deploy requires DATABASE_URL or DIRECT_URL");
    process.exit(1);
  }
  if (!process.env.PRISMA_MIGRATE_ADVISORY_LOCK_TIMEOUT) {
    process.env.PRISMA_MIGRATE_ADVISORY_LOCK_TIMEOUT = "60000";
  }

  const result = spawnSync("prisma", ["migrate", "deploy"], {
    stdio: "inherit",
    env: process.env,
    shell: process.platform === "win32",
  });
  process.exit(result.status ?? 1);
}

main();
