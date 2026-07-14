"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { trpc } from "@/lib/trpc";
import { Button, Card } from "@/components/ui";
import { TemplateEditor } from "@/components/template-editor";

export default function TemplatesPage() {
  const t = useTranslations("templates");
  const tc = useTranslations("common");
  const utils = trpc.useUtils();
  const { data: templates, isLoading } = trpc.templates.list.useQuery();
  const createMutation = trpc.templates.create.useMutation({
    onSuccess: () => utils.templates.list.invalidate(),
  });

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-zinc-500">{t("subtitle")}</p>
      </div>

      <Card>
        <h2 className="mb-4 font-semibold">{t("create")}</h2>
        <TemplateEditor
          onSave={(data) => createMutation.mutate(data)}
          saving={createMutation.isPending}
        />
      </Card>

      <div>
        <h2 className="mb-4 text-lg font-semibold">Mevcut Şablonlar</h2>
        {templates?.length === 0 ? (
          <Card>{t("noTemplates")}</Card>
        ) : (
          <div className="grid gap-4">
            {templates?.map((tpl) => (
              <Card key={tpl.id} className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">{tpl.name}</h3>
                  <p className="text-sm text-zinc-500">v{tpl.version}</p>
                </div>
                <Link href={`/templates/${tpl.id}`}>
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
