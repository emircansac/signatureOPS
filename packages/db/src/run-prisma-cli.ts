import { spawnSync } from "node:child_process";
import { ensureDirectUrlEnv } from "./database-url.js";

function main() {
  ensureDirectUrlEnv();
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error("Usage: run-prisma-cli.ts <prisma subcommand...>");
    process.exit(1);
  }
  const result = spawnSync("prisma", args, {
    stdio: "inherit",
    env: process.env,
    shell: process.platform === "win32",
  });
  process.exit(result.status ?? 1);
}

main();
