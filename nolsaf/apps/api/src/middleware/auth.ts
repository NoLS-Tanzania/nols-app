import { Request, Response, NextFunction } from 'express';

export type Role = 'ADMIN' | 'OWNER' | 'USER' | 'DRIVER';

export interface AuthedUser {
  id: number;
  role: Role;
  email?: string;
}

export interface AuthedRequest extends Request {
  user?: AuthedUser;
}

// Minimal auth stub: read role and user id from headers for now.
// In production, verify JWT in Authorization: Bearer <token>
// Basic auth that attaches a user from headers (dev-friendly)
export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  // Dev bypass: treat every request as ADMIN unless in production
  if (process.env.NODE_ENV !== 'production') {
    req.user = { id: 1, role: 'ADMIN' };
    return next();
  }
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
