import { Router } from "express";
import { requireAuth, requireRole } from "../../lib/auth/middleware.js";
import * as contentController from "../../controllers/admin/content.controller.js";

export const adminContentRouter = Router();

adminContentRouter.get("/:type", requireAuth, contentController.list);
adminContentRouter.get("/:type/:id", requireAuth, contentController.getOne);
adminContentRouter.post("/:type", requireAuth, contentController.create);
// Superadmin-only, unlike the create/update routes above. Every other editor
// mutation funnels into pending_approval and waits for review; reorder writes
// straight to the live, publicly-visible display order of already-published
// records with no review step, which puts it in the same class as
// delete/restore/approve/reject (all superadmin-gated in
// ApprovableResourceService itself). Gated at the route, matching
// sessions.routes.ts / pages.routes.ts.
adminContentRouter.patch("/:type/reorder", requireAuth, requireRole("superadmin"), contentController.reorder);
adminContentRouter.patch("/:type/:id", requireAuth, contentController.update);
adminContentRouter.delete("/:type/:id", requireAuth, contentController.softDelete);
adminContentRouter.post("/:type/:id/restore", requireAuth, contentController.restore);
adminContentRouter.post("/:type/:id/approve", requireAuth, contentController.approve);
adminContentRouter.post("/:type/:id/reject", requireAuth, contentController.reject);
