// apps/web/lib/admin-content/page-keys.ts

/**
 * The known PageContent keys, matching apps/web/app/admin/(protected)/
 * layout.tsx's nav entries and apps/web/app/admin/(protected)/pages/
 * [pageKey]/page.tsx's PAGE_LABELS. Kept here so the BFF route
 * (app/admin/api/pages/[pageKey]/route.ts) can validate before proxying,
 * matching the allowlist-then-proxy pattern every content/[type]/** route
 * already follows via configFor(). The nav and the page-labels map are not
 * yet unified onto this single source -- that's a larger refactor than this
 * fix warrants -- but this closes the actual gap: previously any string
 * reached Express with no 400 short-circuit at the edge.
 */
export const PAGE_KEYS = ["hero", "footer", "whatsapp", "google-review"] as const;

export function isKnownPageKey(value: string): boolean {
  return (PAGE_KEYS as readonly string[]).includes(value);
}
