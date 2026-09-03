"use client";

import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { signIn, useSession } from "next-auth/react";
import { trpc } from "@/lib/trpc";
import { Button, Card, PageHeading } from "@/components/ui";
import { PublicHeader } from "@/components/public-header";
import { useRouter } from "@/i18n/routing";

export default function InvitePage() {
  const params = useParams<{ locale: string; token: string }>();
  const locale = params.locale;
  const token = params.token;
  const t = useTranslations("invite");
  const router = useRouter();
  const { update } = useSession();
  const preview = trpc.auth.previewInvite.useQuery({ token });
  const accept = trpc.auth.acceptInvite.useMutation();

  return (
    <div className="min-h-screen bg-paper">
      <PublicHeader locale={locale} />
      <main className="mx-auto max-w-lg px-6 py-16">
        <PageHeading title={t("title")} subtitle={t("subtitle")} />
        {preview.isError ? (
          <p className="mt-6 text-sm text-seal">{t("invalid")}</p>
        ) : preview.data ? (
          <Card className="mt-8 space-y-4">
            <p className="text-sm">
              {t("org")}: {preview.data.orgName}
            </p>
            <p className="text-sm">
              {t("role")}: {preview.data.role}
            </p>
            <p className="text-sm">
              {t("email")}: {preview.data.email}
            </p>
            {preview.data.matchesSession ? (
              <Button
                type="button"
                onClick={async () => {
                  const data = await accept.mutateAsync({ token });
                  await update();
                  router.push(`/app/${data.slug}`);
                }}
                disabled={accept.isPending}
              >
                {t("accept")}
              </Button>
            ) : (
              <Button
                type="button"
                onClick={() =>
                  signIn("google", { callbackUrl: `/${locale}/davet/${token}` })
                }
              >
                {t("signIn")}
              </Button>
            )}
            {accept.error ? <p className="text-sm text-seal">{accept.error.message}</p> : null}
          </Card>
        ) : (
          <p className="mt-6 text-lead">{t("loading")}</p>
        )}
      </main>
    </div>
  );
}
