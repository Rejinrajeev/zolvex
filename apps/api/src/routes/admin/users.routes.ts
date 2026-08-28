import { Router } from "express";
import { requireAuth, requireRole } from "../../lib/auth/middleware.js";
import * as usersController from "../../controllers/admin/users.controller.js";

export const adminUsersRouter = Router();

adminUsersRouter.get("/", requireAuth, requireRole("superadmin"), usersController.list);
adminUsersRouter.post("/", requireAuth, requireRole("superadmin"), usersController.create);
adminUsersRouter.patch("/:id", requireAuth, requireRole("superadmin"), usersController.patch);
