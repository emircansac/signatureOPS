import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PublicHeader } from "@/components/public-header";
import { GoogleSignInButton } from "@/components/google-sign-in-button";

export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await auth();

  if (session?.orgSlug) {
    redirect(`/${locale}/app/${session.orgSlug}`);
  }
  if (session?.user) {
    redirect(`/${locale}/onboarding`);
  }

  const t = await getTranslations("auth");

  return (
    <div className="min-h-screen bg-paper">
      <PublicHeader locale={locale} />
      <main className="mx-auto max-w-[1080px] px-6 py-16">
        <h1 className="font-serif text-[clamp(2rem,3.5vw,2.6rem)] font-medium text-ink">
          {t("signInTitle")}
        </h1>
        <p className="mt-4 max-w-md text-[1.02rem] leading-7 text-lead">{t("signInHint")}</p>
        <div className="mt-8 max-w-xs">
          <GoogleSignInButton />
        </div>
      </main>
    </div>
  );
}
