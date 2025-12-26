import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '@nolsaf/prisma';

export type Role = 'ADMIN' | 'OWNER' | 'USER' | 'DRIVER';

export interface AuthedUser {
  id: number;
  role: Role;
  email?: string;
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
      select: { id: true, role: true, email: true },
    });

    if (!user) return null;

    // Map database role to Role type (handle case where role might be different format)
    const role = (user.role?.toUpperCase() || 'USER') as Role;
    
    return {
      id: user.id,
      role: role === 'CUSTOMER' ? 'USER' : role, // Map CUSTOMER to USER
      email: user.email || undefined,
    };
  } catch (err) {
    return null;
  }
}

// Minimal auth stub: read role and user id from headers for now.
// In production, verify JWT in Authorization: Bearer <token>
// Basic auth that attaches a user from headers (dev-friendly)
export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const token = getTokenFromRequest(req);
  if (token) {
    const user = await verifyToken(token);
    if (user) {
      req.user = user;
      return next();
    }
  }

  // DEV behavior: keep current dev-bypass so the app keeps working locally.
  // Production is strict: no token -> 401.
  if (process.env.NODE_ENV !== "production") {
    req.user = { id: 1, role: "ADMIN" };
    return next();
  }

  return res.status(401).json({ error: "Unauthorized" });
}

// Role gate. If no role required, just ensure user exists.
export function requireRole(required?: Role) {
  return async (req: AuthedRequest, res: Response, next: NextFunction) => {
    // Ensure req.user exists (supports Bearer or httpOnly cookie).
    if (!req.user) {
      const token = getTokenFromRequest(req);
      if (token) req.user = await verifyToken(token) ?? undefined;
    }

    // Dev bypass: keep local development productive.
    if (process.env.NODE_ENV !== "production") {
      if (!req.user) req.user = { id: 1, role: "ADMIN" };
      return next();
    }

    // Production: strict — no user means no access.
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });

    if (required && req.user.role !== required) {
      return res.status(403).json({ error: "Forbidden" });
    }
    return next();
  };
}

export default requireRole;
