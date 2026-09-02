"use client";

import { useState } from "react";
import type { ContentTypeConfig } from "@/lib/admin-content/types";
import { validateContentValues } from "@/lib/admin/validate";
import { ImageUploadField } from "./ImageUploadField";
import { Button, CheckboxField, TextField, TextAreaField, Notice, Panel } from "./ui";

export type FormValues = Record<string, string | number | boolean>;

function defaultValueFor(type: string): string | number | boolean {
  if (type === "boolean") return false;
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
  onSubmit: (
    values: Partial<FormValues>
  ) => Promise<{ fieldErrors?: Record<string, string>; generalError?: string } | void>;
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
    setFieldErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }

  /**
   * An empty `<input type="number">` is stored as "" (never NaN — see the
   * onChange handler). Strip it before submit: drop it entirely for an
   * optional field so the server sees "not provided", keep "" for a required
   * field so the server's Zod schema reports it as required.
   */
  function buildPayload(): Partial<FormValues> {
    const payload: Partial<FormValues> = {};
    for (const field of config.fields) {
      const value = values[field.name];
      if (field.type === "number" && value === "") {
        if (field.required) payload[field.name] = value;
        continue;
      }
      payload[field.name] = value;
    }
    return payload;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setGeneralError(null);

    const clientErrors = validateContentValues(config, values);
    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors);
      return;
    }

    setSubmitting(true);
    setFieldErrors({});
    const result = await onSubmit(buildPayload());
    setSubmitting(false);
    if (result?.fieldErrors) setFieldErrors(result.fieldErrors);
    if (result?.generalError) setGeneralError(result.generalError);
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl">
      {generalError && (
        <div className="mb-5">
          <Notice tone="error">{generalError}</Notice>
        </div>
      )}
      <Panel className="flex flex-col gap-5">
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
                serverError={error}
              />
            );
          }
          if (field.type === "boolean") {
            return (
              <CheckboxField
                key={field.name}
                id={fieldId}
                label={field.label}
                checked={Boolean(values[field.name])}
                onChange={(checked) => setField(field.name, checked)}
              />
            );
          }
          if (field.type === "textarea") {
            return (
              <TextAreaField
                key={field.name}
                id={fieldId}
                label={field.label}
                required={field.required}
                value={String(values[field.name] ?? "")}
                onChange={(e) => setField(field.name, e.target.value)}
                error={error}
                help={field.helpText}
              />
            );
          }
          return (
            <TextField
              key={field.name}
              id={fieldId}
              label={field.label}
              required={field.required}
              type={field.type === "number" ? "number" : "text"}
              inputMode={field.type === "number" ? "numeric" : undefined}
              value={String(values[field.name] ?? "")}
              onChange={(e) => {
                if (field.type !== "number") {
                  setField(field.name, e.target.value);
                  return;
                }
                const next = e.target.valueAsNumber;
                setField(field.name, Number.isNaN(next) ? "" : next);
              }}
              error={error}
              help={field.helpText}
            />
          );
        })}
      </Panel>
      <Button type="submit" loading={submitting} size="lg" className="mt-6">
        {submitting ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
