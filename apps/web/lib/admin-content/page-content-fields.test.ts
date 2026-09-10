import { describe, it, expect } from "vitest";
import {
  PAGE_FIELD_CONFIGS,
  toFieldValues,
  toJsonPayload,
  type PageContentFieldConfig,
} from "./page-content-fields";

// toFieldValues/toJsonPayload are generic over any field list, so they are
// tested against a local fixture rather than a real page key. Pinning them to
// `hero` coupled these cases to the product's content shape, and every field
// added to the hero editor failed them for no behavioural reason.
const FIELDS: PageContentFieldConfig[] = [
  { name: "headline", label: "Headline", kind: "text", help: "h" },
  { name: "subheadline", label: "Subheadline", kind: "text", help: "s" },
];

describe("PAGE_FIELD_CONFIGS", () => {
  it("defines a form config for every known page key", () => {
    expect(Object.keys(PAGE_FIELD_CONFIGS).sort()).toEqual(
      ["footer", "google-review", "hero", "whatsapp"].sort()
    );
  });

  it("gives every field a name, label, kind, and help note", () => {
    for (const fields of Object.values(PAGE_FIELD_CONFIGS)) {
      for (const field of fields) {
        expect(field.name.length).toBeGreaterThan(0);
        expect(field.label.length).toBeGreaterThan(0);
        expect(["text", "textarea"]).toContain(field.kind);
        expect(field.help.length).toBeGreaterThan(0);
      }
    }
  });

  it("exposes the fields the public site reads off each page key", () => {
    expect(PAGE_FIELD_CONFIGS.hero.map((f) => f.name)).toEqual([
      "headline",
      "subheadline",
      "imageUrl",
    ]);
    expect(PAGE_FIELD_CONFIGS["google-review"].map((f) => f.name)).toEqual([
      "url",
      "rating",
      "reviewCount",
    ]);
  });
});

describe("toFieldValues", () => {
  it("reads matching string values off the loaded data", () => {
    const values = toFieldValues({ headline: "Hello", subheadline: "World" }, FIELDS);
    expect(values).toEqual({ headline: "Hello", subheadline: "World" });
  });

  it("defaults missing fields to an empty string", () => {
    const values = toFieldValues({ headline: "Hello" }, FIELDS);
    expect(values).toEqual({ headline: "Hello", subheadline: "" });
  });

  it("defaults every field to an empty string when data is null", () => {
    expect(toFieldValues(null, FIELDS)).toEqual({ headline: "", subheadline: "" });
  });

  it("defaults every field to an empty string when data is undefined", () => {
    expect(toFieldValues(undefined, FIELDS)).toEqual({ headline: "", subheadline: "" });
  });

  it("coerces a non-string stored value to an empty string instead of crashing", () => {
    const values = toFieldValues({ headline: 12345, subheadline: null }, FIELDS);
    expect(values).toEqual({ headline: "", subheadline: "" });
  });

  it("ignores keys in the data that aren't part of this page key's field config", () => {
    const values = toFieldValues(
      { headline: "Hello", subheadline: "World", extra: "ignored" },
      FIELDS
    );
    expect(values).toEqual({ headline: "Hello", subheadline: "World" });
  });
});

describe("toJsonPayload", () => {
  it("builds a plain object from the field values", () => {
    const payload = toJsonPayload({ headline: "Hello", subheadline: "World" }, FIELDS);
    expect(payload).toEqual({ headline: "Hello", subheadline: "World" });
  });

  it("keeps a blank field as an empty string rather than dropping the key", () => {
    const payload = toJsonPayload({ headline: "Hello", subheadline: "" }, FIELDS);
    expect(payload).toEqual({ headline: "Hello", subheadline: "" });
  });

  it("defaults a missing field value to an empty string", () => {
    const payload = toJsonPayload({ headline: "Hello" }, FIELDS);
    expect(payload).toEqual({ headline: "Hello", subheadline: "" });
  });
});
