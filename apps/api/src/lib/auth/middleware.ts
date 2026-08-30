import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken, type AdminRole } from "./jwt.js";

export interface AuthedRequest extends Request {
  actor?: { id: string; role: AdminRole };
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  if (!token) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  try {
    const payload = verifyAccessToken(token);
    req.actor = { id: payload.sub, role: payload.role };
    next();
  } catch {
    res.status(401).json({ error: "unauthorized" });
  }
}

export function requireRole(role: AdminRole) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.actor) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    if (req.actor.role !== role) {
      res.status(403).json({ error: "forbidden" });
      return;
    }
    next();
  };
}
