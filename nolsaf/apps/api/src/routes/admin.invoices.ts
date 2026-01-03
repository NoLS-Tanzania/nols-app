import { Router } from "express";
import { prisma } from "@nolsaf/prisma";
import type { Prisma } from "@prisma/client";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { invalidateOwnerReports } from "../lib/cache.js";
import { makeQR } from "../lib/qr.js";
import type { AuthedRequest } from "../middleware/auth.js";

export const router = Router();
import type { RequestHandler } from "express";

router.use(requireAuth as RequestHandler, requireRole("ADMIN") as RequestHandler);

/** GET /admin/invoices - List invoices with pagination */
router.get("/", async (req, res) => {
  try {
    const { status, ownerId, propertyId, from, to, q, page = "1", pageSize = "50" } = req.query as any;

    const where: any = {};
    if (status) where.status = status;
    if (ownerId) where.ownerId = Number(ownerId);
    if (from || to) {
      where.issuedAt = {};
      if (from) where.issuedAt.gte = new Date(String(from));
      if (to) where.issuedAt.lte = new Date(String(to));
    }
    if (propertyId) {
      where.booking = { propertyId: Number(propertyId) };
    }
    if (q) {
      // MySQL doesn't support mode: "insensitive", so we use contains which is case-sensitive
      // For case-insensitive search, we'd need to use raw SQL, but contains works for most cases
      // Handle null-safe queries for optional relations
      const searchTerm = String(q).trim();
      if (searchTerm) {
        where.OR = [
          { invoiceNumber: { contains: searchTerm } },
          { receiptNumber: { contains: searchTerm } },
          { booking: { property: { title: { contains: searchTerm } } } },
        ];
      }
    }

    const skip = (Number(page) - 1) * Number(pageSize);
    const take = Math.min(Number(pageSize), 100);

    const [items, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: { 
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              role: true,
            }
          },
          booking: { 
            include: { 
              property: {
                select: {
                  id: true,
                  title: true,
                  type: true,
                }
              },
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                }
              }
            } 
          },
          verifiedByUser: {
            select: {
              id: true,
              name: true,
            }
          },
          approvedByUser: {
            select: {
              id: true,
              name: true,
            }
          },
          paidByUser: {
            select: {
              id: true,
              name: true,
            }
          },
        },
        orderBy: { id: "desc" },
        skip, take,
      }),
      prisma.invoice.count({ where }),
    ]);

    res.json({ total, page: Number(page), pageSize: take, items });
  } catch (err: any) {
    // If the DB schema is out-of-date (missing column), Prisma will throw P2022
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2022") {
        console.error("Prisma schema mismatch error in /admin/invoices:", err.message);
        return res.status(500).json({ error: "Database schema mismatch: missing column(s). Please run migrations.", detail: err.message });
      }
      if (err.code === "P2025") {
        console.error("Prisma record not found in /admin/invoices:", err.message);
        return res.status(404).json({ error: "Record not found", detail: err.message });
      }
    }
    console.error("Unhandled error in GET /admin/invoices:", err);
    console.error("Error stack:", err?.stack);
    res.status(500).json({ error: "Internal server error", detail: err?.message || String(err) });
  }
});

// helpers
function receiptNumberFor(id: number) {
  const now = new Date();
  return `RCT-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,"0")}-${id}`;
}

function nextReceiptNumber(prefix = "RCPT", seq: number) {
  const y = new Date().getFullYear();
  return `${prefix}/${y}/${String(seq).padStart(5, "0")}`;
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
  
  const io = req.app.get("io");
  io.emit("admin:invoice:paid", { id: updated.id });
  
  // Create referral earnings and emit updates if booking belongs to a referred user
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: updated.id },
      include: { booking: { select: { userId: true, id: true } } }
    });
    
    if (invoice?.booking?.userId) {
      // Import and create referral earning
      const { createReferralEarning } = await import('../lib/referral-earnings.js');
      const earning = await createReferralEarning(
        invoice.booking.userId,
        invoice.booking.id,
        updated.id,
        Number(invoice.total || 0)
      );

      if (earning) {
        // Check if this user was referred by a driver
        const user = await prisma.user.findUnique({
          where: { id: invoice.booking.userId },
          select: { referredBy: true, role: true }
        });
        
        if (user?.referredBy) {
          // Only emit for CUSTOMER/USER roles (they earn credits)
          if (user.role === 'CUSTOMER' || user.role === 'USER') {
            const bookingAmount = Number(invoice.total || 0);
            const creditsEarned = Number(earning.amount || 0);
            
            // Emit credit notification to referring driver
            io.to(`driver:${user.referredBy}`).emit('referral-notification', {
              type: 'credits_earned',
              message: `You earned ${creditsEarned.toLocaleString()} TZS credits from a booking!`,
              referralData: {
                userId: invoice.booking.userId,
                bookingId: invoice.bookingId,
                amount: bookingAmount,
                creditsEarned,
                earningId: earning.id,
              }
            });
            
            // Emit referral update to refresh dashboard
            io.to(`driver:${user.referredBy}`).emit('referral-update', {
              driverId: user.referredBy,
              timestamp: Date.now(),
              action: 'credits_earned',
            });
          }
        }
      }
    }
  } catch (e) {
    console.warn('Failed to create referral earning or emit update', e);
  }
  
  res.json({ ok: true, status: updated.status, receiptNumber: updated.receiptNumber });
});

/** POST /admin/invoices/:id/reject  Body: { reason } */
router.post("/:id/reject", async (req, res) => {
  const id = Number(req.params.id);
  const reason = (req.body?.reason as string) || "Not specified";
  const inv = await prisma.invoice.update({
    where: { id },
    data: { status: "REJECTED", rejectedAt: new Date(), rejectedReason: reason } as any,
  });
  await invalidateOwnerReports(inv.ownerId); // invalidate cache for the owner
  req.app.get("io").emit("admin:invoice:status", { id: inv.id, status: inv.status, reason });
  res.json({ ok: true, status: inv.status });
});

/** POST /admin/invoices/:id/mark-paid
 * body: { method, ref }
 * - stamps PAID, generates receiptNumber, QR payload & PNG
 * - emits socket "admin:invoice:paid" so Admin UI auto-refreshes
 */
router.post("/:id/mark-paid", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const authReq = req as AuthedRequest;
    const adminId = authReq.user?.id;
    if (!adminId) return res.status(401).json({ error: "Unauthorized" });
    
    const method = String(req.body?.method ?? "BANK");
    const ref = String(req.body?.ref ?? "");

    const inv = await prisma.invoice.findUnique({
      where: { id },
      include: { booking: { include: { property: true } } },
    });
    if (!inv) return res.status(404).json({ error: "Invoice not found" });
    if (inv.status === "PAID") return res.status(400).json({ error: "Already PAID" });

    const seq = await prisma.invoice.count({ where: { status: "PAID" } });
    const receiptNumber = inv.receiptNumber ?? nextReceiptNumber("RCPT", seq + 1);

    const payload = JSON.stringify({
      receipt: receiptNumber,
      invoice: inv.invoiceNumber,
      amount: inv.netPayable ?? inv.total,
      property: inv.booking?.property?.title,
      bookingId: inv.bookingId,
      issuedAt: inv.issuedAt,
      ref,
    });
    const { png, payload: qrPayload } = await makeQR(payload);

    const updated = await prisma.invoice.update({
      where: { id },
      data: {
        status: "PAID",
        paidBy: adminId,
        paidAt: new Date(),
        paymentMethod: method,
        paymentRef: ref || inv.paymentRef || null,
        receiptNumber,
        receiptQrPayload: qrPayload,
        receiptQrPng: png,
      },
      include: { booking: true },
    });

    await invalidateOwnerReports(updated.ownerId);

    // Notify Admin dashboards
    const io = req.app.get("io");
    try {
      io?.emit?.("admin:invoice:paid", {
        invoiceId: updated.id,
        ownerId: updated.ownerId,
      });
      
      // Emit referral credit update if booking belongs to a referred user
      try {
        const booking = updated.booking;
        if (booking?.userId) {
          const user = await prisma.user.findUnique({
            where: { id: booking.userId },
            select: { referredBy: true, role: true }
          });
          
          if (user?.referredBy && io) {
            if (user.role === 'CUSTOMER' || user.role === 'USER') {
              const bookingAmount = Number(updated.total || updated.netPayable || 0);
              const creditsEarned = Math.round(bookingAmount * 0.0035); // 0.35% of booking
              
              io.to(`driver:${user.referredBy}`).emit('referral-notification', {
                type: 'credits_earned',
                message: `You earned ${creditsEarned.toLocaleString()} TZS credits from a booking!`,
                referralData: {
                  userId: booking.userId,
                  bookingId: booking.id,
                  amount: bookingAmount,
                  creditsEarned,
                }
              });
              
              io.to(`driver:${user.referredBy}`).emit('referral-update', {
                driverId: user.referredBy,
                timestamp: Date.now(),
                action: 'credits_earned',
              });
            }
          }
        }
      } catch (e) {
        console.warn('Failed to emit referral credit update', e);
      }
    } catch {}

    res.json({ ok: true, invoice: updated });
  } catch (err: any) {
    console.error("Error in POST /admin/invoices/:id/mark-paid", err);
    res.status(500).json({ error: "Internal server error", detail: err?.message || String(err) });
  }
});

/** GET /admin/invoices/:id/receipt.png — serve QR PNG */
router.get("/:id/receipt.png", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const inv = await prisma.invoice.findUnique({
      where: { id },
      select: { receiptQrPng: true },
    });
    if (!inv || !inv.receiptQrPng) {
      return res.status(404).json({ error: "Receipt not found" });
    }
    res.setHeader("Content-Type", "image/png");
    res.send(Buffer.from(inv.receiptQrPng));
  } catch (err: any) {
    console.error("Error in GET /admin/invoices/:id/receipt.png", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// NOTE: index.ts imports this router as a default export.
export default router;
