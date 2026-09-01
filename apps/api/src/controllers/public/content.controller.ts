import type { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { ApprovableResourceService } from "../../lib/services/approvable-resource.js";
import { CONTENT_TYPES, TYPE_TO_DELEGATE, type ContentType } from "../admin/content.schemas.js";
import { publicContentListView } from "../../views/public/content.view.js";
import { prisma } from "../../db/prisma.js";

function isContentType(value: string): value is ContentType {
  return (CONTENT_TYPES as readonly string[]).includes(value);
}

const serviceCache = new Map<ContentType, ApprovableResourceService>();
function serviceFor(type: ContentType): ApprovableResourceService {
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
  // status is a hardcoded literal, never read from the request -- this is
  // the one property in this whole plan that must never change. A public
  // caller has no way to ask for draft/pending_approval/rejected content.
  const records = await serviceFor(type).list({ status: "published", isActive: true });
  res.status(200).json(publicContentListView(records));
}
