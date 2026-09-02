"use client";

import { use } from "react";
import { useTranslations } from "next-intl";
import type { TemplateDefinition } from "@signatureops/schema";
import { trpc } from "@/lib/trpc";
import { Card, PageHeading } from "@/components/ui";
import { TemplateEditor } from "@/components/template-editor";

export default function TemplateEditPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id } = use(params);
  const t = useTranslations("templates");
  const utils = trpc.useUtils();
  const { data: template, isLoading } = trpc.templates.get.useQuery({ id });
  const updateMutation = trpc.templates.update.useMutation({
    onSuccess: () => {
      utils.templates.list.invalidate();
      utils.templates.get.invalidate({ id });
    },
  });

  if (isLoading) return <div>Loading...</div>;
  if (!template) return <Card>Not found</Card>;

  const definition = JSON.parse(template.definition) as TemplateDefinition;

  return (
    <div className="space-y-6">
      <PageHeading title={`${t("title")}: ${template.name}`} />
      <Card>
        <TemplateEditor
          initial={{ name: template.name, definition }}
          onSave={(data) =>
            updateMutation.mutate({ id, name: data.name, definition: data.definition })
          }
          saving={updateMutation.isPending}
        />
      </Card>
    </div>
  );
}
