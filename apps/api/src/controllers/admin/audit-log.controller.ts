import type { Response } from "express";
import { listAuditLog } from "../../lib/services/audit-log.js";
import { prisma } from "../../db/prisma.js";
import type { AuthedRequest } from "../../lib/auth/middleware.js";

export async function list(req: AuthedRequest, res: Response) {
  const { entity, adminId, from, to } = req.query;
  const filter = {
    entity: typeof entity === "string" ? entity : undefined,
    adminId: typeof adminId === "string" ? adminId : undefined,
    from: typeof from === "string" ? new Date(from) : undefined,
    to: typeof to === "string" ? new Date(to) : undefined,
  };
  res.status(200).json(await listAuditLog(prisma, filter));
}
