import { auth } from "@/auth";
import { routing } from "@/i18n/routing";
import { NextResponse } from "next/server";

function localeFromCookie(req: Request): string {
  const cookie = req.headers.get("cookie") ?? "";
  const match = cookie.match(/(?:^|; )NEXT_LOCALE=([^;]+)/);
  const value = match?.[1];
  if (value && routing.locales.includes(value as "tr" | "en")) return value;
  return routing.defaultLocale;
}

export async function GET(req: Request) {
  const session = await auth();
  const locale = localeFromCookie(req);
  const origin = new URL(req.url).origin;

  if (!session?.user) {
    return NextResponse.redirect(new URL(`/${locale}/giris`, origin));
  }
  if (!session.orgSlug) {
    return NextResponse.redirect(new URL(`/${locale}/onboarding`, origin));
  }
  return NextResponse.redirect(new URL(`/${locale}/app/${session.orgSlug}`, origin));
}
