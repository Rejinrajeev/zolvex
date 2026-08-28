import { describe, it, expect } from "vitest";
import { CONTENT_TYPES, TYPE_TO_DELEGATE, schemaFor } from "./content.schemas.js";

describe("CONTENT_TYPES / TYPE_TO_DELEGATE", () => {
  it("has exactly the five generic approvable types, each mapped to its ApprovableResourceService delegate name", () => {
    expect(CONTENT_TYPES).toEqual(["service", "blog-post", "testimonial", "faq", "instagram-post"]);
    expect(TYPE_TO_DELEGATE["service"]).toBe("service");
    expect(TYPE_TO_DELEGATE["blog-post"]).toBe("blogPost");
    expect(TYPE_TO_DELEGATE["testimonial"]).toBe("testimonial");
    expect(TYPE_TO_DELEGATE["faq"]).toBe("faq");
    expect(TYPE_TO_DELEGATE["instagram-post"]).toBe("instagramPost");
  });
});

describe("schemaFor", () => {
  it("validates a well-formed service payload and strips unknown fields", () => {
    const result = schemaFor("service").safeParse({
      name: "Office Deep Clean",
      slug: "office-deep-clean",
      shortDescription: "Short",
      fullDescription: "Full",
      order: 1,
      isActive: true,
      hacker: "field that should not exist on Service",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty("hacker");
    }
  });

  it("rejects a service payload missing required fields", () => {
    const result = schemaFor("service").safeParse({ name: "Only a name" });
    expect(result.success).toBe(false);
  });

  it("validates a well-formed blog-post payload", () => {
    const result = schemaFor("blog-post").safeParse({
      title: "How we clean offices",
      image: "https://example.test/a.jpg",
      instagramUrl: "https://instagram.com/p/abc",
    });
    expect(result.success).toBe(true);
  });

  it("validates a well-formed testimonial payload", () => {
    const result = schemaFor("testimonial").safeParse({
      name: "Jane D.",
      rating: 5,
      message: "Great service",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a testimonial rating outside 1-5", () => {
    const result = schemaFor("testimonial").safeParse({ name: "Jane D.", rating: 6, message: "Great" });
    expect(result.success).toBe(false);
  });

  it("validates a well-formed faq payload", () => {
    const result = schemaFor("faq").safeParse({ question: "Q?", answer: "A." });
    expect(result.success).toBe(true);
  });

  it("validates a well-formed instagram-post payload", () => {
    const result = schemaFor("instagram-post").safeParse({
      image: "https://example.test/a.jpg",
      permalink: "https://instagram.com/p/abc",
    });
    expect(result.success).toBe(true);
  });
});
