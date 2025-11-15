import { NextFunction, Response } from "express";
import { AuthedRequest } from "./auth.js";

// Accept any of these roles as “admin”
const ADMIN_ROLES = new Set(["ADMIN_SUPER","ADMIN_OPS","ADMIN_SUPPORT"]);

export function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  if (!ADMIN_ROLES.has(req.user.role)) return res.status(403).json({ error: "Admin only" });
  next();
}
