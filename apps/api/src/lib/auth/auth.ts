import { prisma } from "../../db/prisma.js";
import { verifyPassword } from "./crypto.js";
import { signPendingTwoFAToken } from "./jwt.js";

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;

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
    const attempts = admin.failedLoginAttempts + 1;
    const lockedUntil = attempts >= MAX_FAILED_ATTEMPTS ? new Date(Date.now() + LOCK_DURATION_MS) : null;
    await prisma.admin.update({
      where: { id: admin.id },
      data: { failedLoginAttempts: attempts, lockedUntil },
    });
    if (lockedUntil) throw new AccountLockedError(lockedUntil);
    throw new InvalidCredentialsError();
  }

  await prisma.admin.update({ where: { id: admin.id }, data: { failedLoginAttempts: 0 } });

  return { pendingToken: signPendingTwoFAToken(admin.id), twoFAEnabled: admin.twoFAEnabled };
}
