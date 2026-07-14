"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

const primaryNav = [
  { href: "/", key: "dashboard" },
  { href: "/templates", key: "templates" },
] as const;

const secondaryNav = [
  { href: "/assets", key: "assets" },
  { href: "/directory", key: "directory" },
  { href: "/campaigns", key: "campaigns" },
  { href: "/audit", key: "audit" },
] as const;

const secondaryPaths = secondaryNav.map((item) => item.href);

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function AppShell({ locale, children }: { locale: string; children: ReactNode }) {
  const t = useTranslations("common");
  const tn = useTranslations("nav");
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const onSecondaryRoute = secondaryPaths.some((p) => pathname.startsWith(p));

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
    <div className="min-h-screen bg-zinc-50">
      <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              aria-label={sidebarOpen ? tn("closeMenu") : tn("openMenu")}
              aria-expanded={sidebarOpen}
              onClick={() => setSidebarOpen((v) => !v)}
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-md border transition-colors",
                sidebarOpen || onSecondaryRoute
                  ? "border-blue-200 bg-blue-50 text-[#0066cc]"
                  : "border-zinc-200 text-zinc-600 hover:bg-zinc-100",
              )}
            >
              <span className="text-lg leading-none">{sidebarOpen ? "×" : "☰"}</span>
            </button>
            <Link href="/" className="truncate text-lg font-bold text-[#0066cc]">
              {t("appName")}
            </Link>
            <nav className="hidden items-center gap-1 lg:flex">
              {primaryNav.map((item) => (
                <Link
                  key={item.key}
                  href={item.href}
                  className={cn(
                    "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive(pathname, item.href)
                      ? "bg-blue-50 text-[#0066cc]"
                      : "text-zinc-600 hover:bg-zinc-100",
                  )}
                >
                  {t(item.key)}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex shrink-0 items-center gap-2 text-sm">
            <Link
              href={pathname}
              locale="tr"
              className={cn(
                "rounded px-2 py-1",
                locale === "tr" ? "bg-blue-100 font-semibold text-[#0066cc]" : "text-zinc-500",
              )}
            >
              TR
            </Link>
            <Link
              href={pathname}
              locale="en"
              className={cn(
                "rounded px-2 py-1",
                locale === "en" ? "bg-blue-100 font-semibold text-[#0066cc]" : "text-zinc-500",
              )}
            >
              EN
            </Link>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto border-t border-zinc-100 px-4 py-2 lg:hidden">
          {primaryNav.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className={cn(
                "shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                isActive(pathname, item.href)
                  ? "bg-blue-50 text-[#0066cc]"
                  : "text-zinc-600 hover:bg-zinc-100",
              )}
            >
              {t(item.key)}
            </Link>
          ))}
        </nav>
      </header>

      {sidebarOpen && (
        <button
          type="button"
          aria-label={tn("closeMenu")}
          className="fixed inset-0 z-40 bg-black/30 lg:bg-black/20"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-full w-72 flex-col border-r border-zinc-200 bg-white shadow-xl transition-transform duration-200",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
              {tn("management")}
            </p>
            <p className="text-sm text-zinc-500">{tn("managementHint")}</p>
          </div>
          <button
            type="button"
            aria-label={tn("closeMenu")}
            onClick={() => setSidebarOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100"
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
                "block rounded-lg px-3 py-3 transition-colors",
                isActive(pathname, item.href)
                  ? "bg-blue-50 text-[#0066cc]"
                  : "text-zinc-700 hover:bg-zinc-50",
              )}
            >
              <span className="font-medium">{t(item.key)}</span>
              <span className="mt-0.5 block text-xs text-zinc-500">
                {tn(`desc.${item.key}`)}
              </span>
            </Link>
          ))}
        </nav>
        <div className="border-t border-zinc-100 p-4">
          <Link
            href="/"
            onClick={() => setSidebarOpen(false)}
            className="text-sm text-zinc-500 hover:text-[#0066cc]"
          >
            ← {tn("backToPanel")}
          </Link>
        </div>
      </aside>

      <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
    </div>
  );
}
