import { generateSecret, generateURI, generate, verify } from "otplib";
import { prisma } from "../../db/prisma.js";
import { verifyPassword, hashPassword, encryptSecret, decryptSecret, generateRecoveryCodes, hashRecoveryCode, generateRawToken, hashToken, verifyRecoveryCode } from "./crypto.js";
import { signPendingTwoFAToken, signAccessToken } from "./jwt.js";

export const MIN_PASSWORD_LENGTH = 12;

/** Thrown by changePassword when the new password fails a policy rule. */
export class WeakPasswordError extends Error {}

/**
 * Thrown by changePassword when the supplied current password is wrong.
 * Distinct from InvalidCredentialsError so the HTTP layer can answer with a
 * form-field error (422) instead of a 401 the web client would read as
 * "session expired" and bounce to the login screen.
 */
export class WrongCurrentPasswordError extends Error {}

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;
const REFRESH_TOKEN_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export class InvalidCredentialsError extends Error {}
export class AccountLockedError extends Error {
  constructor(public lockedUntil: Date) {
    super("Account is locked");
  }
}

export async function login(
  email: string,
  password: string
): Promise<{ pendingToken: string; twoFAEnabled: boolean }> {
  const admin = await prisma.admin.findUnique({ where: { email } });
  if (!admin || !admin.isActive) throw new InvalidCredentialsError();

  if (admin.lockedUntil && admin.lockedUntil > new Date()) {
    throw new AccountLockedError(admin.lockedUntil);
  }

  const valid = await verifyPassword(password, admin.passwordHash);
  if (!valid) {
    const updated = await prisma.admin.update({
      where: { id: admin.id },
      data: { failedLoginAttempts: { increment: 1 } },
    });
    if (updated.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
      const lockedUntil = new Date(Date.now() + LOCK_DURATION_MS);
      await prisma.admin.update({ where: { id: admin.id }, data: { lockedUntil } });
      throw new AccountLockedError(lockedUntil);
    }
    throw new InvalidCredentialsError();
  }

  await prisma.admin.update({ where: { id: admin.id }, data: { failedLoginAttempts: 0 } });

  return { pendingToken: signPendingTwoFAToken(admin.id), twoFAEnabled: admin.twoFAEnabled };
}

export async function setupTwoFA(
  adminId: string
): Promise<{ otpauthUrl: string; recoveryCodes: string[] }> {
  const admin = await prisma.admin.findUnique({ where: { id: adminId } });
  if (!admin) throw new InvalidCredentialsError();
  if (!admin.isActive) throw new InvalidCredentialsError();
  if (admin.twoFAEnabled) throw new Error("2FA is already enabled for this account");

  const secret = generateSecret();
  const otpauthUrl = generateURI({
    label: admin.email,
    issuer: "Zolvex Admin",
    secret,
  });
  const recoveryCodes = generateRecoveryCodes();
  const hashedCodes = await Promise.all(recoveryCodes.map(hashRecoveryCode));

  await prisma.admin.update({
    where: { id: adminId },
    data: { twoFASecret: encryptSecret(secret), twoFARecoveryCodes: hashedCodes },
  });

  // recoveryCodes returned in plaintext exactly once here; never stored or logged plaintext again.
  return { otpauthUrl, recoveryCodes };
}

export async function verifyTwoFASetup(adminId: string, code: string): Promise<void> {
  const admin = await prisma.admin.findUnique({ where: { id: adminId } });
  if (!admin?.twoFASecret) throw new InvalidCredentialsError();
  if (!admin.isActive) throw new InvalidCredentialsError();

  const secret = decryptSecret(admin.twoFASecret);
  const result = await verify({ token: code, secret });
  if (!result.valid) throw new InvalidCredentialsError();

  await prisma.admin.update({ where: { id: adminId }, data: { twoFAEnabled: true } });
}

async function createSession(
  adminId: string,
  role: "superadmin" | "editor",
  mustChangePassword: boolean,
  meta?: { ipAddress?: string; userAgent?: string }
): Promise<{
  accessToken: string;
  refreshToken: string;
  sessionId: string;
  mustChangePassword: boolean;
}> {
  const refreshToken = generateRawToken();
  const session = await prisma.adminSession.create({
    data: {
      adminId,
      refreshTokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_LIFETIME_MS),
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    },
  });

  return {
    accessToken: signAccessToken(adminId, role, mustChangePassword),
    refreshToken,
    sessionId: session.id,
    mustChangePassword,
  };
}

export async function verifyTwoFALogin(
  adminId: string,
  code: string,
  meta?: { ipAddress?: string; userAgent?: string }
) {
  const admin = await prisma.admin.findUnique({ where: { id: adminId } });
  if (!admin?.twoFASecret || !admin.twoFAEnabled) throw new InvalidCredentialsError();
  if (!admin.isActive) throw new InvalidCredentialsError();

  if (admin.lockedUntil && admin.lockedUntil > new Date()) {
    throw new AccountLockedError(admin.lockedUntil);
  }

  const secret = decryptSecret(admin.twoFASecret);
  const result = await verify({ token: code, secret });
  if (!result.valid) {
    const updated = await prisma.admin.update({
      where: { id: admin.id },
      data: { failedLoginAttempts: { increment: 1 } },
    });
    if (updated.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
      const lockedUntil = new Date(Date.now() + LOCK_DURATION_MS);
      await prisma.admin.update({ where: { id: admin.id }, data: { lockedUntil } });
      throw new AccountLockedError(lockedUntil);
    }
    throw new InvalidCredentialsError();
  }

  await prisma.admin.update({ where: { id: admin.id }, data: { failedLoginAttempts: 0 } });

  return createSession(admin.id, admin.role, admin.mustChangePassword, meta);
}

export async function loginWithRecoveryCode(
  adminId: string,
  code: string,
  meta?: { ipAddress?: string; userAgent?: string }
) {
  const admin = await prisma.admin.findUnique({ where: { id: adminId } });
  if (!admin) throw new InvalidCredentialsError();
  if (!admin.isActive) throw new InvalidCredentialsError();

  if (admin.lockedUntil && admin.lockedUntil > new Date()) {
    throw new AccountLockedError(admin.lockedUntil);
  }

  // Compare against every stored hash in parallel rather than sequentially:
  // bcrypt cost 12 makes a full sequential scan of up to 8 codes slow enough
  // to be visibly latent for real users and to flirt with test timeouts on
  // slower CI runners. Running the compares concurrently (Node offloads each
  // bcrypt.compare to libuv's threadpool) cuts worst-case wall time roughly
  // to the cost of one compare instead of eight, and as a side effect makes
  // response timing independent of which code (if any) matched.
  const matches = await Promise.all(
    admin.twoFARecoveryCodes.map((hash) => verifyRecoveryCode(code, hash))
  );
  const matchedIndex = matches.indexOf(true);
  if (matchedIndex === -1) {
    const updated = await prisma.admin.update({
      where: { id: admin.id },
      data: { failedLoginAttempts: { increment: 1 } },
    });
    if (updated.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
      const lockedUntil = new Date(Date.now() + LOCK_DURATION_MS);
      await prisma.admin.update({ where: { id: admin.id }, data: { lockedUntil } });
      throw new AccountLockedError(lockedUntil);
    }
    throw new InvalidCredentialsError();
  }

  const remaining = admin.twoFARecoveryCodes.filter((_, i) => i !== matchedIndex);
  await prisma.admin.update({
    where: { id: admin.id },
    data: { twoFARecoveryCodes: remaining, failedLoginAttempts: 0 },
  });

  return createSession(admin.id, admin.role, admin.mustChangePassword, meta);
}

export async function refreshSession(rawRefreshToken: string): Promise<{ accessToken: string }> {
  const tokenHash = hashToken(rawRefreshToken);
  const session = await prisma.adminSession.findUnique({ where: { refreshTokenHash: tokenHash } });
  if (!session || session.revokedAt || session.expiresAt < new Date()) {
    throw new InvalidCredentialsError();
  }

  const admin = await prisma.admin.findUnique({ where: { id: session.adminId } });
  if (!admin || !admin.isActive) throw new InvalidCredentialsError();

  await prisma.adminSession.update({ where: { id: session.id }, data: { lastActiveAt: new Date() } });
  return { accessToken: signAccessToken(admin.id, admin.role, admin.mustChangePassword) };
}

export async function logout(rawRefreshToken: string): Promise<void> {
  const tokenHash = hashToken(rawRefreshToken);
  await prisma.adminSession.updateMany({
    where: { refreshTokenHash: tokenHash },
    data: { revokedAt: new Date() },
  });
}

/**
 * Lets a signed-in admin set their own password. Verifies the current one,
 * enforces the length policy, clears the `mustChangePassword` flag (so a new
 * user is done being onboarded), and revokes every session for the account —
 * changing a password is a security event, and the web client re-authenticates
 * with the new one immediately.
 */
export async function changePassword(
  adminId: string,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const admin = await prisma.admin.findUnique({ where: { id: adminId } });
  if (!admin || !admin.isActive) throw new InvalidCredentialsError();

  const currentValid = await verifyPassword(currentPassword, admin.passwordHash);
  if (!currentValid) throw new WrongCurrentPasswordError("Current password is incorrect");

  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    throw new WeakPasswordError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }
  if (await verifyPassword(newPassword, admin.passwordHash)) {
    throw new WeakPasswordError("Choose a password different from your current one.");
  }

  const passwordHash = await hashPassword(newPassword);
  await prisma.$transaction([
    prisma.admin.update({
      where: { id: adminId },
      data: { passwordHash, mustChangePassword: false, failedLoginAttempts: 0 },
    }),
    prisma.adminSession.updateMany({
      where: { adminId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);
}

export async function revokeSession(sessionId: string): Promise<void> {
  await prisma.adminSession.update({ where: { id: sessionId }, data: { revokedAt: new Date() } });
}

export async function listSessions() {
  return prisma.adminSession.findMany({
    where: { revokedAt: null },
    include: { admin: { select: { name: true, email: true } } },
    orderBy: { lastActiveAt: "desc" },
  });
}
