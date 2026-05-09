import type { NextFunction, Request, Response } from "express";
import { randomUUID } from "crypto";

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const inbound = req.headers["x-request-id"];
  const requestId = Array.isArray(inbound) ? inbound[0] : inbound;
  const id = sanitizeRequestId(requestId) || randomUUID();

  (req as any).requestId = id;
  res.setHeader("x-request-id", id);
  next();
}

function sanitizeRequestId(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 120) return null;
  if (!/^[a-zA-Z0-9._:-]+$/.test(trimmed)) return null;
  return trimmed;
}
