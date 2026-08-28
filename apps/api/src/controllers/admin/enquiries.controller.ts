import type { Request, Response } from "express";
import { z } from "zod";
import { EnquiryStatus } from "@prisma/client";
import { prisma } from "../../db/prisma.js";

/**
 * `?status=` goes straight into a Prisma `status` filter, which throws
 * PrismaClientValidationError -- not a nice 400 -- for any value outside the
 * enum. Validate it here (and drop the `as any` that hid the problem from the
 * compiler). Built from the Prisma-generated enum rather than a hand-copied
 * list, so it can never drift from schema.prisma.
 */
const listStatusSchema = z.enum(EnquiryStatus);

export async function list(req: Request, res: Response) {
  let status: EnquiryStatus | undefined;
  if (typeof req.query.status === "string") {
    const parsed = listStatusSchema.safeParse(req.query.status);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_request", issues: parsed.error.issues });
      return;
    }
    status = parsed.data;
  }
  const where = status ? { status } : {};
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
