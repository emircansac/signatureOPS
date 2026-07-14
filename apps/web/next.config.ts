import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  transpilePackages: [
    "@signatureops/schema",
    "@signatureops/compiler",
    "@signatureops/linter",
    "@signatureops/rules",
    "@signatureops/db",
  ],
  serverExternalPackages: ["@prisma/client"],
};

export default withNextIntl(nextConfig);
