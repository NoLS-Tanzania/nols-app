/**
 * Generate a secure AZAMPAY_WEBHOOK_SECRET for webhook signature verification.
 *
 * AzamPay signs webhook payloads with HMAC-SHA256 using this secret.
 * Your app verifies incoming webhooks by computing the same HMAC and comparing.
 *
 * Usage:
 *   npx tsx scripts/gen-azp-webhook-secret.ts
 *   npx tsx scripts/gen-azp-webhook-secret.ts --format=base64
 *   npx tsx scripts/gen-azp-webhook-secret.ts --format=hex
 */

import crypto from "crypto";

const formats = ["base64", "hex", "alphanumeric"];
function arg(name: string, def: string): string {
  const m = process.argv.slice(2).find((a) => a.startsWith(`--${name}=`));
  return m ? m.split("=")[1] : def;
}

const format = arg("format", "base64");
if (!formats.includes(format)) {
  console.error(`Invalid format: ${format}. Choose: ${formats.join(", ")}`);
  process.exit(1);
}

const bytes = crypto.randomBytes(32); // 256 bits

let secret: string;
switch (format) {
  case "hex":
    secret = bytes.toString("hex");
    break;
  case "alphanumeric":
    // Base62: 0-9a-zA-Z (safe for env/URLs)
    const base62 = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const num = BigInt("0x" + bytes.toString("hex"));
    secret = "";
    let n = num;
    while (n > 0n) {
      secret = base62[Number(n % 62n)] + secret;
      n /= 62n;
    }
    if (!secret) secret = base62[0];
    break;
  default: // base64
    secret = bytes.toString("base64");
}

console.log("");
console.log("── AZAMPAY_WEBHOOK_SECRET ──────────────────────────────────");
console.log(`Format: ${format}`);
console.log(`Length: ${secret.length} chars (${bytes.length * 8} bits entropy)`);
console.log("");
console.log("Add to .env:");
console.log("");
console.log(`AZAMPAY_WEBHOOK_SECRET=${secret}`);
console.log("");
console.log("Steps:");
console.log("1. Copy the secret above");
console.log("2. Paste into nolsaf/apps/api/.env");
console.log("3. Restart the API server");
console.log("4. Configure this same secret in your AzamPay dashboard (if required)");
console.log("");
