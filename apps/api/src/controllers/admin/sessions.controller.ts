import type { Response } from "express";
import * as authService from "../../lib/auth/auth.js";
import type { AuthedRequest } from "../../lib/auth/middleware.js";

export async function list(_req: AuthedRequest, res: Response) {
  const sessions = await authService.listSessions();
  res.status(200).json(sessions);
}

export async function revoke(req: AuthedRequest, res: Response) {
  try {
    await authService.revokeSession(req.params.id);
    res.status(200).json({ ok: true });
  } catch {
    // revokeSession() throws Prisma's P2025 when the id doesn't exist (already
    // revoked, stale client list, double-click). That's a client-caused 404,
    // not a server error -- and it must not become an unhandled rejection.
    res.status(404).json({ error: "not_found" });
  }
}
