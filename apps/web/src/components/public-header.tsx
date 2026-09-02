"use client";

import { Link, usePathname } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { LogoMark } from "@/components/logo-mark";

export function PublicHeader({
  locale,
  actionHref,
  actionLabel,
}: {
  locale: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  const pathname = usePathname();

  return (
    <header>
      <div className="mx-auto flex max-w-[1080px] items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="flex items-center gap-2.5 bg-transparent font-serif text-[1.15rem] font-medium leading-none text-ink"
        >
          <LogoMark size={30} />
          SignatureOps
        </Link>
        <div className="flex items-center gap-5 text-[13px] text-lead">
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
          {actionHref && actionLabel ? (
            <Link href={actionHref} className="hover:text-ink">
              {actionLabel}
            </Link>
          ) : null}
        </div>
      </div>
      <div className="h-px bg-rule" />
    </header>
  );
}
