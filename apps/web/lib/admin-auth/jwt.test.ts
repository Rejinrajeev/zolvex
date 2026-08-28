import { describe, it, expect } from "vitest";
import { decodeJwtPayload } from "./jwt.js";

function fakeJwt(payload: Record<string, unknown>): string {
  const base64url = (obj: unknown) =>
    Buffer.from(JSON.stringify(obj)).toString("base64url");
  return `${base64url({ alg: "HS256", typ: "JWT" })}.${base64url(payload)}.fake-signature`;
}

describe("decodeJwtPayload", () => {
  it("decodes a well-formed JWT's payload segment", () => {
    const token = fakeJwt({ sub: "admin-1", role: "superadmin", purpose: "access" });
    expect(decodeJwtPayload(token)).toEqual({ sub: "admin-1", role: "superadmin", purpose: "access" });
  });

  it("returns null for a string with the wrong number of segments", () => {
    expect(decodeJwtPayload("not-a-jwt")).toBeNull();
    expect(decodeJwtPayload("only.two")).toBeNull();
  });

  it("returns null when the payload segment isn't valid base64url JSON", () => {
    expect(decodeJwtPayload("header.!!!not-valid-base64!!!.sig")).toBeNull();
  });
});
