"use client";

import { use, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { signOut } from "next-auth/react";
import { trpc } from "@/lib/trpc";
import { PublicHeader } from "@/components/public-header";
import { Button, Input, Label } from "@/components/ui";
import { slugify } from "@/lib/slug";

export default function OnboardingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = use(params);
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const router = useRouter();
  const { data: session, status, update } = useSession();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const createOrg = trpc.auth.createOrg.useMutation();

  if (status === "loading") {
    return <div className="p-8 text-lead">{tc("loading")}</div>;
  }

  if (!session?.user) {
    router.replace("/giris");
    return null;
  }

  if (session.orgSlug) {
    router.replace(`/app/${session.orgSlug}`);
    return null;
  }

  const suggested = slugify(slug || name);

  return (
    <div className="min-h-screen bg-paper">
      <PublicHeader locale={locale} />
      <main className="mx-auto max-w-[1080px] px-6 py-16">
        <h1 className="font-serif text-[clamp(2rem,3.5vw,2.6rem)] font-medium text-ink">
          {t("onboardingTitle")}
        </h1>
        <p className="mt-4 max-w-md text-[1.02rem] leading-7 text-lead">{t("onboardingHint")}</p>
        <div className="mt-8 max-w-md space-y-4">
          <div>
            <Label>{t("orgName")}</Label>
            <Input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!slug) setSlug(slugify(e.target.value));
              }}
            />
          </div>
          <div>
            <Label>{t("orgSlug")}</Label>
            <Input
              value={slug}
              onChange={(e) => setSlug(slugify(e.target.value))}
            />
            <p className="mt-1 text-xs text-lead">
              /{locale}/app/{suggested || "…"}
            </p>
          </div>
          {createOrg.error && (
            <p className="text-sm text-seal">{createOrg.error.message}</p>
          )}
          <Button
            disabled={!name.trim() || !suggested || createOrg.isPending}
            onClick={async () => {
              try {
                const result = await createOrg.mutateAsync({ name, slug: suggested });
                await update();
                window.location.assign(`/${locale}/app/${result.slug}`);
              } catch {
                /* error is shown via createOrg.error */
              }
            }}
          >
            {createOrg.isPending ? "..." : t("createOrg")}
          </Button>
          <button
            type="button"
            className="text-sm text-lead hover:text-ink"
            onClick={() => signOut({ callbackUrl: `/${locale}` })}
          >
            {tc("signOut")}
          </button>
        </div>
      </main>
    </div>
  );
}
