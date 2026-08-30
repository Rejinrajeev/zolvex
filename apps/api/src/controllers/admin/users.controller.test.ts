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

let editorAccessToken: string;
let superadminAccessToken: string;
let editorId: string;

beforeEach(async () => {
  const editor = await prisma.admin.create({
    data: {
      name: "Editor",
      email: "users-ctrl-editor@zolvex.test",
      passwordHash: await hashPassword("x"),
      role: "editor",
    },
  });
  const superadmin = await prisma.admin.create({
    data: {
      name: "Super",
      email: "users-ctrl-super@zolvex.test",
      passwordHash: await hashPassword("x"),
      role: "superadmin",
    },
  });
  editorId = editor.id;
  editorAccessToken = signAccessToken(editor.id, "editor");
  superadminAccessToken = signAccessToken(superadmin.id, "superadmin");
});

afterEach(async () => {
  await prisma.auditLog.deleteMany();
  await prisma.adminSession.deleteMany();
  await prisma.admin.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("GET /admin/api/users", () => {
  it("returns 403 for a non-superadmin", async () => {
    const res = await request(app)
      .get("/admin/api/users")
      .set("Authorization", `Bearer ${editorAccessToken}`);
    expect(res.status).toBe(403);
  });

  it("lists admins for a superadmin", async () => {
    const res = await request(app)
      .get("/admin/api/users")
      .set("Authorization", `Bearer ${superadminAccessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.some((a: { id: string }) => a.id === editorId)).toBe(true);
  });
});

describe("POST /admin/api/users", () => {
  it("creates a new admin and returns a one-time temp password with 201", async () => {
    const res = await request(app)
      .post("/admin/api/users")
      .set("Authorization", `Bearer ${superadminAccessToken}`)
      .send({ name: "New Guy", email: "new-guy@zolvex.test", role: "editor" });
    expect(res.status).toBe(201);
    expect(res.body.email).toBe("new-guy@zolvex.test");
    expect(res.body.tempPassword).toBeTruthy();
  });

  it("returns 409 on a duplicate email", async () => {
    const res = await request(app)
      .post("/admin/api/users")
      .set("Authorization", `Bearer ${superadminAccessToken}`)
      .send({ name: "Dupe", email: "users-ctrl-editor@zolvex.test", role: "editor" });
    expect(res.status).toBe(409);
  });

  it("returns 400 on an invalid request body", async () => {
    const res = await request(app)
      .post("/admin/api/users")
      .set("Authorization", `Bearer ${superadminAccessToken}`)
      .send({ name: "", email: "not-an-email", role: "editor" });
    expect(res.status).toBe(400);
  });
});

describe("PATCH /admin/api/users/:id", () => {
  it("returns 400 for an empty body", async () => {
    const res = await request(app)
      .patch(`/admin/api/users/${editorId}`)
      .set("Authorization", `Bearer ${superadminAccessToken}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it("returns 404 for a nonexistent id", async () => {
    const res = await request(app)
      .patch("/admin/api/users/does-not-exist")
      .set("Authorization", `Bearer ${superadminAccessToken}`)
      .send({ isActive: false });
    expect(res.status).toBe(404);
  });

  it("applies a valid patch and returns 200", async () => {
    const res = await request(app)
      .patch(`/admin/api/users/${editorId}`)
      .set("Authorization", `Bearer ${superadminAccessToken}`)
      .send({ role: "superadmin" });
    expect(res.status).toBe(200);
    expect(res.body.role).toBe("superadmin");
  });
});
