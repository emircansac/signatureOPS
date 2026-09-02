"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc";
import { Badge, Button, Card, Label, PageHeading, Select } from "@/components/ui";

export default function SimulatorPage() {
  const t = useTranslations("simulator");
  const tc = useTranslations("common");
  const { data: users, isLoading: usersLoading } = trpc.users.list.useQuery();
  const [userId, setUserId] = useState("");
  const [sendingAlias, setSendingAlias] = useState("");
  const [messageType, setMessageType] = useState<"new" | "reply">("new");
  const [recipientType, setRecipientType] = useState<"internal" | "external">("external");
  const [copied, setCopied] = useState(false);

  const simulateMutation = trpc.simulate.run.useMutation();

  useEffect(() => {
    if (users?.[0]?.id && !userId) {
      setUserId(users[0].id);
    }
  }, [users, userId]);

  const activeUserId = userId || users?.[0]?.id || "";
  const selectedUser = users?.find((u) => u.id === activeUserId);
  const aliases = selectedUser
    ? (JSON.parse(selectedUser.sendAsAliases) as string[])
    : [];

  const run = () => {
    if (!activeUserId) return;
    simulateMutation.mutate({
      userId: activeUserId,
      sendingAlias: sendingAlias || aliases[0] || undefined,
      messageType,
      recipientType,
    });
  };

  const result = simulateMutation.data;

  const copyHtml = async () => {
    if (!result?.renderedHtml) return;
    await navigator.clipboard.writeText(result.renderedHtml);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <PageHeading title={t("title")} subtitle={t("subtitle")} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-semibold">{t("input")}</h2>
          <div className="space-y-4">
            <div>
              <Label>{t("user")}</Label>
              <Select
                value={activeUserId}
                onChange={(e) => setUserId(e.target.value)}
              >
                {users?.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.displayName} — {u.department}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>{t("alias")}</Label>
              <Select
                value={sendingAlias || aliases[0] || ""}
                onChange={(e) => setSendingAlias(e.target.value)}
              >
                {aliases.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>{t("messageType")}</Label>
              <Select
                value={messageType}
                onChange={(e) => setMessageType(e.target.value as "new" | "reply")}
              >
                <option value="new">{t("new")}</option>
                <option value="reply">{t("reply")}</option>
              </Select>
            </div>
            <div>
              <Label>{t("recipientType")}</Label>
              <Select
                value={recipientType}
                onChange={(e) => setRecipientType(e.target.value as "internal" | "external")}
              >
                <option value="internal">{t("internal")}</option>
                <option value="external">{t("external")}</option>
              </Select>
            </div>
            <Button onClick={run} disabled={simulateMutation.isPending || usersLoading || !activeUserId}>
              {t("run")}
            </Button>
            {simulateMutation.error && (
              <p className="text-sm text-seal">{simulateMutation.error.message}</p>
            )}
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 font-semibold">{t("output")}</h2>
          {!result ? (
            <p className="text-lead">Run simulation to see results</p>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-lead">{t("winningRule")}</p>
                <p className="font-medium">
                  {result.winningRule ?? t("noWinningRule")}
                </p>
              </div>

              {result.lintScore !== undefined && (
                <Badge variant={result.lintScore >= 70 ? "success" : "warning"}>
                  {tc("score")}: {result.lintScore}
                </Badge>
              )}

              {result.conflicts.length > 0 && (
                <div>
                  <p className="mb-1 text-sm font-medium text-ink">{t("conflicts")}</p>
                  {result.conflicts.map((c, i) => (
                    <p key={i} className="text-sm text-lead">
                      {c.message}
                    </p>
                  ))}
                </div>
              )}

              {result.missingData.length > 0 && (
                <div>
                  <p className="mb-1 text-sm font-medium text-ink">{t("missingData")}</p>
                  <div className="flex flex-wrap gap-1">
                    {result.missingData.map((m) => (
                      <Badge key={m} variant="warning">
                        {m}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>

      {result && (
        <>
          <Card>
            <h2 className="mb-4 font-semibold">{t("trace")}</h2>
            <div className="space-y-2">
              {result.rulesEvaluated.map((step) => (
                <div
                  key={step.ruleId}
                  className="flex items-start gap-3 border border-rule p-3"
                >
                  <span className="text-lg">
                    {step.excluded ? "○" : step.matched ? "✓" : "×"}
                  </span>
                  <div>
                    <p className="font-medium">
                      {step.ruleName}{" "}
                      <Badge>
                        {step.level} P{step.priority}
                      </Badge>
                    </p>
                    <p className="text-sm text-lead">{step.reason}</p>
                    {step.wonAxes.length > 0 ? (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {step.wonAxes.map((axis) => (
                          <Badge key={axis} variant="success">
                            {axis}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                    {step.excludedAxes.length > 0 ? (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {step.excludedAxes.map((axis) => (
                          <Badge key={axis}>{axis}</Badge>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-semibold">{t("htmlPreview")}</h2>
                <Button variant="secondary" onClick={copyHtml}>
                  {copied ? tc("copied") : tc("export")}
                </Button>
              </div>
              {result.renderedHtml && (
                <div
                  className="overflow-auto border border-rule p-4"
                  dangerouslySetInnerHTML={{ __html: result.renderedHtml }}
                />
              )}
            </Card>
            <Card>
              <h2 className="mb-4 font-semibold">{t("plainText")}</h2>
              <pre className="whitespace-pre-wrap font-mono text-sm text-lead">
                {result.plainText}
              </pre>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
