// apps/web/lib/admin-content/trash-types.ts

/**
 * Trash covers the five generic content types (see configs/index.ts's
 * CONTENT_TYPE_CONFIGS) plus Place, which has no approval workflow and so
 * isn't part of that registry -- see apps/web/app/admin/(protected)/trash/
 * page.tsx's ENTITY_TO_TYPE map, which this mirrors. Kept as its own small
 * list (rather than reusing configFor) because "place" genuinely isn't a
 * content/[type] route this app proxies to for CRUD -- only for restore.
 */
export const TRASH_TYPES = [
  "service",
  "blog-post",
  "testimonial",
  "faq",
  "instagram-post",
  "place",
] as const;

export function isKnownTrashType(value: string): boolean {
  return (TRASH_TYPES as readonly string[]).includes(value);
}
