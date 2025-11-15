// apps/api/src/lib/otp.ts
import crypto from "crypto";

export function generate6() {
  return String(Math.floor(100000 + Math.random()*900000)); // 6-digit
}
export function hashCode(code: string) {
  return crypto.createHash("sha256").update(code).digest("hex");
}
