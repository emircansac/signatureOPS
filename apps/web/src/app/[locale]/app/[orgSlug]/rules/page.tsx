"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import type { RuleLevel } from "@signatureops/schema";
import { trpc } from "@/lib/trpc";
import { Badge, Button, Card, PageHeading } from "@/components/ui";
import { RuleForm, type RuleRecord } from "@/components/rule-form";
import { parseJsonArray } from "@/lib/rule-form";
import { orgPath, useOrgSlug } from "@/lib/org-path";

function toRecord(rule: {
  id: string;
  name: string;
  level: string;
  priority: number;
  conditions: string;
  actions: string;
  enabled: boolean;
}): RuleRecord {
  return {
    id: rule.id,
    name: rule.name,
    level: rule.level as RuleLevel,
    priority: rule.priority,
    conditions: parseJsonArray(rule.conditions, []),
    actions: parseJsonArray(rule.actions, []),
    enabled: rule.enabled,
  };
}

export default function RulesPage() {
  const t = useTranslations("rules");
  const tc = useTranslations("common");
  const orgSlug = useOrgSlug();
  const utils = trpc.useUtils();
  const { data: rules, isLoading } = trpc.rules.list.useQuery();
  const [editing, setEditing] = useState<RuleRecord | null | "new">(null);
  const [pendingDelete, setPendingDelete] = useState<RuleRecord | null>(null);
  const [enabledOverride, setEnabledOverride] = useState<Record<string, boolean>>({});

  const deleteMutation = trpc.rules.delete.useMutation({
    onSuccess: () => {
      utils.rules.list.invalidate();
      setPendingDelete(null);
    },
  });
  const toggleMutation = trpc.rules.update.useMutation({
    onSuccess: () => utils.rules.list.invalidate(),
    onError: (_err, input) => {
      if (input.enabled === undefined) return;
      setEnabledOverride((current) => ({ ...current, [input.id]: !input.enabled }));
    },
  });

  if (isLoading) return <div className="text-lead">{tc("loading")}</div>;

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <PageHeading title={t("title")} subtitle={t("subtitle")} />
        <div className="flex gap-2">
          <Link href={orgPath(orgSlug, "/simulate")}>
            <Button type="button" variant="secondary">
              {t("testInSimulator")}
            </Button>
          </Link>
          <Button type="button" onClick={() => setEditing("new")}>
            {t("create")}
          </Button>
        </div>
      </div>

      {editing !== null ? (
        <RuleForm rule={editing === "new" ? null : editing} onClose={() => setEditing(null)} />
      ) : null}

      <div className="space-y-3">
        {rules?.length === 0 ? (
          <Card>{t("noRules")}</Card>
        ) : (
          rules?.map((rule) => {
            const record = toRecord(rule);
            const enabled = enabledOverride[rule.id] ?? rule.enabled;
            const conditionCount = Array.isArray(record.conditions) ? record.conditions.length : 0;
            return (
              <Card key={rule.id} className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <h3 className="font-medium">{rule.name}</h3>
                  <div className="flex flex-wrap gap-2">
                    <Badge>{rule.level}</Badge>
                    <Badge variant="default">P{rule.priority}</Badge>
                    {!enabled ? <Badge variant="warning">{tc("disabled")}</Badge> : null}
                  </div>
                </div>
                <p className="text-sm text-lead">{t("conditionCount", { count: conditionCount })}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="flex items-center gap-2 text-sm text-ink">
                    <input
                      type="checkbox"
                      checked={enabled}
                      disabled={toggleMutation.isPending && toggleMutation.variables?.id === rule.id}
                      onChange={() => {
                        const next = !enabled;
                        setEnabledOverride((current) => ({ ...current, [rule.id]: next }));
                        toggleMutation.mutate({ id: rule.id, enabled: next });
                      }}
                    />
                    {enabled ? tc("enabled") : tc("disabled")}
                  </label>
                  <Link href={orgPath(orgSlug, "/simulate")}>
                    <Button type="button" variant="secondary">
                      {t("testInSimulator")}
                    </Button>
                  </Link>
                  <Button type="button" variant="secondary" onClick={() => setEditing(record)}>
                    {tc("edit")}
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setPendingDelete(record)}>
                    {tc("delete")}
                  </Button>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {pendingDelete ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-ink/40 p-4 pt-24"
          role="dialog"
          aria-modal="true"
          aria-label={t("deleteConfirm")}
        >
          <Card className="w-full max-w-md space-y-3">
            <p className="text-sm text-ink">{t("deleteConfirm")}</p>
            <p className="text-sm text-lead">{pendingDelete.name}</p>
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
