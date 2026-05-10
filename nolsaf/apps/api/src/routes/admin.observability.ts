import { Router } from "express";
import type { RequestHandler } from "express";
import { prisma } from "@nolsaf/prisma";
import { requireAuth, requireRole } from "../middleware/auth.js";
import {
  clearObservedRequests,
  getObservabilitySummary,
  getImpactedUsers,
  getPrometheusMetrics,
  getRecentErrorRequests,
  getRecentRequests,
  getRecentSlowRequests,
} from "../lib/observability.js";

const router = Router();

router.use(requireAuth as unknown as RequestHandler, requireRole("ADMIN") as unknown as RequestHandler);

router.get("/summary", (_req, res) => {
  res.json({ ok: true, summary: getObservabilitySummary() });
});

router.get("/snapshot", async (req, res) => {
  const recentLimit = Number(req.query.recentLimit ?? 30);
  const slowLimit = Number(req.query.slowLimit ?? 15);
  const errorLimit = Number(req.query.errorLimit ?? 15);
  const impactedLimit = Number(req.query.impactedLimit ?? 20);
  res.json({
    ok: true,
    summary: getObservabilitySummary(),
    recent: getRecentRequests(recentLimit),
    slow: getRecentSlowRequests(slowLimit),
    errors: getRecentErrorRequests(errorLimit),
    impactedUsers: await getImpactedUsers(impactedLimit),
  });
});

router.get("/impacted-users", async (req, res) => {
  const limit = Number(req.query.limit ?? 20);
  res.json({ ok: true, items: await getImpactedUsers(limit) });
});

router.post("/impacted-users/restore", async (req, res) => {
  const impactKey = String(req.body?.impactKey ?? "").trim();
  const label = String(req.body?.label ?? "Impact item").trim().slice(0, 160);
  const note = String(req.body?.note ?? "").trim().slice(0, 500);
  const actorId = (req as any).user?.id ?? null;
  const actorRole = (req as any).user?.role ?? null;
  const ip = req.headers["x-forwarded-for"]?.toString()?.split(",")[0]?.trim() || req.socket.remoteAddress || null;
  const ua = req.headers["user-agent"]?.toString() || null;

  if (!impactKey || impactKey.length > 260) {
    return res.status(400).json({ error: "Valid impactKey is required" });
  }
  if (!actorId) {
    return res.status(401).json({ error: "Admin session is required" });
  }

  const details = {
    impactKey,
    label,
    status: "restored",
    note: note || null,
  };

  await prisma.$transaction([
    prisma.auditLog.create({
      data: {
        actorId,
        actorRole,
        action: "IMPACT_MARK_RESTORED",
        entity: "IMPACT_CENTER",
        entityId: null,
        beforeJson: null,
        afterJson: details,
        ip,
        ua,
      },
    }),
    prisma.adminAudit.create({
      data: {
        adminId: actorId,
        targetUserId: null,
        performedBy: actorId,
        action: "IMPACT_MARK_RESTORED",
        details,
      },
    }),
  ]);

  res.json({ ok: true });
});

router.get("/requests", (req, res) => {
  const limit = Number(req.query.limit ?? 100);
  res.json({ ok: true, items: getRecentRequests(limit) });
});

router.get("/slow-requests", (req, res) => {
  const limit = Number(req.query.limit ?? 50);
  res.json({ ok: true, items: getRecentSlowRequests(limit) });
});

router.get("/errors", (req, res) => {
  const limit = Number(req.query.limit ?? 50);
  res.json({ ok: true, items: getRecentErrorRequests(limit) });
});

router.get("/prometheus", (_req, res) => {
  res.type("text/plain; version=0.0.4; charset=utf-8").send(getPrometheusMetrics());
});

router.delete("/requests", (_req, res) => {
  clearObservedRequests();
  res.json({ ok: true });
});

export default router;
