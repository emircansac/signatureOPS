import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { TRPCProvider } from "@/lib/trpc";
import { AppShell } from "@/components/app-shell";
import "../globals.css";

export const metadata: Metadata = {
  title: "SignatureOps",
  description: "Privacy-first email signature management",
};

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as "tr" | "en")) notFound();
  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider messages={messages}>
          <TRPCProvider>
            <AppShell locale={locale}>{children}</AppShell>
          </TRPCProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
