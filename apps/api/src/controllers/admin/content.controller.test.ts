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
    data: { name: "Editor", email: "content-editor@zolvex.test", passwordHash: await hashPassword("x"), role: "editor" },
  });
  editorToken = signAccessToken(editor.id, "editor");
  const superadmin = await prisma.admin.create({
    data: { name: "Super", email: "content-super@zolvex.test", passwordHash: await hashPassword("x"), role: "superadmin" },
  });
  superadminToken = signAccessToken(superadmin.id, "superadmin");
});

afterEach(async () => {
  await prisma.auditLog.deleteMany();
  await prisma.faq.deleteMany();
  await prisma.service.deleteMany();
  await prisma.admin.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("GET /admin/api/content/:type", () => {
  it("returns 401 with no token", async () => {
    const res = await request(app).get("/admin/api/content/faq");
    expect(res.status).toBe(401);
  });

  it("returns 400 for an unknown content type", async () => {
    const res = await request(app).get("/admin/api/content/not-a-real-type").set("Authorization", `Bearer ${editorToken}`);
    expect(res.status).toBe(400);
  });

  it("lists records for an authenticated editor", async () => {
    await prisma.faq.create({ data: { question: "Q1", answer: "A1", approvalStatus: "published" } });
    const res = await request(app).get("/admin/api/content/faq").set("Authorization", `Bearer ${editorToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  it("filters by status query param", async () => {
    await prisma.faq.create({ data: { question: "Pending", answer: "A", approvalStatus: "pending_approval" } });
    await prisma.faq.create({ data: { question: "Published", answer: "A", approvalStatus: "published" } });
    const res = await request(app)
      .get("/admin/api/content/faq?status=published")
      .set("Authorization", `Bearer ${superadminToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].question).toBe("Published");
  });

  it("returns 400 for a status outside the ApprovalStatus enum, not a 500 or a dead process", async () => {
    // Regression guard: `?status=` used to be passed to Prisma unvalidated, so
    // this exact request threw PrismaClientValidationError inside an async
    // handler -- which bare Express 4 never catches. The request hung and the
    // process died. It must now be a clean 400.
    const res = await request(app)
      .get("/admin/api/content/faq?status=bogus")
      .set("Authorization", `Bearer ${editorToken}`);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("invalid_request");
  });
});

describe("GET /admin/api/content/:type/:id", () => {
  it("returns 404 for an unknown id", async () => {
    const res = await request(app)
      .get("/admin/api/content/faq/does-not-exist")
      .set("Authorization", `Bearer ${editorToken}`);
    expect(res.status).toBe(404);
  });

  it("returns the record for a known id", async () => {
    const created = await prisma.faq.create({ data: { question: "Q", answer: "A" } });
    const res = await request(app)
      .get(`/admin/api/content/faq/${created.id}`)
      .set("Authorization", `Bearer ${editorToken}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(created.id);
  });
});

describe("POST /admin/api/content/:type", () => {
  it("returns 400 for an unknown content type", async () => {
    const res = await request(app)
      .post("/admin/api/content/not-a-real-type")
      .set("Authorization", `Bearer ${editorToken}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it("returns 400 for a malformed body", async () => {
    const res = await request(app)
      .post("/admin/api/content/faq")
      .set("Authorization", `Bearer ${editorToken}`)
      .send({ question: "Missing answer" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("invalid_request");
  });

  it("creates as pending_approval for an editor", async () => {
    const res = await request(app)
      .post("/admin/api/content/faq")
      .set("Authorization", `Bearer ${editorToken}`)
      .send({ question: "Q?", answer: "A." });
    expect(res.status).toBe(201);
    expect(res.body.approvalStatus).toBe("pending_approval");
  });

  it("creates as published for a superadmin", async () => {
    const res = await request(app)
      .post("/admin/api/content/faq")
      .set("Authorization", `Bearer ${superadminToken}`)
      .send({ question: "Q?", answer: "A." });
    expect(res.status).toBe(201);
    expect(res.body.approvalStatus).toBe("published");
  });

  it("returns 409 on a Service slug conflict", async () => {
    await request(app)
      .post("/admin/api/content/service")
      .set("Authorization", `Bearer ${superadminToken}`)
      .send({ name: "A", slug: "dup", shortDescription: "s", fullDescription: "f" });

    const res = await request(app)
      .post("/admin/api/content/service")
      .set("Authorization", `Bearer ${superadminToken}`)
      .send({ name: "B", slug: "dup", shortDescription: "s", fullDescription: "f" });
    expect(res.status).toBe(409);
  });
});

describe("PATCH /admin/api/content/:type/:id", () => {
  it("returns 404 for an unknown id", async () => {
    const res = await request(app)
      .patch("/admin/api/content/faq/does-not-exist")
      .set("Authorization", `Bearer ${editorToken}`)
      .send({ question: "New" });
    expect(res.status).toBe(404);
  });

  it("updates a subset of fields", async () => {
    const created = await prisma.faq.create({ data: { question: "Old", answer: "A" } });
    const res = await request(app)
      .patch(`/admin/api/content/faq/${created.id}`)
      .set("Authorization", `Bearer ${superadminToken}`)
      .send({ question: "New" });
    expect(res.status).toBe(200);
    expect(res.body.question).toBe("New");
    expect(res.body.answer).toBe("A");
  });

  it("returns 409 when updating a soft-deleted record", async () => {
    const created = await prisma.faq.create({ data: { question: "Q", answer: "A", deletedAt: new Date() } });
    const res = await request(app)
      .patch(`/admin/api/content/faq/${created.id}`)
      .set("Authorization", `Bearer ${superadminToken}`)
      .send({ question: "New" });
    expect(res.status).toBe(409);
  });
});

describe("DELETE /admin/api/content/:type/:id", () => {
  it("returns 403 for an editor", async () => {
    const created = await prisma.faq.create({ data: { question: "Q", answer: "A" } });
    const res = await request(app)
      .delete(`/admin/api/content/faq/${created.id}`)
      .set("Authorization", `Bearer ${editorToken}`);
    expect(res.status).toBe(403);
  });

  it("soft-deletes for a superadmin", async () => {
    const created = await prisma.faq.create({ data: { question: "Q", answer: "A" } });
    const res = await request(app)
      .delete(`/admin/api/content/faq/${created.id}`)
      .set("Authorization", `Bearer ${superadminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.deletedAt).not.toBeNull();
  });

  it("returns 409 deleting an already-deleted record", async () => {
    const created = await prisma.faq.create({ data: { question: "Q", answer: "A", deletedAt: new Date() } });
    const res = await request(app)
      .delete(`/admin/api/content/faq/${created.id}`)
      .set("Authorization", `Bearer ${superadminToken}`);
    expect(res.status).toBe(409);
  });
});

describe("POST /admin/api/content/:type/:id/restore", () => {
  it("restores a soft-deleted record for a superadmin", async () => {
    const created = await prisma.faq.create({ data: { question: "Q", answer: "A", deletedAt: new Date() } });
    const res = await request(app)
      .post(`/admin/api/content/faq/${created.id}/restore`)
      .set("Authorization", `Bearer ${superadminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.deletedAt).toBeNull();
  });
});

describe("POST /admin/api/content/:type/:id/approve", () => {
  it("publishes a pending record for a superadmin", async () => {
    const created = await request(app)
      .post("/admin/api/content/faq")
      .set("Authorization", `Bearer ${editorToken}`)
      .send({ question: "Q?", answer: "A." });

    const res = await request(app)
      .post(`/admin/api/content/faq/${created.body.id}/approve`)
      .set("Authorization", `Bearer ${superadminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.approvalStatus).toBe("published");
  });

  it("returns 409 approving an already-published record", async () => {
    const created = await prisma.faq.create({ data: { question: "Q", answer: "A", approvalStatus: "published" } });
    const res = await request(app)
      .post(`/admin/api/content/faq/${created.id}/approve`)
      .set("Authorization", `Bearer ${superadminToken}`);
    expect(res.status).toBe(409);
  });
});

describe("PATCH /admin/api/content/:type/reorder", () => {
  it("reorders records and is not shadowed by the /:id update route", async () => {
    const a = await prisma.faq.create({ data: { question: "A", answer: "A", order: 0 } });
    const b = await prisma.faq.create({ data: { question: "B", answer: "B", order: 1 } });

    const res = await request(app)
      .patch("/admin/api/content/faq/reorder")
      .set("Authorization", `Bearer ${superadminToken}`)
      .send({ items: [{ id: a.id, order: 2 }, { id: b.id, order: 1 }] });

    expect(res.status).toBe(200);
    const refreshedA = await prisma.faq.findUniqueOrThrow({ where: { id: a.id } });
    expect(refreshedA.order).toBe(2);
  });

  it("returns 400 for a malformed body", async () => {
    const res = await request(app)
      .patch("/admin/api/content/faq/reorder")
      .set("Authorization", `Bearer ${superadminToken}`)
      .send({ items: "not-an-array" });
    expect(res.status).toBe(400);
  });

  it("returns 403 for an editor, and does not change any order", async () => {
    // Reorder writes straight to the live, publicly-visible display order with
    // no approval step, unlike every other editor mutation -- superadmin only.
    const a = await prisma.faq.create({ data: { question: "A", answer: "A", order: 0 } });

    const res = await request(app)
      .patch("/admin/api/content/faq/reorder")
      .set("Authorization", `Bearer ${editorToken}`)
      .send({ items: [{ id: a.id, order: 9 }] });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe("forbidden");

    const unchanged = await prisma.faq.findUniqueOrThrow({ where: { id: a.id } });
    expect(unchanged.order).toBe(0);
  });

  it("returns 409 when the batch includes a soft-deleted record", async () => {
    const live = await prisma.faq.create({ data: { question: "A", answer: "A", order: 0 } });
    const trashed = await prisma.faq.create({
      data: { question: "B", answer: "B", order: 1, deletedAt: new Date() },
    });

    const res = await request(app)
      .patch("/admin/api/content/faq/reorder")
      .set("Authorization", `Bearer ${superadminToken}`)
      .send({ items: [{ id: live.id, order: 5 }, { id: trashed.id, order: 6 }] });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe("invalid_state");

    // Atomic: the live record in the same batch must be untouched.
    const unchanged = await prisma.faq.findUniqueOrThrow({ where: { id: live.id } });
    expect(unchanged.order).toBe(0);
  });
});

describe("POST /admin/api/content/:type/:id/reject", () => {
  it("returns 400 with no reason", async () => {
    const created = await prisma.faq.create({ data: { question: "Q", answer: "A", approvalStatus: "pending_approval" } });
    const res = await request(app)
      .post(`/admin/api/content/faq/${created.id}/reject`)
      .set("Authorization", `Bearer ${superadminToken}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it("rejects a pending record with a reason", async () => {
    const created = await prisma.faq.create({ data: { question: "Q", answer: "A", approvalStatus: "pending_approval" } });
    const res = await request(app)
      .post(`/admin/api/content/faq/${created.id}/reject`)
      .set("Authorization", `Bearer ${superadminToken}`)
      .send({ reason: "Needs more detail" });
    expect(res.status).toBe(200);
    expect(res.body.approvalStatus).toBe("rejected");
    expect(res.body.rejectionReason).toBe("Needs more detail");
  });
});
