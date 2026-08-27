import type { Request, Response } from "express";
import { prisma } from "../../db/prisma.js";

export async function list(req: Request, res: Response) {
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  const where = status ? { status: status as any } : {};
  const enquiries = await prisma.enquiry.findMany({ where, orderBy: { createdAt: "desc" } });
  res.status(200).json(enquiries);
}

export async function getOne(req: Request, res: Response) {
  const enquiry = await prisma.enquiry.findUnique({ where: { id: req.params.id } });
  if (!enquiry) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  res.status(200).json(enquiry);
}
