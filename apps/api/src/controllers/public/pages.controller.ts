import type { Request, Response } from "express";
import { prisma } from "../../db/prisma.js";

export async function get(req: Request, res: Response) {
  const { pageKey } = req.params;
  const record = await prisma.pageContent.findUnique({ where: { pageKey } });
  if (!record) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  res.status(200).json({ data: record.data });
}
