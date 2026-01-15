import { Request, Response, NextFunction } from 'express';
import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '@nolsaf/prisma';
import { getRoleSessionMaxMinutes } from '../lib/securitySettings.js';
import { clearAuthCookie } from '../lib/sessionManager.js';

export type Role = 'ADMIN' | 'OWNER' | 'USER' | 'DRIVER';

export interface AuthedUser {
  id: number;
  role: Role;
  email?: string;
  name?: string;
}

export interface AuthedRequest extends Request {
  user?: AuthedUser;
}

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) return {};
  const out: Record<string, string> = {};
  const parts = cookieHeader.split(";");
  for (const part of parts) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (!k) continue;
    try {
      out[k] = decodeURIComponent(v);
    } catch {
      out[k] = v;
    }
  }
  return out;
}

function getTokenFromRequest(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) return authHeader.substring(7);
  const cookies = parseCookies(req.headers.cookie);
  return cookies["nolsaf_token"] || cookies["__Host-nolsaf_token"] || null;
}

// Verify JWT token and extract user info
async function verifyToken(token: string): Promise<AuthedUser | null> {
  try {
    const secret =
      process.env.JWT_SECRET ||
      (process.env.NODE_ENV !== "production" ? (process.env.DEV_JWT_SECRET || "dev_jwt_secret") : "");
    if (!secret) {
      // Production must fail closed if misconfigured
      console.error("JWT_SECRET not set in production; refusing auth");
      return null;
    }

    const decoded = jwt.verify(token, secret) as any;
    if (!decoded || !decoded.sub) return null;

    // Try to get user from database to verify role
    const userId = Number(decoded.sub);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, email: true, suspendedAt: true },
    });

    if (!user) return null;

    // Check if account is suspended - suspended users cannot access their account
    if (user.suspendedAt) {
      return null; // Return null to deny access
    }

    // Map database role to Role type (handle case where role might be different format)
    // Check raw database value before casting to handle CUSTOMER -> USER mapping
    const rawRole = (user.role?.toUpperCase() || 'USER');
    const role: Role = rawRole === 'CUSTOMER' ? 'USER' : (rawRole as Role);

    // Enforce dynamic per-role session TTL based on token issuance time.
    // This ensures that if admin reduces TTL, old tokens are also forced out.
    const issuedAtSec = typeof decoded.iat === 'number' ? decoded.iat : Number(decoded.iat);
    if (Number.isFinite(issuedAtSec) && issuedAtSec > 0) {
      const maxMinutes = await getRoleSessionMaxMinutes(role);
      const ageSec = Math.floor(Date.now() / 1000) - issuedAtSec;
      if (ageSec > maxMinutes * 60) {
        const e: any = new Error('Session expired');
        e.code = 'SESSION_EXPIRED';
        throw e;
      }
    }
    
    return {
      id: user.id,
      role,
      email: user.email || undefined,
    };
  } catch (err) {
    throw err;
  }
}

// Optional auth: if a valid token is present, attach req.user; otherwise continue.
// No DEV bypass, no 401.
export const maybeAuth: RequestHandler = async (req, _res, next) => {
  const token = getTokenFromRequest(req);
  if (token) {
    try {
      const user = await verifyToken(token);
      if (user) (req as AuthedRequest).user = user;
    } catch {
      // ignore in maybeAuth
    }
  }
  return next();
};

// Minimal auth stub: read role and user id from headers for now.
// In production, verify JWT in Authorization: Bearer <token>
// Basic auth that attaches a user from headers (dev-friendly)
export const requireAuth: RequestHandler = async (req, res, next) => {
  const token = getTokenFromRequest(req);
  if (token) {
    try {
      const user = await verifyToken(token);
      if (user) {
        (req as AuthedRequest).user = user;
        return next();
      }
    } catch (err: any) {
      if (err?.code === 'SESSION_EXPIRED') {
        clearAuthCookie(res);
        return res.status(401).json({ error: 'Session expired', code: 'SESSION_EXPIRED' });
      }
      // fallthrough to suspended/unauthorized logic
    }
    // Check if token is valid but user is suspended
    try {
      const secret = process.env.JWT_SECRET || (process.env.NODE_ENV !== "production" ? (process.env.DEV_JWT_SECRET || "dev_jwt_secret") : "");
      if (secret) {
        const decoded = jwt.verify(token, secret) as any;
        if (decoded?.sub) {
          const userId = Number(decoded.sub);
          const dbUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { suspendedAt: true },
          });
          if (dbUser?.suspendedAt) {
            return res.status(403).json({ error: "Account suspended", code: "ACCOUNT_SUSPENDED" });
          }
        }
      }
    } catch (e) {
      // Token invalid or other error - continue to unauthorized
    }
  }

  // DEV behavior: keep current dev-bypass so the app keeps working locally.
  // Production is strict: no token -> 401.
  if (process.env.NODE_ENV !== "production" && process.env.NODE_ENV !== "test") {
    (req as AuthedRequest).user = { id: 1, role: "ADMIN" };
    return next();
  }

  return res.status(401).json({ error: "Unauthorized" });
};

// Role gate. If no role required, just ensure user exists.
export function requireRole(required?: Role) {
  const handler: RequestHandler = async (req, res, next) => {
    // Ensure req.user exists (supports Bearer or httpOnly cookie).
    if (!(req as AuthedRequest).user) {
      const token = getTokenFromRequest(req);
      if (token) {
        try {
          const verified = await verifyToken(token);
          if (verified) {
            (req as AuthedRequest).user = verified;
          } else {
            // token verified but user not found/suspended etc
          }
        } catch (err: any) {
          if (err?.code === 'SESSION_EXPIRED') {
            clearAuthCookie(res);
            return res.status(401).json({ error: 'Session expired', code: 'SESSION_EXPIRED' });
          }
          // Check if token is valid but user is suspended
          try {
            const secret = process.env.JWT_SECRET || (process.env.NODE_ENV !== "production" ? (process.env.DEV_JWT_SECRET || "dev_jwt_secret") : "");
            if (secret) {
              const decoded = jwt.verify(token, secret) as any;
              if (decoded?.sub) {
                const userId = Number(decoded.sub);
                const dbUser = await prisma.user.findUnique({
                  where: { id: userId },
                  select: { suspendedAt: true },
                });
                if (dbUser?.suspendedAt) {
                  return res.status(403).json({ error: "Account suspended", code: "ACCOUNT_SUSPENDED" });
                }
              }
            }
          } catch (e) {
            // Token invalid or other error - continue to unauthorized
          }
        }
      }
    }

    // Dev bypass: keep local development productive.
    if (process.env.NODE_ENV !== "production" && process.env.NODE_ENV !== "test") {
      if (!(req as AuthedRequest).user) (req as AuthedRequest).user = { id: 1, role: "ADMIN" };
      return next();
    }

    // Production: strict — no user means no access.
    if (!(req as AuthedRequest).user) return res.status(401).json({ error: "Unauthorized" });

    if (required && (req as AuthedRequest).user!.role !== required) {
      return res.status(403).json({ error: "Forbidden" });
    }
    return next();
  };

  return handler;
}

export default requireRole;
