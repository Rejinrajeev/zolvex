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
let sessionId: string;

beforeEach(async () => {
  const editor = await prisma.admin.create({
    data: {
      name: "Editor",
      email: "sessions-editor@zolvex.test",
      passwordHash: await hashPassword("x"),
      role: "editor",
    },
  });
  const superadmin = await prisma.admin.create({
    data: {
      name: "Super",
      email: "sessions-super@zolvex.test",
      passwordHash: await hashPassword("x"),
      role: "superadmin",
    },
  });
  editorAccessToken = signAccessToken(editor.id, "editor");
  superadminAccessToken = signAccessToken(superadmin.id, "superadmin");

  const session = await prisma.adminSession.create({
    data: {
      adminId: editor.id,
      refreshTokenHash: "test-hash-" + Math.random(),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
    },
  });
  sessionId = session.id;
});

afterEach(async () => {
  await prisma.adminSession.deleteMany();
  await prisma.admin.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("GET /admin/api/sessions", () => {
  it("returns 403 for a non-superadmin", async () => {
    const res = await request(app)
      .get("/admin/api/sessions")
      .set("Authorization", `Bearer ${editorAccessToken}`);
    expect(res.status).toBe(403);
  });

  it("returns the active session list for a superadmin", async () => {
    const res = await request(app)
      .get("/admin/api/sessions")
      .set("Authorization", `Bearer ${superadminAccessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.some((s: { id: string }) => s.id === sessionId)).toBe(true);
  });
});

describe("POST /admin/api/sessions/:id/revoke", () => {
  it("revokes the target session", async () => {
    const res = await request(app)
      .post(`/admin/api/sessions/${sessionId}/revoke`)
      .set("Authorization", `Bearer ${superadminAccessToken}`);
    expect(res.status).toBe(200);

    const session = await prisma.adminSession.findUniqueOrThrow({ where: { id: sessionId } });
    expect(session.revokedAt).not.toBeNull();
  });
});
