import { getApiBaseUrl } from "@/lib/admin-auth/env";

const REVALIDATE_SECONDS = 90;

/**
 * Fetches a public content-type list from the backend. Never throws --
 * a marketing page must render (with an empty state) even if the API is
 * unreachable or returns something unexpected.
 */
export async function getPublicContent<T = Record<string, unknown>>(type: string): Promise<T[]> {
  try {
    const res = await fetch(`${getApiBaseUrl()}${`/api/content/${type}`}`, {
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!res.ok) return [];
    return (await res.json()) as T[];
  } catch {
    return [];
  }
}

/**
 * Fetches one PageContent key's stored data. Returns null both when the
 * key has never been configured (404) and on any failure -- callers treat
 * both the same way: fall back to a default.
 */
export async function getPageContent<T = Record<string, unknown>>(pageKey: string): Promise<T | null> {
  try {
    const res = await fetch(`${getApiBaseUrl()}${`/api/pages/${pageKey}`}`, {
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { data: T };
    return body.data;
  } catch {
    return null;
  }
}
