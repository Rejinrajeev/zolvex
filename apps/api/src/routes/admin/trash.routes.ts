import { Router } from "express";
import { requireAuth, requireRole } from "../../lib/auth/middleware.js";
import * as trashController from "../../controllers/admin/trash.controller.js";

export const adminTrashRouter = Router();

// Superadmin-only: this returns every soft-deleted record across all six types
// with full, unredacted fields -- an enumeration of everything the team has
// ever removed. Deletion itself is already superadmin-only, so reading the
// trash should be too.
adminTrashRouter.get("/", requireAuth, requireRole("superadmin"), trashController.list);
// Deliberately requireAuth only. The five approvable types are gated inside
// ApprovableResourceService.restore() (superadmin-only), and Place has no such
// gate by design -- it sits outside the approval workflow, and any admin may
// add/remove/restore a service area. Adding requireRole here would silently
// change that Place behaviour.
adminTrashRouter.post("/:type/:id/restore", requireAuth, trashController.restore);
