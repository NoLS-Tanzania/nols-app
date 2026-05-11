// apps/api/src/lib/otp.ts
import crypto from "crypto";

export function generate6() {
  return String(crypto.randomInt(100000, 1000000)); // 6-digit, CSPRNG
}
export function hashCode(code: string) {
  return crypto.createHash("sha256").update(code).digest("hex");
}
