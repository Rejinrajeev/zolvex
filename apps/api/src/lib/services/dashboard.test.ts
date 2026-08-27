import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { listPendingApprovals } from "./dashboard.js";

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL_TEST } },
});

beforeAll(async () => {
  await prisma.$connect();
});

afterEach(async () => {
  await prisma.faq.deleteMany();
  await prisma.service.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("listPendingApprovals", () => {
  it("returns pending records from multiple types, sorted newest-first, excluding published/rejected/deleted", async () => {
    await prisma.faq.create({ data: { question: "Pending FAQ", answer: "A", approvalStatus: "pending_approval" } });
    await prisma.faq.create({ data: { question: "Published FAQ", answer: "A", approvalStatus: "published" } });
    await prisma.service.create({
      data: {
        name: "Pending Service",
        slug: "pending-service",
        shortDescription: "s",
        fullDescription: "f",
        approvalStatus: "pending_approval",
      },
    });
    await prisma.faq.create({
      data: { question: "Deleted pending FAQ", answer: "A", approvalStatus: "pending_approval", deletedAt: new Date() },
    });

    const results = await listPendingApprovals(prisma);
    expect(results).toHaveLength(2);
    expect(results.map((r) => r.entity).sort()).toEqual(["Faq", "Service"]);
    expect(results.every((r) => r.approvalStatus === "pending_approval")).toBe(true);
  });
});
