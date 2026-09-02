import { Router } from "express";
import { requireAuth } from "../../lib/auth/middleware.js";
import * as authController from "../../controllers/admin/auth.controller.js";

/**
 * Self-service account actions available to any signed-in admin (editor or
 * superadmin), unlike /admin/api/users which is superadmin-only. Kept off
 * the /admin/api/auth prefix so it sits behind requireAuth and so the web
 * BFF's callExpress treats a 401 here as "session expired, refresh" rather
 * than "wrong credentials, pass through".
 */
export const adminAccountRouter = Router();

adminAccountRouter.post("/password", requireAuth, authController.changePassword);
