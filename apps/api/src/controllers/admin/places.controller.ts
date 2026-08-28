import type { Response } from "express";
import { z } from "zod";
import { PlaceService } from "../../lib/services/place.js";
import { prisma } from "../../db/prisma.js";
import type { AuthedRequest } from "../../lib/auth/middleware.js";

const places = new PlaceService(prisma);

function actorFrom(req: AuthedRequest) {
  return { id: req.actor!.id, role: req.actor!.role, ipAddress: req.ip };
}

export async function list(_req: AuthedRequest, res: Response) {
  res.status(200).json(await places.list());
}

const createSchema = z.object({
  name: z.string().min(1).max(200),
  order: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export async function create(req: AuthedRequest, res: Response) {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request", issues: parsed.error.issues });
    return;
  }
  try {
    const record = await places.create(actorFrom(req), parsed.data);
    res.status(201).json(record);
  } catch {
    // Consistent with update()/remove()/restore() below: PlaceService throws a
    // bare Error, so 404 is the closest honest mapping. Defense in depth --
    // app.ts's express-async-errors + catch-all would now turn an escaped
    // rejection into a 500 rather than a dead process, but this keeps the
    // whole file answering the same way.
    res.status(404).json({ error: "not_found" });
  }
}

const updateSchema = createSchema.partial();

export async function update(req: AuthedRequest, res: Response) {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request", issues: parsed.error.issues });
    return;
  }
  try {
    const record = await places.update(actorFrom(req), req.params.id, parsed.data);
    res.status(200).json(record);
  } catch {
    // PlaceService throws a bare Error for "not found"/"soft-deleted" — it
    // predates the named-error-class pattern from Task 1 and is out of this
    // task's scope to change; a 404 is the closest honest mapping for either.
    res.status(404).json({ error: "not_found" });
  }
}

export async function remove(req: AuthedRequest, res: Response) {
  try {
    const record = await places.softDelete(actorFrom(req), req.params.id);
    res.status(200).json(record);
  } catch {
    res.status(404).json({ error: "not_found" });
  }
}

export async function restore(req: AuthedRequest, res: Response) {
  try {
    const record = await places.restore(actorFrom(req), req.params.id);
    res.status(200).json(record);
  } catch {
    res.status(404).json({ error: "not_found" });
  }
}
