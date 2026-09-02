import { describe, it, expect, afterEach, afterAll } from "vitest";
import request from "supertest";
import { PrismaClient } from "@prisma/client";
import { createApp } from "../../app.js";

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL_TEST } },
});
const app = createApp();

afterEach(async () => {
  await prisma.pageContent.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("GET /api/pages/:pageKey", () => {
  it("requires no authentication", async () => {
    const res = await request(app).get("/api/pages/hero");
    // 404 (not configured yet) is a valid, non-auth-gated response
    expect([200, 404]).toContain(res.status);
  });

  it("returns 404 when the key has never been configured", async () => {
    const res = await request(app).get("/api/pages/hero");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "not_found" });
  });

  it("returns the stored JSON data when configured", async () => {
    await prisma.pageContent.create({
      data: { pageKey: "hero", data: { headline: "Real headline", subheadline: "Real sub" } },
    });

    const res = await request(app).get("/api/pages/hero");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: { headline: "Real headline", subheadline: "Real sub" } });
  });

  it("returns 404 not_found for a key not on the allowlist, even before any DB lookup", async () => {
    const res = await request(app).get("/api/pages/totally-made-up-key");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "not_found" });
  });

  it.each(["hero", "footer", "whatsapp", "google-review"])(
    "allows the known key %s through to the not-configured 404",
    async (pageKey) => {
      const res = await request(app).get(`/api/pages/${pageKey}`);
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: "not_found" });
    }
  );
});
