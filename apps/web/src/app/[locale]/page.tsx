"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui";

const managementLinks = [
  { href: "/assets", key: "assets" },
  { href: "/directory", key: "directory" },
  { href: "/campaigns", key: "campaigns" },
  { href: "/audit", key: "audit" },
] as const;

export default function DashboardPage() {
  const t = useTranslations("dashboard");
  const tc = useTranslations("common");
  const tn = useTranslations("nav");
  const { data: org, isLoading } = trpc.org.get.useQuery();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-zinc-500">{t("subtitle")}</p>
        </div>
        <div>{tc("loading")}</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-zinc-500">{t("subtitle")}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <p className="text-sm text-zinc-500">{t("templateCount")}</p>
          <p className="text-3xl font-bold">{org?._count.templates ?? 0}</p>
        </Card>
        <Card>
          <p className="text-sm text-zinc-500">{t("userCount")}</p>
          <p className="text-3xl font-bold">{org?._count.users ?? 0}</p>
        </Card>
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold">{t("workflow")}</h2>
        <Link href="/templates">
          <Card className="transition-shadow hover:shadow-md">
            <span className="mb-2 inline-block rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
              {tc("templates")}
            </span>
            <p className="text-sm text-zinc-600">{tn("desc.templates")}</p>
          </Card>
        </Link>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">{t("gmailTitle")}</h2>
        <Card>
          <p className="text-sm text-zinc-600">{t("gmailIntro")}</p>
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-zinc-700">
            <li>{t("gmailStep1")}</li>
            <li>{t("gmailStep2")}</li>
            <li>{t("gmailStep3")}</li>
            <li>{t("gmailStep4")}</li>
          </ol>
        </Card>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t("management")}</h2>
          <p className="text-xs text-zinc-400">{t("managementHint")}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {managementLinks.map((item) => (
            <Link key={item.key} href={item.href}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <p className="font-medium">{tc(item.key)}</p>
                <p className="mt-1 text-sm text-zinc-500">{tn(`desc.${item.key}`)}</p>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
