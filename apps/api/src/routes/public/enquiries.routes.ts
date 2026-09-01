import { Router } from "express";
import rateLimit from "express-rate-limit";
import * as publicEnquiriesController from "../../controllers/public/enquiries.controller.js";

// The enquiry form is unauthenticated and writes a row every call, so it's
// the obvious spam target on the site. Bounded per IP; a real visitor books
// a walkthrough once, not ten times an hour.
const submitRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

export const publicEnquiriesRouter = Router();

publicEnquiriesRouter.post("/", submitRateLimit, publicEnquiriesController.create);
