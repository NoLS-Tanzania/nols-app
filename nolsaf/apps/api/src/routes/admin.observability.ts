import { Router } from "express";
import type { RequestHandler } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import {
  clearObservedRequests,
  getObservabilitySummary,
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

router.get("/snapshot", (req, res) => {
  const recentLimit = Number(req.query.recentLimit ?? 30);
  const slowLimit = Number(req.query.slowLimit ?? 15);
  const errorLimit = Number(req.query.errorLimit ?? 15);
  res.json({
    ok: true,
    summary: getObservabilitySummary(),
    recent: getRecentRequests(recentLimit),
    slow: getRecentSlowRequests(slowLimit),
    errors: getRecentErrorRequests(errorLimit),
  });
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
