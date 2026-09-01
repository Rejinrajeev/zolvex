import type { Request, Response } from "express";
import { prisma } from "../../db/prisma.js";

// Mirrors apps/web/lib/admin-content/page-keys.ts's PAGE_KEYS. Duplicated
// here rather than shared -- apps/api and apps/web are separate packages
// with no shared source -- so this route rejects any key not on the list
// with the same "not_found" shape as a known-but-unconfigured key, instead
// of returning whatever JSON happens to be stored under an arbitrary
// pageKey (unlike the sibling GET /api/content/:type route's isContentType
// allowlist, this route previously had none).
const PAGE_KEYS = ["hero", "footer", "whatsapp", "google-review"] as const;

function isKnownPageKey(value: string): boolean {
  return (PAGE_KEYS as readonly string[]).includes(value);
}

export async function get(req: Request, res: Response) {
  const { pageKey } = req.params;
  if (!isKnownPageKey(pageKey)) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  const record = await prisma.pageContent.findUnique({ where: { pageKey } });
  if (!record) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  res.status(200).json({ data: record.data });
}
