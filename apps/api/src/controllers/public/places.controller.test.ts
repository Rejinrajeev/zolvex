import { describe, it, expect, afterEach, afterAll } from "vitest";
import request from "supertest";
import { PrismaClient } from "@prisma/client";
import { createApp } from "../../app.js";

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL_TEST } },
});
const app = createApp();

afterEach(async () => {
  await prisma.place.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("GET /api/places", () => {
  it("requires no authentication and returns 200", async () => {
    const res = await request(app).get("/api/places");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("returns only active, non-deleted places (id + name), ordered", async () => {
    await prisma.place.create({ data: { name: "Second", order: 2, isActive: true } });
    await prisma.place.create({ data: { name: "First", order: 1, isActive: true } });
    await prisma.place.create({ data: { name: "Hidden", order: 3, isActive: false } });
    await prisma.place.create({
      data: { name: "Gone", order: 4, isActive: true, deletedAt: new Date() },
    });

    const res = await request(app).get("/api/places");
    expect(res.status).toBe(200);
    expect(res.body.map((p: { name: string }) => p.name)).toEqual(["First", "Second"]);
    expect(Object.keys(res.body[0]).sort()).toEqual(["id", "name"]);
  });
});
