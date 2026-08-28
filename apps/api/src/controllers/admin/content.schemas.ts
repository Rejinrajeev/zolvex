import { z } from "zod";

/**
 * The five content types this generic route family serves — kebab-case route
 * params, matched one-to-one against ApprovableResourceService's DelegateName
 * via TYPE_TO_DELEGATE below. This array IS the route-param allowlist: a
 * `:type` value not in this list must never reach a service.
 */
export const CONTENT_TYPES = ["service", "blog-post", "testimonial", "faq", "instagram-post"] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];

export const TYPE_TO_DELEGATE: Record<ContentType, "service" | "blogPost" | "testimonial" | "faq" | "instagramPost"> = {
  service: "service",
  "blog-post": "blogPost",
  testimonial: "testimonial",
  faq: "faq",
  "instagram-post": "instagramPost",
};

/**
 * One named schema per type — this is the HTTP-layer allowlist
 * `approvable-resource.ts`'s INPUT-VALIDATION CONTRACT requires. Never derive
 * these from a client-side config; keep them explicit and server-authoritative.
 * Workflow-control fields (approvalStatus, submittedBy, id, timestamps, etc.)
 * are deliberately absent — the service sets those itself.
 */
const serviceSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(200),
  shortDescription: z.string().min(1).max(500),
  fullDescription: z.string().min(1).max(5000),
  image: z.string().url().optional(),
  icon: z.string().max(200).optional(),
  isHighlighted: z.boolean().optional(),
  order: z.number().int().optional(),
  isActive: z.boolean().optional(),
  metaTitle: z.string().max(200).optional(),
  metaDescription: z.string().max(500).optional(),
  ogImage: z.string().url().optional(),
});

const blogPostSchema = z.object({
  title: z.string().min(1).max(200),
  image: z.string().url(),
  instagramUrl: z.string().url(),
  order: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

const testimonialSchema = z.object({
  name: z.string().min(1).max(200),
  rating: z.number().int().min(1).max(5),
  message: z.string().min(1).max(2000),
  isFeatured: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

const faqSchema = z.object({
  question: z.string().min(1).max(500),
  answer: z.string().min(1).max(5000),
  order: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

const instagramPostSchema = z.object({
  image: z.string().url(),
  permalink: z.string().url(),
  order: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

const SCHEMAS: Record<ContentType, z.ZodTypeAny> = {
  service: serviceSchema,
  "blog-post": blogPostSchema,
  testimonial: testimonialSchema,
  faq: faqSchema,
  "instagram-post": instagramPostSchema,
};

export function schemaFor(type: ContentType): z.ZodTypeAny {
  return SCHEMAS[type];
}

/**
 * All create/update fields are optional at the update layer (a PATCH may send
 * only the fields that changed) — this produces a partial version of a type's
 * schema for Task 5's update endpoint to use, without duplicating every field.
 */
export function partialSchemaFor(type: ContentType) {
  return (SCHEMAS[type] as z.ZodObject<any>).partial();
}
