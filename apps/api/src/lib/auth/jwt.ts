import jwt from "jsonwebtoken";

export type AdminRole = "superadmin" | "editor";
export type AccessTokenPayload = { sub: string; role: AdminRole; purpose: "access" };
export type PendingTwoFATokenPayload = { sub: string; purpose: "pending-2fa" };

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  return secret;
}

export function signAccessToken(adminId: string, role: AdminRole): string {
  const payload: AccessTokenPayload = { sub: adminId, role, purpose: "access" };
  return jwt.sign(payload, getSecret(), { expiresIn: "15m" });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, getSecret()) as AccessTokenPayload;
  if (decoded.purpose !== "access") throw new Error("Not an access token");
  return decoded;
}

export function signPendingTwoFAToken(adminId: string): string {
  const payload: PendingTwoFATokenPayload = { sub: adminId, purpose: "pending-2fa" };
  return jwt.sign(payload, getSecret(), { expiresIn: "2m" });
}

export function verifyPendingTwoFAToken(token: string): PendingTwoFATokenPayload {
  const decoded = jwt.verify(token, getSecret()) as PendingTwoFATokenPayload;
  if (decoded.purpose !== "pending-2fa") throw new Error("Not a pending-2FA token");
  return decoded;
}
