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
