"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { TemplateDefinition, Block, Layout, TemplateColumn } from "@signatureops/schema";
import { assignMissingColumns, blockColumn, defaultBlockColumn, defaultStackedColumn } from "@signatureops/schema";
import { trpc } from "@/lib/trpc";
import { BlockConfig } from "@/components/block-config";
import { EmailComposePreview } from "@/components/email-compose-preview";
import { SavedSignatureStrips } from "@/components/saved-signature-strips";
import { copySignatureHtml } from "@/lib/copy-signature";
import { LintScoreBar } from "@/components/lint-score-bar";
import { Button, Card, Input, Label, Select } from "@/components/ui";
import { cn } from "@/lib/utils";

const BLOCK_TYPES = [
  "identity",
  "contact_details",
  "company_logo",
  "org_intro",
  "profile_photo",
  "social_links",
  "cta_button",
  "campaign_banner",
  "legal_disclaimer",
  "certifications",
  "custom_text",
  "spacer",
  "divider",
] as const;

function defaultBlock(
  type: (typeof BLOCK_TYPES)[number],
  ids: { logo?: string; banner?: string; legalDisclaimer?: string },
): Block {
  switch (type) {
    case "identity":
      return { type: "identity", fields: ["displayName", "jobTitle"] };
    case "contact_details":
      return { type: "contact_details", fields: ["email", "mobile"] };
    case "company_logo":
      return {
        type: "company_logo",
        assetId: ids.logo ?? "",
        logoVariant: "default",
        logoSize: "small",
      };
    case "profile_photo":
      return { type: "profile_photo" };
    case "social_links":
      return {
        type: "social_links",
        platforms: ["linkedin"],
        links: [{ network: "linkedin", url: "https://linkedin.com" }],
      };
    case "cta_button":
      return { type: "cta_button", label: "CTA", url: "https://example.com", assetId: "", colorAssetId: null };
    case "campaign_banner":
      return { type: "campaign_banner", campaignId: "", assetId: ids.banner ?? "" };
    case "legal_disclaimer":
      return {
        type: "legal_disclaimer",
        text: ids.legalDisclaimer?.trim() || "Confidential. {{organization.name}}",
        assetId: "",
      };
    case "org_intro":
      return { type: "org_intro" };
    case "certifications":
      return { type: "certifications", assetIds: [] };
    case "custom_text":
      return { type: "custom_text", text: "Custom text" };
    case "spacer":
      return { type: "spacer" };
    case "divider":
      return { type: "divider" };
  }
}

export function TemplateEditor({
  initial,
  onSave,
  saving,
  templateId,
}: {
  initial?: { name: string; definition: TemplateDefinition };
  onSave: (data: { name: string; definition: TemplateDefinition }) => void;
  saving?: boolean;
  templateId?: string;
}) {
  const t = useTranslations("templates");
  const tc = useTranslations("common");
  const tb = useTranslations("blocks");
  const [name, setName] = useState(initial?.name ?? "New Template");
  const [definition, setDefinition] = useState<TemplateDefinition>(
    initial?.definition ?? {
      layout: "single-column",
      blocks: [
        { type: "identity", fields: ["displayName", "jobTitle"] },
        { type: "contact_details", fields: ["email"] },
      ],
    },
  );
  const [activeBlockIndex, setActiveBlockIndex] = useState<number | null>(null);

  const { data: users } = trpc.users.list.useQuery();
  const { data: identity } = trpc.identity.get.useQuery();
  const [previewUserId, setPreviewUserId] = useState<string>("");
  const [copied, setCopied] = useState<"rich" | "source" | false>(false);
  const [rightTab, setRightTab] = useState<"preview" | "saved">("preview");

  const { data: preview, refetch: refetchPreview } = trpc.templates.compilePreview.useQuery(
    { definition, userId: previewUserId || users?.[0]?.id || "", templateId },
    { enabled: !!(previewUserId || users?.[0]?.id), staleTime: 0, refetchOnMount: "always" },
  );

  const copyHtml = async (mode: "rich" | "source") => {
    if (!preview?.html) return;
    await copySignatureHtml(preview.html, mode);
    setCopied(mode);
    setTimeout(() => setCopied(false), 2000);
  };

  const setLayout = (layout: Layout) => {
    if (layout === "two-column") {
      setDefinition(assignMissingColumns({ ...definition, layout }));
      return;
    }
    setDefinition({ ...definition, layout });
  };

  const moveBlock = (index: number, direction: -1 | 1) => {
    const column = blockColumn(definition.blocks[index]!, definition.layout);
    const siblings = definition.blocks
      .map((_, i) => i)
      .filter((i) => blockColumn(definition.blocks[i]!, definition.layout) === column);
    const position = siblings.indexOf(index);
    const swapWith = siblings[position + direction];
    if (swapWith === undefined) return;
    const newBlocks = [...definition.blocks];
    [newBlocks[index], newBlocks[swapWith]] = [newBlocks[swapWith]!, newBlocks[index]!];
    setDefinition({ ...definition, blocks: newBlocks });
    setActiveBlockIndex(swapWith);
  };

  const moveBlockToColumn = (index: number, column: TemplateColumn) => {
    const blocks = [...definition.blocks];
    const current = blocks[index];
    if (!current) return;
    blocks[index] = { ...current, column };
    setDefinition({ ...definition, blocks });
  };

  const removeBlock = (index: number) => {
    setDefinition({
      ...definition,
      blocks: definition.blocks.filter((_, i) => i !== index),
    });
    setActiveBlockIndex(null);
  };

  const addBlock = (type: (typeof BLOCK_TYPES)[number], column?: TemplateColumn) => {
    const next: Block = {
      ...defaultBlock(type, {
        logo: identity?.slots.logo?.id,
        banner: identity?.slots.banner?.id,
        legalDisclaimer: identity?.legalDisclaimer,
      }),
      ...(column ? { column } : definition.layout === "two-column" ? { column: defaultBlockColumn(type) } : {}),
    };
    const blocks = [...definition.blocks];
    if (!column) {
      blocks.push(next);
      setDefinition({ ...definition, blocks });
      setActiveBlockIndex(blocks.length - 1);
      return;
    }
    const lastInColumn = [...blocks.keys()]
      .filter((i) => blockColumn(blocks[i]!, definition.layout) === column)
      .pop();
    const insertAt = lastInColumn === undefined ? (column === 1 ? 0 : blocks.length) : lastInColumn + 1;
    blocks.splice(insertAt, 0, next);
    setDefinition({ ...definition, blocks });
    setActiveBlockIndex(insertAt);
  };

  const updateBlock = (index: number, block: Block) => {
    const blocks = [...definition.blocks];
    const previous = blocks[index];
    blocks[index] = previous?.column ? { ...block, column: previous.column } : block;
    setDefinition({ ...definition, blocks });
  };

  const renderBlockList = (column?: TemplateColumn) => {
    const items = definition.blocks
      .map((block, index) => ({ block, index }))
      .filter(({ block }) =>
        column ? blockColumn(block, definition.layout) === column : true,
      );
    const isBelow = column === "below";
    const hasIntroBelow = definition.blocks.some(
      (block) => block.type === "org_intro" && blockColumn(block, definition.layout) === "below",
    );

    return (
      <div className={cn(isBelow && "border border-dashed border-rule p-3")}>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <Label>
            {column === 1
              ? t("column1")
              : column === 2
                ? t("column2")
                : isBelow
                  ? t("belowColumns")
                  : t("blocks")}
          </Label>
          <div className="flex flex-wrap items-center gap-2">
            {isBelow && !hasIntroBelow ? (
              <Button type="button" variant="secondary" onClick={() => addBlock("org_intro", "below")}>
                {t("addIntro")}
              </Button>
            ) : null}
            <Select
              defaultValue=""
              className="w-auto min-w-[9rem]"
              onChange={(e) => {
                if (e.target.value) addBlock(e.target.value as (typeof BLOCK_TYPES)[number], column);
                e.target.value = "";
              }}
            >
              <option value="">{t("addBlock")}</option>
              {BLOCK_TYPES.map((type) => (
                <option key={type} value={type}>
                  {tb(type)}
                </option>
              ))}
            </Select>
          </div>
        </div>
        {isBelow && items.length === 0 ? (
          <p className="mb-2 text-sm text-lead">{t("belowColumnsHint")}</p>
        ) : null}
        <div className="space-y-2">
          {items.map(({ block, index }) => (
            <Card
              key={`${block.type}-${index}`}
              className={`p-3 ${activeBlockIndex === index ? "border-ink" : ""}`}
            >
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  className="text-left font-medium text-ink"
                  onClick={() => setActiveBlockIndex(activeBlockIndex === index ? null : index)}
                >
                  {tb(block.type)}
                </button>
                <div className="flex gap-1">
                  {definition.layout === "two-column" ? (
                    blockColumn(block, "two-column") === "below" ? (
                      <Button
                        variant="ghost"
                        title={t("moveToColumns")}
                        onClick={() => moveBlockToColumn(index, defaultStackedColumn(block.type))}
                      >
                        {t("toColumns")}
                      </Button>
                    ) : (
                      <>
                        <Button
                          variant="ghost"
                          title={t("moveToOtherColumn")}
                          onClick={() =>
                            moveBlockToColumn(index, blockColumn(block, "two-column") === 1 ? 2 : 1)
                          }
                        >
                          {blockColumn(block, "two-column") === 1 ? "→" : "←"}
                        </Button>
                        <Button
                          variant="ghost"
                          title={t("moveBelow")}
                          onClick={() => moveBlockToColumn(index, "below")}
                        >
                          {t("toBelow")}
                        </Button>
                      </>
                    )
                  ) : null}
                  <Button variant="ghost" onClick={() => moveBlock(index, -1)}>
                    ↑
                  </Button>
                  <Button variant="ghost" onClick={() => moveBlock(index, 1)}>
                    ↓
                  </Button>
                  <Button variant="ghost" onClick={() => removeBlock(index)}>
                    ×
                  </Button>
                </div>
              </div>
              {activeBlockIndex === index && (
                <BlockConfig block={block} index={index} onChange={updateBlock} />
              )}
            </Card>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div>
            <Label>{tc("name")}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>{t("layout")}</Label>
            <Select
              value={definition.layout}
              onChange={(e) => setLayout(e.target.value as Layout)}
            >
              <option value="single-column">{t("singleColumn")}</option>
              <option value="two-column">{t("twoColumn")}</option>
            </Select>
            {definition.layout === "two-column" ? (
              <label className="mt-2 flex items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={definition.columnDivider === true}
                  onChange={(e) =>
                    setDefinition({ ...definition, columnDivider: e.target.checked })
                  }
                />
                {t("columnDivider")}
              </label>
            ) : null}
          </div>

          {definition.layout === "two-column" ? (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {renderBlockList(1)}
                {renderBlockList(2)}
              </div>
              {renderBlockList("below")}
            </div>
          ) : (
            renderBlockList()
          )}

          <Button type="button" onClick={() => onSave({ name, definition })} disabled={saving}>
            {saving ? "..." : tc("save")}
          </Button>
        </div>

        <div className="space-y-4">
          <div className="flex border-b border-rule">
            {(["preview", "saved"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setRightTab(tab)}
                className={cn(
                  "-mb-px border-b px-3 py-1.5 text-sm",
                  rightTab === tab ? "border-ink text-ink" : "border-transparent text-lead hover:text-ink",
                )}
              >
                {tab === "preview" ? t("previewTab") : t("savedTab")}
              </button>
            ))}
          </div>

          {rightTab === "saved" ? (
            <SavedSignatureStrips currentTemplateId={templateId} />
          ) : (
            <>
              <div>
                <Label>{t("previewUser")}</Label>
                <Select
                  value={previewUserId || users?.[0]?.id || ""}
                  onChange={(e) => setPreviewUserId(e.target.value)}
                >
                  {users?.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.displayName}
                    </option>
                  ))}
                </Select>
                <Button type="button" variant="secondary" className="mt-2" onClick={() => refetchPreview()}>
                  {tc("preview")}
                </Button>
                {preview?.html && (
                  <>
                    <Button
                      type="button"
                      variant="secondary"
                      className="mt-2 ml-2"
                      onClick={() => void copyHtml("rich")}
                    >
                      {copied === "rich" ? tc("copied") : t("copyForGmail")}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      className="mt-2 ml-2"
                      onClick={() => void copyHtml("source")}
                    >
                      {copied === "source" ? tc("copied") : t("copyHtmlSource")}
                    </Button>
                    <p className="mt-2 text-xs text-lead">{t("copyForGmailHint")}</p>
                  </>
                )}
              </div>

              <EmailComposePreview
                html={preview?.html}
                fromName={users?.find((u) => u.id === (previewUserId || users?.[0]?.id))?.displayName}
              />

              {preview && (
                <Card>
                  <LintScoreBar
                    score={preview.lint.score}
                    passed={preview.lint.passed}
                    breakdown={preview.lint.breakdown}
                    issues={preview.lint.issues}
                  />
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
