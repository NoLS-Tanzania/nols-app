// apps/api/src/lib/contactChangeOtp.ts
// OTP store for verifying ownership of a NEW phone/email before an authenticated
// user is allowed to change their account's contact destination. Mirrors the
// auth.ts OTP store (Redis-backed with an in-memory fallback) but is namespaced
// per-user so it doesn't collide with login/signup/reset OTPs.

import crypto from "crypto";
import { hashCode, generate6 } from "./otp.js";
import { getRedis } from "./redis.js";

export type ContactField = "phone" | "email";

const OTP_TTL_SEC = 5 * 60;
const OTP_TTL_MS = OTP_TTL_SEC * 1000;

type Entry = { codeHash: string; value: string; expiresAt: number };
const fallbackStore = new Map<string, Entry>();

function storeKey(userId: number | string, field: ContactField): string {
  return `contact-change:${userId}:${field}`;
}

export const generateOtp = generate6;

export async function storeContactChangeOtp(userId: number | string, field: ContactField, value: string, code: string): Promise<void> {
  const codeHash = hashCode(code);
  const key = storeKey(userId, field);
  try {
    const r = getRedis();
    if (r) {
      await r.set(key, JSON.stringify({ codeHash, value }), "EX", OTP_TTL_SEC);
      return;
    }
  } catch {
    // fall back to memory
  }
  fallbackStore.set(key, { codeHash, value, expiresAt: Date.now() + OTP_TTL_MS });
}

export async function getContactChangeOtpEntry(userId: number | string, field: ContactField): Promise<{ codeHash: string; value: string } | null> {
  const key = storeKey(userId, field);
  try {
    const r = getRedis();
    if (r) {
      const raw = await r.get(key);
      if (!raw) return null;
      return JSON.parse(raw) as { codeHash: string; value: string };
    }
  } catch {
    // fall back to memory
  }
  const entry = fallbackStore.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    fallbackStore.delete(key);
    return null;
  }
  return { codeHash: entry.codeHash, value: entry.value };
}

export async function deleteContactChangeOtp(userId: number | string, field: ContactField): Promise<void> {
  const key = storeKey(userId, field);
  try {
    const r = getRedis();
    if (r) {
      await r.del(key);
      return;
    }
  } catch {
    // ignore
  }
  fallbackStore.delete(key);
}

export function verifyContactChangeOtp(code: string, codeHash: string): boolean {
  const inputHash = Buffer.from(hashCode(String(code)), "hex");
  const storedHash = Buffer.from(codeHash, "hex");
  if (inputHash.length !== storedHash.length) return false;
  return crypto.timingSafeEqual(inputHash, storedHash);
}
