import { Router } from "express";
import { requireAuth } from "../../lib/auth/middleware.js";
import * as placesController from "../../controllers/admin/places.controller.js";

export const adminPlacesRouter = Router();

adminPlacesRouter.get("/", requireAuth, placesController.list);
adminPlacesRouter.post("/", requireAuth, placesController.create);
adminPlacesRouter.patch("/:id", requireAuth, placesController.update);
adminPlacesRouter.delete("/:id", requireAuth, placesController.remove);
adminPlacesRouter.post("/:id/restore", requireAuth, placesController.restore);
