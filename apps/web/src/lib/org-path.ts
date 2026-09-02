"use client";

import { usePathname } from "@/i18n/routing";

export function useOrgSlug() {
  const pathname = usePathname();
  const match = pathname.match(/^\/app\/([^/]+)/);
  return match?.[1] ?? "";
}

export function orgPath(slug: string, suffix = "") {
  return `/app/${slug}${suffix}`;
}
