// apps/api/src/routes/admin.groupStays.revenue.ts
//
// Group-stay revenue/payout tracking for admin — READ-ONLY.
//
// Mirrors the tour-revenue overview: one row per group booking with GMV, owner
// payout, and the NoLSAF take, plus a summary. It does not mutate anything and
// does not touch the existing group-stay collection/claim/assignment logic.
//
// Money model (from schema):
//   GMV (customer pays)   = GroupBooking.totalAmount
//   Owner payout          = GroupBooking.ownerAmount
//   NoLSAF revenue (take) = totalAmount - ownerAmount (commission markup)
//   Realized signal       = depositPaid = true (deal secured)
// TZS is the money of record; group stay is TZS by default.

import { Router } from "express";
import type { RequestHandler } from "express";
import { prisma } from "@nolsaf/prisma";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth as unknown as RequestHandler);
router.use(requireRole("ADMIN") as unknown as RequestHandler);

const num = (v: unknown): number => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};

type RevenueStatus = "PENDING" | "AWAITING_DEPOSIT" | "DEPOSIT_PAID" | "CONFIRMED" | "COMPLETED" | "CANCELED";

function deriveStatus(b: { status: string | null; depositPaid: boolean | null }): RevenueStatus {
  const s = String(b.status || "").toUpperCase();
  if (s === "CANCELED" || s === "CANCELLED") return "CANCELED";
  if (s === "COMPLETED") return "COMPLETED";
  if (s === "CONFIRMED") return "CONFIRMED";
  if (b.depositPaid) return "DEPOSIT_PAID";
  if (s === "AWAITING_DEPOSIT") return "AWAITING_DEPOSIT";
  return "PENDING";
}

/**
 * GET /overview
 * Returns per-booking revenue records + a summary. Only bookings that have a
 * financial figure (totalAmount or ownerAmount) are revenue-relevant.
 */
router.get("/overview", async (_req, res) => {
  try {
    const bookings = await prisma.groupBooking.findMany({
      where: { OR: [{ totalAmount: { not: null } }, { ownerAmount: { not: null } }] },
      orderBy: { createdAt: "desc" },
      take: 1000,
      select: {
        id: true,
        groupType: true,
        headcount: true,
        toRegion: true,
        toDistrict: true,
        status: true,
        currency: true,
        totalAmount: true,
        ownerAmount: true,
        commissionPercent: true,
        depositAmount: true,
        depositPaid: true,
        depositPaidAt: true,
        confirmedAt: true,
        createdAt: true,
        user: { select: { id: true, name: true, fullName: true } },
        assignedOwner: { select: { id: true, name: true, fullName: true } },
        confirmedProperty: { select: { id: true, title: true } },
      },
    });

    const records = bookings.map((b) => {
      const gmv = num(b.totalAmount);
      const ownerPayout = num(b.ownerAmount);
      const nolsafRevenue = Math.max(0, gmv - ownerPayout);
      const status = deriveStatus(b);
      const realized = b.depositPaid === true || status === "CONFIRMED" || status === "COMPLETED";
      return {
        id: b.id,
        groupType: b.groupType,
        headcount: b.headcount,
        destination: [b.toDistrict, b.toRegion].filter(Boolean).join(", ") || b.toRegion || "—",
        customerName: b.user?.fullName || b.user?.name || `User #${b.user?.id ?? "?"}`,
        ownerName: b.assignedOwner?.fullName || b.assignedOwner?.name || null,
        propertyTitle: b.confirmedProperty?.title || null,
        currency: b.currency || "TZS",
        gmv,
        ownerPayout,
        nolsafRevenue,
        commissionPercent: num(b.commissionPercent),
        depositAmount: num(b.depositAmount),
        depositPaid: b.depositPaid === true,
        status,
        realized,
        depositPaidAt: b.depositPaidAt,
        confirmedAt: b.confirmedAt,
        createdAt: b.createdAt,
      };
    });

    const realizedRecords = records.filter((r) => r.realized);
    const pendingRecords = records.filter((r) => !r.realized && r.status !== "CANCELED");

    const sum = (rows: typeof records, key: "gmv" | "ownerPayout" | "nolsafRevenue") =>
      Math.round(rows.reduce((acc, r) => acc + r[key], 0) * 100) / 100;

    const summary = {
      total: records.length,
      realizedCount: realizedRecords.length,
      pendingCount: pendingRecords.length,
      canceledCount: records.filter((r) => r.status === "CANCELED").length,
      gmv: sum(realizedRecords, "gmv"),
      nolsafRevenue: sum(realizedRecords, "nolsafRevenue"),
      ownerPayout: sum(realizedRecords, "ownerPayout"),
      pendingRevenue: sum(pendingRecords, "nolsafRevenue"),
    };

    return res.json({ ok: true, baseCurrency: "TZS", summary, records, generatedAt: new Date().toISOString() });
  } catch (err: any) {
    console.error("[GET /api/admin/group-stays/revenue/overview] Error:", err);
    return res.status(500).json({ ok: false, error: "Failed to load group-stay revenue" });
  }
});

export default router;
