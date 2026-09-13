import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PublicHeader } from "@/components/public-header";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { isAuthBypassed } from "@/lib/auth-bypass";

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { locale } = await params;
  const { error } = await searchParams;
  setRequestLocale(locale);
  const session = await auth();

  if (!error && session?.orgSlug) {
    redirect(`/${locale}/app/${session.orgSlug}`);
  }
  if (!error && session?.user) {
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
        {error ? (
          <p className="mt-4 max-w-md text-sm text-seal" role="alert">
            {error === "Configuration" ? t("configError") : t("signInError")}
          </p>
        ) : null}
        {isAuthBypassed() ? (
          <p className="mt-8 max-w-md text-[1.02rem] leading-7 text-lead">
            Google girişi şimdilik kapalı. Panel için `pnpm db:seed` çalıştırın.
          </p>
        ) : (
          <div className="mt-8 max-w-xs">
            <GoogleSignInButton />
          </div>
        )}
      </main>
    </div>
  );
}
