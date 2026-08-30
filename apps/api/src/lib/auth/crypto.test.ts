import { describe, it, expect } from "vitest";
import {
  encryptSecret,
  decryptSecret,
  hashPassword,
  verifyPassword,
  hashRecoveryCode,
  verifyRecoveryCode,
  generateRecoveryCodes,
  generateRawToken,
  hashToken,
  generateTempPassword,
} from "./crypto.js";

describe("encryptSecret / decryptSecret", () => {
  it("round-trips a plaintext secret", () => {
    const encrypted = encryptSecret("JBSWY3DPEHPK3PXP");
    expect(encrypted).not.toContain("JBSWY3DPEHPK3PXP");
    expect(decryptSecret(encrypted)).toBe("JBSWY3DPEHPK3PXP");
  });

  it("produces a different ciphertext each time (random IV)", () => {
    const a = encryptSecret("same-secret");
    const b = encryptSecret("same-secret");
    expect(a).not.toBe(b);
  });

  it("fails to decrypt a tampered payload", () => {
    const encrypted = encryptSecret("JBSWY3DPEHPK3PXP");
    const tampered = encrypted.slice(0, -2) + "00";
    expect(() => decryptSecret(tampered)).toThrow();
  });
});

describe("hashPassword / verifyPassword", () => {
  it("verifies a correct password and rejects a wrong one", async () => {
    const hash = await hashPassword("correct horse battery staple");
    expect(await verifyPassword("correct horse battery staple", hash)).toBe(true);
    expect(await verifyPassword("wrong password", hash)).toBe(false);
  });
});

describe("hashRecoveryCode / verifyRecoveryCode", () => {
  it("verifies a correct code and rejects a wrong one", async () => {
    const hash = await hashRecoveryCode("ab12cd34ef");
    expect(await verifyRecoveryCode("ab12cd34ef", hash)).toBe(true);
    expect(await verifyRecoveryCode("wrong-code", hash)).toBe(false);
  });
});

describe("generateRecoveryCodes", () => {
  it("generates 8 unique codes by default", () => {
    const codes = generateRecoveryCodes();
    expect(codes).toHaveLength(8);
    expect(new Set(codes).size).toBe(8);
  });
});

describe("generateRawToken / hashToken", () => {
  it("hashes deterministically so a stored hash can be matched later", () => {
    const raw = generateRawToken();
    expect(hashToken(raw)).toBe(hashToken(raw));
  });

  it("generates a different raw token each call", () => {
    expect(generateRawToken()).not.toBe(generateRawToken());
  });
});

describe("generateTempPassword", () => {
  it("generates a non-empty, reasonably long password", () => {
    const pw = generateTempPassword();
    expect(pw.length).toBeGreaterThanOrEqual(10);
  });
});
