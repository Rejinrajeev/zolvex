import { describe, it, expect, vi } from "vitest";
import express from "express";
import request from "supertest";
import { signAccessToken } from "./jwt.js";
import { requireAuth, requireRole, type AuthedRequest } from "./middleware.js";

function buildApp() {
  const app = express();
  app.get("/protected", requireAuth, (req: AuthedRequest, res) => {
    res.status(200).json({ actorId: req.actor?.id });
  });
  app.get("/superadmin-only", requireAuth, requireRole("superadmin"), (_req, res) => {
    res.status(200).json({ ok: true });
  });
  return app;
}

describe("requireAuth", () => {
  it("rejects a request with no Authorization header", async () => {
    const res = await request(buildApp()).get("/protected");
    expect(res.status).toBe(401);
  });

  it("rejects an invalid token", async () => {
    const res = await request(buildApp()).get("/protected").set("Authorization", "Bearer not-a-real-token");
    expect(res.status).toBe(401);
  });

  it("attaches req.actor and calls next() for a valid token", async () => {
    const token = signAccessToken("admin-1", "editor");
    const res = await request(buildApp()).get("/protected").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.actorId).toBe("admin-1");
  });
});

describe("requireRole", () => {
  it("returns 403 for the wrong role", async () => {
    const token = signAccessToken("admin-1", "editor");
    const res = await request(buildApp())
      .get("/superadmin-only")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it("allows the matching role through", async () => {
    const token = signAccessToken("admin-1", "superadmin");
    const res = await request(buildApp())
      .get("/superadmin-only")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});
