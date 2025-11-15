import { Router } from "express";
import { prisma } from "@nolsaf/prisma";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { invalidateOwnerReports } from "../lib/cache.js";

export const router = Router();
import type { RequestHandler } from "express";

router.use(requireAuth as RequestHandler, requireRole("ADMIN") as RequestHandler);

// helpers
function receiptNumberFor(id: number) {
  const now = new Date();
  return `RCT-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,"0")}-${id}`;
}

/** POST /admin/invoices/:id/approve */
router.post("/:id/approve", async (req, res) => {
  const id = Number(req.params.id);
  const inv = await prisma.invoice.update({ where: { id }, data: { status: "APPROVED", approvedAt: new Date() } });
  await invalidateOwnerReports(inv.ownerId); // invalidate cache for the owner
  req.app.get("io").emit("admin:invoice:status", { id: inv.id, status: inv.status });
  res.json({ ok: true, status: inv.status });
});

/** POST /admin/invoices/:id/process */
router.post("/:id/process", async (req, res) => {
  const id = Number(req.params.id);
  const inv = await prisma.invoice.update({ where: { id }, data: { status: "PROCESSING" } });
  await invalidateOwnerReports(inv.ownerId); // invalidate cache for the owner
  req.app.get("io").emit("admin:invoice:status", { id: inv.id, status: inv.status });
  res.json({ ok: true, status: inv.status });
});

/** POST /admin/invoices/:id/pay
 * Body: { paymentRef?: string, commissionPercent?: number }
 * - computes commission & net, stamps receipt and marks PAID
 */
router.post("/:id/pay", async (req, res) => {
  const id = Number(req.params.id);
  const { paymentRef, commissionPercent } = req.body ?? {};

  const updated = await prisma.$transaction(async (tx: { invoice: { findUnique: (arg0: { where: { id: number; }; }) => any; update: (arg0: { where: { id: number; }; data: { status: string; paidAt: Date; commissionPercent: any; commissionAmount: any; netPayable: any; receiptNumber: any; paymentRef: any; }; }) => any; }; }) => {
  const inv = await tx.invoice.findUnique({ where: { id } });
  if (!inv) return null;
    const percent = commissionPercent != null ? Number(commissionPercent) : Number(inv.commissionPercent ?? 0);
    const commissionAmount = ((Number(inv.total) * percent) / 100);
    const netPayable = Number(inv.total) - commissionAmount;

    const paid = await tx.invoice.update({
      where: { id },
      data: {
        status: "PAID",
        paidAt: new Date(),
        commissionPercent: percent as any,
        commissionAmount: commissionAmount as any,
        netPayable: netPayable as any,
        receiptNumber: inv.receiptNumber ?? receiptNumberFor(id),
        paymentRef: paymentRef ?? inv.paymentRef ?? undefined,
      },
    });

    // Attempt to create a payout record for this invoice if the Payout model/table exists.
    // This is best-effort: if your Prisma schema doesn't have `payout`, the runtime will skip it.
    try {
      // gather some booking/driver info if available
      let booking: any = null;
      try {
        booking = await (tx as any).booking?.findUnique?.({ where: { id: inv.bookingId } });
      } catch (e) {
        // ignore if booking model is absent
      }

      if ((tx as any).payout) {
        await (tx as any).payout.create({
          data: {
            invoiceId: paid.id,
            invoiceNumber: paid.invoiceNumber ?? inv.invoiceNumber,
            tripCode: booking?.tripCode ?? booking?.code ?? null,
            paidAt: paid.paidAt,
            paymentMethod: paid.paymentMethod ?? null,
            paymentRef: paid.paymentRef ?? null,
            gross: inv.total as any,
            commissionAmount: commissionAmount as any,
            netPaid: netPayable as any,
            ownerId: inv.ownerId ?? null,
            driverId: booking?.driverId ?? null,
            createdAt: new Date(),
          },
        });
      }
    } catch (err) {
      // non-fatal: log and continue. Avoid making the transaction fail if payout model is missing.
      console.warn('create payout (admin.pay) skipped or failed:', String(err));
    }

    return paid;
  });

  if (!updated) return res.status(404).json({ error: "Not found" });
  try { await invalidateOwnerReports(updated.ownerId); } catch (e) { /* ignore */ }
  req.app.get("io").emit("admin:invoice:paid", { id: updated.id });
  res.json({ ok: true, status: updated.status, receiptNumber: updated.receiptNumber });
});

/** POST /admin/invoices/:id/reject  Body: { reason } */
router.post("/:id/reject", async (req, res) => {
  const id = Number(req.params.id);
  const reason = (req.body?.reason as string) || "Not specified";
  const inv = await prisma.invoice.update({
    where: { id },
    data: { status: "REJECTED", rejectedAt: new Date(), rejectedReason: reason },
  });
  await invalidateOwnerReports(inv.ownerId); // invalidate cache for the owner
  req.app.get("io").emit("admin:invoice:status", { id: inv.id, status: inv.status, reason });
  res.json({ ok: true, status: inv.status });
});
