import { Router } from "express";
import rateLimit from "express-rate-limit";
import { prisma } from "@nolsaf/prisma";
import { maskIpAddress, normalizeRoute } from "../lib/observability.js";

const router = Router();

const limitClientErrors = rateLimit({
  windowMs: 60_000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: "Too many client error reports" },
});

router.post("/", limitClientErrors, async (req, res) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const message = trimText(body.message, 500);
    const source = trimText(body.source, 300);
    const stack = trimText(body.stack, 2000);
    const path = trimText(body.path, 300);
    const userAgent = trimText(req.headers["user-agent"], 255);

    if (!message && !stack) {
      return res.status(400).json({ ok: false, error: "Missing error message" });
    }

    await prisma.auditLog.create({
      data: {
        actorId: (req as any).user?.id ?? null,
        actorRole: (req as any).user?.role ?? null,
        action: "CLIENT_ERROR",
        entity: "CLIENT",
        entityId: null,
        ip: maskIpAddress(req.headers["x-forwarded-for"]?.toString()?.split(",")[0]?.trim() || req.socket.remoteAddress || null),
        ua: userAgent,
        beforeJson: null,
        afterJson: {
          message,
          source,
          stack,
          path,
          timestamp: new Date().toISOString(),
        },
      },
    });

    res.status(202).json({ ok: true });
  } catch (err: any) {
    console.warn("[client-errors] failed to record client error", err?.message || err);
    res.status(202).json({ ok: true });
  }
});

router.post("/health", limitClientErrors, async (req, res) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const path = trimText(body.path, 300);
    const userAgent = trimText(req.headers["user-agent"], 255);

    if (!path) {
      return res.status(400).json({ ok: false, error: "Missing route path" });
    }

    await prisma.auditLog.create({
      data: {
        actorId: (req as any).user?.id ?? null,
        actorRole: (req as any).user?.role ?? null,
        action: "CLIENT_ROUTE_HEALTH",
        entity: "CLIENT",
        entityId: null,
        ip: maskIpAddress(req.headers["x-forwarded-for"]?.toString()?.split(",")[0]?.trim() || req.socket.remoteAddress || null),
        ua: userAgent,
        beforeJson: null,
        afterJson: {
          path,
          route: normalizeRoute(path),
          timestamp: new Date().toISOString(),
        },
      },
    });

    res.status(202).json({ ok: true });
  } catch (err: any) {
    console.warn("[client-errors] failed to record client route health", err?.message || err);
    res.status(202).json({ ok: true });
  }
});

function trimText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

export default router;
