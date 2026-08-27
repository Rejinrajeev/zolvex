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
  await prisma.adminSession.deleteMany();
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

  it("correctly accounts for all attempts under concurrent wrong-password requests (no lost updates)", async () => {
    const N = 10;
    const results = await Promise.allSettled(
      Array.from({ length: N }, () => authService.login("login-test@zolvex.test", "wrong-password"))
    );

    // every attempt must be rejected, either as a plain wrong-password or (once the
    // threshold is crossed mid-batch) as an account-locked error -- both count as
    // a real failed attempt.
    for (const r of results) {
      expect(r.status).toBe("rejected");
      if (r.status === "rejected") {
        expect(
          r.reason instanceof authService.InvalidCredentialsError ||
            r.reason instanceof authService.AccountLockedError
        ).toBe(true);
      }
    }

    const admin = await prisma.admin.findUniqueOrThrow({ where: { id: adminId } });
    // if the atomic increment ever lost an update under concurrency, this would be < N
    expect(admin.failedLoginAttempts).toBe(N);
    expect(admin.lockedUntil).not.toBeNull();
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

  it("throws InvalidCredentialsError for a deactivated admin", async () => {
    await prisma.admin.update({ where: { id: adminId }, data: { isActive: false } });
    await expect(authService.setupTwoFA(adminId)).rejects.toBeInstanceOf(
      authService.InvalidCredentialsError
    );
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

  it("throws InvalidCredentialsError for a deactivated admin, even with a correct code", async () => {
    const { otpauthUrl } = await authService.setupTwoFA(adminId);
    const secretMatch = /secret=([A-Z0-9]+)/.exec(otpauthUrl);
    const secret = secretMatch![1];
    const code = await generate({ secret });

    await prisma.admin.update({ where: { id: adminId }, data: { isActive: false } });

    await expect(authService.verifyTwoFASetup(adminId, code)).rejects.toBeInstanceOf(
      authService.InvalidCredentialsError
    );
  });
});

describe("2FA login verification", () => {
  async function enableTwoFA() {
    const { otpauthUrl } = await authService.setupTwoFA(adminId);
    const secret = /secret=([A-Z0-9]+)/.exec(otpauthUrl)![1];
    const code = await generate({ secret });
    await authService.verifyTwoFASetup(adminId, code);
    return secret;
  }

  it("issues a real session on a correct code", async () => {
    const secret = await enableTwoFA();
    const code = await generate({ secret });
    const result = await authService.verifyTwoFALogin(adminId, code);

    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).toBeTruthy();
    expect(result.sessionId).toBeTruthy();

    const session = await prisma.adminSession.findUniqueOrThrow({ where: { id: result.sessionId } });
    expect(session.adminId).toBe(adminId);
    expect(session.revokedAt).toBeNull();
  });

  it("rejects a wrong code", async () => {
    await enableTwoFA();
    await expect(authService.verifyTwoFALogin(adminId, "000000")).rejects.toBeInstanceOf(
      authService.InvalidCredentialsError
    );
  });

  it("throws InvalidCredentialsError for a deactivated admin, even with a correct code", async () => {
    const secret = await enableTwoFA();
    const code = await generate({ secret });

    await prisma.admin.update({ where: { id: adminId }, data: { isActive: false } });

    await expect(authService.verifyTwoFALogin(adminId, code)).rejects.toBeInstanceOf(
      authService.InvalidCredentialsError
    );
  });

  it("rejects login-verification when 2FA was never enabled", async () => {
    await expect(authService.verifyTwoFALogin(adminId, "000000")).rejects.toBeInstanceOf(
      authService.InvalidCredentialsError
    );
  });

  it("locks the account after 5 wrong codes, rejecting even the correct code on the 6th attempt", async () => {
    const secret = await enableTwoFA();

    for (let i = 0; i < 4; i++) {
      await expect(authService.verifyTwoFALogin(adminId, "000000")).rejects.toBeInstanceOf(
        authService.InvalidCredentialsError
      );
    }
    // 5th wrong code locks
    await expect(authService.verifyTwoFALogin(adminId, "000000")).rejects.toBeInstanceOf(
      authService.AccountLockedError
    );

    // even the correct code is rejected while locked
    const code = await generate({ secret });
    await expect(authService.verifyTwoFALogin(adminId, code)).rejects.toBeInstanceOf(
      authService.AccountLockedError
    );
  });
});

describe("recovery-code login", () => {
  it(
    "issues a session and consumes exactly the used code",
    async () => {
      const { recoveryCodes } = await authService.setupTwoFA(adminId);
      const usedCode = recoveryCodes[0];

      const result = await authService.loginWithRecoveryCode(adminId, usedCode);
      expect(result.accessToken).toBeTruthy();
      expect(result.refreshToken).toBeTruthy();
      expect(result.sessionId).toBeTruthy();

      const admin = await prisma.admin.findUniqueOrThrow({ where: { id: adminId } });
      expect(admin.twoFARecoveryCodes).toHaveLength(7);

      // the same code cannot be used twice
      await expect(authService.loginWithRecoveryCode(adminId, usedCode)).rejects.toBeInstanceOf(
        authService.InvalidCredentialsError
      );
    },
    // Two full recovery-code verification rounds, each bcrypt-comparing
    // against up to 8 stored hashes (parallelized, but still bounded by
    // libuv's threadpool size) -- comfortably fast on a dev machine but slow
    // enough on a constrained CI runner to need headroom past vitest's 5s default.
    15000
  );

  it(
    "rejects an unknown code",
    async () => {
      await authService.setupTwoFA(adminId);
      await expect(authService.loginWithRecoveryCode(adminId, "not-a-real-code")).rejects.toBeInstanceOf(
        authService.InvalidCredentialsError
      );
    },
    10000
  );

  it("throws InvalidCredentialsError for a deactivated admin, even with a valid unused code", async () => {
    const { recoveryCodes } = await authService.setupTwoFA(adminId);
    const validUnusedCode = recoveryCodes[0];

    await prisma.admin.update({ where: { id: adminId }, data: { isActive: false } });

    await expect(authService.loginWithRecoveryCode(adminId, validUnusedCode)).rejects.toBeInstanceOf(
      authService.InvalidCredentialsError
    );
  });

  it(
    "locks the account after 5 wrong recovery codes, rejecting even a valid unused code on the 6th attempt",
    async () => {
      const { recoveryCodes } = await authService.setupTwoFA(adminId);
      const validUnusedCode = recoveryCodes[0];

      for (let i = 0; i < 4; i++) {
        await expect(authService.loginWithRecoveryCode(adminId, "not-a-real-code")).rejects.toBeInstanceOf(
          authService.InvalidCredentialsError
        );
      }
      // 5th wrong code locks
      await expect(authService.loginWithRecoveryCode(adminId, "not-a-real-code")).rejects.toBeInstanceOf(
        authService.AccountLockedError
      );

      const admin = await prisma.admin.findUniqueOrThrow({ where: { id: adminId } });
      expect(admin.lockedUntil).not.toBeNull();

      // even a real, unused recovery code is rejected while locked
      await expect(authService.loginWithRecoveryCode(adminId, validUnusedCode)).rejects.toBeInstanceOf(
        authService.AccountLockedError
      );
    },
    30000
  );
});

describe("refreshSession", () => {
  async function loggedInSession() {
    const secret = await (async () => {
      const { otpauthUrl } = await authService.setupTwoFA(adminId);
      const s = /secret=([A-Z0-9]+)/.exec(otpauthUrl)![1];
      await authService.verifyTwoFASetup(adminId, await generate({ secret: s }));
      return s;
    })();
    return authService.verifyTwoFALogin(adminId, await generate({ secret }));
  }

  it("issues a fresh access token for a valid, unrevoked session", async () => {
    const { refreshToken } = await loggedInSession();
    const result = await authService.refreshSession(refreshToken);
    expect(result.accessToken).toBeTruthy();
  });

  it("rejects an unknown refresh token", async () => {
    await expect(authService.refreshSession("not-a-real-token")).rejects.toBeInstanceOf(
      authService.InvalidCredentialsError
    );
  });

  it("rejects a revoked session's refresh token", async () => {
    const { refreshToken, sessionId } = await loggedInSession();
    await authService.revokeSession(sessionId);

    await expect(authService.refreshSession(refreshToken)).rejects.toBeInstanceOf(
      authService.InvalidCredentialsError
    );
  });
});

describe("logout", () => {
  it("revokes the session so a later refresh fails", async () => {
    const { refreshToken } = await (async () => {
      const { otpauthUrl } = await authService.setupTwoFA(adminId);
      const s = /secret=([A-Z0-9]+)/.exec(otpauthUrl)![1];
      await authService.verifyTwoFASetup(adminId, await generate({ secret: s }));
      return authService.verifyTwoFALogin(adminId, await generate({ secret: s }));
    })();

    await authService.logout(refreshToken);
    await expect(authService.refreshSession(refreshToken)).rejects.toBeInstanceOf(
      authService.InvalidCredentialsError
    );
  });
});

describe("listSessions", () => {
  it("lists only unrevoked sessions, most-recently-active first", async () => {
    const { otpauthUrl } = await authService.setupTwoFA(adminId);
    const secret = /secret=([A-Z0-9]+)/.exec(otpauthUrl)![1];
    await authService.verifyTwoFASetup(adminId, await generate({ secret }));

    const first = await authService.verifyTwoFALogin(adminId, await generate({ secret }));
    await authService.revokeSession(first.sessionId);
    const second = await authService.verifyTwoFALogin(adminId, await generate({ secret }));

    const sessions = await authService.listSessions();
    const ids = sessions.map((s) => s.id);
    expect(ids).toContain(second.sessionId);
    expect(ids).not.toContain(first.sessionId);
  });
});
