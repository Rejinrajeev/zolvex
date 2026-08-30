import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { listTrash } from "./trash.js";

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL_TEST } },
});

beforeAll(async () => {
  await prisma.$connect();
});

afterEach(async () => {
  await prisma.faq.deleteMany();
  await prisma.place.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("listTrash", () => {
  it("lists soft-deleted rows across the five approvable types and Place, excluding live rows", async () => {
    await prisma.faq.create({ data: { question: "Deleted", answer: "A", deletedAt: new Date() } });
    await prisma.faq.create({ data: { question: "Live", answer: "A" } });
    await prisma.place.create({ data: { name: "Deleted Place", deletedAt: new Date() } });

    const results = await listTrash(prisma);
    expect(results).toHaveLength(2);
    expect(results.map((r) => r.entity).sort()).toEqual(["Faq", "Place"]);
  });
});
