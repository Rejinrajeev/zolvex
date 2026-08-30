import { describe, it, expect, beforeEach, afterEach, afterAll } from "vitest";
import request from "supertest";
import { PrismaClient } from "@prisma/client";
import { createApp } from "../../app.js";
import { hashPassword } from "../../lib/auth/crypto.js";
import { signAccessToken } from "../../lib/auth/jwt.js";

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL_TEST } },
});
const app = createApp();

let editorToken: string;

beforeEach(async () => {
  const editor = await prisma.admin.create({
    data: { name: "Editor", email: "places-editor@zolvex.test", passwordHash: await hashPassword("x"), role: "editor" },
  });
  editorToken = signAccessToken(editor.id, "editor");
});

afterEach(async () => {
  await prisma.auditLog.deleteMany();
  await prisma.place.deleteMany();
  await prisma.admin.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("Places HTTP routes", () => {
  it("returns 401 with no token", async () => {
    const res = await request(app).get("/admin/api/places");
    expect(res.status).toBe(401);
  });

  it("supports the full create -> list -> update -> delete -> restore cycle for an editor (no role restriction)", async () => {
    const createRes = await request(app)
      .post("/admin/api/places")
      .set("Authorization", `Bearer ${editorToken}`)
      .send({ name: "Downtown" });
    expect(createRes.status).toBe(201);
    const id = createRes.body.id;

    const listRes = await request(app).get("/admin/api/places").set("Authorization", `Bearer ${editorToken}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.some((p: { id: string }) => p.id === id)).toBe(true);

    const patchRes = await request(app)
      .patch(`/admin/api/places/${id}`)
      .set("Authorization", `Bearer ${editorToken}`)
      .send({ name: "Uptown" });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.name).toBe("Uptown");

    const deleteRes = await request(app).delete(`/admin/api/places/${id}`).set("Authorization", `Bearer ${editorToken}`);
    expect(deleteRes.status).toBe(200);

    const restoreRes = await request(app)
      .post(`/admin/api/places/${id}/restore`)
      .set("Authorization", `Bearer ${editorToken}`);
    expect(restoreRes.status).toBe(200);
    expect(restoreRes.body.deletedAt).toBeNull();
  });

  it("returns 400 for an empty name on create", async () => {
    const res = await request(app)
      .post("/admin/api/places")
      .set("Authorization", `Bearer ${editorToken}`)
      .send({ name: "" });
    expect(res.status).toBe(400);
  });

  it("returns 404 patching an unknown id", async () => {
    const res = await request(app)
      .patch("/admin/api/places/does-not-exist")
      .set("Authorization", `Bearer ${editorToken}`)
      .send({ name: "X" });
    expect(res.status).toBe(404);
  });
});
