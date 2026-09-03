import { getTranslations, setRequestLocale } from "next-intl/server";
import { PublicHeader } from "@/components/public-header";

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("privacy");

  return (
    <div className="min-h-screen bg-paper">
      <PublicHeader locale={locale} actionHref="/giris" actionLabel={t("signIn")} />
      <main className="mx-auto max-w-[720px] space-y-6 px-6 py-16">
        <h1 className="font-serif text-3xl">{t("title")}</h1>
        <p className="text-sm leading-7 text-lead">{t("p1")}</p>
        <p className="text-sm leading-7 text-lead">{t("p2")}</p>
        <p className="text-sm leading-7 text-lead">{t("p3")}</p>
        <p className="text-sm leading-7 text-lead">{t("p4")}</p>
      </main>
    </div>
  );
}
