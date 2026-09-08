"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { displayBoxForSlot } from "@signatureops/compiler/display-fit";
import { trpc } from "@/lib/trpc";
import { resolvePublicAssetUrl } from "@/lib/asset-url";
import { readImageSize, uploadImageFile } from "@/lib/upload-image";
import type { IdentitySlot } from "@/lib/identity";
import { Button, Input, Label } from "@/components/ui";
import { cn } from "@/lib/utils";

type Source = "file" | "url";

const MAX_BYTES = 500_000;
const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);

function isAllowedImageSource(url: string): boolean {
  return (
    url.startsWith("https://") ||
    url.startsWith("http://localhost") ||
    url.startsWith("http://127.0.0.1")
  );
}

type IdentityAsset = {
  id: string;
  url: string;
  alt: string | null;
  width: number | null;
  height: number | null;
  usedIn?: {
    templates: { id: string; name: string }[];
    campaigns: { id: string; name: string }[];
  };
};

export function ImageSlotEditor({
  slot,
  asset,
  compact = false,
  required = false,
}: {
  slot: IdentitySlot;
  asset?: IdentityAsset | null;
  compact?: boolean;
  required?: boolean;
}) {
  const t = useTranslations("identity");
  const ta = useTranslations("assets");
  const tc = useTranslations("common");
  const utils = trpc.useUtils();
  const fileRef = useRef<HTMLInputElement>(null);
  const box = displayBoxForSlot(slot);

  const [replacing, setReplacing] = useState(!asset);
  const [source, setSource] = useState<Source>("file");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [url, setUrl] = useState("");
  const [alt, setAlt] = useState(asset?.alt ?? "");
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(false);

  const upsert = trpc.assets.upsertSlot.useMutation({
    onSuccess: () => {
      utils.identity.get.invalidate();
      utils.assets.list.invalidate();
      resetDraft();
      setReplacing(!asset);
    },
    onError: (err) => setError(err.message),
  });

  const update = trpc.assets.update.useMutation({
    onSuccess: () => {
      utils.identity.get.invalidate();
      utils.assets.list.invalidate();
    },
    onError: (err) => setError(err.message),
  });

  const remove = trpc.assets.delete.useMutation({
    onSuccess: () => {
      utils.identity.get.invalidate();
      utils.assets.list.invalidate();
      setPendingDelete(false);
      setReplacing(true);
    },
    onError: (err) =>
      setError(err.message === "SUPER_ADMIN_REQUIRED" ? ta("deleteForbidden") : err.message),
  });

  useEffect(() => {
    setAlt(asset?.alt ?? "");
  }, [asset?.id, asset?.url, asset?.alt]);

  useEffect(() => {
    setPendingDelete(false);
    setReplacing(!asset);
  }, [asset?.id]);

  useEffect(() => {
    return () => {
      if (previewUrl.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function resetDraft() {
    setFile(null);
    setUrl("");
    setError("");
    setNaturalSize(null);
    setPreviewUrl((current) => {
      if (current.startsWith("blob:")) URL.revokeObjectURL(current);
      return "";
    });
    if (fileRef.current) fileRef.current.value = "";
  }

  const applyPreview = async (src: string, nextAlt?: string) => {
    setPreviewUrl((current) => {
      if (current.startsWith("blob:")) URL.revokeObjectURL(current);
      return src;
    });
    if (nextAlt) setAlt((current) => current || nextAlt);
    try {
      setNaturalSize(await readImageSize(src));
    } catch {
      setNaturalSize(null);
    }
  };

  const onFileChosen = (next: File | undefined) => {
    if (!next) return;
    setError("");
    if (!ALLOWED_TYPES.has(next.type) || next.size > MAX_BYTES) {
      setError(ta("fileHint"));
      return;
    }
    setFile(next);
    void applyPreview(URL.createObjectURL(next), next.name.replace(/\.[^.]+$/, ""));
  };

  const canUpload =
    source === "file"
      ? Boolean(file) && !uploading && !upsert.isPending
      : Boolean(url.trim()) && !upsert.isPending;

  const handleUpload = async () => {
    setError("");
    if (source === "url") {
      const trimmed = url.trim();
      if (!isAllowedImageSource(trimmed)) {
        setError(ta("urlHint"));
        return;
      }
      let nextWidth = naturalSize?.width;
      let nextHeight = naturalSize?.height;
      if (!nextWidth || !nextHeight) {
        try {
          const size = await readImageSize(trimmed);
          nextWidth = size.width;
          nextHeight = size.height;
        } catch {
          /* optional — server falls back to the slot box */
        }
      }
      upsert.mutate({
        slot,
        url: trimmed,
        alt: alt.trim() || undefined,
        width: nextWidth,
        height: nextHeight,
      });
      return;
    }
    if (!file) return;
    setUploading(true);
    try {
      const uploaded = await uploadImageFile(file, { slot });
      await upsert.mutateAsync({
        slot,
        url: uploaded.url,
        bytes: uploaded.bytes,
        width: uploaded.width,
        height: uploaded.height,
        alt: alt.trim() || file.name.replace(/\.[^.]+$/, ""),
      });
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : ta("uploadFailed"));
    } finally {
      setUploading(false);
    }
  };

  const usageNames = [
    ...(asset?.usedIn?.templates.map((item) => item.name) ?? []),
    ...(asset?.usedIn?.campaigns.map((item) => item.name) ?? []),
  ];
  const inUse = usageNames.length > 0;
  const currentSrc = asset ? resolvePublicAssetUrl(asset.url) : "";
  const sizeHint = ta("displaySizeHint", { width: box.width, height: box.height });

  return (
    <div className={cn("space-y-3", compact && "space-y-2")}>
      {asset && !replacing ? (
        <>
          <div className="flex h-24 items-center justify-center overflow-hidden border border-rule">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={currentSrc} alt={asset.alt ?? ""} className="max-h-full max-w-full object-contain" />
          </div>
          <div>
            <Label>{ta("alt")}</Label>
            <Input value={alt} onChange={(e) => setAlt(e.target.value)} />
          </div>
          <p className="text-xs text-lead">{sizeHint}</p>
          {error ? <p className="text-sm text-seal">{error}</p> : null}
          {inUse ? (
            <p className="text-xs text-lead">
              {ta("usedIn")}: {usageNames.join(", ")}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => {
                setError("");
                asset && update.mutate({ id: asset.id, alt });
              }}
              disabled={update.isPending}
            >
              {tc("save")}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setReplacing(true);
                resetDraft();
              }}
            >
              {t("replace")}
            </Button>
            <Button variant="ghost" onClick={() => setPendingDelete(true)}>
              {tc("delete")}
            </Button>
          </div>
          {pendingDelete ? (
            <div className="border-t border-rule pt-3">
              <p className="text-sm text-ink">{ta("deleteConfirm")}</p>
              {inUse ? (
                <p className="mt-1 text-sm text-seal">{ta("deleteInUse", { names: usageNames.join(", ") })}</p>
              ) : null}
              {required ? <p className="mt-1 text-sm text-lead">{t("logoRequiredHint")}</p> : null}
              <div className="mt-3 flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => asset && remove.mutate({ id: asset.id })}
                  disabled={remove.isPending}
                >
                  {ta("confirmDelete")}
                </Button>
                <Button variant="ghost" onClick={() => setPendingDelete(false)}>
                  {tc("cancel")}
                </Button>
              </div>
            </div>
          ) : null}
        </>
      ) : (
        <>
          {required ? <p className="text-xs text-lead">{t("logoRequiredHint")}</p> : null}
          <div className="flex border-b border-rule">
            {(["file", "url"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setSource(value);
                  setError("");
                }}
                className={cn(
                  "-mb-px border-b px-3 py-1.5 text-sm",
                  source === value ? "border-ink text-ink" : "border-transparent text-lead hover:text-ink",
                )}
              >
                {value === "file" ? ta("sourceFile") : ta("sourceUrl")}
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
                aria-label={ta("chooseFile")}
                onClick={() => fileRef.current?.click()}
                className="flex w-full items-center justify-between border border-rule bg-paper px-3 py-3 text-left text-sm text-ink hover:border-ink"
              >
                <span>{file ? file.name : ta("chooseFile")}</span>
                <span aria-hidden="true" className="text-lead">
                  {file ? `${Math.round(file.size / 1024)} KB` : ta("noFile")}
                </span>
              </button>
              <p className="mt-1 text-xs text-lead">{ta("fileHint")}</p>
            </div>
          ) : (
            <div>
              <Input
                placeholder={ta("urlPlaceholder")}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onBlur={() => {
                  if (url.trim()) void applyPreview(url.trim());
                }}
              />
              <p className="mt-1 text-xs text-lead">{ta("urlHint")}</p>
            </div>
          )}
          {previewUrl ? (
            <div className="flex h-24 items-center justify-center overflow-hidden border border-rule">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl} alt="" className="max-h-full max-w-full object-contain" />
            </div>
          ) : null}
          <div>
            <Label>{ta("alt")}</Label>
            <Input value={alt} onChange={(e) => setAlt(e.target.value)} />
          </div>
          <p className="text-xs text-lead">{sizeHint}</p>
          {error ? <p className="text-sm text-seal">{error}</p> : null}
          <div className="flex gap-2">
            <Button onClick={() => void handleUpload()} disabled={!canUpload}>
              {uploading || upsert.isPending ? ta("uploading") : ta("uploadAction")}
            </Button>
            {asset ? (
              <Button
                variant="ghost"
                onClick={() => {
                  setReplacing(false);
                  resetDraft();
                }}
              >
                {tc("cancel")}
              </Button>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
