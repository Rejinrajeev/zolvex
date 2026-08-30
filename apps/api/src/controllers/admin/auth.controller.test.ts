import { describe, it, expect, beforeEach, afterEach, afterAll } from "vitest";
import request from "supertest";
import { generate } from "otplib";
import { PrismaClient } from "@prisma/client";
import { createApp } from "../../app.js";
import { hashPassword } from "../../lib/auth/crypto.js";

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL_TEST } },
});
const app = createApp();

beforeEach(async () => {
  await prisma.admin.create({
    data: {
      name: "Controller Test",
      email: "controller-test@zolvex.test",
      passwordHash: await hashPassword("correct-password"),
      role: "editor",
    },
  });
});

afterEach(async () => {
  await prisma.adminSession.deleteMany();
  await prisma.admin.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("POST /admin/api/auth/login", () => {
  it("returns 200 with a pendingToken on correct credentials", async () => {
    const res = await request(app)
      .post("/admin/api/auth/login")
      .send({ email: "controller-test@zolvex.test", password: "correct-password" });
    expect(res.status).toBe(200);
    expect(res.body.pendingToken).toBeTruthy();
    expect(res.body.twoFAEnabled).toBe(false);
  });

  it("returns 401 on a wrong password", async () => {
    const res = await request(app)
      .post("/admin/api/auth/login")
      .send({ email: "controller-test@zolvex.test", password: "wrong" });
    expect(res.status).toBe(401);
  });

  it("returns 400 on a malformed request body", async () => {
    const res = await request(app).post("/admin/api/auth/login").send({ email: "not-an-email" });
    expect(res.status).toBe(400);
  });

  it("returns 400 when email exceeds the max length", async () => {
    const oversizedEmail = `${"a".repeat(250)}@zolvex.test`; // > 255 chars, still a syntactically valid email
    const res = await request(app)
      .post("/admin/api/auth/login")
      .send({ email: oversizedEmail, password: "correct-password" });
    expect(res.status).toBe(400);
  });

  it("returns 400 when password exceeds the max length", async () => {
    const res = await request(app)
      .post("/admin/api/auth/login")
      .send({ email: "controller-test@zolvex.test", password: "a".repeat(201) });
    expect(res.status).toBe(400);
  });
});

describe("POST /admin/api/auth/2fa/recovery validation", () => {
  it("returns 400 when the recovery code exceeds the max length", async () => {
    const res = await request(app)
      .post("/admin/api/auth/2fa/recovery")
      .send({ code: "a".repeat(101) });
    expect(res.status).toBe(400);
  });
});


describe("full login -> 2FA setup -> 2FA verify -> refresh -> logout flow", () => {
  it("works end to end", async () => {
    const loginRes = await request(app)
      .post("/admin/api/auth/login")
      .send({ email: "controller-test@zolvex.test", password: "correct-password" });
    const pendingToken = loginRes.body.pendingToken;

    const setupRes = await request(app)
      .post("/admin/api/auth/2fa/setup")
      .set("Authorization", `Bearer ${pendingToken}`);
    expect(setupRes.status).toBe(200);
    const secret = /secret=([A-Z0-9]+)/.exec(setupRes.body.otpauthUrl)![1];

    const setupVerifyRes = await request(app)
      .post("/admin/api/auth/2fa/setup/verify")
      .set("Authorization", `Bearer ${pendingToken}`)
      .send({ code: await generate({ secret }) });
    expect(setupVerifyRes.status).toBe(200);

    const loginVerifyRes = await request(app)
      .post("/admin/api/auth/2fa/login/verify")
      .set("Authorization", `Bearer ${pendingToken}`)
      .send({ code: await generate({ secret }) });
    expect(loginVerifyRes.status).toBe(200);
    expect(loginVerifyRes.body.accessToken).toBeTruthy();
    const cookies = loginVerifyRes.headers["set-cookie"];
    expect(cookies).toBeDefined();

    const refreshRes = await request(app).post("/admin/api/auth/refresh").set("Cookie", cookies);
    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.accessToken).toBeTruthy();

    const logoutRes = await request(app).post("/admin/api/auth/logout").set("Cookie", cookies);
    expect(logoutRes.status).toBe(204);

    const refreshAfterLogoutRes = await request(app).post("/admin/api/auth/refresh").set("Cookie", cookies);
    expect(refreshAfterLogoutRes.status).toBe(401);
  });
});

describe("POST /admin/api/auth/2fa/login/verify - account lockout on 5 failed 2FA codes", () => {
  it("returns 423 with lockedUntil after 5 wrong 2FA codes", async () => {
    const loginRes = await request(app)
      .post("/admin/api/auth/login")
      .send({ email: "controller-test@zolvex.test", password: "correct-password" });
    const pendingToken = loginRes.body.pendingToken;

    const setupRes = await request(app)
      .post("/admin/api/auth/2fa/setup")
      .set("Authorization", `Bearer ${pendingToken}`);
    const secret = /secret=([A-Z0-9]+)/.exec(setupRes.body.otpauthUrl)![1];

    const setupVerifyRes = await request(app)
      .post("/admin/api/auth/2fa/setup/verify")
      .set("Authorization", `Bearer ${pendingToken}`)
      .send({ code: await generate({ secret }) });
    expect(setupVerifyRes.status).toBe(200);

    // Make 5 failed attempts with wrong code
    for (let i = 0; i < 4; i++) {
      const res = await request(app)
        .post("/admin/api/auth/2fa/login/verify")
        .set("Authorization", `Bearer ${pendingToken}`)
        .send({ code: "000000" });
      expect(res.status).toBe(401);
      expect(res.body.error).toBe("invalid_credentials");
    }

    // 5th attempt should return 423 with lockedUntil
    const lockedRes = await request(app)
      .post("/admin/api/auth/2fa/login/verify")
      .set("Authorization", `Bearer ${pendingToken}`)
      .send({ code: "000000" });
    expect(lockedRes.status).toBe(423);
    expect(lockedRes.body.error).toBe("account_locked");
    expect(lockedRes.body.lockedUntil).toBeTruthy();
    expect(new Date(lockedRes.body.lockedUntil)).toBeInstanceOf(Date);
  });
});

describe("POST /admin/api/auth/2fa/recovery - account lockout on 5 failed recovery codes", () => {
  it(
    "returns 423 with lockedUntil after 5 wrong recovery codes",
    async () => {
    const loginRes = await request(app)
      .post("/admin/api/auth/login")
      .send({ email: "controller-test@zolvex.test", password: "correct-password" });
    const pendingToken = loginRes.body.pendingToken;

    const setupRes = await request(app)
      .post("/admin/api/auth/2fa/setup")
      .set("Authorization", `Bearer ${pendingToken}`);
    const secret = /secret=([A-Z0-9]+)/.exec(setupRes.body.otpauthUrl)![1];

    const setupVerifyRes = await request(app)
      .post("/admin/api/auth/2fa/setup/verify")
      .set("Authorization", `Bearer ${pendingToken}`)
      .send({ code: await generate({ secret }) });
    expect(setupVerifyRes.status).toBe(200);

    // Make 5 failed attempts with wrong recovery code
    for (let i = 0; i < 4; i++) {
      const res = await request(app)
        .post("/admin/api/auth/2fa/recovery")
        .set("Authorization", `Bearer ${pendingToken}`)
        .send({ code: "wrong-recovery-code" });
      expect(res.status).toBe(401);
      expect(res.body.error).toBe("invalid_credentials");
    }

    // 5th attempt should return 423 with lockedUntil
    const lockedRes = await request(app)
      .post("/admin/api/auth/2fa/recovery")
      .set("Authorization", `Bearer ${pendingToken}`)
      .send({ code: "wrong-recovery-code" });
    expect(lockedRes.status).toBe(423);
    expect(lockedRes.body.error).toBe("account_locked");
    expect(lockedRes.body.lockedUntil).toBeTruthy();
    expect(new Date(lockedRes.body.lockedUntil)).toBeInstanceOf(Date);
    },
    // 5 recovery-code guesses each requiring a full bcrypt-compare round
    // (parallelized in loginWithRecoveryCode, but still bounded by libuv's
    // threadpool size), through the full HTTP + login + 2FA-setup flow first
    // -- 15s already came within ~500ms of the limit on a real CI runner.
    30000
  );
});
