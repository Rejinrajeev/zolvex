import { describe, it, expect, afterEach, afterAll } from "vitest";
import request from "supertest";
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
