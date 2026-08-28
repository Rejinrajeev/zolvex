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
    data: { name: "Editor", email: "dashboard-editor@zolvex.test", passwordHash: await hashPassword("x"), role: "editor" },
  });
  editorToken = signAccessToken(editor.id, "editor");
});

afterEach(async () => {
  await prisma.faq.deleteMany();
  await prisma.admin.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("GET /admin/api/dashboard/approvals", () => {
  it("returns 401 with no token", async () => {
    const res = await request(app).get("/admin/api/dashboard/approvals");
    expect(res.status).toBe(401);
  });

  it("returns 200 with pending records for an authenticated admin", async () => {
    await prisma.faq.create({ data: { question: "Q", answer: "A", approvalStatus: "pending_approval" } });
    const res = await request(app)
      .get("/admin/api/dashboard/approvals")
      .set("Authorization", `Bearer ${editorToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].entity).toBe("Faq");
  });
});
