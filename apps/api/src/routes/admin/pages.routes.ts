import { Router } from "express";
import { requireAuth, requireRole } from "../../lib/auth/middleware.js";
import * as pagesController from "../../controllers/admin/pages.controller.js";

export const adminPagesRouter = Router();

adminPagesRouter.get("/:pageKey", requireAuth, requireRole("superadmin"), pagesController.get);
adminPagesRouter.put("/:pageKey", requireAuth, requireRole("superadmin"), pagesController.set);
