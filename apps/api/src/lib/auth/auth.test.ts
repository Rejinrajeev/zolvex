import { describe, it, expect, beforeEach, afterEach, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { generate } from "otplib";
import { hashPassword } from "./crypto.js";
import { verifyPendingTwoFAToken } from "./jwt.js";
import * as authService from "./auth.js";

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL_TEST } },
});

let adminId: string;

beforeEach(async () => {
  const admin = await prisma.admin.create({
    data: {
      name: "Login Test",
      email: "login-test@zolvex.test",
      passwordHash: await hashPassword("correct-password"),
      role: "editor",
    },
  });
  adminId = admin.id;
});

afterEach(async () => {
  await prisma.admin.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("login", () => {
  it("issues a pending-2FA token on correct credentials", async () => {
    const result = await authService.login("login-test@zolvex.test", "correct-password");
    expect(result.twoFAEnabled).toBe(false);
    expect(verifyPendingTwoFAToken(result.pendingToken).sub).toBe(adminId);
  });

  it("throws InvalidCredentialsError on a wrong password", async () => {
    await expect(authService.login("login-test@zolvex.test", "wrong-password")).rejects.toBeInstanceOf(
      authService.InvalidCredentialsError
    );
  });

  it("throws InvalidCredentialsError for a nonexistent email", async () => {
    await expect(authService.login("nobody@zolvex.test", "anything")).rejects.toBeInstanceOf(
      authService.InvalidCredentialsError
    );
  });

  it("locks the account after 5 failed attempts", async () => {
    for (let i = 0; i < 4; i++) {
      await expect(
        authService.login("login-test@zolvex.test", "wrong-password")
      ).rejects.toBeInstanceOf(authService.InvalidCredentialsError);
    }
    // 5th failure locks
    await expect(
      authService.login("login-test@zolvex.test", "wrong-password")
    ).rejects.toBeInstanceOf(authService.AccountLockedError);

    // even the correct password is rejected while locked
    await expect(
      authService.login("login-test@zolvex.test", "correct-password")
    ).rejects.toBeInstanceOf(authService.AccountLockedError);
  });

  it("resets failedLoginAttempts on a successful login", async () => {
    await expect(
      authService.login("login-test@zolvex.test", "wrong-password")
    ).rejects.toBeInstanceOf(authService.InvalidCredentialsError);

    await authService.login("login-test@zolvex.test", "correct-password");

    const admin = await prisma.admin.findUniqueOrThrow({ where: { id: adminId } });
    expect(admin.failedLoginAttempts).toBe(0);
  });

  it("throws InvalidCredentialsError for a deactivated account", async () => {
    await prisma.admin.update({ where: { id: adminId }, data: { isActive: false } });
    await expect(
      authService.login("login-test@zolvex.test", "correct-password")
    ).rejects.toBeInstanceOf(authService.InvalidCredentialsError);
  });
});

describe("2FA setup", () => {
  it("generates a secret, an otpauth URL, and 8 recovery codes", async () => {
    const result = await authService.setupTwoFA(adminId);
    expect(result.otpauthUrl).toContain("otpauth://totp/");
    expect(result.recoveryCodes).toHaveLength(8);

    const admin = await prisma.admin.findUniqueOrThrow({ where: { id: adminId } });
    expect(admin.twoFASecret).not.toBeNull();
    expect(admin.twoFAEnabled).toBe(false); // not enabled until verified
    expect(admin.twoFARecoveryCodes).toHaveLength(8);
    expect(admin.twoFARecoveryCodes[0]).not.toBe(result.recoveryCodes[0]); // stored hashed
  });

  it("throws if 2FA is already enabled", async () => {
    await prisma.admin.update({ where: { id: adminId }, data: { twoFAEnabled: true } });
    await expect(authService.setupTwoFA(adminId)).rejects.toThrow();
  });
});

describe("2FA setup verification", () => {
  it("enables 2FA when the submitted code matches the generated secret", async () => {
    const { otpauthUrl } = await authService.setupTwoFA(adminId);
    const secretMatch = /secret=([A-Z0-9]+)/.exec(otpauthUrl);
    const secret = secretMatch![1];
    const code = await generate({ secret });

    await authService.verifyTwoFASetup(adminId, code);

    const admin = await prisma.admin.findUniqueOrThrow({ where: { id: adminId } });
    expect(admin.twoFAEnabled).toBe(true);
  });

  it("throws InvalidCredentialsError on a wrong code", async () => {
    await authService.setupTwoFA(adminId);
    await expect(authService.verifyTwoFASetup(adminId, "000000")).rejects.toBeInstanceOf(
      authService.InvalidCredentialsError
    );
  });
});
