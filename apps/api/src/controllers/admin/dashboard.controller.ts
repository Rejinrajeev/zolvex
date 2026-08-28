import type { Request, Response } from "express";
import { listPendingApprovals } from "../../lib/services/dashboard.js";
import { prisma } from "../../db/prisma.js";

export async function approvals(_req: Request, res: Response) {
  res.status(200).json(await listPendingApprovals(prisma));
}
