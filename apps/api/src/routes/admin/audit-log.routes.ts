import { Router } from "express";
import { requireAuth, requireRole } from "../../lib/auth/middleware.js";
import * as auditLogController from "../../controllers/admin/audit-log.controller.js";

export const adminAuditLogRouter = Router();

adminAuditLogRouter.get("/", requireAuth, requireRole("superadmin"), auditLogController.list);
