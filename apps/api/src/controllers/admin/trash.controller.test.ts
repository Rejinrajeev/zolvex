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
    data: { name: "Editor", email: "trash-editor@zolvex.test", passwordHash: await hashPassword("x"), role: "editor" },
  });
  editorToken = signAccessToken(editor.id, "editor");

  const superadmin = await prisma.admin.create({
    data: { name: "Super", email: "trash-super@zolvex.test", passwordHash: await hashPassword("x"), role: "superadmin" },
  });
  superadminToken = signAccessToken(superadmin.id, "superadmin");
});

afterEach(async () => {
  await prisma.auditLog.deleteMany();
  await prisma.faq.deleteMany();
  await prisma.service.deleteMany();
  await prisma.place.deleteMany();
  await prisma.admin.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("GET /admin/api/trash", () => {
  it("returns 401 with no token", async () => {
    const res = await request(app).get("/admin/api/trash");
    expect(res.status).toBe(401);
  });

  // NOTE: this route is superadmin-only. It enumerates every soft-deleted
  // record across all six types with full, unredacted fields, and deletion
  // itself is already superadmin-only -- so reading the trash is too. This test
  // previously used the editor token and asserted 200; that expectation was
  // the bug, not the fix.
  it("lists a soft-deleted Faq for a superadmin", async () => {
    await prisma.faq.create({ data: { question: "Q", answer: "A", deletedAt: new Date() } });
    const res = await request(app).get("/admin/api/trash").set("Authorization", `Bearer ${superadminToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].entity).toBe("Faq");
  });

  it("returns 403 for an editor, leaking nothing about what is in the trash", async () => {
    await prisma.faq.create({ data: { question: "Q", answer: "A", deletedAt: new Date() } });
    const res = await request(app).get("/admin/api/trash").set("Authorization", `Bearer ${editorToken}`);
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("forbidden");
    expect(res.body).not.toHaveProperty("length");
  });
});

describe("POST /admin/api/trash/:type/:id/restore", () => {
  // NOTE ON ROLE: ApprovableResourceService.restore() (Task 1) enforces
  // "only superadmin can delete/restore" itself -- there is no route-level
  // role guard (same pattern as content.routes.ts). So restoring one of the
  // five approvable types requires a superadmin token, same as
  // content.controller.test.ts's own restore test. Place has no such
  // restriction (PlaceService.restore performs no role check), so the editor
  // token is used there deliberately, to prove that distinction still holds
  // through this dispatch endpoint.
  it("restores a soft-deleted Faq for a superadmin", async () => {
    const created = await prisma.faq.create({ data: { question: "Q", answer: "A", deletedAt: new Date() } });
    const res = await request(app)
      .post(`/admin/api/trash/faq/${created.id}/restore`)
      .set("Authorization", `Bearer ${superadminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.deletedAt).toBeNull();
  });

  it("writes a real audit-log row when restoring a Faq through this endpoint", async () => {
    const created = await prisma.faq.create({ data: { question: "Q", answer: "A", deletedAt: new Date() } });
    await request(app)
      .post(`/admin/api/trash/faq/${created.id}/restore`)
      .set("Authorization", `Bearer ${superadminToken}`);

    const rows = await prisma.auditLog.findMany({ where: { entity: "Faq", entityId: created.id, action: "restore" } });
    expect(rows).toHaveLength(1);
  });

  it("returns 403 when a non-superadmin tries to restore a Faq (proves it hits the real service, not a raw update)", async () => {
    const created = await prisma.faq.create({ data: { question: "Q", answer: "A", deletedAt: new Date() } });
    const res = await request(app)
      .post(`/admin/api/trash/faq/${created.id}/restore`)
      .set("Authorization", `Bearer ${editorToken}`);
    expect(res.status).toBe(403);

    const stillDeleted = await prisma.faq.findUniqueOrThrow({ where: { id: created.id } });
    expect(stillDeleted.deletedAt).not.toBeNull();
  });

  it("returns 409 restoring a Service whose slug was reclaimed by a live record (real business logic, not a raw write)", async () => {
    const original = await prisma.service.create({
      data: { name: "Sofa Cleaning", slug: "sofa-cleaning", shortDescription: "s", fullDescription: "f", deletedAt: new Date() },
    });
    await prisma.service.create({
      data: { name: "New Sofa Cleaning", slug: "sofa-cleaning", shortDescription: "s2", fullDescription: "f2" },
    });

    const res = await request(app)
      .post(`/admin/api/trash/service/${original.id}/restore`)
      .set("Authorization", `Bearer ${superadminToken}`);
    expect(res.status).toBe(409);
    expect(res.body.error).toBe("slug_conflict");

    const stillDeleted = await prisma.service.findUniqueOrThrow({ where: { id: original.id } });
    expect(stillDeleted.deletedAt).not.toBeNull();
  });

  it("restores a soft-deleted Place", async () => {
    const created = await prisma.place.create({ data: { name: "Downtown", deletedAt: new Date() } });
    const res = await request(app)
      .post(`/admin/api/trash/place/${created.id}/restore`)
      .set("Authorization", `Bearer ${editorToken}`);
    expect(res.status).toBe(200);
    expect(res.body.deletedAt).toBeNull();
  });

  it("returns 404 for an unknown id", async () => {
    const res = await request(app)
      .post("/admin/api/trash/faq/does-not-exist/restore")
      .set("Authorization", `Bearer ${superadminToken}`);
    expect(res.status).toBe(404);
  });
});
