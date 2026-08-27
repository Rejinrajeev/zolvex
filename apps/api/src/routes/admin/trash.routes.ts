import { Router } from "express";
import { requireAuth } from "../../lib/auth/middleware.js";
import * as trashController from "../../controllers/admin/trash.controller.js";

export const adminTrashRouter = Router();

adminTrashRouter.get("/", requireAuth, trashController.list);
adminTrashRouter.post("/:type/:id/restore", requireAuth, trashController.restore);
