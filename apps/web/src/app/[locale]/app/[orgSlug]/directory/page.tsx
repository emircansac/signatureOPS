"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { formatPhone } from "@signatureops/schema";
import { trpc } from "@/lib/trpc";
import { resolvePublicAssetUrl } from "@/lib/asset-url";
import { Badge, Button, Card, PageHeading } from "@/components/ui";
import { PersonForm, type DirectoryPerson } from "@/components/person-form";
import { DirectoryImport } from "@/components/directory-import";
import { consumeCreateQuery } from "@/lib/create-query";

const PERSON_GAPS = ["jobTitle", "mobile", "photo"] as const;

function missingFields(user: {
  jobTitle: string | null;
  mobile: string | null;
  photoUrl: string | null;
}) {
  const missing: (typeof PERSON_GAPS)[number][] = [];
  if (!user.jobTitle?.trim()) missing.push("jobTitle");
  if (!user.mobile?.trim()) missing.push("mobile");
  if (!user.photoUrl?.trim()) missing.push("photo");
  return missing;
}

function PersonPhoto({ url, name }: { url: string | null; name: string }) {
  if (!url?.trim()) {
    return (
      <span className="flex h-9 w-9 items-center justify-center border border-rule text-[11px] text-lead">
        —
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={resolvePublicAssetUrl(url)}
      alt={name}
      className="h-9 w-9 object-cover"
    />
  );
}

export default function DirectoryPage() {
  const t = useTranslations("directory");
  const tc = useTranslations("common");
  const utils = trpc.useUtils();
  const { data: users, isLoading } = trpc.users.list.useQuery();
  const syncGoogle = trpc.deploy.syncGoogle.useMutation();
  const syncMicrosoft = trpc.deploy.syncMicrosoft.useMutation();
  const [editing, setEditing] = useState<DirectoryPerson | null | "new">(null);
  const [importing, setImporting] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<DirectoryPerson | null>(null);

  useEffect(() => {
    if (consumeCreateQuery()) setEditing("new");
  }, []);

  const deleteMutation = trpc.users.delete.useMutation({
    onSuccess: () => {
      utils.users.list.invalidate();
      setPendingDelete(null);
    },
  });

  if (isLoading) return <div className="text-lead">{tc("loading")}</div>;

  const existingEmails = (users ?? []).map((user) => user.email);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <PageHeading title={t("title")} subtitle={t("subtitle")} />
          <p className="mt-2 max-w-2xl text-sm leading-6 text-lead">{t("personFieldsHint")}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
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
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => setEditing("new")}>
          {t("addPerson")}
        </Button>
        <Button type="button" variant="secondary" onClick={() => setImporting(true)}>
          {t("import")}
        </Button>
      </div>

      {importing ? (
        <DirectoryImport existingEmails={existingEmails} onClose={() => setImporting(false)} />
      ) : null}

      {editing !== null ? (
        <PersonForm
          person={editing === "new" ? null : editing}
          existingEmails={existingEmails}
          onClose={() => setEditing(null)}
        />
      ) : null}

      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="border-b border-rule">
            <tr>
              <th className="px-4 py-3 text-left font-medium">{t("photo")}</th>
              <th className="px-4 py-3 text-left font-medium">{t("name")}</th>
              <th className="px-4 py-3 text-left font-medium">{t("jobTitle")}</th>
              <th className="px-4 py-3 text-left font-medium">{t("mobile")}</th>
              <th className="px-4 py-3 text-left font-medium">{t("email")}</th>
              <th className="px-4 py-3 text-left font-medium">{t("department")}</th>
              <th className="px-4 py-3 text-left font-medium">{t("country")}</th>
              <th className="px-4 py-3 text-left font-medium">{t("missingFields")}</th>
              <th className="px-4 py-3 text-left font-medium">{tc("actions")}</th>
            </tr>
          </thead>
          <tbody>
            {users?.map((user) => {
              const missing = missingFields(user);
              return (
                <tr
                  key={user.id}
                  className="cursor-pointer border-b border-rule hover:bg-paper"
                  onClick={() => setEditing(user)}
                >
                  <td className="px-4 py-3">
                    <PersonPhoto url={user.photoUrl} name={user.displayName} />
                  </td>
                  <td className="px-4 py-3 font-medium">{user.displayName}</td>
                  <td className="px-4 py-3">{user.jobTitle?.trim() || "—"}</td>
                  <td className="px-4 py-3 tabular-nums">
                    {user.mobile?.trim() ? formatPhone(user.mobile) : "—"}
                  </td>
                  <td className="px-4 py-3">{user.email}</td>
                  <td className="px-4 py-3">{user.department ?? "—"}</td>
                  <td className="px-4 py-3">{user.country ?? "—"}</td>
                  <td className="px-4 py-3">
                    {missing.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {missing.map((field) => (
                          <Badge key={field} variant="warning">
                            {t(`gaps.${field}`)}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <Badge variant="success">{t("complete")}</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        className="px-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditing(user);
                        }}
                      >
                        {tc("edit")}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className="px-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPendingDelete(user);
                        }}
                      >
                        {tc("delete")}
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {pendingDelete ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-ink/40 p-4 pt-24"
          role="dialog"
          aria-modal="true"
          aria-label={t("deleteConfirm")}
        >
          <Card className="w-full max-w-md space-y-3">
            <p className="text-sm text-ink">{t("deleteConfirm")}</p>
            <p className="text-sm text-lead">{pendingDelete.displayName}</p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => deleteMutation.mutate({ id: pendingDelete.id })}
                disabled={deleteMutation.isPending}
              >
                {t("confirmDelete")}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setPendingDelete(null)}>
                {tc("cancel")}
              </Button>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
