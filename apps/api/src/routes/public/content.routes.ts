import { Router } from "express";
import * as publicContentController from "../../controllers/public/content.controller.js";

export const publicContentRouter = Router();

publicContentRouter.get("/:type", publicContentController.list);
