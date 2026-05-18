import { Router } from "express";
import type { RequestHandler } from "express";
import { prisma } from "@nolsaf/prisma";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth as unknown as RequestHandler);
router.use(requireRole("ADMIN") as unknown as RequestHandler);

type RevenueStatus = "NEW" | "VERIFIED" | "APPROVED" | "DISBURSED" | "REJECTED";

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * GET /api/admin/tour-revenue/overview
 * Admin view: Returns revenue summary and all revenue records across all operators
 */
router.get("/overview", async (req: any, res) => {
  try {
    // Fetch all tour revenue records
    const bookings = await prisma.tourBooking.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        bookingCode: true,
        operatorAgentId: true,
        operator: {
          select: {
            id: true,
            user: {
              select: {
                fullName: true,
                name: true,
              },
            },
          },
        },
        title: true,
        destination: true,
        travelerCount: true,
        grossAmount: true,
        commissionAmount: true,
        currency: true,
        paymentStatus: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Fetch system commission setting
    const settings = await prisma.systemSetting.findFirst({
      select: { commissionPercent: true },
    });
    const commissionPercent = num(settings?.commissionPercent ?? 10);

    // Map bookings to revenue records with status
    const revenueRecords = bookings.map((booking) => {
      const grossAmount = num(booking.grossAmount || 0);
      const commissionAmount = num(booking.commissionAmount || 0);
      const netAmount = grossAmount - commissionAmount;
      const operatorName = booking.operator?.user?.fullName || booking.operator?.user?.name || `Operator #${booking.operatorAgentId}`;

      // Determine status based on payment status
      let status: RevenueStatus = "NEW";
      const paymentStatus = String(booking.paymentStatus || "").toUpperCase();
      if (paymentStatus === "PAID") status = "VERIFIED";
      if (paymentStatus === "APPROVED") status = "APPROVED";
      if (paymentStatus === "DISBURSED") status = "DISBURSED";
      if (paymentStatus === "REJECTED") status = "REJECTED";

      return {
        id: booking.id,
        bookingId: booking.id,
        bookingCode: booking.bookingCode,
        operatorAgentId: booking.operatorAgentId,
        operatorName,
        tourTitle: booking.title || "Untitled Tour",
        destination: booking.destination || "Unknown",
        numberOfPeople: booking.travelerCount || 0,
        grossAmount,
        commissionPercent,
        commissionAmount,
        netAmount,
        currency: booking.currency || "TZS",
        status,
        paymentRef: null,
        rejectionReason: null,
        createdAt: booking.createdAt,
        updatedAt: booking.updatedAt,
      };
    });

    // Calculate summary
    const summary = {
      total: revenueRecords.length,
      new: revenueRecords.filter((r) => r.status === "NEW").length,
      verified: revenueRecords.filter((r) => r.status === "VERIFIED").length,
      approved: revenueRecords.filter((r) => r.status === "APPROVED").length,
      disbursed: revenueRecords.filter((r) => r.status === "DISBURSED").length,
      rejected: revenueRecords.filter((r) => r.status === "REJECTED").length,
      totalAmount: revenueRecords.reduce((sum, r) => sum + r.grossAmount, 0),
      disbursedAmount: revenueRecords
        .filter((r) => r.status === "DISBURSED")
        .reduce((sum, r) => sum + r.netAmount, 0),
    };

    return res.json({
      ok: true,
      summary,
      revenues: revenueRecords,
    });
  } catch (err: any) {
    console.error("[GET /api/admin/tour-revenue/overview] Error:", err);
    return res.status(500).json({ ok: false, error: "Failed to load revenue overview" });
  }
});

/**
 * POST /api/admin/tour-revenue/action
 * Admin execute revenue action (verify, approve, disburse, reject)
 * Body: { revenueId: number, action: "verify"|"approve"|"disburse"|"reject", paymentRef?: string, reason?: string }
 */
router.post("/action", async (req: any, res) => {
  try {
    const adminId = Number(req.user?.id);
    const { revenueId, action, paymentRef, reason } = req.body || {};

    if (!adminId) return res.status(401).json({ ok: false, error: "Unauthorized" });
    if (!revenueId || !action) return res.status(400).json({ ok: false, error: "Missing required fields" });

    const validActions = ["verify", "approve", "disburse", "reject"];
    if (!validActions.includes(action)) {
      return res.status(400).json({ ok: false, error: "Invalid action" });
    }

    // Fetch the booking
    const booking = await prisma.tourBooking.findUnique({
      where: { id: Number(revenueId) },
    });

    if (!booking) {
      return res.status(404).json({ ok: false, error: "Revenue record not found" });
    }

    // Perform action
    let updatedData: any = { updatedAt: new Date() };

    if (action === "verify") {
      updatedData.paymentStatus = "PAID";
    } else if (action === "approve") {
      updatedData.paymentStatus = "APPROVED";
    } else if (action === "disburse") {
      if (!paymentRef) return res.status(400).json({ ok: false, error: "Payment reference required" });
      updatedData.paymentStatus = "DISBURSED";
      updatedData.paymentRef = paymentRef;
    } else if (action === "reject") {
      updatedData.paymentStatus = "REJECTED";
      updatedData.rejectionReason = reason || "No reason provided";
    }

    const updated = await prisma.tourBooking.update({
      where: { id: Number(revenueId) },
      data: updatedData,
    });

    // Log audit trail
    try {
      await (prisma as any).auditLog?.create?.({
        data: {
          actorId: adminId,
          actorRole: "ADMIN",
          action: `TOUR_REVENUE_${action.toUpperCase()}`,
          entity: `tour-booking:${revenueId}`,
          entityId: String(revenueId),
          afterJson: { action, ...updatedData } as any,
        },
      });
    } catch {
      // Audit logging is optional
    }

    return res.json({
      ok: true,
      message: `Revenue ${action}ed successfully`,
      booking: updated,
    });
  } catch (err: any) {
    console.error("[POST /api/admin/tour-revenue/action] Error:", err);
    return res.status(500).json({ ok: false, error: "Action failed" });
  }
});

export default router;
