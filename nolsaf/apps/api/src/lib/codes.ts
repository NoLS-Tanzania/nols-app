import crypto from "crypto";

// 8–10 chars, uppercase, no ambiguous chars; with checksum for typos
export function generateReadableCode(length = 8) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I, O, 0, 1
  let code = "";
  for (let i = 0; i < length; i++) {
    const rnd = crypto.randomInt(0, alphabet.length);
    code += alphabet[rnd];
  }
  // simple 2-char checksum
  const sum = crypto.createHash("sha1").update(code).digest("hex").slice(0, 2).toUpperCase();
  return `${code}${sum}`;
}

export function hashCode(raw: string) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}
