import createMiddleware from "next-intl/middleware";
import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { routing } from "./src/i18n/routing";
import { authConfig } from "./src/auth.config";

const { auth } = NextAuth(authConfig);
const intlMiddleware = createMiddleware(routing);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const locale = pathname.startsWith("/en") ? "en" : "tr";
  const isApp = /^\/(tr|en)\/app(\/|$)/.test(pathname);

  if (isApp) {
    if (!req.auth?.user) {
      return NextResponse.redirect(new URL(`/${locale}/giris`, req.nextUrl.origin));
    }
    if (!req.auth.orgSlug) {
      return NextResponse.redirect(new URL(`/${locale}/onboarding`, req.nextUrl.origin));
    }
    const match = pathname.match(/^\/(tr|en)\/app\/([^/]+)/);
    if (match && match[2] !== req.auth.orgSlug) {
      return NextResponse.redirect(
        new URL(`/${match[1]}/app/${req.auth.orgSlug}`, req.nextUrl.origin),
      );
    }
  }

  return intlMiddleware(req);
});

export const config = {
  matcher: ["/", "/(tr|en)/:path*"],
};
