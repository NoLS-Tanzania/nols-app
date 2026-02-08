import crypto from "crypto";

const CROCKFORD_BASE32_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

function base32Crockford(bytes: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = "";

  for (const b of bytes) {
    value = (value << 8) | b;
    bits += 8;

    while (bits >= 5) {
      out += CROCKFORD_BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    out += CROCKFORD_BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return out;
}

function groupTripPayload(payload26: string): string {
  const p = payload26.slice(0, 26);
  return `${p.slice(0, 5)}-${p.slice(5, 10)}-${p.slice(10, 15)}-${p.slice(15, 20)}-${p.slice(20, 26)}`;
}

export function normalizeTripCode(input: unknown): string {
  const raw = String(input ?? "").trim().toUpperCase();
  if (!raw) return "";

  // Remove spaces and underscores to reduce input variance.
  const compact = raw.replace(/[\s_]/g, "");

  // Accept both TRP_XXXXX-... and plain payload forms.
  const withoutPrefix = compact.startsWith("TRP") ? compact.replace(/^TRP[-:]?/i, "") : compact;
  const payload = withoutPrefix.replace(/-/g, "");

  // If it doesn't look like our base32 payload, return the uppercased original.
  if (!/^[0-9A-Z]+$/.test(payload)) return raw;

  if (payload.length < 26) {
    return compact.startsWith("TRP") ? compact : `TRP_${compact}`;
  }

  const canonicalPayload = payload.slice(0, 26);
  return `TRP_${groupTripPayload(canonicalPayload)}`;
}

export function hashTripCode(tripCode: string): string {
  const normalized = normalizeTripCode(tripCode);
  if (!normalized) return "";

  const secret = String(process.env.TRIP_CODE_HASH_SECRET ?? "").trim();
  if (secret) {
    return crypto.createHmac("sha256", secret).update(normalized).digest("hex");
  }

  return crypto.createHash("sha256").update(normalized).digest("hex");
}

export function generateTransportTripCode(): { tripCode: string; tripCodeHash: string } {
  // 128-bit random -> ~26 base32 chars (we take first 26 for stable length)
  const payload = base32Crockford(crypto.randomBytes(16)).slice(0, 26);
  const tripCode = `TRP_${groupTripPayload(payload)}`;
  const tripCodeHash = hashTripCode(tripCode);
  return { tripCode, tripCodeHash };
}
