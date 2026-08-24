import express, { type Express } from "express";
import { prisma } from "./db/prisma.js";

export function createApp(): Express {
  const app = express();

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
      res.status(503).json({
        status: "unavailable",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  return app;
}
