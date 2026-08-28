import type { Response } from "express";
import { listAuditLog } from "../../lib/services/audit-log.js";
import { prisma } from "../../db/prisma.js";
import type { AuthedRequest } from "../../lib/auth/middleware.js";

/**
 * `new Date("garbage")` yields an Invalid Date rather than throwing, and Prisma
 * rejects an Invalid Date in a `timestamp` filter with a raw
 * PrismaClientValidationError. Return undefined for "not supplied" and null for
 * "supplied but unparseable", so the caller can tell the two apart and answer
 * 400 instead of leaning on app.ts's catch-all 500.
 */
function parseDateParam(value: unknown): Date | null | undefined {
  if (typeof value !== "string") return undefined;
  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date;
}

export async function list(req: AuthedRequest, res: Response) {
  const { entity, adminId, from, to } = req.query;
  const parsedFrom = parseDateParam(from);
  const parsedTo = parseDateParam(to);
  if (parsedFrom === null || parsedTo === null) {
    res.status(400).json({ error: "invalid_request" });
    return;
  }
  const filter = {
    entity: typeof entity === "string" ? entity : undefined,
    adminId: typeof adminId === "string" ? adminId : undefined,
    from: parsedFrom,
    to: parsedTo,
  };
  res.status(200).json(await listAuditLog(prisma, filter));
}
