/**
 * Decodes (does NOT verify the signature of) a JWT's payload segment. Used
 * only to read the `role` claim for a UI display decision (which controls to
 * show) -- the actual security boundary is Express's own signature-verified
 * requireAuth/requireRole on every proxied call. Never use this function's
 * output to make an authorization DECISION, only a display one.
 */
export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const json = Buffer.from(parts[1], "base64url").toString("utf-8");
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}
