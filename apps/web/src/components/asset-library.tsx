"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc";
import { resolvePublicAssetUrl } from "@/lib/asset-url";
import { Badge, Button, Card, Input, Label, Select } from "@/components/ui";
import { cn } from "@/lib/utils";

type AssetKind = "LOGO" | "BANNER" | "CERTIFICATION" | "PHOTO";
type Source = "file" | "url";

const KINDS: AssetKind[] = ["LOGO", "BANNER", "PHOTO", "CERTIFICATION"];
const MAX_BYTES = 500_000;
const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);

function formatBytes(bytes: number): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  return `${Math.round((bytes / 1024) * 10) / 10} KB`;
}

function readImageSize(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error("unreadable"));
    img.src = src;
  });
}

export function AssetLibrary({
  onSelect,
  selectedId,
  kindFilter,
}: {
  onSelect?: (assetId: string) => void;
  selectedId?: string;
  kindFilter?: AssetKind;
}) {
  const t = useTranslations("assets");
  const tc = useTranslations("common");
  const locale = useLocale();
  const utils = trpc.useUtils();
  const { data: assets, isLoading } = trpc.assets.list.useQuery(
    kindFilter ? { kind: kindFilter } : undefined,
  );

  const [source, setSource] = useState<Source>("file");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [url, setUrl] = useState("");
  const [alt, setAlt] = useState("");
  const [kind, setKind] = useState<AssetKind>(kindFilter ?? "LOGO");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [dimsFromImage, setDimsFromImage] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [kindQuery, setKindQuery] = useState<AssetKind | "ALL">("ALL");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [editAlt, setEditAlt] = useState("");
  const [editKind, setEditKind] = useState<AssetKind>("LOGO");
  const [editWidth, setEditWidth] = useState("");
  const [editHeight, setEditHeight] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const createMutation = trpc.assets.create.useMutation({
    onSuccess: () => {
      utils.assets.list.invalidate();
      resetForm();
    },
    onError: (err) => setError(err.message),
  });

  const updateMutation = trpc.assets.update.useMutation({
    onSuccess: () => {
      utils.assets.list.invalidate();
      setEditingId(null);
    },
  });

  const deleteMutation = trpc.assets.delete.useMutation({
    onSuccess: () => {
      utils.assets.list.invalidate();
      setPendingDeleteId(null);
    },
  });

  function resetForm() {
    setFile(null);
    setUrl("");
    setAlt("");
    setWidth("");
    setHeight("");
    setDimsFromImage(false);
    setError("");
    setPreviewUrl((current) => {
      if (current.startsWith("blob:")) URL.revokeObjectURL(current);
      return "";
    });
    if (fileRef.current) fileRef.current.value = "";
  }

  useEffect(() => {
    return () => {
      if (previewUrl.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const applyImageSource = async (src: string, nextAlt?: string) => {
    setPreviewUrl((current) => {
      if (current.startsWith("blob:")) URL.revokeObjectURL(current);
      return src;
    });
    if (nextAlt) setAlt((current) => current || nextAlt);
    try {
      const size = await readImageSize(src);
      setWidth(String(size.width));
      setHeight(String(size.height));
      setDimsFromImage(true);
    } catch {
      setDimsFromImage(false);
    }
  };

  const onFileChosen = (next: File | undefined) => {
    if (!next) return;
    setError("");
    if (!ALLOWED_TYPES.has(next.type)) {
      setError(t("fileHint"));
      return;
    }
    if (next.size > MAX_BYTES) {
      setError(t("fileHint"));
      return;
    }
    setFile(next);
    const name = next.name.replace(/\.[^.]+$/, "");
    void applyImageSource(URL.createObjectURL(next), name);
  };

  const onUrlBlur = () => {
    const trimmed = url.trim();
    if (!trimmed) {
      setPreviewUrl("");
      setDimsFromImage(false);
      return;
    }
    void applyImageSource(trimmed);
  };

  const canSubmit =
    source === "file"
      ? Boolean(file) && !uploading && !createMutation.isPending
      : Boolean(url.trim()) && !createMutation.isPending;

  const handleSubmit = async () => {
    setError("");
    const parsedWidth = parseInt(width, 10);
    const parsedHeight = parseInt(height, 10);
    const meta = {
      kind,
      alt: alt.trim() || undefined,
      width: Number.isFinite(parsedWidth) && parsedWidth > 0 ? parsedWidth : undefined,
      height: Number.isFinite(parsedHeight) && parsedHeight > 0 ? parsedHeight : undefined,
    };

    if (source === "url") {
      const trimmed = url.trim();
      if (!trimmed.startsWith("https://") && !trimmed.startsWith("http://")) {
        setError(t("urlHint"));
        return;
      }
      let nextWidth = meta.width;
      let nextHeight = meta.height;
      if (!nextWidth || !nextHeight) {
        try {
          const size = await readImageSize(trimmed);
          nextWidth = size.width;
          nextHeight = size.height;
        } catch {
          /* URL may be unreachable from the browser; store without dims */
        }
      }
      createMutation.mutate({ ...meta, url: trimmed, width: nextWidth, height: nextHeight });
      return;
    }

    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = (await res.json()) as { url?: string; bytes?: number; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "Upload failed");
      await createMutation.mutateAsync({
        ...meta,
        url: data.url,
        bytes: data.bytes,
        alt: meta.alt || file.name.replace(/\.[^.]+$/, ""),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const filtered = useMemo(() => {
    const list = assets ?? [];
    const q = query.trim().toLocaleLowerCase(locale);
    return list.filter((asset) => {
      if (kindQuery !== "ALL" && asset.kind !== kindQuery) return false;
      if (!q) return true;
      const haystack = `${asset.alt ?? ""} ${asset.id} ${asset.kind}`.toLocaleLowerCase(locale);
      return haystack.includes(q);
    });
  }, [assets, kindQuery, locale, query]);

  const dateFmt = (value: Date | string) =>
    new Date(value).toLocaleDateString(locale === "en" ? "en-GB" : "tr-TR");

  if (isLoading) return <Card className="p-4 text-sm text-lead">{t("loading")}</Card>;

  return (
    <div className="space-y-8">
      <Card className="space-y-5">
        <div>
          <h2 className="text-[15px] font-medium text-ink">{t("newAsset")}</h2>
          <p className="mt-1 text-sm text-lead">{t("subtitle")}</p>
        </div>

        <div className="flex border-b border-rule">
          {(["file", "url"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setSource(value);
                setError("");
                setDimsFromImage(false);
                setPreviewUrl((current) => {
                  if (current.startsWith("blob:")) URL.revokeObjectURL(current);
                  return "";
                });
                if (value === "file") setUrl("");
                if (value === "url") {
                  setFile(null);
                  if (fileRef.current) fileRef.current.value = "";
                }
              }}
              className={cn(
                "-mb-px border-b px-4 py-2 text-sm",
                source === value ? "border-ink text-ink" : "border-transparent text-lead hover:text-ink",
              )}
            >
              {value === "file" ? t("sourceFile") : t("sourceUrl")}
            </button>
          ))}
        </div>

        {source === "file" ? (
          <div>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp"
              className="hidden"
              onChange={(e) => onFileChosen(e.target.files?.[0])}
            />
            <button
              type="button"
              aria-label={t("chooseFile")}
              onClick={() => fileRef.current?.click()}
              className="flex w-full items-center justify-between border border-rule bg-paper px-3 py-3 text-left text-sm text-ink hover:border-ink"
            >
              <span>{file ? file.name : t("chooseFile")}</span>
              <span aria-hidden="true" className="text-lead">
                {file ? formatBytes(file.size) : t("noFile")}
              </span>
            </button>
            <p className="mt-1 text-xs text-lead">{t("fileHint")}</p>
          </div>
        ) : (
          <div>
            <Label>{t("sourceUrl")}</Label>
            <Input
              placeholder={t("urlPlaceholder")}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onBlur={onUrlBlur}
            />
            <p className="mt-1 text-xs text-lead">{t("urlHint")}</p>
          </div>
        )}

        {previewUrl ? (
          <div className="border border-rule p-3">
            <p className="mb-2 text-xs text-lead">{t("previewTitle")}</p>
            <div className="flex h-28 items-center justify-center overflow-hidden border border-rule bg-paper">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl} alt="" className="max-h-full max-w-full object-contain" />
            </div>
          </div>
        ) : null}

        <div className="grid gap-3 md:grid-cols-4">
          {!kindFilter && (
            <div>
              <Label>{t("kind")}</Label>
              <Select value={kind} onChange={(e) => setKind(e.target.value as AssetKind)}>
                {KINDS.map((value) => (
                  <option key={value} value={value}>
                    {t(`kinds.${value}`)}
                  </option>
                ))}
              </Select>
            </div>
          )}
          <div className={kindFilter ? "md:col-span-2" : ""}>
            <Label>{t("alt")}</Label>
            <Input value={alt} onChange={(e) => setAlt(e.target.value)} placeholder="Acme Logo" />
          </div>
          <div>
            <Label>{t("width")}</Label>
            <Input type="number" value={width} onChange={(e) => setWidth(e.target.value)} />
          </div>
          <div>
            <Label>{t("height")}</Label>
            <Input type="number" value={height} onChange={(e) => setHeight(e.target.value)} />
          </div>
        </div>
        <p className="text-xs text-lead">
          {dimsFromImage ? t("dimensionsFromImage") : t("dimensionsUnknown")}
        </p>

        {error ? <p className="text-sm text-seal">{error}</p> : null}

        <Button onClick={() => void handleSubmit()} disabled={!canSubmit}>
          {uploading || createMutation.isPending ? t("uploading") : t("uploadAction")}
        </Button>
      </Card>

      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="text-[15px] font-medium text-ink">{t("library")}</h2>
          <div className="flex flex-1 flex-col gap-3 sm:max-w-xl sm:flex-row">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("search")}
              aria-label={t("search")}
            />
            {!kindFilter ? (
              <Select
                value={kindQuery}
                onChange={(e) => setKindQuery(e.target.value as AssetKind | "ALL")}
                className="sm:max-w-[10rem]"
              >
                <option value="ALL">{t("filterAll")}</option>
                {KINDS.map((value) => (
                  <option key={value} value={value}>
                    {t(`kinds.${value}`)}
                  </option>
                ))}
              </Select>
            ) : null}
          </div>
        </div>

        {assets?.length === 0 ? (
          <Card>
            <p className="text-sm text-ink">{t("empty")}</p>
            <p className="mt-1 text-sm text-lead">{t("emptyHint")}</p>
          </Card>
        ) : filtered.length === 0 ? (
          <Card>
            <p className="text-sm text-lead">{t("noResults")}</p>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {filtered.map((asset) => {
              const src = resolvePublicAssetUrl(asset.url);
              const isSelected = selectedId === asset.id;
              const usageNames = [
                ...asset.usedIn.templates.map((item) => item.name),
                ...asset.usedIn.campaigns.map((item) => item.name),
              ];
              const inUse = usageNames.length > 0;
              const isEditing = editingId === asset.id;
              const isDeleting = pendingDeleteId === asset.id;

              return (
                <div
                  key={asset.id}
                  className={cn("border p-3", isSelected ? "border-ink" : "border-rule")}
                >
                  <div className="mb-3 flex h-24 items-center justify-center overflow-hidden border border-rule">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={src}
                      alt={asset.alt ?? asset.id}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>

                  {isEditing ? (
                    <div className="space-y-3">
                      <div>
                        <Label>{t("alt")}</Label>
                        <Input value={editAlt} onChange={(e) => setEditAlt(e.target.value)} />
                      </div>
                      {!kindFilter ? (
                        <div>
                          <Label>{t("kind")}</Label>
                          <Select value={editKind} onChange={(e) => setEditKind(e.target.value as AssetKind)}>
                            {KINDS.map((value) => (
                              <option key={value} value={value}>
                                {t(`kinds.${value}`)}
                              </option>
                            ))}
                          </Select>
                        </div>
                      ) : null}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label>{t("width")}</Label>
                          <Input type="number" value={editWidth} onChange={(e) => setEditWidth(e.target.value)} />
                        </div>
                        <div>
                          <Label>{t("height")}</Label>
                          <Input
                            type="number"
                            value={editHeight}
                            onChange={(e) => setEditHeight(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() =>
                            updateMutation.mutate({
                              id: asset.id,
                              alt: editAlt,
                              kind: editKind,
                              width: parseInt(editWidth, 10) || null,
                              height: parseInt(editHeight, 10) || null,
                            })
                          }
                          disabled={updateMutation.isPending}
                        >
                          {tc("save")}
                        </Button>
                        <Button variant="secondary" onClick={() => setEditingId(null)}>
                          {tc("cancel")}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-ink">{asset.alt ?? asset.id}</p>
                          <Badge>{t(`kinds.${asset.kind}`)}</Badge>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          {onSelect ? (
                            <Button variant="secondary" onClick={() => onSelect(asset.id)}>
                              {t("select")}
                            </Button>
                          ) : null}
                          <Button
                            variant="ghost"
                            onClick={() => {
                              setPendingDeleteId(null);
                              setEditingId(asset.id);
                              setEditAlt(asset.alt ?? "");
                              setEditKind(asset.kind);
                              setEditWidth(asset.width ? String(asset.width) : "");
                              setEditHeight(asset.height ? String(asset.height) : "");
                            }}
                          >
                            {tc("edit")}
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() => {
                              setEditingId(null);
                              setPendingDeleteId(asset.id);
                            }}
                          >
                            {tc("delete")}
                          </Button>
                        </div>
                      </div>

                      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-[12px] text-lead">
                        <div>
                          <dt className="text-lead">{t("bytes")}</dt>
                          <dd className="text-ink">
                            {asset.bytes ? formatBytes(asset.bytes) : t("unknownSize")}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-lead">{t("dimensions")}</dt>
                          <dd className="text-ink">
                            {asset.width && asset.height ? `${asset.width} × ${asset.height}` : "—"}
                          </dd>
                        </div>
                        <div className="col-span-2">
                          <dt className="text-lead">{t("uploadedAt")}</dt>
                          <dd className="text-ink">{dateFmt(asset.createdAt)}</dd>
                        </div>
                      </dl>

                      <p className="mt-3 text-[12px] text-lead">
                        {inUse
                          ? `${t("usedIn")}: ${usageNames.join(", ")}`
                          : t("unused")}
                      </p>
                      {inUse ? (
                        <p className="mt-0.5 text-[12px] text-lead">
                          {t("usedInTemplates", { count: asset.usedIn.templates.length })}
                          {asset.usedIn.campaigns.length
                            ? ` · ${t("usedInCampaigns", { count: asset.usedIn.campaigns.length })}`
                            : ""}
                        </p>
                      ) : null}

                      {isDeleting ? (
                        <div className="mt-3 border-t border-rule pt-3">
                          <p className="text-sm text-ink">{t("deleteConfirm")}</p>
                          {inUse ? (
                            <p className="mt-1 text-sm text-seal">
                              {t("deleteInUse", { names: usageNames.join(", ") })}
                            </p>
                          ) : null}
                          <div className="mt-3 flex gap-2">
                            <Button
                              variant="secondary"
                              onClick={() => deleteMutation.mutate({ id: asset.id })}
                              disabled={deleteMutation.isPending}
                            >
                              {t("confirmDelete")}
                            </Button>
                            <Button variant="ghost" onClick={() => setPendingDeleteId(null)}>
                              {tc("cancel")}
                            </Button>
                          </div>
                        </div>
                      ) : null}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
