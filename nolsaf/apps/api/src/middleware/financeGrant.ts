// apps/api/src/middleware/financeGrant.ts
import type { Request, Response, NextFunction } from "express";

declare global {
  namespace Express {
    interface User {
      id: any;
      role?: string;
    }
    interface Request {
      user?: User;
      session?: any;
    }
  }
}

export function hasFinanceGrant(req: Request): boolean {
  const ts = (req.session as any)?.financeOkUntil as number | undefined;
  return !!ts && ts > Date.now();
}

// Use for endpoints that must return UNMASKED numbers
export function requireFinanceGrant(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== "ADMIN") return res.status(403).json({ error: "Admin only" });
  if (!hasFinanceGrant(req)) {
    return res.status(403).json({ error: "OTP required", require2fa: true });
  }
  return next();
}
