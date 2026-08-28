import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../../app.js";

// This file is intentionally separate from auth.controller.test.ts: vitest gives each
// test file its own module registry, so the rate limiters defined in auth.routes.ts
// (module-level instances, one independent counter per route) start fresh here and
// hammering a route's quota in this file can't bleed into the functional/flow tests
// that live in the other file (or vice versa).
const app = createApp();

describe("rate limiting on previously-unprotected auth routes", () => {
  it("returns 429 once request volume on /2fa/login/verify exceeds the configured limit", async () => {
    const attempts = 35; // configured max is 30 for this limiter
    const statuses: number[] = [];
    for (let i = 0; i < attempts; i++) {
      const res = await request(app).post("/admin/api/auth/2fa/login/verify").send({ code: "000000" });
      statuses.push(res.status);
    }
    expect(statuses).toContain(429);
  });

  it("returns 429 once request volume on /2fa/setup exceeds the configured limit", async () => {
    const attempts = 35;
    const statuses: number[] = [];
    for (let i = 0; i < attempts; i++) {
      const res = await request(app).post("/admin/api/auth/2fa/setup");
      statuses.push(res.status);
    }
    expect(statuses).toContain(429);
  });
});
