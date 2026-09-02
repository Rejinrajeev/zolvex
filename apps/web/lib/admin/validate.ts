import type { ContentTypeConfig, FieldConfig } from "@/lib/admin-content/types";

/** True for a non-empty, non-whitespace string. */
export function isFilled(value: unknown): boolean {
  return typeof value === "string" ? value.trim().length > 0 : value != null && value !== "";
}

export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value.trim());
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function isSlug(value: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.trim());
}

export function isInteger(value: unknown): boolean {
  if (value === "" || value == null) return true; // empty is "not provided", handled by required
  return Number.isInteger(typeof value === "number" ? value : Number(value));
}

/**
 * Client-side validation for a content record, run before the request so the
 * user sees required/format problems immediately instead of after a round
 * trip. The server's Zod schema is still the source of truth; this only
 * covers the checks that are safe to assume from the field config plus a few
 * name-based conventions (slug, *url). Returns `{}` when the values pass.
 */
export function validateContentValues(
  config: ContentTypeConfig,
  values: Record<string, unknown>
): Record<string, string> {
  const errors: Record<string, string> = {};

  for (const field of config.fields) {
    const raw = values[field.name];
    const str = typeof raw === "string" ? raw.trim() : raw;

    if (field.required && field.type !== "boolean" && !isFilled(raw)) {
      errors[field.name] = `${field.label} is required.`;
      continue;
    }
    if (!isFilled(raw)) continue;

    if (field.type === "number" && !isInteger(raw)) {
      errors[field.name] = `${field.label} must be a whole number.`;
      continue;
    }
    if (fieldWantsUrl(field) && typeof str === "string" && !isHttpUrl(str)) {
      errors[field.name] = `Enter a full URL starting with http:// or https://`;
      continue;
    }
    if (field.name === "slug" && typeof str === "string" && !isSlug(str)) {
      errors[field.name] = "Use lowercase letters, numbers and hyphens only.";
    }
  }

  return errors;
}

function fieldWantsUrl(field: FieldConfig): boolean {
  if (field.type === "image") return false;
  return /url$/i.test(field.name) || field.name === "permalink";
}
