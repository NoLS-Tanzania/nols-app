/**
 * AzamPay Authentication — Bearer Token Manager
 *
 * AzamPay uses a short-lived JWT that must be obtained by POSTing credentials
 * to the authenticator endpoint before any API call is made. This module:
 *
 *  1. Fetches a fresh token using client credentials (never logged).
 *  2. Caches the token in Redis (with a TTL 60 s shorter than expiry) so only
 *     one token fetch is in-flight at a time across restarts/instances.
 *  3. Falls back to an in-process cache when Redis is unavailable.
 *  4. Uses a Promise-lock to prevent concurrent token refresh (thundering herd).
 *
 * SECURITY RULES enforced here:
 *  - env var VALUES are never written to logs — only key names when missing.
 *  - The raw AzamPay response body is never forwarded to callers.
 *  - All outbound fetch calls have a hard timeout.
 */

import { getRedis } from "./redis.js";

// ── Constants ─────────────────────────────────────────────────────────────────

const REDIS_KEY = "azp:token";         // Redis key — no sensitive data in key name
const CLOCK_SKEW_SEC = 60;             // Expire cache 60 s before real expiry
const FETCH_TIMEOUT_MS = 10_000;       // 10 s hard timeout on auth call

// ── Types ─────────────────────────────────────────────────────────────────────

interface TokenCache {
  token: string;
  expiresAtMs: number; // JS timestamp (ms)
}

// ── In-process fallback cache ─────────────────────────────────────────────────

let inMemCache: TokenCache | null = null;

// ── Mutex — prevent concurrent refresh ───────────────────────────────────────

let inflightRefresh: Promise<string> | null = null;

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Parse ISO-8601 or epoch-second/ms expiry strings from AzamPay response. */
function parseExpiry(expire: string | number | undefined | null): number {
  if (!expire) return Date.now() + 50 * 60 * 1000; // Default 50 min if not provided
  if (typeof expire === "number") {
    // Could be Unix seconds or milliseconds
    return expire < 1e12 ? expire * 1000 : expire;
  }
  const ms = Date.parse(expire);
  return Number.isFinite(ms) && ms > 0 ? ms : Date.now() + 50 * 60 * 1000;
}

/** Fetch a new access token from the AzamPay authenticator. */
async function fetchFreshToken(): Promise<TokenCache> {
  const authUrl = (process.env.AZAMPAY_AUTH_URL || "https://authenticator.azampay.co.tz").replace(/\/$/, "");
  const appName = process.env.AZAMPAY_APP_NAME || "";
  const clientId = process.env.AZAMPAY_CLIENT_ID || "";
  const clientSecret = process.env.AZAMPAY_CLIENT_SECRET || "";

  if (!clientId || !clientSecret) {
    // Name the missing keys — never the values
    const missing = [
      !clientId && "AZAMPAY_CLIENT_ID",
      !clientSecret && "AZAMPAY_CLIENT_SECRET",
    ].filter(Boolean);
    throw new Error(`AzamPay auth: missing required env var(s): ${missing.join(", ")}`);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${authUrl}/AppRegistration/GenerateToken`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appName, clientId, clientSecret }),
      signal: controller.signal,
    });
  } catch (err: any) {
    clearTimeout(timer);
    // Do NOT include raw error which might echo request body on some runtimes
    throw new Error(`AzamPay auth: network error reaching authenticator (${err?.name ?? "unknown"})`);
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    // Read and discard body — never forward it (could contain diagnostic info)
    try { await res.text(); } catch { /* ignore */ }
    throw new Error(`AzamPay auth: authenticator returned HTTP ${res.status}`);
  }

  let body: any;
  try {
    body = await res.json();
  } catch {
    throw new Error("AzamPay auth: authenticator returned non-JSON body");
  }

  if (!body?.success || !body?.data?.accessToken) {
    // Log only the outcome flag, not the body which may echo credentials
    throw new Error(`AzamPay auth: token fetch failed (success=${body?.success})`);
  }

  const token: string = body.data.accessToken;
  const expiresAtMs = parseExpiry(body.data.expire) - CLOCK_SKEW_SEC * 1000;

  return { token, expiresAtMs };
}

/** Persist token in Redis so all instances share it. Silently skips on error. */
async function persistToRedis(cache: TokenCache): Promise<void> {
  try {
    const redis = getRedis();
    if (!redis) return;
    const ttlSec = Math.max(0, Math.floor((cache.expiresAtMs - Date.now()) / 1000));
    if (ttlSec < 10) return; // Not worth caching for < 10 s
    await redis.set(REDIS_KEY, cache.token, "EX", ttlSec);
  } catch {
    // Redis failure is non-fatal — we have a valid in-process cache
  }
}

/** Read token from Redis. Returns null if Redis unavailable or key missing. */
async function readFromRedis(): Promise<string | null> {
  try {
    const redis = getRedis();
    if (!redis) return null;
    return await redis.get(REDIS_KEY);
  } catch {
    return null;
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Returns a valid AzamPay Bearer token, fetching a new one only when necessary.
 *
 * Safe to call concurrently — only one network request in-flight at a time.
 */
export async function getAzamPayToken(): Promise<string> {
  const now = Date.now();

  // 1. In-process cache still valid?
  if (inMemCache && inMemCache.expiresAtMs > now) {
    return inMemCache.token;
  }

  // 2. Redis cache still valid?
  const redisToken = await readFromRedis();
  if (redisToken) {
    // We got a valid token from Redis; refresh in-process cache.
    // We can't know the exact TTL here so give local cache a conservative 55 min.
    inMemCache = { token: redisToken, expiresAtMs: now + 55 * 60 * 1000 };
    return redisToken;
  }

  // 3. Need a fresh token — use mutex to prevent thundering herd
  if (inflightRefresh) {
    return inflightRefresh;
  }

  inflightRefresh = (async () => {
    try {
      const cache = await fetchFreshToken();
      inMemCache = cache;
      await persistToRedis(cache);
      return cache.token;
    } finally {
      inflightRefresh = null;
    }
  })();

  return inflightRefresh;
}

/**
 * Force-invalidate the cached token (e.g. after a 401 from the API).
 * The next call to `getAzamPayToken()` will re-fetch.
 */
export async function invalidateAzamPayToken(): Promise<void> {
  inMemCache = null;
  try {
    const redis = getRedis();
    if (redis) await redis.del(REDIS_KEY);
  } catch { /* non-fatal */ }
}
