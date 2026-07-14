"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { trpc } from "@/lib/trpc";
import { Badge, Button, Card, Input, Label, Select } from "@/components/ui";

const CONDITION_TYPES = [
  "user",
  "group",
  "department",
  "office",
  "country",
  "brand",
  "job_title",
  "sending_alias",
  "message_type",
  "recipient_type",
  "campaign_active",
] as const;

const LEVELS = ["USER", "GROUP", "DEPT_OFFICE", "ORG"] as const;

export default function RulesPage() {
  const t = useTranslations("rules");
  const tc = useTranslations("common");
  const utils = trpc.useUtils();
  const { data: rules, isLoading } = trpc.rules.list.useQuery();
  const { data: templates } = trpc.templates.list.useQuery();
  const { data: users } = trpc.users.list.useQuery();

  const [name, setName] = useState("New Rule");
  const [level, setLevel] = useState<(typeof LEVELS)[number]>("DEPT_OFFICE");
  const [priority, setPriority] = useState(50);
  const [condType, setCondType] = useState<(typeof CONDITION_TYPES)[number]>("department");
  const [condValue, setCondValue] = useState("Sales");
  const [templateId, setTemplateId] = useState("");

  const createMutation = trpc.rules.create.useMutation({
    onSuccess: () => utils.rules.list.invalidate(),
  });
  const deleteMutation = trpc.rules.delete.useMutation({
    onSuccess: () => utils.rules.list.invalidate(),
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
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>{tc("name")}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>{t("level")}</Label>
            <Select value={level} onChange={(e) => setLevel(e.target.value as typeof level)}>
              {LEVELS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>{t("priority")}</Label>
            <Input
              type="number"
              value={priority}
              onChange={(e) => setPriority(parseInt(e.target.value, 10))}
            />
          </div>
          <div>
            <Label>{t("conditions")}</Label>
            <Select
              value={condType}
              onChange={(e) => setCondType(e.target.value as typeof condType)}
            >
              {CONDITION_TYPES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
            <Input
              className="mt-2"
              value={condValue}
              onChange={(e) => setCondValue(e.target.value)}
              placeholder="Value"
            />
          </div>
          <div>
            <Label>{t("actions")}</Label>
            <Select value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
              <option value="">Select template</option>
              {templates?.map((tpl) => (
                <option key={tpl.id} value={tpl.id}>
                  {tpl.name}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <Button
          className="mt-4"
          onClick={() => {
            if (!templateId) return;
            const conditionValue =
              condType === "user"
                ? users?.find((u) => u.displayName.includes(condValue))?.id ?? condValue
                : condValue;
            createMutation.mutate({
              name,
              level,
              priority,
              conditions: [{ type: condType, operator: "eq", value: conditionValue }],
              actions: [{ type: "select_template", templateId }],
            });
          }}
          disabled={createMutation.isPending || !templateId}
        >
          {tc("create")}
        </Button>
      </Card>

      <div className="space-y-3">
        {rules?.length === 0 ? (
          <Card>{t("noRules")}</Card>
        ) : (
          rules?.map((rule) => (
            <Card key={rule.id} className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-medium">{rule.name}</h3>
                  <Badge>{rule.level}</Badge>
                  <Badge variant="default">P{rule.priority}</Badge>
                  {!rule.enabled && <Badge variant="warning">{tc("disabled")}</Badge>}
                </div>
                <p className="mt-1 text-sm text-zinc-500">
                  {JSON.parse(rule.conditions).length} condition(s)
                </p>
              </div>
              <div className="flex gap-2">
                <Link href="/simulate">
                  <Button variant="secondary">{t("testInSimulator")}</Button>
                </Link>
                <Button
                  variant="destructive"
                  onClick={() => deleteMutation.mutate({ id: rule.id })}
                >
                  {tc("delete")}
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
