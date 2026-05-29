// apps/api/src/routes/admin.fx.ts
//
// Admin display-currency rate management (manual entry).
//
//   GET /api/admin/fx   — current effective rates + bounds + supported currencies
//   PUT /api/admin/fx   — set manual TZS-per-unit rates (validated, audited)
//
// Presentation only. These rates never touch a charge, payout, or invoice total.

import { Router, type Response } from "express";
import type { RequestHandler } from "express";
import { z } from "zod";
import { prisma } from "@nolsaf/prisma";
import { AuthedRequest, requireAuth, requireRole } from "../middleware/auth.js";
import { audit } from "../lib/audit.js";
import {
  BASE_CURRENCY,
  RATE_BOUNDS,
  SUPPORTED_CURRENCIES,
  SUPPORTED_CURRENCY_CODES,
  getFxRates,
  setManualRates,
} from "../lib/fx.js";

export const router = Router();
router.use(requireAuth, requireRole("ADMIN"));

// GET /api/admin/fx — everything the admin UI needs to render the editor.
router.get("/", (async (_req: AuthedRequest, res: Response) => {
  const state = await getFxRates(true);
  res.json({
    base: state.base,
    tzsPerUnit: state.tzsPerUnit,
    locked: state.locked,
    updatedAt: state.updatedAt,
    source: state.source,
    stale: state.stale,
    bounds: RATE_BOUNDS,
    currencies: SUPPORTED_CURRENCY_CODES.map((code) => SUPPORTED_CURRENCIES[code]),
  });
}) as RequestHandler);

// GET /api/admin/fx/audit — recent FX rate-change trail (who/when/what).
// Reads the same auditLog the PUT handler writes to, so the UI proves every
// change is recorded.
router.get("/audit", (async (_req: AuthedRequest, res: Response) => {
  const rows = await prisma.auditLog.findMany({
    where: { action: "ADMIN_FX_RATES_UPDATE", entity: "settings:fx" },
    orderBy: { createdAt: "desc" },
    take: 15,
    include: {
      actor: { select: { id: true, email: true, name: true, role: true } },
    },
  });

  res.json(
    rows.map((r) => ({
      id: String(r.id),
      actorId: r.actorId ?? null,
      actorRole: r.actorRole ?? null,
      actor: r.actor
        ? { id: r.actor.id, email: r.actor.email, name: (r.actor as any).name, role: (r.actor as any).role }
        : null,
      ip: r.ip ?? null,
      createdAt: r.createdAt,
      before: (r.beforeJson as any) ?? null,
      after: (r.afterJson as any) ?? null,
    }))
  );
}) as RequestHandler);

const putRatesSchema = z.object({
  // TZS per 1 unit of each currency, e.g. { USD: 2600, EUR: 2800 }.
  tzsPerUnit: z.record(z.string(), z.number().finite().positive()),
  // Optional per-currency pin (protects a rate from a future auto feed).
  locked: z.record(z.string(), z.boolean()).optional(),
});

// PUT /api/admin/fx — validate + persist manual rates.
router.put("/", (async (req: AuthedRequest, res: Response) => {
  const parsed = putRatesSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid rate payload", details: parsed.error.flatten() });
  }

  const before = await getFxRates(true);

  const result = await setManualRates({
    tzsPerUnit: parsed.data.tzsPerUnit,
    locked: parsed.data.locked,
  });

  if (!result.ok && result.state.source === "fallback" && result.rejected.some((r) => r.code === "*")) {
    // Column not available — surface a clear 409 rather than a silent no-op.
    return res.status(409).json({
      error: "FX rates storage is not available yet (database not migrated).",
      rejected: result.rejected,
    });
  }

  await audit(
    req,
    "ADMIN_FX_RATES_UPDATE",
    "settings:fx",
    { tzsPerUnit: before.tzsPerUnit, locked: before.locked, source: before.source },
    { tzsPerUnit: result.state.tzsPerUnit, locked: result.state.locked, source: result.state.source }
  );

  res.json({
    ok: result.ok,
    base: BASE_CURRENCY,
    tzsPerUnit: result.state.tzsPerUnit,
    locked: result.state.locked,
    updatedAt: result.state.updatedAt,
    source: result.state.source,
    rejected: result.rejected,
  });
}) as RequestHandler);

export default router;
