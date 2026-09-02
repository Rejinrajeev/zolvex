import { Router } from "express";
import * as publicPagesController from "../../controllers/public/pages.controller.js";

export const publicPagesRouter = Router();

publicPagesRouter.get("/:pageKey", publicPagesController.get);
