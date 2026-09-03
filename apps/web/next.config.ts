import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  transpilePackages: [
    "@signatureops/schema",
    "@signatureops/compiler",
    "@signatureops/linter",
    "@signatureops/rules",
    "@signatureops/db",
    "@signatureops/adapters-google",
    "@signatureops/adapters-microsoft",
  ],
  serverExternalPackages: ["@prisma/client", "xlsx", "@aws-sdk/client-s3", "inngest"],
  async headers() {
    return [
      {
        source: "/addin/:path*",
        headers: [
          ...securityHeaders.filter((h) => h.key !== "Strict-Transport-Security"),
          {
            key: "Content-Security-Policy",
            value:
              "frame-ancestors https://*.office.com https://*.office365.com https://*.microsoft.com https://outlook.office.com https://outlook.office365.com 'self'",
          },
        ],
      },
      {
        source: "/:path*",
        headers: [
          ...securityHeaders,
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
