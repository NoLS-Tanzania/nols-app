// apps/api/src/routes/public.reports.ts
//
// Public, no login verification of sealed admin reports. An outside party (for
// example a tax authority) scans the QR on a printed report, which opens the
// public verify page; that page calls this endpoint with the sealed token and
// renders the authenticated snapshot. No credentials are required or accepted.

import { Router, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import { verifyReportSeal } from "../lib/reportSeal.js";

const router = Router();

const verifyLimiter = rateLimit({
  windowMs: 60_000,
  limit: 120,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { ok: false, error: "Too many requests" },
});

/**
 * GET /api/public/reports/verify?token=...
 * Returns the sealed report snapshot if the signature is valid.
 * Always 200 so the public page can render a clean "could not verify" state.
 */
router.get("/verify", verifyLimiter, (req: Request, res: Response) => {
  const token = String(req.query.token || req.query.t || "").trim();
  if (!token) {
    return res.status(400).json({ ok: false, error: "Missing token" });
  }

  const payload = verifyReportSeal(token);
  if (!payload) {
    return res.json({ ok: true, valid: false });
  }

  return res.json({
    ok: true,
    valid: true,
    report: {
      issuer: "NoLS Africa Co Ltd",
      kind: payload.kind,
      title: payload.title,
      ref: payload.ref,
      from: payload.from,
      to: payload.to,
      generatedAt: payload.generatedAt,
      generatedBy: payload.generatedBy,
      role: payload.role || "",
      figures: Array.isArray(payload.figures) ? payload.figures : [],
    },
  });
});

export default router;
