"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc";
import { resolvePublicAssetUrl } from "@/lib/asset-url";
import { uploadImageFile } from "@/lib/upload-image";
import { isValidEmail } from "@/lib/directory-import";
import { Button, Card, Input, Label } from "@/components/ui";
import { cn } from "@/lib/utils";

const MAX_BYTES = 500_000;
const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);

export type DirectoryPerson = {
  id: string;
  displayName: string;
  jobTitle: string | null;
  email: string;
  mobile: string | null;
  department: string | null;
  country: string | null;
  photoUrl: string | null;
};

type PhotoSource = "file" | "url";

export function PersonForm({
  person,
  existingEmails,
  onClose,
}: {
  person: DirectoryPerson | null;
  existingEmails: string[];
  onClose: () => void;
}) {
  const t = useTranslations("directory");
  const tc = useTranslations("common");
  const ta = useTranslations("assets");
  const utils = trpc.useUtils();
  const fileRef = useRef<HTMLInputElement>(null);
  const editing = Boolean(person);

  const [displayName, setDisplayName] = useState(person?.displayName ?? "");
  const [jobTitle, setJobTitle] = useState(person?.jobTitle ?? "");
  const [email, setEmail] = useState(person?.email ?? "");
  const [mobile, setMobile] = useState(person?.mobile ?? "");
  const [department, setDepartment] = useState(person?.department ?? "");
  const [country, setCountry] = useState(person?.country ?? "");
  const [photoUrl, setPhotoUrl] = useState(person?.photoUrl ?? "");
  const [photoSource, setPhotoSource] = useState<PhotoSource>("file");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [urlDraft, setUrlDraft] = useState(
    person?.photoUrl && (person.photoUrl.startsWith("http://") || person.photoUrl.startsWith("https://"))
      ? person.photoUrl
      : "",
  );
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);

  const createMutation = trpc.users.create.useMutation();
  const updateMutation = trpc.users.update.useMutation();
  const pending = createMutation.isPending || updateMutation.isPending || uploading;

  useEffect(() => {
    return () => {
      if (previewUrl.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function validate(): string | null {
    if (!displayName.trim()) return t("errors.missingName");
    if (!jobTitle.trim()) return t("errors.missingTitle");
    if (!email.trim()) return t("errors.missingEmail");
    if (!isValidEmail(email)) return t("errors.invalidEmail");
    const taken = existingEmails.some(
      (value) => value.toLowerCase() === email.trim().toLowerCase() && value.toLowerCase() !== person?.email.toLowerCase(),
    );
    if (taken) return t("emailTaken");
    return null;
  }

  const onFileChosen = (next: File | undefined) => {
    if (!next) return;
    setError("");
    if (!ALLOWED_TYPES.has(next.type)) {
      setError(t("photoHint"));
      return;
    }
    if (next.size > MAX_BYTES) {
      setError(t("photoHint"));
      return;
    }
    setFile(next);
    setPreviewUrl((current) => {
      if (current.startsWith("blob:")) URL.revokeObjectURL(current);
      return URL.createObjectURL(next);
    });
  };

  const save = async () => {
    const message = validate();
    if (message) {
      setError(message);
      return;
    }
    setError("");
    let nextPhoto = photoUrl.trim();
    try {
      if (photoSource === "file" && file) {
        setUploading(true);
        const uploaded = await uploadImageFile(file);
        nextPhoto = uploaded.url;
      } else if (photoSource === "url") {
        const trimmed = urlDraft.trim();
        if (trimmed) {
          if (!trimmed.startsWith("https://") && !trimmed.startsWith("http://")) {
            setError(ta("urlHint"));
            return;
          }
          nextPhoto = trimmed;
        }
      }
      const payload = {
        displayName: displayName.trim(),
        jobTitle: jobTitle.trim(),
        email: email.trim(),
        mobile: mobile.trim() || null,
        department: department.trim() || null,
        country: country.trim() || null,
        photoUrl: nextPhoto || null,
      };
      if (person) {
        await updateMutation.mutateAsync({ id: person.id, ...payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      await utils.users.list.invalidate();
      onClose();
    } catch (err) {
      const code = err instanceof Error ? err.message : "";
      setError(code.includes("EMAIL_TAKEN") ? t("emailTaken") : code || t("saveFailed"));
    } finally {
      setUploading(false);
    }
  };

  const displayPhoto = previewUrl || (photoUrl ? resolvePublicAssetUrl(photoUrl) : "");

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/40 p-4 pt-16"
      role="dialog"
      aria-modal="true"
      aria-label={editing ? t("editPerson") : t("addPerson")}
    >
      <Card className="w-full max-w-lg space-y-4">
        <div className="flex items-start justify-between gap-4">
          <h2 className="font-serif text-xl font-medium text-ink">
            {editing ? t("editPerson") : t("addPerson")}
          </h2>
          <Button variant="ghost" type="button" onClick={onClose}>
            {tc("cancel")}
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="person-name">
              {t("name")} <span className="text-lead">*</span>
            </Label>
            <Input
              id="person-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="person-title">
              {t("jobTitle")} <span className="text-lead">*</span>
            </Label>
            <Input
              id="person-title"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="person-email">
              {t("email")} <span className="text-lead">*</span>
            </Label>
            <Input
              id="person-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="person-mobile">{t("mobile")}</Label>
            <Input
              id="person-mobile"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="person-department">{t("department")}</Label>
            <Input
              id="person-department"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="person-country">{t("country")}</Label>
            <Input
              id="person-country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-3">
          <Label>{t("photo")}</Label>
          <div className="flex border-b border-rule">
            {(["file", "url"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setPhotoSource(value);
                  setError("");
                }}
                className={cn(
                  "-mb-px border-b px-4 py-2 text-sm",
                  photoSource === value ? "border-ink text-ink" : "border-transparent text-lead hover:text-ink",
                )}
              >
                {value === "file" ? t("photoFile") : t("photoUrl")}
              </button>
            ))}
          </div>
          {photoSource === "file" ? (
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
                onClick={() => fileRef.current?.click()}
                className="flex w-full items-center justify-between border border-rule bg-paper px-3 py-3 text-left text-sm text-ink hover:border-ink"
              >
                <span>{file ? file.name : t("choosePhoto")}</span>
                <span className="text-lead">{file ? "" : t("optional")}</span>
              </button>
              <p className="mt-1 text-xs text-lead">{t("photoHint")}</p>
            </div>
          ) : (
            <Input
              placeholder="https://"
              value={urlDraft}
              onChange={(e) => setUrlDraft(e.target.value)}
            />
          )}
          {displayPhoto ? (
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={displayPhoto} alt="" className="h-12 w-12 object-cover" />
              {photoUrl || file ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setFile(null);
                    setPhotoUrl("");
                    setUrlDraft("");
                    setPreviewUrl((current) => {
                      if (current.startsWith("blob:")) URL.revokeObjectURL(current);
                      return "";
                    });
                    if (fileRef.current) fileRef.current.value = "";
                  }}
                >
                  {t("removePhoto")}
                </Button>
              ) : null}
            </div>
          ) : null}
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
