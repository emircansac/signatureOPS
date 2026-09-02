"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { trpc } from "@/lib/trpc";
import { PageHeading } from "@/components/ui";
import { orgPath, useOrgSlug } from "@/lib/org-path";

export default function DashboardPage() {
  const t = useTranslations("dashboard");
  const tc = useTranslations("common");
  const tn = useTranslations("nav");
  const orgSlug = useOrgSlug();
  const { data: org, isLoading } = trpc.org.get.useQuery();

  const managementLinks = [
    { href: orgPath(orgSlug, "/assets"), key: "assets" },
    { href: orgPath(orgSlug, "/directory"), key: "directory" },
    { href: orgPath(orgSlug, "/campaigns"), key: "campaigns" },
    { href: orgPath(orgSlug, "/audit"), key: "audit" },
  ] as const;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeading title={t("title")} subtitle={t("subtitle")} />
        <div className="text-lead">{tc("loading")}</div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <PageHeading title={t("title")} subtitle={t("subtitle")} />

      <div className="grid divide-y divide-rule md:grid-cols-2 md:divide-x md:divide-y-0">
        <div className="py-4 md:py-0 md:pr-8">
          <p className="text-sm text-lead">{t("templateCount")}</p>
          <p className="mt-1 font-serif text-3xl font-medium text-ink">
            {org?._count.templates ?? 0}
          </p>
        </div>
        <div className="py-4 md:py-0 md:pl-8">
          <p className="text-sm text-lead">{t("userCount")}</p>
          <p className="mt-1 font-serif text-3xl font-medium text-ink">
            {org?._count.users ?? 0}
          </p>
        </div>
      </div>

      <section>
        <h2 className="mb-3 text-[15px] font-medium text-ink">{t("workflow")}</h2>
        <Link href={orgPath(orgSlug, "/templates")} className="block border border-rule p-5">
          <p className="text-[15px] font-medium text-ink">{tc("templates")}</p>
          <p className="mt-2 text-sm leading-6 text-lead">{tn("desc.templates")}</p>
        </Link>
      </section>

      <section>
        <h2 className="mb-3 text-[15px] font-medium text-ink">{t("gmailTitle")}</h2>
        <div className="border border-rule p-5">
          <p className="text-sm leading-6 text-lead">{t("gmailIntro")}</p>
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-ink">
            <li>{t("gmailStep1")}</li>
            <li>{t("gmailStep2")}</li>
            <li>{t("gmailStep3")}</li>
            <li>{t("gmailStep4")}</li>
          </ol>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between gap-4">
          <h2 className="text-[15px] font-medium text-ink">{t("management")}</h2>
          <p className="text-xs text-lead">{t("managementHint")}</p>
        </div>
        <div className="grid divide-y divide-rule sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
          {managementLinks.map((item) => (
            <Link key={item.key} href={item.href} className="block px-0 py-5 sm:px-5 sm:first:pl-0">
              <p className="font-medium text-ink">{tc(item.key)}</p>
              <p className="mt-1 text-sm leading-6 text-lead">{tn(`desc.${item.key}`)}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
