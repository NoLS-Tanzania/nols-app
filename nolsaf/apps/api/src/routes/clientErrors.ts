import { Router } from "express";
import { rateLimitWithRedis as rateLimit } from "../lib/redisRateLimitStore.js";
import { prisma } from "@nolsaf/prisma";
import { maskIpAddress, normalizeRoute } from "../lib/observability.js";
import { buildErrorDiagnostic } from "../lib/errorDiagnostics.js";

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
    const message = redactSecrets(trimText(body.message, 500));
    const source = trimText(body.source, 300);
    const stack = redactSecrets(trimText(body.stack, 12_000));
    const componentStack = redactSecrets(trimText(body.componentStack, 6_000));
    const path = trimText(body.path, 300);
    const release = trimText(body.release, 160);
    const line = positiveInteger(body.line);
    const column = positiveInteger(body.column);
    const userAgent = trimText(req.headers["user-agent"], 255);

    if (!message && !stack) {
      return res.status(400).json({ ok: false, error: "Missing error message" });
    }

    const diagnostic = await buildErrorDiagnostic({
      service: "web",
      message,
      source,
      stack,
      line,
      column,
      release,
    });

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
          componentStack,
          path,
          route: path ? normalizeRoute(path) : null,
          line,
          column,
          release,
          requestId: String((req as any).requestId || "") || null,
          diagnostic,
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
          release: trimText(body.release, 160),
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

function positiveInteger(value: unknown) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function redactSecrets(value: string | null) {
  if (!value) return value;
  return value
    .replace(/([?&](?:token|key|secret|password|authorization)=)[^&\s]+/gi, "$1[REDACTED]")
    .replace(/(bearer\s+)[a-z0-9._~+\/-]+=*/gi, "$1[REDACTED]");
}

export default router;
