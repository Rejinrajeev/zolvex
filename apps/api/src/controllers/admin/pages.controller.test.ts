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
let superadminToken: string;

beforeEach(async () => {
  const editor = await prisma.admin.create({
    data: { name: "Editor", email: "pages-editor@zolvex.test", passwordHash: await hashPassword("x"), role: "editor" },
  });
  editorToken = signAccessToken(editor.id, "editor");
  const superadmin = await prisma.admin.create({
    data: { name: "Super", email: "pages-super@zolvex.test", passwordHash: await hashPassword("x"), role: "superadmin" },
  });
  superadminToken = signAccessToken(superadmin.id, "superadmin");
});

afterEach(async () => {
  await prisma.auditLog.deleteMany();
  await prisma.pageContent.deleteMany();
  await prisma.admin.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("Pages HTTP routes", () => {
  it("returns 403 for an editor on both routes", async () => {
    const getRes = await request(app).get("/admin/api/pages/hero").set("Authorization", `Bearer ${editorToken}`);
    expect(getRes.status).toBe(403);
    const putRes = await request(app)
      .put("/admin/api/pages/hero")
      .set("Authorization", `Bearer ${editorToken}`)
      .send({ data: {} });
    expect(putRes.status).toBe(403);
  });

  it("returns null for a never-set pageKey, for a superadmin", async () => {
    const res = await request(app).get("/admin/api/pages/hero").set("Authorization", `Bearer ${superadminToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toBeNull();
  });

  it("sets and retrieves page content for a superadmin", async () => {
    const putRes = await request(app)
      .put("/admin/api/pages/hero")
      .set("Authorization", `Bearer ${superadminToken}`)
      .send({ data: { headline: "Commercial cleaning you can set your clock to." } });
    expect(putRes.status).toBe(200);
    expect(putRes.body.data.headline).toBe("Commercial cleaning you can set your clock to.");

    const getRes = await request(app).get("/admin/api/pages/hero").set("Authorization", `Bearer ${superadminToken}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.data.headline).toBe("Commercial cleaning you can set your clock to.");
  });

  it("returns 400 for a PUT body missing data", async () => {
    const res = await request(app)
      .put("/admin/api/pages/hero")
      .set("Authorization", `Bearer ${superadminToken}`)
      .send({});
    expect(res.status).toBe(400);
  });
});
