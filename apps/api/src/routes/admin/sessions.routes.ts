import { Router } from "express";
import { requireAuth, requireRole } from "../../lib/auth/middleware.js";
import * as sessionsController from "../../controllers/admin/sessions.controller.js";

export const adminSessionsRouter = Router();

adminSessionsRouter.get("/", requireAuth, requireRole("superadmin"), sessionsController.list);
adminSessionsRouter.post(
  "/:id/revoke",
  requireAuth,
  requireRole("superadmin"),
  sessionsController.revoke
);
