import { describe, it, expect } from "vitest";
import { PAGE_FIELD_CONFIGS, toFieldValues, toJsonPayload } from "./page-content-fields";

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
});

describe("toFieldValues", () => {
  const heroFields = PAGE_FIELD_CONFIGS.hero;

  it("reads matching string values off the loaded data", () => {
    const values = toFieldValues({ headline: "Hello", subheadline: "World" }, heroFields);
    expect(values).toEqual({ headline: "Hello", subheadline: "World" });
  });

  it("defaults missing fields to an empty string", () => {
    const values = toFieldValues({ headline: "Hello" }, heroFields);
    expect(values).toEqual({ headline: "Hello", subheadline: "" });
  });

  it("defaults every field to an empty string when data is null", () => {
    expect(toFieldValues(null, heroFields)).toEqual({ headline: "", subheadline: "" });
  });

  it("defaults every field to an empty string when data is undefined", () => {
    expect(toFieldValues(undefined, heroFields)).toEqual({ headline: "", subheadline: "" });
  });

  it("coerces a non-string stored value to an empty string instead of crashing", () => {
    const values = toFieldValues({ headline: 12345, subheadline: null }, heroFields);
    expect(values).toEqual({ headline: "", subheadline: "" });
  });

  it("ignores keys in the data that aren't part of this page key's field config", () => {
    const values = toFieldValues({ headline: "Hello", subheadline: "World", extra: "ignored" }, heroFields);
    expect(values).toEqual({ headline: "Hello", subheadline: "World" });
  });
});

describe("toJsonPayload", () => {
  const heroFields = PAGE_FIELD_CONFIGS.hero;

  it("builds a plain object from the field values", () => {
    const payload = toJsonPayload({ headline: "Hello", subheadline: "World" }, heroFields);
    expect(payload).toEqual({ headline: "Hello", subheadline: "World" });
  });

  it("keeps a blank field as an empty string rather than dropping the key", () => {
    const payload = toJsonPayload({ headline: "Hello", subheadline: "" }, heroFields);
    expect(payload).toEqual({ headline: "Hello", subheadline: "" });
  });

  it("defaults a missing field value to an empty string", () => {
    const payload = toJsonPayload({ headline: "Hello" }, heroFields);
    expect(payload).toEqual({ headline: "Hello", subheadline: "" });
  });
});
