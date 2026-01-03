// apps/api/src/middleware/csrf.ts
import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

// In-memory store for CSRF tokens (in production, use Redis)
const tokenStore = new Map<string, { token: string; expiresAt: number }>();

// Clean up expired tokens every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of tokenStore.entries()) {
    if (value.expiresAt < now) {
      tokenStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Generate a CSRF token for a session
 */
export function generateCsrfToken(sessionId: string): string {
  const token = crypto.randomBytes(32).toString("hex");
  tokenStore.set(sessionId, {
    token,
    expiresAt: Date.now() + 60 * 60 * 1000, // 1 hour
  });
  return token;
}

/**
 * Verify CSRF token
 */
export function verifyCsrfToken(sessionId: string, token: string): boolean {
  const stored = tokenStore.get(sessionId);
  if (!stored || stored.expiresAt < Date.now()) {
    return false;
  }
  return stored.token === token;
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
export function csrfProtection(req: Request, res: Response, next: NextFunction) {
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

  if (!verifyCsrfToken(sessionId, token)) {
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
export function csrfTokenHeader(req: Request, res: Response, next: NextFunction) {
  if (req.method === "GET") {
    const sessionId = getSessionId(req);
    const token = generateCsrfToken(sessionId);
    res.setHeader("X-CSRF-Token", token);
  }
  next();
}

