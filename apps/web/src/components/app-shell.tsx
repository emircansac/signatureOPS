"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { signOut } from "next-auth/react";
import { Link, usePathname } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { orgPath } from "@/lib/org-path";
import { LogoMark } from "@/components/logo-mark";
import type { ReactNode } from "react";

function isActive(pathname: string, href: string, exact = false) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({
  locale,
  orgSlug,
  orgName,
  hideSignOut = false,
  children,
}: {
  locale: string;
  orgSlug: string;
  orgName: string;
  hideSignOut?: boolean;
  children: ReactNode;
}) {
  const t = useTranslations("common");
  const tn = useTranslations("nav");
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const dashboardHref = orgPath(orgSlug);
  const primaryNav = [
    { href: dashboardHref, key: "dashboard" as const, exact: true },
    { href: orgPath(orgSlug, "/templates"), key: "templates" as const, exact: false },
  ];
  const secondaryNav = [
    { href: orgPath(orgSlug, "/assets"), key: "assets" as const },
    { href: orgPath(orgSlug, "/directory"), key: "directory" as const },
    { href: orgPath(orgSlug, "/campaigns"), key: "campaigns" as const },
    { href: orgPath(orgSlug, "/rules"), key: "rules" as const },
    { href: orgPath(orgSlug, "/simulate"), key: "simulate" as const },
  ];

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!sidebarOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSidebarOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sidebarOpen]);

  return (
    <div className="min-h-screen bg-paper">
      <header className="sticky top-0 z-40 bg-paper">
        <div className="mx-auto flex max-w-[1080px] items-center justify-between gap-4 px-6 py-4">
          <div className="flex min-w-0 items-center gap-4">
            <button
              type="button"
              aria-label={sidebarOpen ? tn("closeMenu") : tn("openMenu")}
              aria-expanded={sidebarOpen}
              onClick={() => setSidebarOpen((v) => !v)}
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center border border-rule text-ink",
                sidebarOpen && "border-ink",
              )}
            >
              <span className="text-lg leading-none">{sidebarOpen ? "×" : "☰"}</span>
            </button>
            <Link
              href={dashboardHref}
              className="flex min-w-0 items-center gap-2.5 bg-transparent font-serif text-[1.15rem] font-medium leading-none text-ink"
            >
              <LogoMark size={30} className="shrink-0" />
              <span className="truncate">{t("appName")}</span>
            </Link>
            {orgName ? (
              <span className="hidden truncate text-[13px] text-lead sm:inline">{orgName}</span>
            ) : null}
            <nav className="hidden items-center gap-5 lg:flex">
              {primaryNav.map((item) => (
                <Link
                  key={item.key}
                  href={item.href}
                  className={cn(
                    "text-[13px]",
                    isActive(pathname, item.href, item.exact)
                      ? "text-ink"
                      : "text-lead hover:text-ink",
                  )}
                >
                  {t(item.key)}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex shrink-0 items-center gap-5 text-[13px] text-lead">
            <Link
              href={pathname}
              locale="tr"
              className={cn(locale === "tr" ? "text-ink" : "hover:text-ink")}
            >
              TR
            </Link>
            <Link
              href={pathname}
              locale="en"
              className={cn(locale === "en" ? "text-ink" : "hover:text-ink")}
            >
              EN
            </Link>
            {hideSignOut ? null : (
              <button
                type="button"
                className="hover:text-ink"
                onClick={() => signOut({ callbackUrl: `/${locale}` })}
              >
                {t("signOut")}
              </button>
            )}
          </div>
        </div>
        <div className="h-px bg-rule" />
        <nav className="flex gap-5 overflow-x-auto px-6 py-3 lg:hidden">
          {primaryNav.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className={cn(
                "shrink-0 text-[13px]",
                isActive(pathname, item.href, item.exact)
                  ? "text-ink"
                  : "text-lead hover:text-ink",
              )}
            >
              {t(item.key)}
            </Link>
          ))}
        </nav>
        <div className="h-px bg-rule lg:hidden" />
      </header>

      {sidebarOpen ? (
        <button
          type="button"
          aria-label={tn("closeMenu")}
          className="fixed inset-0 z-40 bg-ink/20"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-full w-72 flex-col border-r border-rule bg-paper transition-transform duration-200",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between border-b border-rule px-5 py-4">
          <div>
            <p className="text-sm font-medium text-ink">{tn("management")}</p>
            <p className="mt-0.5 text-[13px] text-lead">{tn("managementHint")}</p>
          </div>
          <button
            type="button"
            aria-label={tn("closeMenu")}
            onClick={() => setSidebarOpen(false)}
            className="flex h-8 w-8 items-center justify-center text-lead hover:text-ink"
          >
            ×
          </button>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {secondaryNav.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={cn(
                "block px-3 py-3",
                isActive(pathname, item.href) ? "text-ink" : "text-lead hover:text-ink",
              )}
            >
              <span className="font-medium">{t(item.key)}</span>
              <span className="mt-0.5 block text-[13px] text-lead">{tn(`desc.${item.key}`)}</span>
            </Link>
          ))}
        </nav>
        <div className="border-t border-rule p-4">
          <Link
            href={dashboardHref}
            onClick={() => setSidebarOpen(false)}
            className="text-[13px] text-lead hover:text-ink"
          >
            {tn("backToPanel")}
          </Link>
        </div>
      </aside>

      <main className="mx-auto max-w-[1080px] px-6 py-10">{children}</main>
    </div>
  );
}
