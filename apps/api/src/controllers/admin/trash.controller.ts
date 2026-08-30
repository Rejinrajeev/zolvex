import type { Response } from "express";
import { listTrash } from "../../lib/services/trash.js";
import { prisma } from "../../db/prisma.js";
import { CONTENT_TYPES, type ContentType } from "./content.schemas.js";
import { serviceFor } from "./content.controller.js";
import { PlaceService } from "../../lib/services/place.js";
import {
  SlugConflictError,
  RecordNotFoundError,
  InvalidStateError,
  ForbiddenActionError,
} from "../../lib/services/approvable-resource.js";
import type { AuthedRequest } from "../../lib/auth/middleware.js";

const places = new PlaceService(prisma);

export async function list(_req: AuthedRequest, res: Response) {
  res.status(200).json(await listTrash(prisma));
}

function isContentType(value: string): value is ContentType {
  return (CONTENT_TYPES as readonly string[]).includes(value);
}

export async function restore(req: AuthedRequest, res: Response) {
  const { type, id } = req.params;
  const actor = { id: req.actor!.id, role: req.actor!.role, ipAddress: req.ip };

  try {
    if (type === "place") {
      const record = await places.restore(actor, id);
      res.status(200).json(record);
      return;
    }
    if (!isContentType(type)) {
      res.status(400).json({ error: "invalid_type" });
      return;
    }
    const record = await serviceFor(type).restore(actor, id);
    res.status(200).json(record);
  } catch (error) {
    if (error instanceof SlugConflictError) {
      res.status(409).json({ error: "slug_conflict", message: error.message });
      return;
    }
    if (error instanceof RecordNotFoundError) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    if (error instanceof InvalidStateError) {
      res.status(409).json({ error: "invalid_state", message: error.message });
      return;
    }
    if (error instanceof ForbiddenActionError) {
      res.status(403).json({ error: "forbidden" });
      return;
    }
    // PlaceService's not-found/not-deleted throws are still bare Error (Task 9's
    // same note applies) -- treat anything else reaching here as 404 rather
    // than a 500, since every real failure mode here is a bad id or bad state.
    res.status(404).json({ error: "not_found" });
  }
}
