import { describe, it, expect, beforeEach, afterEach, afterAll } from "vitest";
import request from "supertest";
import { PrismaClient } from "@prisma/client";
import { createApp } from "../../app.js";

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL_TEST } },
});
const app = createApp();

beforeEach(async () => {
  await prisma.place.create({ data: { name: "Downtown", order: 1, isActive: true } });
});

afterEach(async () => {
  await prisma.enquiry.deleteMany();
  await prisma.place.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

const valid = {
  name: "Jane Buyer",
  phone: "+1 555 234 5678",
  place: "Downtown",
};

describe("POST /api/enquiries", () => {
  it("creates an enquiry with no auth and returns 201 with the new id", async () => {
    const res = await request(app).post("/api/enquiries").send(valid);
    expect(res.status).toBe(201);
    expect(res.body.id).toBeTruthy();
    expect(res.body.status).toBe("new");

    const row = await prisma.enquiry.findUnique({ where: { id: res.body.id } });
    expect(row?.name).toBe("Jane Buyer");
    expect(row?.place).toBe("Downtown");
    expect(row?.serviceName).toBe("Website enquiry");
  });

  it("stores an optional preferred date", async () => {
    const res = await request(app)
      .post("/api/enquiries")
      .send({ ...valid, preferredDate: "2026-10-01" });
    expect(res.status).toBe(201);
    const row = await prisma.enquiry.findUnique({ where: { id: res.body.id } });
    expect(row?.preferredDate?.toISOString().slice(0, 10)).toBe("2026-10-01");
  });

  it("rejects a missing name with 400", async () => {
    const res = await request(app).post("/api/enquiries").send({ phone: "+15552345678", place: "Downtown" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("invalid_request");
  });

  it("rejects a phone number that is too short with 400", async () => {
    const res = await request(app).post("/api/enquiries").send({ ...valid, phone: "12345" });
    expect(res.status).toBe(400);
  });

  it("rejects a place that is not an active service area with 400", async () => {
    const res = await request(app).post("/api/enquiries").send({ ...valid, place: "Nowhere" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("invalid_place");
  });

  it("rejects an inactive place with 400", async () => {
    await prisma.place.create({ data: { name: "Closed Area", order: 2, isActive: false } });
    const res = await request(app).post("/api/enquiries").send({ ...valid, place: "Closed Area" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("invalid_place");
  });
});
