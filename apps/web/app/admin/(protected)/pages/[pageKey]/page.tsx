"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ErrorBanner } from "@/components/admin/ErrorBanner";
import { Button, PageHeader, Panel, SkeletonRows, Notice, Label, TextField, TextAreaField } from "@/components/admin/ui";
import { adminFetch } from "@/lib/admin/fetch";
import { PAGE_FIELD_CONFIGS, toFieldValues, toJsonPayload } from "@/lib/admin-content/page-content-fields";

const PAGE_LABELS: Record<string, string> = {
  hero: "Hero section",
  footer: "Footer",
  whatsapp: "WhatsApp number",
  "google-review": "Google Review URL",
};

// Fallback for any page key without a form config above -- shouldn't be
// reachable since the admin nav only links to the 4 known keys, but keeps
// this screen from hard-erroring if that ever changes.
const PAGE_HINTS: Record<string, string> = {
  hero: '{ "headline": "...", "subheadline": "..." }',
  footer: '{ "tagline": "...", "instagramUrl": "https://..." }',
  whatsapp: '{ "phoneNumber": "+15551234567" }',
  "google-review": '{ "url": "https://..." }',
};

export default function PageContentEditorPage() {
  const { pageKey } = useParams<{ pageKey: string }>();
  const label = PAGE_LABELS[pageKey] ?? pageKey;
  const fields = PAGE_FIELD_CONFIGS[pageKey];

  const [values, setValues] = useState<Record<string, string>>({});
  const [raw, setRaw] = useState("{}");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setLoading(true);
    setLoadError(null);
    adminFetch(`/admin/api/pages/${pageKey}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("load_failed");
        return res.json();
      })
      .then((record) => {
        if (fields) {
          setValues(toFieldValues(record?.data, fields));
        } else {
          setRaw(record?.data != null ? JSON.stringify(record.data, null, 2) : "{}");
        }
        setLoading(false);
      })
      .catch(() => {
        setLoadError("Could not load page content.");
        setLoading(false);
      });
  }, [pageKey, fields]);

  async function handleSave() {
    setValidationError(null);
    setSaveError(null);

    let payload: unknown;
    if (fields) {
      payload = toJsonPayload(values, fields);
    } else {
      try {
        payload = JSON.parse(raw);
      } catch {
        setValidationError("That isn't valid JSON — check for a missing quote, comma or bracket.");
        return;
      }
      if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
        setValidationError("The content must be a JSON object, like { \"key\": \"value\" }.");
        return;
      }
    }

    setSaving(true);
    setSaved(false);
    const res = await adminFetch(`/admin/api/pages/${pageKey}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: payload }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json();
      setSaveError(data?.message ?? "Could not save. Please try again.");
      return;
    }
    setSaved(true);
  }

  return (
    <div className="max-w-2xl">
      <PageHeader
        title={label}
        description="Changes go live within a couple of minutes."
      />

      {loading ? (
        <SkeletonRows rows={6} />
      ) : loadError ? (
        <ErrorBanner message={loadError} />
      ) : (
        <>
          <div className="flex flex-col gap-3">
            {validationError && <Notice tone="error">{validationError}</Notice>}
            {saveError && <Notice tone="error">{saveError}</Notice>}
            {saved && <Notice tone="success">Saved.</Notice>}
          </div>

          {fields ? (
            <Panel className="mt-4">
              <div className="flex flex-col gap-4">
                {fields.map((field) =>
                  field.kind === "textarea" ? (
                    <TextAreaField
                      key={field.name}
                      id={`page-field-${field.name}`}
                      label={field.label}
                      help={field.help}
                      value={values[field.name] ?? ""}
                      onChange={(e) => {
                        setValues((prev) => ({ ...prev, [field.name]: e.target.value }));
                        setSaved(false);
                      }}
                    />
                  ) : (
                    <TextField
                      key={field.name}
                      id={`page-field-${field.name}`}
                      label={field.label}
                      type={field.inputType ?? "text"}
                      help={field.help}
                      value={values[field.name] ?? ""}
                      onChange={(e) => {
                        setValues((prev) => ({ ...prev, [field.name]: e.target.value }));
                        setSaved(false);
                      }}
                    />
                  )
                )}
              </div>
            </Panel>
          ) : (
            <div className="mt-4">
              <Label htmlFor="page-json">Content</Label>
              <textarea
                id="page-json"
                value={raw}
                onChange={(e) => {
                  setRaw(e.target.value);
                  setSaved(false);
                  setValidationError(null);
                }}
                rows={16}
                spellCheck={false}
                className="mt-1.5 block w-full rounded-xl bg-paper p-3.5 font-mono text-sm leading-relaxed text-ink outline-none ring-1 ring-ink/15 focus:ring-2 focus:ring-green"
              />
              {PAGE_HINTS[pageKey] && (
                <p className="mt-1.5 font-mono text-xs text-moss">Expected shape: {PAGE_HINTS[pageKey]}</p>
              )}
            </div>
          )}

          <Button onClick={handleSave} loading={saving} size="lg" className="mt-5">
            {saving ? "Saving…" : "Save"}
          </Button>
        </>
      )}
    </div>
  );
}
