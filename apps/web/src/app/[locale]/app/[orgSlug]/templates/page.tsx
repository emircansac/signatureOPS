"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc";
import { Card, PageHeading } from "@/components/ui";
import { TemplateEditor } from "@/components/template-editor";
import { consumeCreateQuery } from "@/lib/create-query";

export default function TemplatesPage() {
  const t = useTranslations("templates");
  const utils = trpc.useUtils();
  const createMutation = trpc.templates.create.useMutation({
    onSuccess: () => {
      utils.templates.list.invalidate();
      utils.templates.listCompiled.invalidate();
    },
  });

  useEffect(() => {
    if (!consumeCreateQuery()) return;
    document.getElementById("create-template")?.scrollIntoView({ block: "start" });
    document.querySelector<HTMLInputElement>("#create-template input")?.focus();
  }, []);

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
    </div>
  );
}
