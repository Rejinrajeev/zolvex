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

  // Catch-all error handler -- MUST be the last middleware registered. Express
  // 4 does not auto-catch a rejected promise from an async route handler, and
  // there is no process-level unhandledRejection/uncaughtException guard, so
  // an unguarded async handler that throws can otherwise crash the whole
  // process. Any future handler that forgets its own try/catch degrades to a
  // 500 here instead.
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    res.status(500).json({ error: "internal_error" });
  });

  return app;
}
