import type { Response } from "express";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { PageContentService } from "../../lib/services/page-content.js";
import { prisma } from "../../db/prisma.js";
import type { AuthedRequest } from "../../lib/auth/middleware.js";

const pages = new PageContentService(prisma);

export async function get(req: AuthedRequest, res: Response) {
  const record = await pages.get(req.params.pageKey);
  res.status(200).json(record);
}

const setSchema = z.object({ data: z.record(z.string(), z.unknown()) });

export async function set(req: AuthedRequest, res: Response) {
  const parsed = setSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request", issues: parsed.error.issues });
    return;
  }
  const record = await pages.set(
    { id: req.actor!.id, role: req.actor!.role, ipAddress: req.ip },
    req.params.pageKey,
    parsed.data.data as Prisma.InputJsonValue
  );
  res.status(200).json(record);
}
