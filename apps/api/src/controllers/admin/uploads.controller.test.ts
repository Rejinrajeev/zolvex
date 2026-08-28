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
    data: { name: "Editor", email: "uploads-editor@zolvex.test", passwordHash: await hashPassword("x"), role: "editor" },
  });
  editorToken = signAccessToken(editor.id, "editor");
});

afterEach(async () => {
  await prisma.admin.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("POST /admin/api/uploads", () => {
  it("returns 401 with no token", async () => {
    const res = await request(app).post("/admin/api/uploads");
    expect(res.status).toBe(401);
  });

  it("returns 400 with no file attached", async () => {
    const res = await request(app).post("/admin/api/uploads").set("Authorization", `Bearer ${editorToken}`);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("no_file");
  });

  it("returns 400 for a disallowed file type", async () => {
    const res = await request(app)
      .post("/admin/api/uploads")
      .set("Authorization", `Bearer ${editorToken}`)
      .attach("file", Buffer.from("not an image"), { filename: "a.txt", contentType: "text/plain" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("invalid_file_type");
  });

  it("returns 400 for a file over the 5MB limit, without ever calling Cloudinary", async () => {
    const bigBuffer = Buffer.alloc(6 * 1024 * 1024, 1);
    const res = await request(app)
      .post("/admin/api/uploads")
      .set("Authorization", `Bearer ${editorToken}`)
      .attach("file", bigBuffer, { filename: "big.png", contentType: "image/png" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("file_too_large");
  });

  it("returns 400, not 500, when the file arrives under the wrong form-field name", async () => {
    // multer rejects this with MulterError code LIMIT_UNEXPECTED_FILE. Only
    // LIMIT_FILE_SIZE used to be mapped, so every other multer code fell
    // through to app.ts's catch-all as an opaque 500 for what is really a
    // malformed client request.
    const onePixelPng = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
      "base64"
    );
    const res = await request(app)
      .post("/admin/api/uploads")
      .set("Authorization", `Bearer ${editorToken}`)
      .attach("wrongfield", onePixelPng, { filename: "pixel.png", contentType: "image/png" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("invalid_upload");
  });

  it("uploads a real 1x1 PNG to Cloudinary and returns its URL", async () => {
    // A minimal valid 1x1 transparent PNG, base64-decoded.
    const onePixelPng = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
      "base64"
    );
    const res = await request(app)
      .post("/admin/api/uploads")
      .set("Authorization", `Bearer ${editorToken}`)
      .attach("file", onePixelPng, { filename: "pixel.png", contentType: "image/png" });
    expect(res.status).toBe(200);
    expect(res.body.url).toMatch(/^https:\/\/res\.cloudinary\.com\//);
  }, 15000);
});
