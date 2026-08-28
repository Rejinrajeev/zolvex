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
    data: { name: "Editor", email: "enquiries-editor@zolvex.test", passwordHash: await hashPassword("x"), role: "editor" },
  });
  editorToken = signAccessToken(editor.id, "editor");
});

afterEach(async () => {
  await prisma.enquiry.deleteMany();
  await prisma.admin.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("Enquiries HTTP routes", () => {
  it("returns 401 with no token", async () => {
    const res = await request(app).get("/admin/api/enquiries");
    expect(res.status).toBe(401);
  });

  it("lists enquiries for an authenticated editor", async () => {
    await prisma.enquiry.create({
      data: { serviceName: "Office Cleaning", name: "Jane", phone: "+1000", place: "Downtown" },
    });
    const res = await request(app).get("/admin/api/enquiries").set("Authorization", `Bearer ${editorToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  it("filters by status", async () => {
    await prisma.enquiry.create({
      data: { serviceName: "A", name: "Jane", phone: "+1000", place: "Downtown", status: "new" },
    });
    await prisma.enquiry.create({
      data: { serviceName: "B", name: "Jane", phone: "+1000", place: "Downtown", status: "pushed_to_crm" },
    });
    const res = await request(app)
      .get("/admin/api/enquiries?status=pushed_to_crm")
      .set("Authorization", `Bearer ${editorToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].status).toBe("pushed_to_crm");
  });

  it("returns 400 for a status outside the EnquiryStatus enum, not a 500 or a dead process", async () => {
    // `?status=` used to be cast `as any` straight into the Prisma filter, so
    // this threw PrismaClientValidationError inside an async handler -- a
    // rejection bare Express 4 never catches.
    const res = await request(app)
      .get("/admin/api/enquiries?status=bogus")
      .set("Authorization", `Bearer ${editorToken}`);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("invalid_request");
  });

  it("returns 404 for an unknown id", async () => {
    const res = await request(app)
      .get("/admin/api/enquiries/does-not-exist")
      .set("Authorization", `Bearer ${editorToken}`);
    expect(res.status).toBe(404);
  });

  it("returns a single enquiry by id", async () => {
    const created = await prisma.enquiry.create({
      data: { serviceName: "Office Cleaning", name: "Jane", phone: "+1000", place: "Downtown" },
    });
    const res = await request(app)
      .get(`/admin/api/enquiries/${created.id}`)
      .set("Authorization", `Bearer ${editorToken}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(created.id);
  });
});
