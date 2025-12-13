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

// Verify JWT token and extract user info
async function verifyToken(token: string): Promise<AuthedUser | null> {
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.warn('JWT_SECRET not set, token verification disabled');
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
  // Dev bypass: treat every request as ADMIN unless in production
  if (process.env.NODE_ENV !== 'production') {
    // Try to verify token if provided, otherwise use dev default
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const user = await verifyToken(token);
      if (user) {
        req.user = user;
        return next();
      }
    }
    // Fallback to dev default
    req.user = { id: 1, role: 'ADMIN' };
    return next();
  }

  // Production: verify JWT token
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const user = await verifyToken(token);
    if (user) {
      req.user = user;
      return next();
    }
  }

  // Fallback to header-based auth (for backward compatibility)
  const roleHeader = (req.headers['x-role'] as string | undefined)?.toUpperCase() as Role | undefined;
  const idHeader = req.headers['x-user-id'] as string | undefined;
  const role: Role = roleHeader ?? 'OWNER';
  const id = Number(idHeader ?? '1');
  req.user = { id, role };
  next();
}

// Role gate. If no role required, just ensure user exists.
export function requireRole(required?: Role) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    // Dev bypass: ensure ADMIN user and allow
    if (process.env.NODE_ENV !== 'production') {
      if (!req.user) req.user = { id: 1, role: 'ADMIN' };
      return next();
    }
    if (!req.user) {
      // attach a default user from headers if missing
      requireAuth(req, res, () => {});
    }
    if (required && req.user && req.user.role !== required) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    return next();
  };
}

export default requireRole;
