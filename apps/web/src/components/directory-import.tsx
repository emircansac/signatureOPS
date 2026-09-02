"use client";

import { useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc";
import {
  applyMapping,
  DIRECTORY_FIELDS,
  emptyColumnMapping,
  requiredFieldsMapped,
  suggestMapping,
  validateImportRows,
  type ColumnMapping,
  type ImportErrorCode,
} from "@/lib/directory-import";
import { Button, Card, Label, Select } from "@/components/ui";

const FIELD_LABEL_KEY = {
  displayName: "name",
  jobTitle: "jobTitle",
  email: "email",
  mobile: "mobile",
  department: "department",
  country: "country",
  photoUrl: "photo",
} as const;

type Step = "upload" | "map" | "preview" | "done";

type ParsedSheet = {
  headers: string[];
  rows: string[][];
};

export function DirectoryImport({
  existingEmails,
  onClose,
}: {
  existingEmails: string[];
  onClose: () => void;
}) {
  const t = useTranslations("directory");
  const tc = useTranslations("common");
  const utils = trpc.useUtils();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("upload");
  const [fileName, setFileName] = useState("");
  const [parsed, setParsed] = useState<ParsedSheet | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>(emptyColumnMapping());
  const [error, setError] = useState("");
  const [parsing, setParsing] = useState(false);
  const [result, setResult] = useState<{ created: number; updated: number; failed: number } | null>(
    null,
  );

  const importMutation = trpc.users.importRows.useMutation();

  const mappedRows = useMemo(() => {
    if (!parsed) return [];
    return applyMapping(parsed.headers, parsed.rows, mapping);
  }, [parsed, mapping]);

  const preview = useMemo(
    () => validateImportRows(mappedRows, existingEmails),
    [mappedRows, existingEmails],
  );

  const parseFile = async (file: File | undefined) => {
    if (!file) return;
    setError("");
    setParsing(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/directory/parse", { method: "POST", body: formData });
      const data = (await res.json()) as ParsedSheet & { error?: string };
      if (!res.ok || !data.headers) throw new Error(data.error ?? t("parseError"));
      setFileName(file.name);
      setParsed({ headers: data.headers, rows: data.rows });
      setMapping(suggestMapping(data.headers));
      setStep("map");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("parseError"));
    } finally {
      setParsing(false);
    }
  };

  const confirm = async () => {
    setError("");
    try {
      const data = await importMutation.mutateAsync({ rows: mappedRows });
      setResult({ created: data.created, updated: data.updated, failed: data.failed });
      await utils.users.list.invalidate();
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("saveFailed"));
    }
  };

  const errorLabel = (code: ImportErrorCode) => t(`errors.${code}`);

  return (
    <Card className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-medium text-ink">{t("importTitle")}</h2>
          <p className="mt-1 text-sm text-lead">{t("importFileHint")}</p>
        </div>
        <Button type="button" variant="ghost" onClick={onClose}>
          {tc("cancel")}
        </Button>
      </div>

      <ol className="flex flex-wrap gap-3 text-sm">
        {(["upload", "map", "preview", "done"] as const).map((value, index) => (
          <li
            key={value}
            className={step === value ? "font-medium text-ink" : "text-lead"}
          >
            {index + 1}. {t(`importSteps.${value}`)}
          </li>
        ))}
      </ol>

      {step === "upload" ? (
        <div className="space-y-3">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={(e) => void parseFile(e.target.files?.[0])}
          />
          <Button type="button" onClick={() => fileRef.current?.click()} disabled={parsing}>
            {parsing ? tc("loading") : t("chooseFile")}
          </Button>
        </div>
      ) : null}

      {step === "map" && parsed ? (
        <div className="space-y-4">
          <p className="text-sm text-lead">{fileName}</p>
          <div className="grid gap-3">
            {DIRECTORY_FIELDS.map((field) => (
              <div key={field} className="grid gap-2 sm:grid-cols-[10rem_1fr] sm:items-center">
                <Label>
                  {t(FIELD_LABEL_KEY[field])}
                  {field === "displayName" || field === "jobTitle" || field === "email" ? (
                    <span className="text-lead"> *</span>
                  ) : null}
                </Label>
                <div>
                  <Select
                    value={mapping[field] ?? ""}
                    onChange={(e) =>
                      setMapping((current) => ({
                        ...current,
                        [field]: e.target.value || null,
                      }))
                    }
                  >
                    <option value="">{t("skipColumn")}</option>
                    {parsed.headers.map((header) => (
                      <option key={header} value={header}>
                        {header}
                      </option>
                    ))}
                  </Select>
                  <SampleValues
                    headers={parsed.headers}
                    rows={parsed.rows}
                    header={mapping[field]}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={() => setStep("preview")}
              disabled={!requiredFieldsMapped(mapping)}
            >
              {t("next")}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setStep("upload")}>
              {t("back")}
            </Button>
          </div>
        </div>
      ) : null}

      {step === "preview" ? (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3 text-sm">
            <span>{t("previewValid", { count: preview.valid.length })}</span>
            <span>{t("previewInvalid", { count: preview.errors.length })}</span>
            <span>
              {t("previewCreate", {
                count: preview.valid.filter((row) => row.action === "create").length,
              })}
            </span>
            <span>
              {t("previewUpdate", {
                count: preview.valid.filter((row) => row.action === "update").length,
              })}
            </span>
          </div>
          {preview.errors.length > 0 ? (
            <div className="max-h-56 overflow-auto border border-rule">
              <table className="w-full text-sm">
                <thead className="border-b border-rule">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">{t("rowNumber")}</th>
                    <th className="px-3 py-2 text-left font-medium">{t("errorReason")}</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.errors.map((row) => (
                    <tr key={row.rowNumber} className="border-b border-rule">
                      <td className="px-3 py-2 tabular-nums">{row.rowNumber}</td>
                      <td className="px-3 py-2">
                        {row.codes.map((code) => errorLabel(code)).join(", ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={() => void confirm()}
              disabled={importMutation.isPending || preview.valid.length === 0}
            >
              {importMutation.isPending ? t("importing") : t("confirmImport")}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setStep("map")}>
              {t("back")}
            </Button>
          </div>
        </div>
      ) : null}

      {step === "done" && result ? (
        <div className="space-y-4">
          <p className="text-sm text-ink">
            {t("importResult", {
              created: result.created,
              updated: result.updated,
              failed: result.failed,
            })}
          </p>
          {preview.errors.length > 0 ? (
            <div className="max-h-56 overflow-auto border border-rule">
              <table className="w-full text-sm">
                <thead className="border-b border-rule">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">{t("rowNumber")}</th>
                    <th className="px-3 py-2 text-left font-medium">{t("errorReason")}</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.errors.map((row) => (
                    <tr key={row.rowNumber} className="border-b border-rule">
                      <td className="px-3 py-2 tabular-nums">{row.rowNumber}</td>
                      <td className="px-3 py-2">
                        {row.codes.map((code) => errorLabel(code)).join(", ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          <Button type="button" onClick={onClose}>
            {t("close")}
          </Button>
        </div>
      ) : null}

      {error ? <p className="text-sm text-seal">{error}</p> : null}
    </Card>
  );
}

function SampleValues({
  headers,
  rows,
  header,
}: {
  headers: string[];
  rows: string[][];
  header: string | null;
}) {
  if (!header) return null;
  const index = headers.indexOf(header);
  if (index < 0) return null;
  const samples = rows
    .map((row) => row[index]?.trim() ?? "")
    .filter(Boolean)
    .slice(0, 3);
  if (samples.length === 0) return null;
  return <p className="mt-1 text-xs text-lead">{samples.join(" · ")}</p>;
}
