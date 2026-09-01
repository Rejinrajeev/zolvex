import { Router } from "express";
import * as publicPlacesController from "../../controllers/public/places.controller.js";

export const publicPlacesRouter = Router();

publicPlacesRouter.get("/", publicPlacesController.list);
