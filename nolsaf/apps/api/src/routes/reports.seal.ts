// apps/api/src/routes/reports.seal.ts
//
// Shared report sealing for any authenticated NoLSAF user (admin, owner, or tour
// operator). At print time the client posts the report snapshot; the server
// stamps the generator, their role, and the time, signs it, and returns a token
// to embed in the printed verification QR.
//
// Sealing requires login (any role). Verifying is public (see public.reports.ts).

import { Router } from "express";
import { rateLimitWithRedis as rateLimit } from "../lib/redisRateLimitStore.js";
import { prisma } from "@nolsaf/prisma";
import { requireAuth } from "../middleware/auth.js";
import { signReportSeal, type ReportFigure } from "../lib/reportSeal.js";

const router = Router();

// Sealing is cheap but should not be hammered. Limit per authenticated user
// (fall back to IP) so a single session cannot spin tokens in a tight loop.
const sealLimiter = rateLimit({
  windowMs: 60_000,
  limit: 60,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: (req: any) => String(req.user?.id || req.ip || "anon"),
  message: { ok: false, error: "Too many requests" },
});

router.post("/seal", requireAuth as any, sealLimiter, async (req: any, res) => {
  try {
    const body = req.body || {};
    const kind = String(body.kind || "REPORT").slice(0, 40);
    const title = String(body.title || "NoLSAF Report").slice(0, 120);
    const from = String(body.from || "").slice(0, 40);
    const to = String(body.to || "").slice(0, 40);
    const ref = (String(body.ref || "").slice(0, 60) || `${kind}-${Date.now()}`).toUpperCase();

    const figuresIn = Array.isArray(body.figures) ? body.figures : [];
    const figures: ReportFigure[] = figuresIn.slice(0, 24).map((f: any) => ({
      label: String(f?.label ?? "").slice(0, 60),
      value: String(f?.value ?? "").slice(0, 60),
    }));

    const generatedAt = new Date().toISOString();
    const role = String(req.user?.role || "USER").toUpperCase().slice(0, 20);

    // Use the user's real name. The auth token does not always carry it, so look
    // it up from the database and only fall back to an id label as a last resort.
    let generatedBy = String(req.user?.name || "").trim();
    if (!generatedBy && req.user?.id) {
      try {
        const u = await prisma.user.findUnique({
          where: { id: Number(req.user.id) },
          select: { fullName: true, name: true },
        });
        generatedBy = String((u as any)?.fullName || (u as any)?.name || "").trim();
      } catch {
        // non-fatal: fall through to the id label below
      }
    }
    if (!generatedBy) generatedBy = req.user?.id ? `User #${req.user.id}` : "User";
    generatedBy = generatedBy.slice(0, 80);

    const token = signReportSeal({ kind, title, ref, from, to, generatedAt, generatedBy, role, figures });
    return res.json({ ok: true, token, ref, generatedAt, generatedBy, role });
  } catch (err: any) {
    console.error("POST /api/reports/seal error:", err?.message || err);
    return res.status(500).json({ ok: false, error: "Failed to seal report" });
  }
});

export default router;
