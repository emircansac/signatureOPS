"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { RuleAction, RuleCondition, RuleLevel } from "@signatureops/schema";
import { trpc } from "@/lib/trpc";
import { AssetPicker } from "@/components/asset-picker";
import { Button, Card, Input, Label, Select, Textarea } from "@/components/ui";
import {
  ACTION_TYPES,
  BLOCK_TYPES,
  CONDITION_TYPES,
  RULE_LEVELS,
  coerceConditionValue,
  defaultValueFor,
  emptyAction,
  emptyCondition,
  emptyRuleForm,
  isMultiValueOperator,
  operatorsFor,
  parseJsonArray,
  ruleFormFromStored,
  toRulePayload,
  uniqueNonEmpty,
  validateRuleForm,
  type ActionDraft,
  type ConditionDraft,
  type ConditionType,
} from "@/lib/rule-form";

export type RuleRecord = {
  id: string;
  name: string;
  level: RuleLevel;
  priority: number;
  conditions: RuleCondition[] | unknown;
  actions: RuleAction[] | unknown;
  enabled: boolean;
};

type Option = { value: string; label: string };

function asOptions(values: string[]): Option[] {
  return values.map((value) => ({ value, label: value }));
}

function toggleValue(values: string[], value: string) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function MultiValueField({
  options,
  values,
  onChange,
  allowCustom,
  addLabel,
}: {
  options: Option[];
  values: string[];
  onChange: (values: string[]) => void;
  allowCustom?: boolean;
  addLabel: string;
}) {
  const [custom, setCustom] = useState("");
  const extra = values.filter((value) => !options.some((option) => option.value === value));
  return (
    <div className="space-y-2">
      {options.length > 0 ? (
        <ul className="space-y-1">
          {options.map((option) => (
            <li key={option.value}>
              <label className="flex items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={values.includes(option.value)}
                  onChange={() => onChange(toggleValue(values, option.value))}
                />
                {option.label}
              </label>
            </li>
          ))}
        </ul>
      ) : null}
      {extra.map((value) => (
        <label key={value} className="flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" checked onChange={() => onChange(toggleValue(values, value))} />
          {value}
        </label>
      ))}
      {allowCustom ? (
        <div className="flex gap-2">
          <Input
            value={custom}
            onChange={(event) => setCustom(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              const next = custom.trim();
              if (!next) return;
              onChange(values.includes(next) ? values : [...values, next]);
              setCustom("");
            }}
          />
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              const next = custom.trim();
              if (!next) return;
              onChange(values.includes(next) ? values : [...values, next]);
              setCustom("");
            }}
          >
            {addLabel}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function ConditionValue({
  draft,
  onChange,
  users,
  groups,
  campaigns,
  departments,
  countries,
  jobTitles,
  aliases,
}: {
  draft: ConditionDraft;
  onChange: (value: string | string[]) => void;
  users: Option[];
  groups: Option[];
  campaigns: Option[];
  departments: string[];
  countries: string[];
  jobTitles: string[];
  aliases: string[];
}) {
  const t = useTranslations("rules");
  const ts = useTranslations("simulator");
  const valueId = `cond-value-${draft.key}`;
  const scalar = Array.isArray(draft.value) ? (draft.value[0] ?? "") : draft.value;
  const multi = Array.isArray(draft.value) ? draft.value : scalar ? [scalar] : [];

  if (isMultiValueOperator(draft.operator)) {
    if (draft.type === "user") {
      return <MultiValueField options={users} values={multi} onChange={onChange} addLabel={t("addCustomValue")} />;
    }
    if (draft.type === "group") {
      return <MultiValueField options={groups} values={multi} onChange={onChange} addLabel={t("addCustomValue")} />;
    }
    if (draft.type === "campaign_active") {
      return <MultiValueField options={campaigns} values={multi} onChange={onChange} addLabel={t("addCustomValue")} />;
    }
    const known =
      draft.type === "department"
        ? departments
        : draft.type === "country"
          ? countries
          : draft.type === "job_title"
            ? jobTitles
            : draft.type === "sending_alias"
              ? aliases
              : [];
    return (
      <MultiValueField
        options={asOptions(known)}
        values={multi}
        onChange={onChange}
        allowCustom
        addLabel={t("addCustomValue")}
      />
    );
  }

  if (draft.type === "message_type") {
    return (
      <Select id={valueId} value={scalar} onChange={(event) => onChange(event.target.value)}>
        <option value="new">{ts("new")}</option>
        <option value="reply">{ts("reply")}</option>
      </Select>
    );
  }
  if (draft.type === "recipient_type") {
    return (
      <Select id={valueId} value={scalar} onChange={(event) => onChange(event.target.value)}>
        <option value="internal">{ts("internal")}</option>
        <option value="external">{ts("external")}</option>
      </Select>
    );
  }
  if (draft.type === "user") {
    return (
      <Select id={valueId} value={scalar} onChange={(event) => onChange(event.target.value)}>
        <option value="">{t("chooseUser")}</option>
        {users.map((user) => (
          <option key={user.value} value={user.value}>
            {user.label}
          </option>
        ))}
        {scalar && !users.some((user) => user.value === scalar) ? <option value={scalar}>{scalar}</option> : null}
      </Select>
    );
  }
  if (draft.type === "group") {
    return (
      <Select id={valueId} value={scalar} onChange={(event) => onChange(event.target.value)}>
        <option value="">{t("chooseGroup")}</option>
        {groups.map((group) => (
          <option key={group.value} value={group.value}>
            {group.label}
          </option>
        ))}
        {scalar && !groups.some((group) => group.value === scalar) ? <option value={scalar}>{scalar}</option> : null}
      </Select>
    );
  }
  if (draft.type === "campaign_active") {
    return (
      <Select id={valueId} value={scalar} onChange={(event) => onChange(event.target.value)}>
        <option value="">{t("chooseCampaign")}</option>
        {campaigns.map((campaign) => (
          <option key={campaign.value} value={campaign.value}>
            {campaign.label}
          </option>
        ))}
        {scalar && !campaigns.some((campaign) => campaign.value === scalar) ? (
          <option value={scalar}>{scalar}</option>
        ) : null}
      </Select>
    );
  }

  const suggestions =
    draft.type === "department"
      ? departments
      : draft.type === "country"
        ? countries
        : draft.type === "job_title"
          ? jobTitles
          : draft.type === "sending_alias"
            ? aliases
            : [];
  const listId = `rule-cond-${draft.key}`;
  return (
    <>
      <Input
        id={valueId}
        list={suggestions.length ? listId : undefined}
        value={scalar}
        onChange={(event) => onChange(event.target.value)}
      />
      {suggestions.length ? (
        <datalist id={listId}>
          {suggestions.map((value) => (
            <option key={value} value={value} />
          ))}
        </datalist>
      ) : null}
    </>
  );
}

export function RuleForm({
  rule,
  onClose,
}: {
  rule: RuleRecord | null;
  onClose: () => void;
}) {
  const t = useTranslations("rules");
  const tc = useTranslations("common");
  const tb = useTranslations("blocks");
  const utils = trpc.useUtils();
  const editing = Boolean(rule);

  const { data: templates } = trpc.templates.list.useQuery();
  const { data: users } = trpc.users.list.useQuery();
  const { data: groups } = trpc.groups.list.useQuery();
  const { data: campaigns } = trpc.campaigns.list.useQuery();

  const [form, setForm] = useState(() =>
    rule
      ? ruleFormFromStored({
          name: rule.name,
          level: rule.level,
          priority: rule.priority,
          enabled: rule.enabled,
          conditions: rule.conditions,
          actions: rule.actions,
        })
      : emptyRuleForm(),
  );
  const [error, setError] = useState("");

  const createMutation = trpc.rules.create.useMutation();
  const updateMutation = trpc.rules.update.useMutation();
  const pending = createMutation.isPending || updateMutation.isPending;

  const userOptions: Option[] = useMemo(
    () => (users ?? []).map((user) => ({ value: user.id, label: `${user.displayName} — ${user.email}` })),
    [users],
  );
  const groupOptions: Option[] = useMemo(
    () => (groups ?? []).map((group) => ({ value: group.id, label: group.name })),
    [groups],
  );
  const campaignOptions: Option[] = useMemo(
    () => (campaigns ?? []).map((campaign) => ({ value: campaign.id, label: campaign.name })),
    [campaigns],
  );
  const departments = useMemo(() => uniqueNonEmpty((users ?? []).map((user) => user.department)), [users]);
  const countries = useMemo(() => uniqueNonEmpty((users ?? []).map((user) => user.country)), [users]);
  const jobTitles = useMemo(() => uniqueNonEmpty((users ?? []).map((user) => user.jobTitle)), [users]);
  const aliases = useMemo(
    () =>
      uniqueNonEmpty(
        (users ?? []).flatMap((user) => parseJsonArray<string>(user.sendAsAliases, user.email ? [user.email] : [])),
      ),
    [users],
  );

  function patch(partial: Partial<typeof form>) {
    setForm((current) => ({ ...current, ...partial }));
  }

  function updateCondition(key: string, next: ConditionDraft) {
    setForm((current) => ({
      ...current,
      conditions: current.conditions.map((condition) => (condition.key === key ? next : condition)),
    }));
  }

  function updateAction(key: string, next: ActionDraft) {
    setForm((current) => ({
      ...current,
      actions: current.actions.map((action) => (action.key === key ? next : action)),
    }));
  }

  const save = async () => {
    setError("");
    const issue = validateRuleForm(form);
    if (issue) {
      setError(t(`errors.${issue}`));
      return;
    }
    const payload = toRulePayload(form);
    try {
      if (rule) {
        await updateMutation.mutateAsync({ id: rule.id, ...payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      await utils.rules.list.invalidate();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("saveFailed"));
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/40 p-4 pt-12"
      role="dialog"
      aria-modal="true"
      aria-label={editing ? t("edit") : t("create")}
    >
      <Card className="w-full max-w-3xl space-y-5">
        <div className="flex items-start justify-between gap-4">
          <h2 className="font-serif text-xl font-medium text-ink">{editing ? t("edit") : t("create")}</h2>
          <Button type="button" variant="ghost" onClick={onClose}>
            {tc("cancel")}
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="rule-name">{tc("name")}</Label>
            <Input id="rule-name" value={form.name} onChange={(event) => patch({ name: event.target.value })} />
          </div>
          <div>
            <Label htmlFor="rule-level">{t("level")}</Label>
            <Select
              id="rule-level"
              value={form.level}
              onChange={(event) => patch({ level: event.target.value as RuleLevel })}
            >
              {RULE_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </Select>
            <p className="mt-1 text-xs leading-5 text-lead">{t(`levelHint.${form.level}`)}</p>
          </div>
          <div>
            <Label htmlFor="rule-priority">{t("priority")}</Label>
            <Input
              id="rule-priority"
              type="number"
              value={form.priority}
              onChange={(event) => patch({ priority: Number.parseInt(event.target.value, 10) || 0 })}
            />
          </div>
        </div>
        <p className="text-xs leading-5 text-lead">{t("axisHint")}</p>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-medium text-ink">{t("conditions")}</h3>
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                setForm((current) => ({ ...current, conditions: [...current.conditions, emptyCondition()] }))
              }
            >
              {t("addCondition")}
            </Button>
          </div>
          {form.conditions.length === 0 ? (
            <p className="text-sm text-lead">{t("emptyConditions")}</p>
          ) : (
            <>
              {form.conditions.length > 1 ? <p className="text-xs text-lead">{t("conditionsAndHint")}</p> : null}
              {form.conditions.map((condition) => (
                <div key={condition.key} className="grid gap-3 border border-rule p-3 md:grid-cols-[1fr_1fr_1fr_auto]">
                  <div>
                    <Label htmlFor={`cond-type-${condition.key}`}>{t("type")}</Label>
                    <Select
                      id={`cond-type-${condition.key}`}
                      value={condition.type}
                      onChange={(event) => {
                        const type = event.target.value as ConditionType;
                        const operator = operatorsFor(type).includes(condition.operator)
                          ? condition.operator
                          : (operatorsFor(type)[0] ?? "eq");
                        updateCondition(condition.key, {
                          ...condition,
                          type,
                          operator,
                          value: defaultValueFor(type, operator),
                        });
                      }}
                    >
                      {CONDITION_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {t(`conditionType.${type}`)}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor={`cond-op-${condition.key}`}>{t("operatorLabel")}</Label>
                    <Select
                      id={`cond-op-${condition.key}`}
                      value={condition.operator}
                      onChange={(event) => {
                        const operator = event.target.value as ConditionDraft["operator"];
                        updateCondition(condition.key, {
                          ...condition,
                          operator,
                          value: coerceConditionValue(condition.type, operator, condition.value),
                        });
                      }}
                    >
                      {operatorsFor(condition.type).map((operator) => (
                        <option key={operator} value={operator}>
                          {t(`operator.${operator}`)}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor={`cond-value-${condition.key}`}>{t("value")}</Label>
                    <ConditionValue
                      draft={condition}
                      onChange={(value) => updateCondition(condition.key, { ...condition, value })}
                      users={userOptions}
                      groups={groupOptions}
                      campaigns={campaignOptions}
                      departments={departments}
                      countries={countries}
                      jobTitles={jobTitles}
                      aliases={aliases}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="ghost"
                      aria-label={t("removeCondition")}
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          conditions: current.conditions.filter((item) => item.key !== condition.key),
                        }))
                      }
                    >
                      ×
                    </Button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-medium text-ink">{t("actions")}</h3>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setForm((current) => ({ ...current, actions: [...current.actions, emptyAction()] }))}
            >
              {t("addAction")}
            </Button>
          </div>
          {form.actions.length === 0 ? <p className="text-sm text-seal">{t("actionsRequired")}</p> : null}
          {form.actions.map((action) => (
            <div key={action.key} className="space-y-3 border border-rule p-3">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <Label htmlFor={`act-type-${action.key}`}>{t("type")}</Label>
                  <Select
                    id={`act-type-${action.key}`}
                    value={action.type}
                    onChange={(event) =>
                      updateAction(action.key, { ...emptyAction(event.target.value as ActionDraft["type"]), key: action.key })
                    }
                  >
                    {ACTION_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {t(`actionType.${type}`)}
                      </option>
                    ))}
                  </Select>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  className="mt-6"
                  aria-label={t("removeAction")}
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      actions: current.actions.filter((item) => item.key !== action.key),
                    }))
                  }
                >
                  ×
                </Button>
              </div>
              {action.type === "select_template" ? (
                <Select
                  id={`act-template-${action.key}`}
                  value={action.templateId}
                  onChange={(event) => updateAction(action.key, { ...action, templateId: event.target.value })}
                >
                  <option value="">{t("chooseTemplate")}</option>
                  {(templates ?? []).map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </Select>
              ) : null}
              {action.type === "select_disclaimer" ? (
                <div>
                  <Label htmlFor={`act-text-${action.key}`}>{t("disclaimerText")}</Label>
                  <Textarea
                    id={`act-text-${action.key}`}
                    rows={3}
                    value={action.text}
                    onChange={(event) => updateAction(action.key, { ...action, text: event.target.value })}
                  />
                </div>
              ) : null}
              {action.type === "select_banner" ? (
                <Select
                  id={`act-campaign-${action.key}`}
                  value={action.campaignId}
                  onChange={(event) => updateAction(action.key, { ...action, campaignId: event.target.value })}
                >
                  <option value="">{t("chooseCampaign")}</option>
                  {campaignOptions.map((campaign) => (
                    <option key={campaign.value} value={campaign.value}>
                      {campaign.label}
                    </option>
                  ))}
                </Select>
              ) : null}
              {action.type === "hide_block" || action.type === "show_block" ? (
                <Select
                  id={`act-block-${action.key}`}
                  value={action.blockType}
                  onChange={(event) => updateAction(action.key, { ...action, blockType: event.target.value })}
                >
                  {BLOCK_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {tb(type)}
                    </option>
                  ))}
                </Select>
              ) : null}
              {action.type === "override_brand_asset" ? (
                <AssetPicker kind="any" value={action.assetId} allowClear onChange={(assetId) => updateAction(action.key, { ...action, assetId })} />
              ) : null}
            </div>
          ))}
        </div>

        {error ? <p className="text-sm text-seal">{error}</p> : null}

        <div className="flex gap-2">
          <Button type="button" onClick={() => void save()} disabled={pending}>
            {pending ? tc("loading") : tc("save")}
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            {tc("cancel")}
          </Button>
        </div>
      </Card>
    </div>
  );
}
