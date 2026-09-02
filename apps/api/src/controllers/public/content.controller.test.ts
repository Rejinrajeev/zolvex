import { describe, it, expect, afterEach, afterAll } from "vitest";
import request from "supertest";
import { PrismaClient } from "@prisma/client";
import { createApp } from "../../app.js";

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL_TEST } },
});
const app = createApp();

afterEach(async () => {
  await prisma.faq.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("GET /api/content/:type", () => {
  it("returns 400 for an unknown content type", async () => {
    const res = await request(app).get("/api/content/not-a-real-type");
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "invalid_type" });
  });

  it("requires no authentication", async () => {
    const res = await request(app).get("/api/content/faq");
    expect(res.status).toBe(200);
  });

  it("returns only published, active, non-deleted records", async () => {
    await prisma.faq.create({ data: { question: "Published", answer: "A", approvalStatus: "published", isActive: true } });
    await prisma.faq.create({ data: { question: "Pending", answer: "A", approvalStatus: "pending_approval", isActive: true } });
    await prisma.faq.create({ data: { question: "Rejected", answer: "A", approvalStatus: "rejected", isActive: true } });
    await prisma.faq.create({ data: { question: "Draft", answer: "A", approvalStatus: "draft", isActive: true } });
    await prisma.faq.create({ data: { question: "Inactive", answer: "A", approvalStatus: "published", isActive: false } });
    await prisma.faq.create({
      data: { question: "Deleted", answer: "A", approvalStatus: "published", isActive: true, deletedAt: new Date() },
    });

    const res = await request(app).get("/api/content/faq");
    expect(res.status).toBe(200);
    expect(res.body.map((r: { question: string }) => r.question)).toEqual(["Published"]);
  });

  it("ignores a client-supplied status query param entirely -- status is always published", async () => {
    await prisma.faq.create({ data: { question: "Pending", answer: "A", approvalStatus: "pending_approval", isActive: true } });

    const res = await request(app).get("/api/content/faq?status=pending_approval");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("strips workflow-internal fields from the response", async () => {
    await prisma.faq.create({
      data: {
        question: "Q",
        answer: "A",
        approvalStatus: "published",
        isActive: true,
        submittedBy: "some-admin-id",
      },
    });

    const res = await request(app).get("/api/content/faq");
    expect(res.status).toBe(200);
    expect(res.body[0]).not.toHaveProperty("submittedBy");
    expect(res.body[0]).not.toHaveProperty("approvedBy");
    expect(res.body[0]).not.toHaveProperty("approvedAt");
    expect(res.body[0]).not.toHaveProperty("rejectionReason");
    expect(res.body[0]).not.toHaveProperty("deletedAt");
    expect(res.body[0]).toHaveProperty("question", "Q");
  });
});
