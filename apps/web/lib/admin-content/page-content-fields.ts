import { asString } from "../public-content/coerce";

/**
 * Describes one form field for a PageContent key's editor. `kind` picks
 * TextField vs TextAreaField; `inputType` is only used for `kind: "text"`
 * and sets the underlying <input>'s `type` attribute (e.g. "url", "tel").
 * `help` is shown under the field so an admin knows what it controls and
 * where it shows up on the public site -- these keys have no schema
 * enforced server-side, so this note is the only documentation an admin
 * sees at the point of editing.
 */
export interface PageContentFieldConfig {
  name: string;
  label: string;
  kind: "text" | "textarea";
  inputType?: string;
  help: string;
}

/**
 * One form config per known PageContent key, matching apps/web/lib/
 * admin-content/page-keys.ts's PAGE_KEYS and the shapes this plan's spec
 * defines: hero {headline, subheadline}, footer {tagline, instagramUrl},
 * whatsapp {phoneNumber}, google-review {url}.
 */
export const PAGE_FIELD_CONFIGS: Record<string, PageContentFieldConfig[]> = {
  hero: [
    {
      name: "headline",
      label: "Headline",
      kind: "text",
      help: "The big headline at the top of the homepage. Leave blank to keep the default headline.",
    },
    {
      name: "subheadline",
      label: "Subheadline",
      kind: "text",
      help: "The one-line sentence shown under the headline. Leave blank to keep the default.",
    },
  ],
  footer: [
    {
      name: "tagline",
      label: "Tagline",
      kind: "textarea",
      help: "Short description shown under the Zolvex logo in the footer. Leave blank to keep the default.",
    },
    {
      name: "instagramUrl",
      label: "Instagram URL",
      kind: "text",
      inputType: "url",
      help: "Full Instagram profile link, shown as the footer's \"Instagram\" link. Leave blank to hide it.",
    },
  ],
  whatsapp: [
    {
      name: "phoneNumber",
      label: "Phone number",
      kind: "text",
      inputType: "tel",
      help: "Powers both the floating WhatsApp button and the footer's \"Call for a quote\" link. Leave blank to hide both. Include the country code, e.g. +15551234567.",
    },
  ],
  "google-review": [
    {
      name: "url",
      label: "Google Review URL",
      kind: "text",
      inputType: "url",
      help: "Link to your Google Business Profile's review section, shown as a button next to client reviews. Leave blank to hide it.",
    },
  ],
};

/**
 * Turns the loaded PageContent record's freeform JSON into a string-keyed
 * form-field record. `data` has no shape guarantee (same trust boundary as
 * the public site's own PageContent consumption -- see
 * lib/public-content/coerce.ts) so every field is coerced with `asString`
 * rather than trusted, and any key on `data` that isn't part of this page
 * key's field config is ignored.
 */
export function toFieldValues(
  data: unknown,
  fields: PageContentFieldConfig[]
): Record<string, string> {
  const record = data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  const values: Record<string, string> = {};
  for (const field of fields) {
    values[field.name] = asString(record[field.name]) ?? "";
  }
  return values;
}

/**
 * Reassembles the form's field values into the plain object PUT to the
 * API. A blank field is kept as an empty string rather than dropped --
 * every consumer downstream already treats "" the same as a missing key
 * (both are falsy), so this doesn't change behavior, and keeping the key
 * present makes what was explicitly cleared vs. never set easier to see
 * in the stored JSON.
 */
export function toJsonPayload(
  values: Record<string, string>,
  fields: PageContentFieldConfig[]
): Record<string, string> {
  const payload: Record<string, string> = {};
  for (const field of fields) {
    payload[field.name] = values[field.name] ?? "";
  }
  return payload;
}
