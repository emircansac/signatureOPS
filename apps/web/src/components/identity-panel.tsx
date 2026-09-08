"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc";
import {
  SOCIAL_PLATFORMS,
  normalizeHex,
  ensureColorId,
  type BrandColor,
} from "@/lib/identity";
import { ImageSlotEditor } from "@/components/image-slot-editor";
import { Button, Card, Input, Label } from "@/components/ui";
import { cn } from "@/lib/utils";

const MAX_COLORS = 6;

export function IdentityPanel() {
  const t = useTranslations("identity");
  const tc = useTranslations("common");
  const [advanced, setAdvanced] = useState(false);
  const { data, isLoading } = trpc.identity.get.useQuery();

  if (isLoading || !data) {
    return <p className="text-sm text-lead">{tc("loading")}</p>;
  }

  const logo = data.slots.logo ?? null;
  const banner = data.slots.banner ?? null;

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h2 className="text-[15px] font-medium text-ink">{t("basic")}</h2>
        <Card className="space-y-5">
          <div>
            <h2 className="text-[15px] font-medium text-ink">{t("logo")}</h2>
            <p className="mt-1 text-sm text-lead">{t("logoHint")}</p>
          </div>
          <ImageSlotEditor slot="logo" asset={logo} required />
          {advanced ? (
            <div className="space-y-3 border-t border-rule pt-5">
              <p className="text-sm text-lead">{t("logoVariantsHint")}</p>
              <div className="grid gap-3 lg:grid-cols-3">
                {(
                  [
                    ["logo_light", "logoLight"],
                    ["logo_dark", "logoDark"],
                    ["logo_mark", "logoMark"],
                  ] as const
                ).map(([slot, key]) => (
                  <div key={slot} className="border border-rule p-4">
                    <p className="mb-3 text-sm font-medium text-ink">{t(key)}</p>
                    <ImageSlotEditor slot={slot} asset={data.slots[slot] ?? null} compact />
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </Card>

        <PaletteCard initial={data.colors} />

        <Card className="space-y-5">
          <div>
            <h2 className="text-[15px] font-medium text-ink">{t("banner")}</h2>
            <p className="mt-1 text-sm text-lead">{t("bannerHint")}</p>
          </div>
          <ImageSlotEditor slot="banner" asset={banner} />
        </Card>
      </section>

      <button
        type="button"
        onClick={() => setAdvanced((v) => !v)}
        className="text-sm text-lead hover:text-ink"
      >
        {advanced ? t("hideAdvanced") : t("showAdvanced")}
      </button>

      {advanced ? (
        <section className="space-y-4">
          <Card className="space-y-5">
            <div>
              <h2 className="text-[15px] font-medium text-ink">{t("certs")}</h2>
              <p className="mt-1 text-sm text-lead">{t("certsHint")}</p>
            </div>
            {data.certifications.map((asset) => (
              <div key={asset.id} className="border border-rule p-4">
                <ImageSlotEditor slot="certification" asset={asset} compact />
              </div>
            ))}
            <div className="border border-rule p-4">
              <p className="mb-3 text-sm font-medium text-ink">{t("addCert")}</p>
              <ImageSlotEditor slot="certification" compact />
            </div>
          </Card>

          <Card className="space-y-5">
            <div>
              <h2 className="text-[15px] font-medium text-ink">{t("profile")}</h2>
              <p className="mt-1 text-sm text-lead">{t("profileHint")}</p>
            </div>
            <ImageSlotEditor slot="profile_fallback" asset={data.slots.profile_fallback ?? null} />
          </Card>

          <SocialCard
            mode={data.socialIconMode}
            slots={data.slots}
          />

          <Card className="space-y-5">
            <div>
              <h2 className="text-[15px] font-medium text-ink">{t("ctaIcon")}</h2>
              <p className="mt-1 text-sm text-lead">{t("ctaIconHint")}</p>
            </div>
            <ImageSlotEditor slot="cta_icon" asset={data.slots.cta_icon ?? null} />
          </Card>

          <Card className="space-y-5">
            <div>
              <h2 className="text-[15px] font-medium text-ink">{t("legalBadge")}</h2>
              <p className="mt-1 text-sm text-lead">{t("legalBadgeHint")}</p>
            </div>
            <ImageSlotEditor slot="legal_badge" asset={data.slots.legal_badge ?? null} />
          </Card>
        </section>
      ) : null}
    </div>
  );
}

function paletteSignature(colors: BrandColor[]): string {
  return JSON.stringify(
    colors.map((color) => ({
      id: color.id ?? "",
      hex: color.hex.trim().toUpperCase(),
      label: color.label?.trim() ?? "",
    })),
  );
}

function PaletteCard({ initial }: { initial: BrandColor[] }) {
  const t = useTranslations("identity");
  const tc = useTranslations("common");
  const utils = trpc.useUtils();
  const [colors, setColors] = useState<BrandColor[]>(initial);
  const colorsRef = useRef(colors);
  colorsRef.current = colors;
  const [error, setError] = useState("");
  const save = trpc.identity.setColors.useMutation({
    onSuccess: (next) => {
      setColors(next);
      utils.identity.get.invalidate();
      setError("");
    },
    onError: (err) => setError(err.message),
  });

  useEffect(() => {
    if (paletteSignature(colorsRef.current) !== paletteSignature(initial)) return;
    setColors(initial);
  }, [initial]);

  const dirty = paletteSignature(colors) !== paletteSignature(initial);

  const persist = () => {
    const parsed = colors.map((color, index) => {
      const hex = normalizeHex(color.hex);
      return hex
        ? { id: color.id || ensureColorId({ hex, label: color.label }, index), hex, label: color.label?.trim() || undefined }
        : null;
    });
    if (parsed.some((color) => !color)) {
      setError(t("hexInvalid"));
      return;
    }
    save.mutate(parsed as BrandColor[]);
  };

  const updateAt = (index: number, patch: Partial<BrandColor>) => {
    setError("");
    setColors((current) => current.map((color, i) => (i === index ? { ...color, ...patch } : color)));
  };

  return (
    <Card className="space-y-5">
      <div>
        <h2 className="text-[15px] font-medium text-ink">{t("palette")}</h2>
        <p className="mt-1 text-sm text-lead">{t("paletteHint")}</p>
      </div>
      <div className="space-y-3">
        {colors.map((color, index) => (
          <div key={color.id ?? `color-${index}`} className="grid gap-3 sm:grid-cols-[3rem_8rem_1fr_auto] sm:items-end">
            <div>
              <Label>{t("swatch")}</Label>
              <input
                type="color"
                aria-label={t("swatch")}
                value={normalizeHex(color.hex) ?? "#1C2B3A"}
                onChange={(e) => updateAt(index, { hex: e.target.value.toUpperCase() })}
                className="h-10 w-full cursor-pointer border border-rule bg-paper p-1"
              />
            </div>
            <div>
              <Label>Hex</Label>
              <Input value={color.hex} onChange={(e) => updateAt(index, { hex: e.target.value })} />
            </div>
            <div>
              <Label>{t("colorLabel")}</Label>
              <Input
                value={color.label ?? ""}
                placeholder={t("colorLabelPlaceholder")}
                onChange={(e) => updateAt(index, { label: e.target.value })}
              />
            </div>
            <Button
              variant="ghost"
              onClick={() => {
                setError("");
                setColors((current) => current.filter((_, i) => i !== index));
              }}
            >
              {t("removeColor")}
            </Button>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          disabled={colors.length >= MAX_COLORS || save.isPending}
          onClick={() => {
            setError("");
            setColors((current) => [
              ...current,
              { id: `color-${crypto.randomUUID()}`, hex: "#1C2B3A", label: "" },
            ]);
          }}
        >
          {t("addColor")}
        </Button>
        <Button onClick={persist} disabled={!dirty || save.isPending}>
          {tc("save")}
        </Button>
      </div>
      {colors.length >= MAX_COLORS ? (
        <p className="text-xs text-lead">{t("paletteMax")}</p>
      ) : null}
      {error ? <p className="text-sm text-seal">{error}</p> : null}
    </Card>
  );
}

function SocialCard({
  mode,
  slots,
}: {
  mode: "standard" | "custom";
  slots: Record<string, { id: string; url: string; alt: string | null; width: number | null; height: number | null } | undefined>;
}) {
  const t = useTranslations("identity");
  const utils = trpc.useUtils();
  const setMode = trpc.identity.setSocialIconMode.useMutation({
    onSuccess: () => utils.identity.get.invalidate(),
  });

  return (
    <Card className="space-y-5">
      <div>
        <h2 className="text-[15px] font-medium text-ink">{t("social")}</h2>
        <p className="mt-1 text-sm text-lead">{t("socialHint")}</p>
      </div>
      <div className="flex border-b border-rule">
        {(["standard", "custom"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setMode.mutate({ mode: value })}
            className={cn(
              "-mb-px border-b px-4 py-2 text-sm",
              mode === value ? "border-ink text-ink" : "border-transparent text-lead hover:text-ink",
            )}
          >
            {value === "standard" ? t("socialStandard") : t("socialCustom")}
          </button>
        ))}
      </div>
      {mode === "custom" ? (
        <div className="grid gap-4 md:grid-cols-2">
          {SOCIAL_PLATFORMS.map((platform) => {
            const slot = `social_${platform}` as const;
            return (
              <div key={platform} className="border border-rule p-4">
                    <p className="mb-3 text-sm font-medium text-ink">{t(`platforms.${platform}`)}</p>
                <ImageSlotEditor slot={slot} asset={slots[slot] ?? null} compact />
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-lead">{t("socialStandardHint")}</p>
      )}
    </Card>
  );
}
