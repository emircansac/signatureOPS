"use client";

import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc";
import { Badge, Button, Card, PageHeading } from "@/components/ui";

export default function DeployHealthPage() {
  const t = useTranslations("deploy");
  const tc = useTranslations("common");
  const tp = useTranslations("positioning");
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.deploy.health.useQuery();
  const gmail = trpc.deploy.gmail.useMutation({
    onSuccess: () => utils.deploy.health.invalidate(),
  });
  const syncGoogle = trpc.deploy.syncGoogle.useMutation({
    onSuccess: () => utils.deploy.health.invalidate(),
  });
  const syncMicrosoft = trpc.deploy.syncMicrosoft.useMutation({
    onSuccess: () => utils.deploy.health.invalidate(),
  });

  if (isLoading || !data) return <div className="text-lead">{tc("loading")}</div>;

  return (
    <div className="space-y-8">
      <PageHeading title={t("title")} subtitle={t("subtitle")} />
      <p className="max-w-2xl text-sm leading-6 text-lead">{tp("google")}</p>
      <p className="max-w-2xl text-sm leading-6 text-lead">{tp("microsoft")}</p>

      <div className="flex flex-wrap gap-3">
        <Button type="button" onClick={() => gmail.mutate(undefined)} disabled={gmail.isPending}>
          {t("deployGmail")}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => syncGoogle.mutate()}
          disabled={syncGoogle.isPending}
        >
          {t("syncGoogle")}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => syncMicrosoft.mutate()}
          disabled={syncMicrosoft.isPending}
        >
          {t("syncMicrosoft")}
        </Button>
      </div>
      {gmail.error ? <p className="text-sm text-seal">{gmail.error.message}</p> : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-[13px] text-lead">{t("usersDiscovered")}</p>
          <p className="mt-1 font-serif text-2xl">{data.usersDiscovered}</p>
        </Card>
        <Card>
          <p className="text-[13px] text-lead">{t("gmailOk")}</p>
          <p className="mt-1 font-serif text-2xl">{data.gmailOk}</p>
        </Card>
        <Card>
          <p className="text-[13px] text-lead">{t("gmailFailed")}</p>
          <p className="mt-1 font-serif text-2xl">{data.gmailFailed}</p>
        </Card>
      </div>

      <Card>
        <h2 className="text-sm font-medium">{t("lastSync")}</h2>
        <p className="mt-2 text-sm text-lead">
          Google: {data.lastSync.google ? new Date(data.lastSync.google).toLocaleString() : "—"} (
          {data.lastSync.googleUserCount}) {data.lastSync.googleError}
        </p>
        <p className="mt-1 text-sm text-lead">
          Microsoft:{" "}
          {data.lastSync.microsoft ? new Date(data.lastSync.microsoft).toLocaleString() : "—"} (
          {data.lastSync.microsoftUserCount}) {data.lastSync.microsoftError}
        </p>
        <p className="mt-3 text-sm text-lead">
          {t("addinNote")} {data.addin.assigned ? t("addinAssigned") : t("addinNotAssigned")}
        </p>
      </Card>

      <Card>
        <h2 className="text-sm font-medium">{t("missingFields")}</h2>
        {data.missingFields.length === 0 ? (
          <p className="mt-2 text-sm text-lead">{t("none")}</p>
        ) : (
          <ul className="mt-2 space-y-1 text-sm">
            {data.missingFields.map((person) => (
              <li key={person.id}>
                {person.displayName} ({person.email})
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <h2 className="text-sm font-medium">{t("recent")}</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-lead">
                <th className="py-1">{t("colUser")}</th>
                <th>{t("colProvider")}</th>
                <th>{tc("status")}</th>
                <th>{t("colError")}</th>
              </tr>
            </thead>
            <tbody>
              {data.recent.map((row) => (
                <tr key={row.id} className="border-t border-rule">
                  <td className="py-2">{row.user ?? row.email}</td>
                  <td>{row.provider}</td>
                  <td>
                    <Badge variant={row.status === "OK" ? "success" : row.status === "FAILED" ? "error" : "warning"}>
                      {row.status}
                    </Badge>
                    {row.diffChanged ? <span className="ml-2 text-lead">{t("sanitized")}</span> : null}
                  </td>
                  <td className="max-w-xs truncate text-lead">{row.error}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
