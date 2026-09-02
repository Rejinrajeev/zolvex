import { Router } from "express";
import rateLimit from "express-rate-limit";
import * as publicEnquiriesController from "../../controllers/public/enquiries.controller.js";

// The enquiry form is unauthenticated and writes a row every call, so it's
// the obvious spam target on the site. Keyed on `req.ip` -- same as the
// admin auth limiters. When the site's web app calls this through its BFF
// proxy (the normal path), that IP is the web server's, so this is a global
// ceiling rather than per-visitor: a real reverse proxy configured end to
// end (Express `trust proxy` + a hop that overwrites x-forwarded-for) is
// what makes it per-client. Bound is generous enough for a busy day of
// genuine enquiries but still stops a flood.
const submitRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

export const publicEnquiriesRouter = Router();

publicEnquiriesRouter.post("/", submitRateLimit, publicEnquiriesController.create);
