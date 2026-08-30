"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ErrorBanner } from "@/components/admin/ErrorBanner";

const PAGE_LABELS: Record<string, string> = {
  hero: "Hero section",
  footer: "Footer",
  whatsapp: "WhatsApp number",
  "google-review": "Google Review URL",
};

export default function PageContentEditorPage() {
  const { pageKey } = useParams<{ pageKey: string }>();
  const label = PAGE_LABELS[pageKey] ?? pageKey;

  const [raw, setRaw] = useState("{}");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setLoading(true);
    setLoadError(null);
    fetch(`/admin/api/pages/${pageKey}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("load_failed");
        return res.json();
      })
      .then((record) => {
        // record is null if the pageKey has never been configured — default to {}
        setRaw(
          record?.data != null ? JSON.stringify(record.data, null, 2) : "{}"
        );
        setLoading(false);
      })
      .catch(() => {
        setLoadError("Could not load page content.");
        setLoading(false);
      });
  }, [pageKey]);

  async function handleSave() {
    setParseError(null);
    setSaveError(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      setParseError("Invalid JSON — fix the syntax before saving.");
      return;
    }
    setSaving(true);
    setSaved(false);
    const res = await fetch(`/admin/api/pages/${pageKey}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: parsed }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json();
      setSaveError(data?.message ?? "Could not save. Please try again.");
      return;
    }
    setSaved(true);
  }

  if (loading) return <p className="font-body text-sm text-slate">Loading…</p>;
  if (loadError) return <ErrorBanner message={loadError} />;

  return (
    <div className="max-w-2xl">
      <h1 className="mb-2 font-display text-3xl text-ink">{label}</h1>
      <p className="mb-6 font-body text-sm text-slate">
        Edit the JSON data for this page section. Changes take effect
        immediately on save.
      </p>
      {parseError && (
        <div className="mb-4">
          <ErrorBanner message={parseError} />
        </div>
      )}
      {saveError && (
        <div className="mb-4">
          <ErrorBanner message={saveError} />
        </div>
      )}
      {saved && (
        <div className="mb-4 border border-olive-ink/40 bg-olive-ink/5 px-4 py-3 font-body text-sm text-ink">
          Saved successfully.
        </div>
      )}
      <textarea
        value={raw}
        onChange={(e) => {
          setRaw(e.target.value);
          setSaved(false);
          setParseError(null);
        }}
        rows={16}
        spellCheck={false}
        className="block w-full border border-ink/20 bg-paper p-3 font-body text-sm text-ink focus:border-olive-ink focus:outline-none"
      />
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="mt-4 bg-gold px-6 py-3.5 font-display text-ink disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save"}
      </button>
    </div>
  );
}
