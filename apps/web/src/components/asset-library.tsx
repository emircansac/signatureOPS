"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc";
import { resolvePublicAssetUrl } from "@/lib/asset-url";
import { Badge, Button, Card, Input, Label, Select } from "@/components/ui";

type AssetKind = "LOGO" | "BANNER" | "CERTIFICATION" | "PHOTO";

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
  const utils = trpc.useUtils();
  const { data: assets, isLoading } = trpc.assets.list.useQuery(
    kindFilter ? { kind: kindFilter } : undefined,
  );

  const [url, setUrl] = useState("");
  const [alt, setAlt] = useState("");
  const [kind, setKind] = useState<AssetKind>(kindFilter ?? "LOGO");
  const [width, setWidth] = useState("120");
  const [height, setHeight] = useState("40");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const createMutation = trpc.assets.create.useMutation({
    onSuccess: () => {
      utils.assets.list.invalidate();
      setUrl("");
      setAlt("");
      setError("");
    },
    onError: (err) => setError(err.message),
  });

  const deleteMutation = trpc.assets.delete.useMutation({
    onSuccess: () => utils.assets.list.invalidate(),
  });

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");

      await createMutation.mutateAsync({
        kind,
        url: data.url,
        bytes: data.bytes,
        width: parseInt(width, 10) || undefined,
        height: parseInt(height, 10) || undefined,
        alt: alt || file.name,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleUrlAdd = () => {
    if (!url.trim()) return;
    createMutation.mutate({
      kind,
      url: url.trim(),
      alt: alt || undefined,
      width: parseInt(width, 10) || undefined,
      height: parseInt(height, 10) || undefined,
    });
  };

  if (isLoading) return <Card className="p-4 text-sm text-zinc-500">{t("loading")}</Card>;

  return (
    <Card className="space-y-4">
      <div>
        <h3 className="font-semibold">{t("title")}</h3>
        <p className="text-sm text-zinc-500">{t("subtitle")}</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <Label>{t("upload")}</Label>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp"
            className="mt-1 block w-full text-sm"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFileUpload(file);
              e.target.value = "";
            }}
          />
          <p className="mt-1 text-xs text-zinc-400">{t("uploadHint")}</p>
        </div>
        <div>
          <Label>{t("urlAdd")}</Label>
          <Input
            placeholder="https://cdn.example.com/logo.png"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        {!kindFilter && (
          <div>
            <Label>{t("kind")}</Label>
            <Select value={kind} onChange={(e) => setKind(e.target.value as AssetKind)}>
              <option value="LOGO">{t("kinds.LOGO")}</option>
              <option value="BANNER">{t("kinds.BANNER")}</option>
              <option value="PHOTO">{t("kinds.PHOTO")}</option>
              <option value="CERTIFICATION">{t("kinds.CERTIFICATION")}</option>
            </Select>
          </div>
        )}
        <div>
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

      {url.trim() && (
        <Button variant="secondary" onClick={handleUrlAdd} disabled={createMutation.isPending}>
          {t("addUrl")}
        </Button>
      )}

      {uploading && <p className="text-sm text-blue-600">{t("uploading")}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {assets?.map((asset) => {
          const src = resolvePublicAssetUrl(asset.url);
          const isSelected = selectedId === asset.id;
          return (
            <div
              key={asset.id}
              className={`rounded-lg border p-3 ${isSelected ? "border-blue-500 bg-blue-50" : "border-zinc-200"}`}
            >
              <div className="mb-2 flex h-20 items-center justify-center overflow-hidden rounded bg-zinc-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={asset.alt ?? asset.id}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{asset.alt ?? asset.id}</p>
                  <Badge>{asset.kind}</Badge>
                </div>
                <div className="flex shrink-0 gap-1">
                  {onSelect && (
                    <Button variant="secondary" onClick={() => onSelect(asset.id)}>
                      {t("select")}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    onClick={() => deleteMutation.mutate({ id: asset.id })}
                  >
                    ×
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {assets?.length === 0 && (
        <p className="text-sm text-zinc-500">{t("empty")}</p>
      )}
    </Card>
  );
}
