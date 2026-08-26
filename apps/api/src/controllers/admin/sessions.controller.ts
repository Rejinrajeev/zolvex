import type { Response } from "express";
import * as authService from "../../lib/auth/auth.js";
import type { AuthedRequest } from "../../lib/auth/middleware.js";

export async function list(_req: AuthedRequest, res: Response) {
  const sessions = await authService.listSessions();
  res.status(200).json(sessions);
}

export async function revoke(req: AuthedRequest, res: Response) {
  await authService.revokeSession(req.params.id);
  res.status(200).json({ ok: true });
}
