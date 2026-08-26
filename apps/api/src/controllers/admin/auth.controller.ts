import type { Request, Response } from "express";
import { z } from "zod";
import * as authService from "../../lib/auth/auth.js";
import { verifyPendingTwoFAToken } from "../../lib/auth/jwt.js";
import { loginPendingView, twoFASetupView, sessionAccessTokenView } from "../../views/admin/auth.view.js";

const REFRESH_COOKIE = "refresh_token";
const REFRESH_COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: 30 * 24 * 60 * 60 * 1000,
};

function pendingAdminId(req: Request): string {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  if (!token) throw new authService.InvalidCredentialsError();
  return verifyPendingTwoFAToken(token).sub;
}

function userAgentOf(req: Request): string | undefined {
  const value = req.headers["user-agent"];
  return Array.isArray(value) ? value[0] : value;
}

const loginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(200),
});

export async function login(req: Request, res: Response) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request" });
    return;
  }
  try {
    const result = await authService.login(parsed.data.email, parsed.data.password);
    res.status(200).json(loginPendingView(result));
  } catch (error) {
    if (error instanceof authService.AccountLockedError) {
      res.status(423).json({ error: "account_locked", lockedUntil: error.lockedUntil });
      return;
    }
    res.status(401).json({ error: "invalid_credentials" });
  }
}

export async function setupTwoFA(req: Request, res: Response) {
  try {
    const adminId = pendingAdminId(req);
    const result = await authService.setupTwoFA(adminId);
    res.status(200).json(twoFASetupView(result));
  } catch {
    res.status(401).json({ error: "unauthorized" });
  }
}

const codeSchema = z.object({ code: z.string().min(6).max(10) });

export async function verifyTwoFASetup(req: Request, res: Response) {
  const parsed = codeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request" });
    return;
  }
  try {
    const adminId = pendingAdminId(req);
    await authService.verifyTwoFASetup(adminId, parsed.data.code);
    res.status(200).json({ ok: true });
  } catch {
    res.status(401).json({ error: "invalid_credentials" });
  }
}

export async function verifyTwoFALogin(req: Request, res: Response) {
  const parsed = codeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request" });
    return;
  }
  try {
    const adminId = pendingAdminId(req);
    const result = await authService.verifyTwoFALogin(adminId, parsed.data.code, {
      ipAddress: req.ip,
      userAgent: userAgentOf(req),
    });
    res.cookie(REFRESH_COOKIE, result.refreshToken, REFRESH_COOKIE_OPTS);
    res.status(200).json(sessionAccessTokenView(result));
  } catch {
    res.status(401).json({ error: "invalid_credentials" });
  }
}

const recoverySchema = z.object({ code: z.string().min(1).max(100) });

export async function loginWithRecoveryCode(req: Request, res: Response) {
  const parsed = recoverySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request" });
    return;
  }
  try {
    const adminId = pendingAdminId(req);
    const result = await authService.loginWithRecoveryCode(adminId, parsed.data.code, {
      ipAddress: req.ip,
      userAgent: userAgentOf(req),
    });
    res.cookie(REFRESH_COOKIE, result.refreshToken, REFRESH_COOKIE_OPTS);
    res.status(200).json(sessionAccessTokenView(result));
  } catch {
    res.status(401).json({ error: "invalid_credentials" });
  }
}

export async function refresh(req: Request, res: Response) {
  const rawToken = req.cookies?.[REFRESH_COOKIE];
  if (!rawToken) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  try {
    const result = await authService.refreshSession(rawToken);
    res.status(200).json(sessionAccessTokenView(result));
  } catch {
    res.status(401).json({ error: "unauthorized" });
  }
}

export async function logout(req: Request, res: Response) {
  const rawToken = req.cookies?.[REFRESH_COOKIE];
  if (rawToken) await authService.logout(rawToken);
  const { maxAge: _maxAge, ...clearCookieOpts } = REFRESH_COOKIE_OPTS;
  res.clearCookie(REFRESH_COOKIE, clearCookieOpts);
  res.status(204).send();
}
