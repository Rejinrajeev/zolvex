import { Router } from "express";
import { requireAuth } from "../../lib/auth/middleware.js";
import * as enquiriesController from "../../controllers/admin/enquiries.controller.js";

export const adminEnquiriesRouter = Router();

adminEnquiriesRouter.get("/", requireAuth, enquiriesController.list);
adminEnquiriesRouter.get("/:id", requireAuth, enquiriesController.getOne);
