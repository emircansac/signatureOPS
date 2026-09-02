"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { TemplateDefinition, Block } from "@signatureops/schema";
import { trpc } from "@/lib/trpc";
import { BlockConfig } from "@/components/block-config";
import { EmailComposePreview } from "@/components/email-compose-preview";
import { Badge, Button, Card, Input, Label, Select } from "@/components/ui";

const BLOCK_TYPES = [
  "identity",
  "contact_details",
  "company_logo",
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
  ids: { logo?: string; banner?: string },
): Block {
  switch (type) {
    case "identity":
      return { type: "identity", fields: ["displayName", "jobTitle"] };
    case "contact_details":
      return { type: "contact_details", fields: ["email", "mobile"] };
    case "company_logo":
      return { type: "company_logo", assetId: ids.logo ?? "", logoVariant: "default" };
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
      return { type: "legal_disclaimer", text: "Confidential. {{organization.name}}", assetId: "" };
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
  const [copied, setCopied] = useState(false);

  const { data: preview, refetch: refetchPreview } = trpc.templates.compilePreview.useQuery(
    { definition, userId: previewUserId || users?.[0]?.id || "", templateId },
    { enabled: !!(previewUserId || users?.[0]?.id), staleTime: 0, refetchOnMount: "always" },
  );

  const copyHtml = async () => {
    if (!preview?.html) return;
    await navigator.clipboard.writeText(preview.html);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const moveBlock = (index: number, direction: -1 | 1) => {
    const newBlocks = [...definition.blocks];
    const target = index + direction;
    if (target < 0 || target >= newBlocks.length) return;
    [newBlocks[index], newBlocks[target]] = [newBlocks[target]!, newBlocks[index]!];
    setDefinition({ ...definition, blocks: newBlocks });
    setActiveBlockIndex(target);
  };

  const removeBlock = (index: number) => {
    setDefinition({
      ...definition,
      blocks: definition.blocks.filter((_, i) => i !== index),
    });
    setActiveBlockIndex(null);
  };

  const addBlock = (type: (typeof BLOCK_TYPES)[number]) => {
    const newIndex = definition.blocks.length;
    setDefinition({
      ...definition,
      blocks: [
        ...definition.blocks,
        defaultBlock(type, {
          logo: identity?.slots.logo?.id,
          banner: identity?.slots.banner?.id,
        }),
      ],
    });
    setActiveBlockIndex(newIndex);
  };

  const updateBlock = (index: number, block: Block) => {
    const blocks = [...definition.blocks];
    blocks[index] = block;
    setDefinition({ ...definition, blocks });
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
              onChange={(e) =>
                setDefinition({
                  ...definition,
                  layout: e.target.value as "single-column" | "two-column",
                })
              }
            >
              <option value="single-column">{t("singleColumn")}</option>
              <option value="two-column">{t("twoColumn")}</option>
            </Select>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <Label>{t("blocks")}</Label>
              <Select
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) addBlock(e.target.value as (typeof BLOCK_TYPES)[number]);
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
            <div className="space-y-2">
              {definition.blocks.map((block, index) => (
                <Card
                  key={index}
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

          <Button onClick={() => onSave({ name, definition })} disabled={saving}>
            {saving ? "..." : tc("save")}
          </Button>
        </div>

        <div className="space-y-4">
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
            <Button variant="secondary" className="mt-2" onClick={() => refetchPreview()}>
              {tc("preview")}
            </Button>
            {preview?.html && (
              <Button variant="secondary" className="mt-2 ml-2" onClick={copyHtml}>
                {copied ? tc("copied") : t("copyForGmail")}
              </Button>
            )}
          </div>

          <EmailComposePreview
            html={preview?.html}
            fromName={users?.find((u) => u.id === (previewUserId || users?.[0]?.id))?.displayName}
          />

          {preview && (
            <Card>
              <div className="mb-2 flex items-center justify-between">
                <span className="font-medium">{t("lintPanel")}</span>
                <Badge variant={preview.lint.passed ? "success" : "warning"}>
                  {preview.lint.score}/100
                </Badge>
              </div>
              <ul className="space-y-1 text-sm">
                {preview.lint.issues.slice(0, 5).map((issue) => (
                  <li key={issue.id} className="text-lead">
                    {issue.message}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
