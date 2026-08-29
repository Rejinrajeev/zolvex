"use client";

import { useState } from "react";
import type { ContentTypeConfig } from "@/lib/admin-content/types";
import { ImageUploadField } from "./ImageUploadField";
import { ErrorBanner } from "./ErrorBanner";

export type FormValues = Record<string, string | number | boolean>;

function defaultValueFor(type: string): string | number | boolean {
  if (type === "boolean") return false;
  if (type === "number") return "";
  return "";
}

export function ContentForm({
  config,
  initialValues,
  onSubmit,
  submitLabel,
}: {
  config: ContentTypeConfig;
  initialValues?: FormValues;
  onSubmit: (values: FormValues) => Promise<{ fieldErrors?: Record<string, string>; generalError?: string } | void>;
  submitLabel: string;
}) {
  const [values, setValues] = useState<FormValues>(() => {
    const initial: FormValues = {};
    for (const field of config.fields) {
      initial[field.name] = initialValues?.[field.name] ?? defaultValueFor(field.type);
    }
    return initial;
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function setField(name: string, value: string | number | boolean) {
    setValues((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setFieldErrors({});
    setGeneralError(null);
    const result = await onSubmit(values);
    setSubmitting(false);
    if (result?.fieldErrors) setFieldErrors(result.fieldErrors);
    if (result?.generalError) setGeneralError(result.generalError);
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl">
      {generalError && (
        <div className="mb-4">
          <ErrorBanner message={generalError} />
        </div>
      )}
      <div className="flex flex-col gap-5">
        {config.fields.map((field) => {
          const error = fieldErrors[field.name];
          const fieldId = `field-${field.name}`;
          if (field.type === "image") {
            return (
              <ImageUploadField
                key={field.name}
                label={field.label}
                required={field.required}
                value={String(values[field.name] ?? "")}
                onChange={(url) => setField(field.name, url)}
              />
            );
          }
          if (field.type === "boolean") {
            return (
              <label key={field.name} className="flex items-center gap-2 font-body text-sm text-ink">
                <input
                  type="checkbox"
                  checked={Boolean(values[field.name])}
                  onChange={(e) => setField(field.name, e.target.checked)}
                />
                {field.label}
              </label>
            );
          }
          return (
            <div key={field.name}>
              <label htmlFor={fieldId} className="mb-1 block font-body text-sm text-ink">
                {field.label}
                {field.required && " *"}
              </label>
              {field.type === "textarea" ? (
                <textarea
                  id={fieldId}
                  required={field.required}
                  value={String(values[field.name] ?? "")}
                  onChange={(e) => setField(field.name, e.target.value)}
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? `${fieldId}-error` : undefined}
                  className={`block w-full border bg-paper p-3 font-body text-ink focus:outline-none ${
                    error ? "border-2 border-ink" : "border-ink/20 focus:border-olive-ink"
                  }`}
                  rows={4}
                />
              ) : (
                <input
                  id={fieldId}
                  type={field.type === "number" ? "number" : "text"}
                  required={field.required}
                  value={String(values[field.name] ?? "")}
                  onChange={(e) =>
                    setField(field.name, field.type === "number" ? e.target.valueAsNumber : e.target.value)
                  }
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? `${fieldId}-error` : undefined}
                  className={`block h-11 w-full border bg-paper px-3.5 font-body text-ink focus:outline-none ${
                    error ? "border-2 border-ink" : "border-ink/20 focus:border-olive-ink"
                  }`}
                />
              )}
              {field.helpText && !error && <p className="mt-1 font-body text-xs text-slate">{field.helpText}</p>}
              {error && (
                <p id={`${fieldId}-error`} role="alert" className="mt-1 font-body text-sm text-ink">
                  <span aria-hidden="true" className="stamp-rotate inline-block mr-1">◆</span>
                  {error}
                </p>
              )}
            </div>
          );
        })}
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="mt-6 bg-gold px-6 py-3.5 font-display text-ink disabled:opacity-50"
      >
        {submitting ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
