import type { Request, Response } from "express";
import { z } from "zod";
import { PrismaClient, ApprovalStatus } from "@prisma/client";
import {
  ApprovableResourceService,
  SlugConflictError,
  ForbiddenActionError,
  RecordNotFoundError,
  InvalidStateError,
} from "../../lib/services/approvable-resource.js";
import { CONTENT_TYPES, TYPE_TO_DELEGATE, type ContentType, schemaFor, partialSchemaFor } from "./content.schemas.js";
import { contentRecordView, contentListView } from "../../views/admin/content.view.js";
import { prisma } from "../../db/prisma.js";
import type { AuthedRequest } from "../../lib/auth/middleware.js";

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

/**
 * `?status=` goes straight into a Prisma `approvalStatus` filter, and Prisma
 * throws PrismaClientValidationError -- not a nice 400 -- for any value outside
 * the enum. Validate it here so a bad value is a clean 400 instead of leaning on
 * app.ts's catch-all 500. Built from the Prisma-generated enum rather than a
 * hand-copied list, so it can never drift from schema.prisma.
 */
const listStatusSchema = z.enum(ApprovalStatus);

export async function list(req: Request, res: Response) {
  const { type } = req.params;
  if (!isContentType(type)) {
    res.status(400).json({ error: "invalid_type" });
    return;
  }
  let status: ApprovalStatus | undefined;
  if (typeof req.query.status === "string") {
    const parsed = listStatusSchema.safeParse(req.query.status);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_request", issues: parsed.error.issues });
      return;
    }
    status = parsed.data;
  }
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

function mapServiceError(error: unknown, res: Response): boolean {
  if (error instanceof SlugConflictError) {
    res.status(409).json({ error: "slug_conflict", message: error.message });
    return true;
  }
  if (error instanceof RecordNotFoundError) {
    res.status(404).json({ error: "not_found" });
    return true;
  }
  if (error instanceof InvalidStateError) {
    res.status(409).json({ error: "invalid_state", message: error.message });
    return true;
  }
  if (error instanceof ForbiddenActionError) {
    res.status(403).json({ error: "forbidden" });
    return true;
  }
  return false;
}

export async function create(req: AuthedRequest, res: Response) {
  const { type } = req.params;
  if (!isContentType(type)) {
    res.status(400).json({ error: "invalid_type" });
    return;
  }
  const parsed = schemaFor(type).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request", issues: parsed.error.issues });
    return;
  }
  try {
    const record = await serviceFor(type).create(
      { id: req.actor!.id, role: req.actor!.role, ipAddress: req.ip },
      parsed.data as Record<string, unknown>
    );
    res.status(201).json(contentRecordView(record));
  } catch (error) {
    if (!mapServiceError(error, res)) throw error;
  }
}

export async function update(req: AuthedRequest, res: Response) {
  const { type, id } = req.params;
  if (!isContentType(type)) {
    res.status(400).json({ error: "invalid_type" });
    return;
  }
  const parsed = partialSchemaFor(type).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request", issues: parsed.error.issues });
    return;
  }
  try {
    const record = await serviceFor(type).update(
      { id: req.actor!.id, role: req.actor!.role, ipAddress: req.ip },
      id,
      parsed.data as Record<string, unknown>
    );
    res.status(200).json(contentRecordView(record));
  } catch (error) {
    if (!mapServiceError(error, res)) throw error;
  }
}

export async function softDelete(req: AuthedRequest, res: Response) {
  const { type, id } = req.params;
  if (!isContentType(type)) {
    res.status(400).json({ error: "invalid_type" });
    return;
  }
  try {
    const record = await serviceFor(type).softDelete({ id: req.actor!.id, role: req.actor!.role, ipAddress: req.ip }, id);
    res.status(200).json(contentRecordView(record));
  } catch (error) {
    if (!mapServiceError(error, res)) throw error;
  }
}

export async function restore(req: AuthedRequest, res: Response) {
  const { type, id } = req.params;
  if (!isContentType(type)) {
    res.status(400).json({ error: "invalid_type" });
    return;
  }
  try {
    const record = await serviceFor(type).restore({ id: req.actor!.id, role: req.actor!.role, ipAddress: req.ip }, id);
    res.status(200).json(contentRecordView(record));
  } catch (error) {
    if (!mapServiceError(error, res)) throw error;
  }
}

const rejectSchema = z.object({ reason: z.string().min(1) });

export async function approve(req: AuthedRequest, res: Response) {
  const { type, id } = req.params;
  if (!isContentType(type)) {
    res.status(400).json({ error: "invalid_type" });
    return;
  }
  try {
    const record = await serviceFor(type).approve({ id: req.actor!.id, role: req.actor!.role, ipAddress: req.ip }, id);
    res.status(200).json(contentRecordView(record));
  } catch (error) {
    if (!mapServiceError(error, res)) throw error;
  }
}

const reorderSchema = z.object({
  items: z.array(z.object({ id: z.string().min(1), order: z.number().int() })),
});

export async function reorder(req: AuthedRequest, res: Response) {
  const { type } = req.params;
  if (!isContentType(type)) {
    res.status(400).json({ error: "invalid_type" });
    return;
  }
  const parsed = reorderSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request", issues: parsed.error.issues });
    return;
  }
  try {
    const records = await serviceFor(type).reorder(
      { id: req.actor!.id, role: req.actor!.role, ipAddress: req.ip },
      parsed.data.items
    );
    res.status(200).json(contentListView(records));
  } catch (error) {
    if (!mapServiceError(error, res)) throw error;
  }
}

export async function reject(req: AuthedRequest, res: Response) {
  const { type, id } = req.params;
  if (!isContentType(type)) {
    res.status(400).json({ error: "invalid_type" });
    return;
  }
  const parsed = rejectSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request", issues: parsed.error.issues });
    return;
  }
  try {
    const record = await serviceFor(type).reject(
      { id: req.actor!.id, role: req.actor!.role, ipAddress: req.ip },
      id,
      parsed.data.reason
    );
    res.status(200).json(contentRecordView(record));
  } catch (error) {
    if (!mapServiceError(error, res)) throw error;
  }
}
