import type { ContentTypeConfig } from "../types";
import { serviceConfig } from "./service";
import { blogPostConfig } from "./blog-post";
import { testimonialConfig } from "./testimonial";
import { faqConfig } from "./faq";
import { instagramPostConfig } from "./instagram-post";

// Mirrors apps/api/src/controllers/admin/content.schemas.ts's CONTENT_TYPES
// exactly -- these two lists must never drift apart.
export const CONTENT_TYPE_CONFIGS: Record<string, ContentTypeConfig> = {
  service: serviceConfig,
  "blog-post": blogPostConfig,
  testimonial: testimonialConfig,
  faq: faqConfig,
  "instagram-post": instagramPostConfig,
};

export function configFor(type: string): ContentTypeConfig | undefined {
  return CONTENT_TYPE_CONFIGS[type];
}
