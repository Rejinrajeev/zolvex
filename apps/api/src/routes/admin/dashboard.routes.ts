import { Router } from "express";
import { requireAuth } from "../../lib/auth/middleware.js";
import * as dashboardController from "../../controllers/admin/dashboard.controller.js";

export const adminDashboardRouter = Router();

adminDashboardRouter.get("/approvals", requireAuth, dashboardController.approvals);
