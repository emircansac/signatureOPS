import { auth } from "@/auth";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { PublicHeader } from "@/components/public-header";
import { LandingSigMark } from "@/components/landing-sig-mark";
import { SignatureLibrary } from "@/components/signature-library";

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await auth();
  const t = await getTranslations("marketing");

  const ctaHref = session?.orgSlug
    ? `/app/${session.orgSlug}`
    : session?.user
      ? "/onboarding"
      : "/giris";

  const features = [
    { title: t("feature1Title"), body: t("feature1Body") },
    { title: t("feature2Title"), body: t("feature2Body") },
    { title: t("feature3Title"), body: t("feature3Body") },
  ];

  return (
    <div className="min-h-screen bg-paper">
      <PublicHeader locale={locale} actionHref={ctaHref} actionLabel={t("signIn")} />

      <main>
        <section className="mx-auto max-w-[1080px] px-6 pb-14 pt-14 text-center lg:pb-16 lg:pt-16">
          <h1 className="font-serif mx-auto whitespace-nowrap pb-3 text-[clamp(1.45rem,4.4vw,3.15rem)] font-medium leading-[1.12] tracking-[-0.02em] text-ink">
            {t.rich("headline", {
              br: () => <br />,
              line: (chunks) => (
                <span className="relative inline-block whitespace-nowrap">
                  {chunks}
                  <LandingSigMark animated />
                </span>
              ),
            })}
          </h1>
          <p className="mx-auto mt-5 max-w-[32rem] text-[1.2rem] leading-8 text-ink">
            {t("subhead")}
          </p>
          <Link
            href={ctaHref}
            className="mt-8 inline-block bg-seal px-6 py-3 text-[16px] font-medium text-paper"
          >
            {t("cta")}
          </Link>
        </section>

        <section className="mx-auto max-w-[1080px] px-6 pb-14 pt-4 lg:pt-6">
          <h2 className="font-serif mx-auto whitespace-nowrap text-center text-[clamp(1.45rem,4.4vw,3.15rem)] font-medium leading-[1.12] tracking-[-0.02em] text-ink">
            {t("libraryHeadline")}
          </h2>
          <div className="mt-10">
            <SignatureLibrary
              chrome={{
                title: t("mockupTitle"),
                toLabel: t("mockupTo"),
                subjectLabel: t("mockupSubject"),
                send: t("mockupSend"),
                name: t("mockupName"),
                role: t("mockupRole"),
                company: t("mockupCompany"),
                phone: t("mockupPhone"),
                email: t("mockupEmail"),
              }}
              strips={[
                {
                  title: t("library1Title"),
                  functionLine: t("library1Function"),
                  to: t("library1To"),
                  subject: t("library1Subject"),
                  body: t("library1Body"),
                  variant: "cta",
                  cta: t("mockupCta"),
                  ctaContext: t("library1Context"),
                },
                {
                  title: t("library2Title"),
                  functionLine: t("library2Function"),
                  to: t("library2To"),
                  subject: t("library2Subject"),
                  body: t("library2Body"),
                  variant: "banner",
                  banner: t("mockupBanner"),
                },
                {
                  title: t("library3Title"),
                  functionLine: t("library3Function"),
                  to: t("library3To"),
                  subject: t("library3Subject"),
                  body: t("library3Body"),
                  variant: "plain",
                },
              ]}
            />
          </div>
        </section>

        <section className="mx-auto max-w-[1080px] px-6 pb-14 pt-2">
          <div className="border border-rule">
            <div className="grid md:grid-cols-3">
              {features.map((feature) => (
                <div key={feature.title} className="px-8 py-7 md:px-10">
                  <h2 className="relative inline-block pb-1 text-[15px] font-medium leading-snug whitespace-nowrap text-ink">
                    {feature.title}
                    <LandingSigMark />
                  </h2>
                  <p className="mt-3.5 max-w-[22em] text-[14px] leading-[1.7] text-lead">
                    {feature.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer>
        <div className="h-px bg-rule" />
        <div className="mx-auto flex max-w-[1080px] items-center justify-between px-6 py-4 text-[12px] text-lead">
          <span>© SignatureOps</span>
          <div className="flex gap-5">
            <a href="#iletisim" className="hover:text-ink">
              {t("contact")}
            </a>
            <a href="#gizlilik" className="hover:text-ink">
              {t("privacy")}
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
