import { Router } from "express";
import { requireAuth } from "../../lib/auth/middleware.js";
import * as contentController from "../../controllers/admin/content.controller.js";

export const adminContentRouter = Router();

adminContentRouter.get("/:type", requireAuth, contentController.list);
adminContentRouter.get("/:type/:id", requireAuth, contentController.getOne);
adminContentRouter.post("/:type", requireAuth, contentController.create);
adminContentRouter.patch("/:type/:id", requireAuth, contentController.update);
