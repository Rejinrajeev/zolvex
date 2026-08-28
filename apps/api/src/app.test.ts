import { describe, it, expect, afterEach, afterAll } from "vitest";
import request from "supertest";
import { Router } from "express";
import { createApp } from "./app.js";
import { prisma } from "./db/prisma.js";

afterAll(async () => {
  await prisma.$disconnect();
});

describe("GET /health", () => {
  it("returns 200 with status ok", async () => {
    const app = createApp();
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });
});

describe("GET /ready", () => {
  it("returns 200 with status ready when Postgres answers via the Prisma singleton", async () => {
    const app = createApp();
    const res = await request(app).get("/ready");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ready" });
  });
});

describe("async handler rejections", () => {
  // THE regression guard for the crash that shipped through 15 reviews.
  //
  // Bare Express 4 does not forward a rejected promise from an async route
  // handler to error-handling middleware: the rejection escapes as an unhandled
  // rejection, the request hangs forever, and Node kills the process. app.ts
  // imports `express-async-errors` first to patch that globally. This test
  // covers the general case -- a handler that rejects for a reason NO
  // per-route query-param validation could ever pre-empt (a dropped DB
  // connection, a Prisma P1001, schema drift) -- so it stays honest even as the
  // individual controllers gain their own validation.
  it("routes a rejected promise from an async handler into error-handling middleware instead of hanging", async () => {
    const app = createApp();
    let seenByErrorHandler: unknown;

    app.get("/test-only/async-boom", async () => {
      throw new Error("simulated failure deep inside an async handler");
    });
    app.use((err: unknown, _req: unknown, res: any, _next: unknown) => {
      seenByErrorHandler = err;
      res.status(500).json({ error: "internal_error" });
    });

    const res = await request(app).get("/test-only/async-boom");

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "internal_error" });
    expect((seenByErrorHandler as Error).message).toBe(
      "simulated failure deep inside an async handler"
    );
  });

  it("does the same for a rejection raised from a nested router, not just an app-level route", async () => {
    const app = createApp();
    let seenByErrorHandler: unknown;

    const router = Router();
    router.get("/boom", async () => {
      throw new Error("nested router rejection");
    });
    app.use("/test-only/nested", router);
    app.use((err: unknown, _req: unknown, res: any, _next: unknown) => {
      seenByErrorHandler = err;
      res.status(500).json({ error: "internal_error" });
    });

    const res = await request(app).get("/test-only/nested/boom");

    expect(res.status).toBe(500);
    expect((seenByErrorHandler as Error).message).toBe("nested router rejection");
  });
});

describe("trust proxy setting", () => {
  const originalValue = process.env.TRUST_PROXY;

  afterEach(() => {
    if (originalValue === undefined) {
      delete process.env.TRUST_PROXY;
    } else {
      process.env.TRUST_PROXY = originalValue;
    }
  });

  it("leaves Express's default (disabled) trust proxy setting when TRUST_PROXY is unset", () => {
    delete process.env.TRUST_PROXY;
    const app = createApp();
    expect(app.get("trust proxy")).toBeFalsy();
  });

  it("enables trust proxy when TRUST_PROXY is set", () => {
    process.env.TRUST_PROXY = "loopback";
    const app = createApp();
    expect(app.get("trust proxy")).toBeTruthy();
  });
});
