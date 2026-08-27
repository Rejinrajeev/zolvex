import type { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { ApprovableResourceService } from "../../lib/services/approvable-resource.js";
import { CONTENT_TYPES, TYPE_TO_DELEGATE, type ContentType } from "./content.schemas.js";
import { contentRecordView, contentListView } from "../../views/admin/content.view.js";
import { prisma } from "../../db/prisma.js";

function isContentType(value: string): value is ContentType {
  return (CONTENT_TYPES as readonly string[]).includes(value);
}

/** One ApprovableResourceService instance per type, built lazily and cached. */
const serviceCache = new Map<ContentType, ApprovableResourceService>();
export function serviceFor(type: ContentType): ApprovableResourceService {
  if (!serviceCache.has(type)) {
    serviceCache.set(type, new ApprovableResourceService(prisma as PrismaClient, TYPE_TO_DELEGATE[type]));
  }
  return serviceCache.get(type)!;
}

export async function list(req: Request, res: Response) {
  const { type } = req.params;
  if (!isContentType(type)) {
    res.status(400).json({ error: "invalid_type" });
    return;
  }
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  const search = typeof req.query.q === "string" ? req.query.q : undefined;
  const records = await serviceFor(type).list({ status, search });
  res.status(200).json(contentListView(records));
}

export async function getOne(req: Request, res: Response) {
  const { type, id } = req.params;
  if (!isContentType(type)) {
    res.status(400).json({ error: "invalid_type" });
    return;
  }
  // A direct, indexed Prisma read (allowed — see Global Constraints; this
  // doesn't mutate anything, so it doesn't need to go through the service).
  const delegateName = TYPE_TO_DELEGATE[type];
  const record = await (prisma as any)[delegateName].findFirst({ where: { id, deletedAt: null } });
  if (!record) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  res.status(200).json(contentRecordView(record));
}
