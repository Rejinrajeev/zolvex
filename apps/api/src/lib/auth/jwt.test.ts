import { describe, it, expect } from "vitest";
import {
  signAccessToken,
  verifyAccessToken,
  signPendingTwoFAToken,
  verifyPendingTwoFAToken,
} from "./jwt.js";

describe("access tokens", () => {
  it("round-trips adminId and role", () => {
    const token = signAccessToken("admin-1", "editor");
    const payload = verifyAccessToken(token);
    expect(payload.sub).toBe("admin-1");
    expect(payload.role).toBe("editor");
  });

  it("rejects a pending-2FA token presented as an access token", () => {
    const token = signPendingTwoFAToken("admin-1");
    expect(() => verifyAccessToken(token)).toThrow();
  });
});

describe("pending-2FA tokens", () => {
  it("round-trips adminId", () => {
    const token = signPendingTwoFAToken("admin-2");
    const payload = verifyPendingTwoFAToken(token);
    expect(payload.sub).toBe("admin-2");
  });

  it("rejects an access token presented as a pending-2FA token", () => {
    const token = signAccessToken("admin-2", "superadmin");
    expect(() => verifyPendingTwoFAToken(token)).toThrow();
  });
});
