// MUST stay the very first import in this file -- load-bearing, do not reorder.
//
// Express 4 does NOT forward a rejected promise from an async route handler to
// the error-handling middleware: the rejection escapes as an unhandled
// rejection, the request hangs forever, and (under Node's default
// --unhandled-rejections=throw) the whole process dies. One authenticated
// request with a bad query param used to be enough to take the API down.
//
// This package patches Express's Layer/Router at import time so every handler's
// returned promise gets a `.catch(next)`. Because Express builds a Layer at
// route-REGISTRATION time, the patch has to be installed before any router
// module is evaluated -- ESM evaluates imports in declaration order, so this
// import sitting above the `./routes/...` imports below is what makes the
// guarantee hold. (app.ts is the only module that imports the routers; nothing
// else can register a route ahead of this.)
import "express-async-errors";
import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cookieParser from "cookie-parser";
import { prisma } from "./db/prisma.js";
import { adminAuthRouter } from "./routes/admin/auth.routes.js";
import { adminSessionsRouter } from "./routes/admin/sessions.routes.js";
import { adminUsersRouter } from "./routes/admin/users.routes.js";
import { adminContentRouter } from "./routes/admin/content.routes.js";
import { adminPlacesRouter } from "./routes/admin/places.routes.js";
import { adminPagesRouter } from "./routes/admin/pages.routes.js";
import { adminUploadsRouter } from "./routes/admin/uploads.routes.js";
import { adminDashboardRouter } from "./routes/admin/dashboard.routes.js";
import { adminTrashRouter } from "./routes/admin/trash.routes.js";
import { adminAuditLogRouter } from "./routes/admin/audit-log.routes.js";
import { adminEnquiriesRouter } from "./routes/admin/enquiries.routes.js";
import { publicContentRouter } from "./routes/public/content.routes.js";
import { publicPagesRouter } from "./routes/public/pages.routes.js";

export function createApp(): Express {
  const app = express();

  // Off by default: blindly trusting X-Forwarded-For from an untrusted network
  // lets a client spoof their own rate-limit bucket. Only opt in, explicitly,
  // when this API actually sits behind a known reverse proxy/load balancer --
  // see .env.example for accepted values (Express's "trust proxy" setting).
  if (process.env.TRUST_PROXY) {
    app.set("trust proxy", process.env.TRUST_PROXY);
  }

  app.use(express.json());
  app.use(cookieParser());
  app.use("/admin/api/auth", adminAuthRouter);
  app.use("/admin/api/sessions", adminSessionsRouter);
  app.use("/admin/api/users", adminUsersRouter);
  app.use("/admin/api/content", adminContentRouter);
  app.use("/admin/api/places", adminPlacesRouter);
  app.use("/admin/api/pages", adminPagesRouter);
  app.use("/admin/api/uploads", adminUploadsRouter);
  app.use("/admin/api/dashboard", adminDashboardRouter);
  app.use("/admin/api/trash", adminTrashRouter);
  app.use("/admin/api/audit-log", adminAuditLogRouter);
  app.use("/admin/api/enquiries", adminEnquiriesRouter);
  app.use("/api/content", publicContentRouter);
  app.use("/api/pages", publicPagesRouter);

  // Liveness: is the process up? Deliberately touches nothing external, so a
  // dead database never causes the process to be restarted.
  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  // Readiness: can we actually serve traffic? Exercises the Prisma singleton
  // against Postgres, so a broken DATABASE_URL / down database surfaces as 503
  // rather than as a 500 on the first real request.
  app.get("/ready", async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.status(200).json({ status: "ready" });
    } catch (error) {
      // /ready is unauthenticated by design, so the response body must stay
      // generic: a raw Prisma error message leaks the DB host/port and
      // sometimes connection-string fragments to anyone who can reach it.
      // The real error goes to the server log instead.
      console.error("readiness check failed:", error);
      res.status(503).json({ status: "unavailable" });
    }
  });

  // Catch-all error handler -- MUST be the last middleware registered.
  //
  // On its own this middleware only catches SYNCHRONOUS throws: bare Express 4
  // does not forward a rejected promise from an async handler here, so before
  // `express-async-errors` was added an async handler that forgot its own
  // try/catch produced a hung request and a dead process, never a 500. The
  // `import "express-async-errors"` at the top of this file is what actually
  // routes async rejections into `next(err)` and therefore into this handler.
  // Keep that import; without it the guarantee below is false.
  //
  // With both in place, any handler that forgets its own try/catch degrades to
  // a 500 here instead of crashing the process.
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    res.status(500).json({ error: "internal_error" });
  });

  return app;
}
