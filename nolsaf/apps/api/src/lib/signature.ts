import crypto from "crypto";

/** Compute hex HMAC-SHA256 */
export function hmacSha256Hex(secret: string, data: string) {
  return crypto.createHmac("sha256", secret).update(data, "utf8").digest("hex");
}

/** Constant-time compare */
export function safeEq(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}
