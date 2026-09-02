"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { trpc } from "@/lib/trpc";
import { Badge, Button, PageHeading } from "@/components/ui";
import { orgPath, useOrgSlug } from "@/lib/org-path";
import { withCreateQuery } from "@/lib/create-query";
import { onboardingState, type OnboardingStepId } from "@/lib/onboarding";
import { cn } from "@/lib/utils";

const STEP_HREF: Record<OnboardingStepId, (slug: string) => string> = {
  identity: (slug) => orgPath(slug, "/assets"),
  directory: (slug) => withCreateQuery(orgPath(slug, "/directory")),
  campaign: (slug) => withCreateQuery(orgPath(slug, "/campaigns")),
  template: (slug) => withCreateQuery(orgPath(slug, "/templates")),
};

export default function DashboardPage() {
  const t = useTranslations("dashboard");
  const tc = useTranslations("common");
  const orgSlug = useOrgSlug();
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.org.dashboard.useQuery();
  const skipCampaign = trpc.org.skipCampaignOnboarding.useMutation({
    onSuccess: () => utils.org.dashboard.invalidate(),
  });

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <PageHeading title={t("title")} subtitle={t("subtitle")} />
        <div className="text-lead">{tc("loading")}</div>
      </div>
    );
  }

  const state = onboardingState(data);
  const showQuickActions = !state.showChecklist;

  const actions = [
    {
      href: orgPath(orgSlug, "/assets"),
      title: t("actions.updateIdentity.title"),
      desc: t("actions.updateIdentity.desc"),
    },
    {
      href: withCreateQuery(orgPath(orgSlug, "/directory")),
      title: t("actions.addPerson.title"),
      desc: t("actions.addPerson.desc"),
    },
    {
      href: withCreateQuery(orgPath(orgSlug, "/campaigns")),
      title: t("actions.startCampaign.title"),
      desc: t("actions.startCampaign.desc"),
    },
    {
      href: withCreateQuery(orgPath(orgSlug, "/templates")),
      title: t("actions.createTemplate.title"),
      desc: t("actions.createTemplate.desc"),
    },
  ];

  return (
    <div className="space-y-12">
      <PageHeading title={t("title")} subtitle={t("subtitle")} />

      {state.showChecklist ? (
        <section className="space-y-5" aria-label={t("onboardingTitle")}>
          <div className="space-y-3">
            <p className="text-[15px] font-medium text-ink">
              {t("progress", { completed: state.completedCount, total: state.totalCount })}
            </p>
            <div className="flex gap-1" aria-hidden="true">
              {Array.from({ length: state.totalCount }).map((_, index) => (
                <div
                  key={index}
                  className={cn(
                    "h-1.5 flex-1",
                    index < state.completedCount ? "bg-ink" : "bg-rule",
                  )}
                />
              ))}
            </div>
          </div>

          {state.completedVisible.length > 0 ? (
            <ul className="space-y-2">
              {state.completedVisible.map((id) => (
                <li key={id} className="text-sm text-lead">
                  <span className="mr-2 text-ink">✓</span>
                  {t(`steps.${id}.title`)}
                </li>
              ))}
            </ul>
          ) : null}

          <div className="grid gap-4">
            {state.incompleteVisible.map((id) => {
              const optional = id === "campaign";
              return (
                <div
                  key={id}
                  className={cn("border border-rule p-5", optional && "border-dashed")}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-[15px] font-medium text-ink">{t(`steps.${id}.title`)}</h2>
                    {optional ? <Badge>{t("optional")}</Badge> : null}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-lead">{t(`steps.${id}.desc`)}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link
                      href={STEP_HREF[id](orgSlug)}
                      className="inline-flex items-center justify-center bg-seal px-4 py-2 text-sm font-medium text-paper"
                    >
                      {t("doNow")}
                    </Link>
                    {optional ? (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => skipCampaign.mutate()}
                        disabled={skipCampaign.isPending}
                      >
                        {t("skip")}
                      </Button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {showQuickActions ? (
        <section aria-label={t("quickActions")}>
          <div className="grid gap-3 sm:grid-cols-2">
            {actions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="block border border-rule bg-paper px-4 py-3 hover:border-ink hover:bg-wash"
              >
                <p className="text-[15px] font-medium text-ink">{action.title}</p>
                <p className="mt-1 text-sm leading-5 text-lead">{action.desc}</p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          href={orgPath(orgSlug, "/templates")}
          className="block border border-rule px-4 py-3 hover:border-ink hover:bg-wash"
          aria-label={t("templateCount")}
        >
          <p className="text-sm text-lead">{t("templateCount")}</p>
          <p className="mt-1 font-serif text-3xl font-medium text-ink">{data.templateCount}</p>
        </Link>
        <Link
          href={orgPath(orgSlug, "/directory")}
          className="block border border-rule px-4 py-3 hover:border-ink hover:bg-wash"
          aria-label={t("userCount")}
        >
          <p className="text-sm text-lead">{t("userCount")}</p>
          <p className="mt-1 font-serif text-3xl font-medium text-ink">{data.userCount}</p>
        </Link>
      </div>

      <details className="border border-rule">
        <summary className="cursor-pointer px-5 py-4 text-[15px] font-medium text-ink">
          {t("gmailTitle")}
        </summary>
        <div className="border-t border-rule px-5 py-4">
          <p className="text-sm leading-6 text-lead">{t("gmailIntro")}</p>
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-ink">
            <li>{t("gmailStep1")}</li>
            <li>{t("gmailStep2")}</li>
            <li>{t("gmailStep3")}</li>
            <li>{t("gmailStep4")}</li>
          </ol>
        </div>
      </details>
    </div>
  );
}
