import createMiddleware from "next-intl/middleware";
import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { routing } from "./src/i18n/routing";
import { authConfig } from "./src/auth.config";
import { isAuthBypassed } from "./src/lib/auth-bypass";

const { auth } = NextAuth(authConfig);
const intlMiddleware = createMiddleware(routing);

const withAuth = auth((req) => {
  const { pathname } = req.nextUrl;
  const locale = pathname.startsWith("/en") ? "en" : "tr";
  const isApp = /^\/(tr|en)\/app(\/|$)/.test(pathname);

  if (isApp && !req.auth?.user) {
    return NextResponse.redirect(new URL(`/${locale}/giris`, req.nextUrl.origin));
  }

  return intlMiddleware(req);
});

export default isAuthBypassed() ? intlMiddleware : withAuth;

export const config = {
  matcher: ["/", "/(tr|en)/:path*"],
};
