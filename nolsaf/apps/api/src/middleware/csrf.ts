// apps/api/src/middleware/csrf.ts
import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { getRedis } from "../lib/redis.js";

const CSRF_TTL_SEC = 60 * 60; // 1 hour

// ---------------------------------------------------------------------------
// In-memory fallback (used when Redis is unavailable, e.g. local dev without Redis)
// ---------------------------------------------------------------------------
const tokenStore = new Map<string, { token: string; expiresAt: number }>();

// Prune expired entries every 5 minutes to avoid unbounded memory growth.
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of tokenStore.entries()) {
    if (value.expiresAt < now) tokenStore.delete(key);
  }
}, 5 * 60 * 1000);

function memSet(sessionId: string, token: string): void {
  tokenStore.set(sessionId, { token, expiresAt: Date.now() + CSRF_TTL_SEC * 1000 });
}

function memGet(sessionId: string): string | null {
  const stored = tokenStore.get(sessionId);
  if (!stored || stored.expiresAt < Date.now()) return null;
  return stored.token;
}

// ---------------------------------------------------------------------------
// Redis-backed store with in-memory fallback
// ---------------------------------------------------------------------------
const REDIS_PREFIX = "csrf:";

async function storeToken(sessionId: string, token: string): Promise<void> {
  const redis = getRedis();
  if (redis) {
    try {
      await redis.set(`${REDIS_PREFIX}${sessionId}`, token, "EX", CSRF_TTL_SEC);
      return;
    } catch {
      // Redis unavailable — fall through to in-memory
    }
  }
  memSet(sessionId, token);
}

async function retrieveToken(sessionId: string): Promise<string | null> {
  const redis = getRedis();
  if (redis) {
    try {
      return await redis.get(`${REDIS_PREFIX}${sessionId}`);
    } catch {
      // Redis unavailable — fall through to in-memory
    }
  }
  return memGet(sessionId);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate a CSRF token for a session and persist it.
 */
export async function generateCsrfToken(sessionId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  await storeToken(sessionId, token);
  return token;
}

/**
 * Verify a submitted CSRF token against the stored value using
 * constant-time comparison to resist timing attacks.
 */
export async function verifyCsrfToken(sessionId: string, token: string): Promise<boolean> {
  const stored = await retrieveToken(sessionId);
  if (!stored) return false;
  try {
    const a = Buffer.from(stored);
    const b = Buffer.from(token);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Get session ID from request (uses IP + User-Agent as fallback)
 */
function getSessionId(req: Request): string {
  // In a real app, you'd use a session ID from cookies
  // For now, use IP + User-Agent as a simple identifier
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const ua = req.get("user-agent") || "unknown";
  return crypto.createHash("sha256").update(`${ip}:${ua}`).digest("hex");
}

/**
 * CSRF protection middleware for state-changing operations
 * Only applies to POST, PUT, DELETE, PATCH methods
 */
export async function csrfProtection(req: Request, res: Response, next: NextFunction) {
  // Skip CSRF for GET, HEAD, OPTIONS
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return next();
  }

  // Skip CSRF for webhooks (they use signature verification)
  if (req.path.startsWith("/webhooks/")) {
    return next();
  }

  // Skip CSRF for public read-only endpoints
  if (req.method === "GET" && req.path.startsWith("/api/public/")) {
    return next();
  }

  const sessionId = getSessionId(req);
  const token = req.headers["x-csrf-token"] as string;

  if (!token) {
    return res.status(403).json({
      error: "CSRF token missing",
      message: "Please include X-CSRF-Token header",
    });
  }

  if (!(await verifyCsrfToken(sessionId, token))) {
    return res.status(403).json({
      error: "Invalid CSRF token",
      message: "CSRF token verification failed",
    });
  }

  next();
}

/**
 * Middleware to add CSRF token to response headers
 * Call this on GET requests to provide token to frontend
 */
export async function csrfTokenHeader(req: Request, res: Response, next: NextFunction) {
  if (req.method === "GET") {
    const sessionId = getSessionId(req);
    const token = await generateCsrfToken(sessionId);
    res.setHeader("X-CSRF-Token", token);
  }
  next();
}

