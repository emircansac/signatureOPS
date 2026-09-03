"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc";
import { Button, Card, Input, PageHeading } from "@/components/ui";

export default function SettingsPage() {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.connections.get.useQuery();
  const invites = trpc.invites.list.useQuery();
  const save = trpc.connections.save.useMutation({
    onSuccess: () => utils.connections.get.invalidate(),
  });
  const createInvite = trpc.invites.create.useMutation({
    onSuccess: () => utils.invites.list.invalidate(),
  });
  const revoke = trpc.invites.revoke.useMutation({
    onSuccess: () => utils.invites.list.invalidate(),
  });
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteUrl, setInviteUrl] = useState("");

  if (isLoading || !data) return <div className="text-lead">{tc("loading")}</div>;

  return (
    <div className="space-y-8">
      <PageHeading title={t("title")} subtitle={t("subtitle")} />

      <Card>
        <h2 className="text-sm font-medium">{t("googleTitle")}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-lead">{t("googleHint")}</p>
        <form
          className="mt-4 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            save.mutate({
              googleWorkspaceDomain: String(form.get("domain") ?? ""),
              googleImpersonateEmail: String(form.get("admin") ?? ""),
              microsoftTenantId: String(form.get("tenant") ?? ""),
            });
          }}
        >
          <label className="block text-sm">
            {t("workspaceDomain")}
            <Input name="domain" defaultValue={data.googleWorkspaceDomain} className="mt-1" />
          </label>
          <label className="block text-sm">
            {t("impersonateEmail")}
            <Input
              name="admin"
              type="email"
              defaultValue={data.googleImpersonateEmail}
              className="mt-1"
            />
          </label>
          <label className="block text-sm">
            {t("microsoftTenant")}
            <Input name="tenant" defaultValue={data.microsoftTenantId} className="mt-1" />
          </label>
          <Button type="submit" disabled={save.isPending}>
            {tc("save")}
          </Button>
        </form>
        <div className="mt-4 space-y-1 text-[13px] text-lead">
          <p>
            {t("saReady")}: {data.platform.googleServiceAccountReady ? t("yes") : t("no")}
          </p>
          <p>
            {t("clientId")}: {data.platform.googleServiceAccountClientId || "—"}
          </p>
          <p>{t("scopes")}:</p>
          <ul className="list-disc pl-5">
            {data.platform.googleScopes.map((scope) => (
              <li key={scope}>{scope}</li>
            ))}
          </ul>
        </div>
      </Card>

      <Card>
        <h2 className="text-sm font-medium">{t("addinTitle")}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-lead">{t("addinHint")}</p>
        <div className="mt-3 flex flex-col gap-2 text-sm">
          <a className="text-ink underline" href={data.addin.unifiedManifestUrl}>
            {t("unifiedManifest")}
          </a>
          <a className="text-ink underline" href={data.addin.addinOnlyManifestUrl}>
            {t("addinOnlyManifest")}
          </a>
        </div>
      </Card>

      <Card>
        <h2 className="text-sm font-medium">{t("admins")}</h2>
        <ul className="mt-3 space-y-1 text-sm">
          {(invites.data?.admins ?? []).map((admin) => (
            <li key={admin.id}>
              {admin.name} — {admin.email} ({admin.role})
            </li>
          ))}
        </ul>
        <form
          className="mt-4 flex flex-wrap items-end gap-3"
          onSubmit={async (event) => {
            event.preventDefault();
            const result = await createInvite.mutateAsync({
              email: inviteEmail,
              role: "CONTENT_MANAGER",
            });
            setInviteUrl(result.url);
            setInviteEmail("");
          }}
        >
          <label className="block text-sm">
            {t("inviteEmail")}
            <Input
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              type="email"
              className="mt-1"
            />
          </label>
          <Button type="submit" disabled={createInvite.isPending}>
            {t("invite")}
          </Button>
        </form>
        {inviteUrl ? (
          <p className="mt-3 break-all text-sm">
            {t("inviteLink")}: {inviteUrl}
          </p>
        ) : null}
        <ul className="mt-4 space-y-2 text-sm">
          {(invites.data?.invites ?? []).map((invite) => (
            <li key={invite.id} className="flex items-center justify-between gap-3">
              <span>
                {invite.email} ({invite.role})
              </span>
              <Button type="button" variant="ghost" onClick={() => revoke.mutate({ id: invite.id })}>
                {t("revoke")}
              </Button>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
