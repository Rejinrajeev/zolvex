"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { configFor } from "@/lib/admin-content/configs";
import { ContentForm, type FormValues } from "@/components/admin/ContentForm";
import { ErrorBanner } from "@/components/admin/ErrorBanner";

interface ZodIssue {
  path: (string | number)[];
  message: string;
}

export default function EditContentPage() {
  const params = useParams<{ type: string; id: string }>();
  const router = useRouter();
  const { type, id } = params;
  const config = configFor(type);

  const [initialValues, setInitialValues] = useState<FormValues | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!config) return;
    (async () => {
      const res = await fetch(`/admin/api/content/${type}/${id}`);
      if (res.status === 404) {
        setLoadError("This record no longer exists. It may have been deleted.");
        return;
      }
      if (!res.ok) {
        setLoadError("Could not load this record.");
        return;
      }
      const data = await res.json();
      const values: FormValues = {};
      for (const field of config.fields) {
        values[field.name] = data[field.name] ?? (field.type === "boolean" ? false : "");
      }
      setInitialValues(values);
    })();
  }, [config, type, id]);

  if (!config) {
    return <ErrorBanner message={`Unknown content type "${type}".`} />;
  }

  if (loadError) {
    return (
      <div>
        <ErrorBanner message={loadError} />
        <button
          type="button"
          onClick={() => router.push(`/admin/content/${type}`)}
          className="mt-4 border-2 border-ink px-6 py-3 font-display text-ink"
        >
          Back to {config.displayNamePlural.toLowerCase()}
        </button>
      </div>
    );
  }

  async function handleSubmit(values: Partial<FormValues>) {
    const res = await fetch(`/admin/api/content/${type}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const data = await res.json();
    if (res.ok) {
      router.push(`/admin/content/${type}`);
      return;
    }
    if (data?.error === "invalid_request") {
      const fieldErrors: Record<string, string> = {};
      for (const issue of (data.issues ?? []) as ZodIssue[]) {
        if (typeof issue.path[0] === "string") fieldErrors[issue.path[0]] = issue.message;
      }
      return { fieldErrors };
    }
    if (data?.error === "slug_conflict") {
      return { generalError: data.message ?? "That slug is already in use." };
    }
    if (data?.error === "invalid_state" || data?.error === "not_found") {
      return { generalError: "This record changed since you loaded it. Go back and try again." };
    }
    return { generalError: "Could not save. Please try again." };
  }

  if (!initialValues) {
    return <p className="font-body text-sm text-slate">Loading…</p>;
  }

  return (
    <div>
      <h1 className="mb-6 font-display text-3xl text-ink">Edit {config.displayName.toLowerCase()}</h1>
      <ContentForm config={config} initialValues={initialValues} onSubmit={handleSubmit} submitLabel="Save" />
    </div>
  );
}
