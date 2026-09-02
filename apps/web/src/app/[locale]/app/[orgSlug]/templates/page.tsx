"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { trpc } from "@/lib/trpc";
import { Button, Card, PageHeading } from "@/components/ui";
import { TemplateEditor } from "@/components/template-editor";
import { orgPath, useOrgSlug } from "@/lib/org-path";
import { consumeCreateQuery } from "@/lib/create-query";

export default function TemplatesPage() {
  const t = useTranslations("templates");
  const tc = useTranslations("common");
  const orgSlug = useOrgSlug();
  const utils = trpc.useUtils();
  const { data: templates, isLoading } = trpc.templates.list.useQuery();
  const createMutation = trpc.templates.create.useMutation({
    onSuccess: () => utils.templates.list.invalidate(),
  });

  useEffect(() => {
    if (isLoading) return;
    if (!consumeCreateQuery()) return;
    document.getElementById("create-template")?.scrollIntoView({ block: "start" });
    document.querySelector<HTMLInputElement>("#create-template input")?.focus();
  }, [isLoading]);

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="space-y-8">
      <PageHeading title={t("title")} subtitle={t("subtitle")} />

      <Card id="create-template">
        <h2 className="mb-4 font-semibold">{t("create")}</h2>
        <TemplateEditor
          onSave={(data) => createMutation.mutate(data)}
          saving={createMutation.isPending}
        />
      </Card>

      <div>
        <h2 className="mb-4 text-[15px] font-medium text-ink">Mevcut Şablonlar</h2>
        {templates?.length === 0 ? (
          <Card>{t("noTemplates")}</Card>
        ) : (
          <div className="grid gap-4">
            {templates?.map((tpl) => (
              <Card key={tpl.id} className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">{tpl.name}</h3>
                  <p className="text-sm text-lead">v{tpl.version}</p>
                </div>
                <Link href={orgPath(orgSlug, `/templates/${tpl.id}`)}>
                  <Button variant="secondary">{tc("edit")}</Button>
                </Link>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
