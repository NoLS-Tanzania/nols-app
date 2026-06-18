import crypto from "crypto";
import { rateLimitWithRedis as rateLimit } from "./redisRateLimitStore.js";

export const CORAL_UCF_API_URL = (
  process.env.CORAL_UCF_API_URL || "https://dev.coralcommerce.com/Payserver/Service/Execute"
).replace(/\/$/, "");

export const CORAL_FETCH_TIMEOUT_MS = 10_000;

export type CoralPostResponse = {
  ok: boolean;
  status: number;
  body: string;
};

export type CoralInitiateResult = {
  code: string;
  message: string;
  redirectUrl: string | null;
  zone?: string | null;
  raw: unknown;
};

export function makeCoralRateLimiter(options: {
  windowMs: number;
  limit: number;
  keyFn: (req: any) => string;
}) {
  return rateLimit({
    windowMs: options.windowMs,
    limit: options.limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    keyGenerator: options.keyFn,
    message: { error: "rate_limited", message: "Too many payment attempts. Please try again shortly." },
  });
}

export function encodeCoralJson64(payload: object): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64");
}

export async function coralPostJson64(payload: object): Promise<CoralPostResponse> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), CORAL_FETCH_TIMEOUT_MS);
  try {
    const form = new URLSearchParams();
    form.set("json64", encodeCoralJson64(payload));

    const res = await fetch(CORAL_UCF_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
      signal: ctrl.signal,
    });

    let body = "";
    try { body = await res.text(); } catch { /* leave empty */ }
    return { ok: res.ok, status: res.status, body };
  } finally {
    clearTimeout(timer);
  }
}

export function parseCoralInitiateResponse(body: string): CoralInitiateResult {
  let parsed: any;
  try {
    parsed = JSON.parse(body);
  } catch {
    throw new Error("coral_non_json_response");
  }

  const result = parsed?.Result ?? parsed?.result ?? {};
  const code = String(result.Code ?? result.code ?? "");
  const message = String(result.Message ?? result.message ?? "");
  const redirectUrl = result.RedirectUrl ?? result.redirectUrl ?? result.RedirectURL ?? null;
  const zone = result.Zone ?? result.zone ?? null;

  return {
    code,
    message,
    redirectUrl: redirectUrl == null ? null : String(redirectUrl),
    zone: zone == null ? null : String(zone),
    raw: parsed,
  };
}

function makeOpenSslBlowfishKey(secret: string): Buffer {
  if (!secret) return Buffer.from(secret, "utf8");
  const targetLen = (16 + 2) * 4;
  let key = secret;
  while (Buffer.byteLength(key, "utf8") < targetLen) {
    key += key;
  }
  return Buffer.from(key, "utf8").subarray(0, targetLen);
}

export function decryptCoralBlowfishHex(secret: string, encryptedHex: string): string {
  const key = makeOpenSslBlowfishKey(secret);
  const encrypted = Buffer.from(encryptedHex, "hex");
  let decipher: crypto.Decipher;

  try {
    decipher = crypto.createDecipheriv("bf-ecb", key, null);
  } catch (err: any) {
    throw new Error(
      `coral_blowfish_unavailable:${err?.message || "enable OpenSSL legacy provider or provide a Blowfish fallback"}`
    );
  }

  decipher.setAutoPadding(false);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8").replace(/\0+$/g, "").trimEnd();
}

export function parseCoralEncryptedJson(secret: string, encryptedHex: string): any {
  const plaintext = decryptCoralBlowfishHex(secret, encryptedHex);
  return JSON.parse(plaintext);
}

