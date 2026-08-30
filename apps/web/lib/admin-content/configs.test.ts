import { describe, it, expect } from "vitest";
import { CONTENT_TYPE_CONFIGS, configFor } from "./configs/index.js";

const EXPECTED_TYPES = ["service", "blog-post", "testimonial", "faq", "instagram-post"];

describe("content type configs", () => {
  it("has exactly the five types Express's CONTENT_TYPES allowlist defines", () => {
    expect(Object.keys(CONTENT_TYPE_CONFIGS).sort()).toEqual([...EXPECTED_TYPES].sort());
  });

  it("each config's own `type` field matches the map key it's stored under", () => {
    for (const [key, config] of Object.entries(CONTENT_TYPE_CONFIGS)) {
      expect(config.type).toBe(key);
    }
  });

  it("every field has a non-empty name and label", () => {
    for (const config of Object.values(CONTENT_TYPE_CONFIGS)) {
      for (const field of config.fields) {
        expect(field.name.length).toBeGreaterThan(0);
        expect(field.label.length).toBeGreaterThan(0);
      }
    }
  });

  it("configFor returns undefined for an unknown type", () => {
    expect(configFor("not-a-real-type")).toBeUndefined();
  });

  it("configFor returns the matching config for each known type", () => {
    for (const type of EXPECTED_TYPES) {
      expect(configFor(type)?.type).toBe(type);
    }
  });
});
