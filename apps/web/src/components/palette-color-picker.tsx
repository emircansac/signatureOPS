"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { trpc } from "@/lib/trpc";
import { useOrgSlug, orgPath } from "@/lib/org-path";
import { cn } from "@/lib/utils";

export function PaletteColorPicker({
  value,
  onChange,
}: {
  value?: string | null;
  onChange: (colorId: string | null) => void;
}) {
  const t = useTranslations("templates");
  const orgSlug = useOrgSlug();
  const { data } = trpc.identity.get.useQuery();
  const colors = data?.colors ?? [];

  if (colors.length === 0) {
    return (
      <p className="text-sm text-lead">
        {t("emptyPalette")}{" "}
        <Link href={orgPath(orgSlug, "/assets")} className="text-ink underline">
          {t("goToIdentity")}
        </Link>
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => onChange(null)}
        className={cn(
          "border px-2 py-1 text-xs",
          !value ? "border-ink text-ink" : "border-rule text-lead hover:border-ink",
        )}
      >
        {t("defaultTokenColor")}
      </button>
      {colors.map((color) => {
        const id = color.id ?? color.hex;
        const active = value === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={cn(
              "flex items-center gap-2 border px-2 py-1 text-xs",
              active ? "border-ink" : "border-rule hover:border-ink",
            )}
          >
            <span
              className="inline-block h-4 w-4 border border-rule"
              style={{ backgroundColor: color.hex }}
              aria-hidden
            />
            <span className="text-ink">{color.label?.trim() || color.hex}</span>
          </button>
        );
      })}
    </div>
  );
}
