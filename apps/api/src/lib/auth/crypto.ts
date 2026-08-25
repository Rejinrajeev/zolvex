import { createCipheriv, createDecipheriv, randomBytes, createHash } from "node:crypto";
import bcrypt from "bcryptjs";

const ALGO = "aes-256-gcm";
const BCRYPT_ROUNDS = 12;

function getEncryptionKey(): Buffer {
  const key = process.env.ADMIN_2FA_ENCRYPTION_KEY;
  if (!key) throw new Error("ADMIN_2FA_ENCRYPTION_KEY is not set");
  const buf = Buffer.from(key, "hex");
  if (buf.length !== 32) {
    throw new Error("ADMIN_2FA_ENCRYPTION_KEY must be 32 bytes (64 hex characters)");
  }
  return buf;
}

/** Encrypts a TOTP secret for storage. Format: "iv:authTag:ciphertext", all hex. */
export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("hex"), authTag.toString("hex"), encrypted.toString("hex")].join(":");
}

export function decryptSecret(payload: string): string {
  const [ivHex, tagHex, dataHex] = payload.split(":");
  if (!ivHex || !tagHex || !dataHex) throw new Error("Malformed encrypted secret payload");
  const decipher = createDecipheriv(ALGO, getEncryptionKey(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataHex, "hex")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function hashRecoveryCode(code: string): Promise<string> {
  return bcrypt.hash(code, BCRYPT_ROUNDS);
}

export async function verifyRecoveryCode(code: string, hash: string): Promise<boolean> {
  return bcrypt.compare(code, hash);
}

/** 8 codes of 10 hex characters each, e.g. "a1b2c3d4e5". Shown once, never stored plaintext. */
export function generateRecoveryCodes(count = 8): string[] {
  return Array.from({ length: count }, () => randomBytes(5).toString("hex"));
}

export function generateRawToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

/** A URL-safe, human-typeable temporary password for a newly-created admin. */
export function generateTempPassword(): string {
  return randomBytes(9).toString("base64url");
}
