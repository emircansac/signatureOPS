"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { callingCodeForCountry, normalizeNationalNumber, normalizeStoredCountry } from "@signatureops/schema";
import { trpc } from "@/lib/trpc";
import { resolvePublicAssetUrl } from "@/lib/asset-url";
import { uploadImageFile } from "@/lib/upload-image";
import { isValidEmail } from "@/lib/directory-import";
import { joinDisplayName, personPhotoFilename, personPhotoStem, splitDisplayName } from "@/lib/person-name";
import { countrySelectOptions } from "@/lib/country-options";
import { Button, Card, Input, Label, Select } from "@/components/ui";

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
  const locale = useLocale();
  const countryOptions = countrySelectOptions(locale);
  const utils = trpc.useUtils();
  const fileRef = useRef<HTMLInputElement>(null);
  const editing = Boolean(person);

  const initialName = splitDisplayName(person?.displayName ?? "");
  const [firstName, setFirstName] = useState(initialName.firstName);
  const [lastName, setLastName] = useState(initialName.lastName);
  const [jobTitle, setJobTitle] = useState(person?.jobTitle ?? "");
  const [email, setEmail] = useState(person?.email ?? "");
  const [mobile, setMobile] = useState(() =>
    normalizeNationalNumber(person?.mobile ?? "", person?.country),
  );
  const [department, setDepartment] = useState(person?.department ?? "");
  const [country, setCountry] = useState(() => normalizeStoredCountry(person?.country) ?? "");
  const [photoUrl, setPhotoUrl] = useState(person?.photoUrl ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
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
    if (!firstName.trim()) return t("errors.missingFirstName");
    if (!lastName.trim()) return t("errors.missingLastName");
    if (!jobTitle.trim()) return t("errors.missingTitle");
    if (!email.trim()) return t("errors.missingEmail");
    if (!isValidEmail(email)) return t("errors.invalidEmail");
    if (mobile.trim() && !country.trim()) return t("errors.missingCountryForMobile");
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
      if (file) {
        setUploading(true);
        const uploaded = await uploadImageFile(file, {
          filenameStem: personPhotoStem(firstName, lastName, jobTitle) || undefined,
        });
        nextPhoto = uploaded.url;
      }
      const payload = {
        displayName: joinDisplayName(firstName, lastName),
        jobTitle: jobTitle.trim(),
        email: email.trim(),
        mobile: normalizeNationalNumber(mobile, country) || null,
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
  const dialPrefix = callingCodeForCountry(country);

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
          <div>
            <Label htmlFor="person-first-name">
              {t("firstName")} <span className="text-lead">*</span>
            </Label>
            <Input
              id="person-first-name"
              autoComplete="given-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="person-last-name">
              {t("lastName")} <span className="text-lead">*</span>
            </Label>
            <Input
              id="person-last-name"
              autoComplete="family-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
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
            <Label htmlFor="person-country">{t("country")}</Label>
            <Select
              id="person-country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
            >
              <option value="">{t("countryPlaceholder")}</option>
              {country && !countryOptions.some((row) => row.code === country) ? (
                <option value={country}>{country}</option>
              ) : null}
              {countryOptions.map((row) => (
                <option key={row.code} value={row.code}>
                  {row.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="person-mobile">{t("mobile")}</Label>
            <div className="flex">
              <span className="inline-flex shrink-0 items-center border border-r-0 border-rule bg-paper px-3 text-sm text-lead">
                {dialPrefix ? `+${dialPrefix}` : "+"}
              </span>
              <Input
                id="person-mobile"
                className="border-l-0"
                inputMode="numeric"
                autoComplete="tel-national"
                maxLength={15}
                placeholder={t("mobilePlaceholder")}
                value={mobile}
                onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
              />
            </div>
            <p className="mt-1 text-xs text-lead">{t("mobileHint")}</p>
          </div>
          <div>
            <Label htmlFor="person-department">{t("department")}</Label>
            <Input
              id="person-department"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-3">
          <Label>{t("photo")}</Label>
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
            {file ? (
              <p className="mt-1 text-xs text-lead">
                {t("photoStoredAs", {
                  name:
                    personPhotoFilename(firstName, lastName, jobTitle, file.type) || file.name,
                })}
              </p>
            ) : null}
          </div>
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
