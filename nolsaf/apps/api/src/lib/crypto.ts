import argon2 from "argon2";

/** Password hashing */
export const hashPassword = (plain: string) => argon2.hash(plain, { type: argon2.argon2id });
export const verifyPassword = (hash: string, plain: string) => argon2.verify(hash, plain);

/** Backup codes hashing (same as password) */
export const hashCode = (plain: string) => hashPassword(plain);
export const verifyCode = (hash: string, plain: string) => verifyPassword(hash, plain);

/** Very light secret encryption placeholder: replace with KMS/libsodium in prod */
const ENC_KEY = (process.env.ENCRYPTION_KEY || "dev-key-dev-key-dev-key-32bytes").slice(0, 32);
export function encrypt(text: string): string {
  // Simple XOR-ish placeholder NOT for production use; swap for proper AES-256-GCM
  const buf = Buffer.from(text, "utf8");
  const key = Buffer.from(ENC_KEY);
  const out = Buffer.alloc(buf.length);
  for (let i = 0; i < buf.length; i++) out[i] = buf[i] ^ key[i % key.length];
  return out.toString("base64");
}
export function decrypt(b64: string): string {
  const buf = Buffer.from(b64, "base64");
  const key = Buffer.from(ENC_KEY);
  const out = Buffer.alloc(buf.length);
  for (let i = 0; i < buf.length; i++) out[i] = buf[i] ^ key[i % key.length];
  return out.toString("utf8");
}
