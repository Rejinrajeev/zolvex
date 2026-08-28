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
let superadminId: string;

beforeEach(async () => {
  const editor = await prisma.admin.create({
    data: { name: "Editor", email: "audit-log-editor@zolvex.test", passwordHash: await hashPassword("x"), role: "editor" },
  });
  editorToken = signAccessToken(editor.id, "editor");
  const superadmin = await prisma.admin.create({
    data: { name: "Super", email: "audit-log-super@zolvex.test", passwordHash: await hashPassword("x"), role: "superadmin" },
  });
  superadminId = superadmin.id;
  superadminToken = signAccessToken(superadmin.id, "superadmin");
});

afterEach(async () => {
  await prisma.auditLog.deleteMany();
  await prisma.admin.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("GET /admin/api/audit-log", () => {
  it("returns 403 for an editor", async () => {
    const res = await request(app).get("/admin/api/audit-log").set("Authorization", `Bearer ${editorToken}`);
    expect(res.status).toBe(403);
  });

  it("returns filtered results for a superadmin", async () => {
    await prisma.auditLog.create({
      data: { adminId: superadminId, action: "create", entity: "Faq", entityId: "x", diff: {} },
    });
    await prisma.auditLog.create({
      data: { adminId: superadminId, action: "create", entity: "Service", entityId: "y", diff: {} },
    });
    const res = await request(app)
      .get("/admin/api/audit-log?entity=Faq")
      .set("Authorization", `Bearer ${superadminToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].entity).toBe("Faq");
  });

  it("accepts a valid from/to date range", async () => {
    await prisma.auditLog.create({
      data: { adminId: superadminId, action: "create", entity: "Faq", entityId: "x", diff: {} },
    });
    const res = await request(app)
      .get("/admin/api/audit-log?from=2000-01-01&to=2999-01-01")
      .set("Authorization", `Bearer ${superadminToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  it("returns 400 for an unparseable from/to date, not a 500 or a dead process", async () => {
    // `new Date("garbage")` is an Invalid Date, which Prisma rejects with a raw
    // PrismaClientValidationError inside this async handler -- a rejection bare
    // Express 4 never catches.
    const bad = await request(app)
      .get("/admin/api/audit-log?from=not-a-date")
      .set("Authorization", `Bearer ${superadminToken}`);
    expect(bad.status).toBe(400);
    expect(bad.body.error).toBe("invalid_request");

    const badTo = await request(app)
      .get("/admin/api/audit-log?to=13/45/9999")
      .set("Authorization", `Bearer ${superadminToken}`);
    expect(badTo.status).toBe(400);
    expect(badTo.body.error).toBe("invalid_request");
  });
});
