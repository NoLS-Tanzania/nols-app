// apps/api/src/routes/webhooks.payments.ts
import { Router } from "express";
import { prisma } from "@nolsaf/prisma";
import { makeQR } from "../lib/qr.js";
import bodyParser from "body-parser"; // for raw parser here
import { invalidateOwnerReports } from "../lib/cache.js";
import { sendSms } from "../lib/sms.js";
import crypto from "crypto";
import { generateBookingCodeForBooking, sendBookingCodeNotification } from "../lib/bookingCodeService.js";
import rateLimit from "express-rate-limit";
import { safeEq } from "../lib/signature.js";

const router = Router();

// Webhooks are authenticated via signature, but still rate-limit to reduce abuse/DoS.
const webhookLimiter = rateLimit({
  windowMs: 60_000,
  limit: 300,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { ok: false, error: "Too many requests" },
});

async function notifyOwnerInvoicePaid(params: {
  ownerId: number;
  invoiceId: number;
  bookingId: number;
  receiptNumber?: string | null;
  propertyTitle?: string | null;
  checkIn?: Date | string | null;
  checkOut?: Date | string | null;
  amount?: number | null;
}) {
  const { ownerId, invoiceId, bookingId, receiptNumber, propertyTitle, checkIn, checkOut, amount } = params;
  if (!ownerId) return;

  const title = "New paid booking";
  const body =
    `Booking #${bookingId} has been paid` +
    (propertyTitle ? ` for ${propertyTitle}` : "") +
    (receiptNumber ? `. Receipt: ${receiptNumber}` : ".") +
    (checkIn ? ` Check-in: ${new Date(checkIn).toISOString().slice(0, 10)}` : "") +
    (checkOut ? ` Check-out: ${new Date(checkOut).toISOString().slice(0, 10)}` : "") +
    (amount ? ` Amount: ${Number(amount).toLocaleString()} TZS` : "");

  let already = false;
  try {
    // Best-effort idempotency via JSON path. If DB doesn't support this filter, we'll fallback.
    const existing = await prisma.notification.findFirst({
      where: {
        ownerId,
        type: "invoice",
        meta: { path: ["invoiceId"], equals: invoiceId } as any,
      } as any,
      select: { id: true },
    });
    already = !!existing;
  } catch {
    already = false;
  }

  let createdId: number | null = null;
  if (!already) {
    try {
      const n = await prisma.notification.create({
        data: {
          ownerId,
          userId: ownerId, // also populate userId for future-proofing
          title,
          body,
          type: "invoice",
          meta: {
            kind: "invoice_paid",
            invoiceId,
            bookingId,
            actionUrl: "/owner/bookings/recent",
          },
        },
        select: { id: true },
      });
      createdId = Number(n.id);
    } catch {
      // non-fatal
    }
  }

  const io = (global as any).io;
  if (io) {
    // Targeted: owners can join owner room; payload has no sensitive data.
    io.to(`owner:${ownerId}`).emit("owner:bookings:updated", { bookingId, invoiceId });
    io.to(`owner:${ownerId}`).emit("notification:new", { id: createdId, title, type: "invoice" });
    // Backward-compat: some owner pages don't join rooms yet; broadcast a lightweight refresh signal.
    io.emit("owner:bookings:updated", { bookingId, invoiceId });
  }

}

async function notifyAdminsInvoicePaid(params: {
  invoiceId: number;
  invoiceNumber?: string | null;
  bookingId: number;
  ownerId?: number | null;
  receiptNumber?: string | null;
  propertyTitle?: string | null;
  totalPaid?: number | null;
  ownerPayout?: number | null;
  commissionAmount?: number | null;
  transportFare?: number | null;
  currency?: string | null;
}) {
  const {
    invoiceId,
    invoiceNumber,
    bookingId,
    ownerId,
    receiptNumber,
    propertyTitle,
    totalPaid,
    ownerPayout,
    commissionAmount,
    transportFare,
    currency,
  } = params;

  const admins = await prisma.user.findMany({
    where: { role: "ADMIN", isDisabled: { not: true } },
    select: { id: true },
  });
  if (!admins.length) return;

  const fmt = (v?: number | null) =>
    typeof v === "number" && Number.isFinite(v) ? `${Math.round(v).toLocaleString()} ${currency || "TZS"}` : null;

  const title = "Invoice paid";
  const body =
    `${invoiceNumber ? `Invoice ${invoiceNumber}` : `Invoice #${invoiceId}`} paid` +
    ` for Booking #${bookingId}` +
    (propertyTitle ? ` (${propertyTitle})` : "") +
    (receiptNumber ? `. Receipt: ${receiptNumber}` : ".") +
    (fmt(totalPaid) ? ` Customer paid: ${fmt(totalPaid)}.` : "") +
    (fmt(ownerPayout) ? ` Owner payout: ${fmt(ownerPayout)}.` : "") +
    (fmt(commissionAmount) ? ` NoLSAF commission: ${fmt(commissionAmount)}.` : "") +
    (fmt(transportFare) ? ` Transport: ${fmt(transportFare)}.` : "") +
    (ownerId ? ` OwnerId: ${ownerId}.` : "");

  try {
    await prisma.notification.createMany({
      data: admins.map((a) => ({
        userId: a.id,
        title,
        body,
        type: "invoice",
        meta: {
          kind: "invoice_paid_admin",
          invoiceId,
          invoiceNumber: invoiceNumber ?? null,
          bookingId,
          ownerId: ownerId ?? null,
          receiptNumber: receiptNumber ?? null,
          propertyTitle: propertyTitle ?? null,
          totals: {
            customerPaid: totalPaid ?? null,
            ownerPayout: ownerPayout ?? null,
            commission: commissionAmount ?? null,
            transport: transportFare ?? null,
            currency: currency ?? "TZS",
          },
          actionUrl: "/admin/invoices",
        },
      })),
    });
  } catch {
    // Best-effort.
  }
}

// raw parser just for webhooks
router.use(bodyParser.raw({ type: "*/*", limit: "1mb" }));

// naive sequences for receipt/invoice numbers if needed
function nextReceiptNumber(prefix = "RCPT", seq: number) {
  const y = new Date().getFullYear();
  return `${prefix}/${y}/${String(seq).padStart(5, "0")}`;
}

async function markInvoicePaid(invId: number, method: string, paymentRef: string, phoneNumber?: string, provider?: string) {
  const inv = await prisma.invoice.findUnique({
    where: { id: invId },
    include: { booking: { include: { property: true } } },
  });
  if (!inv) throw new Error("invoice not found");
  if (inv.status === "PAID") return inv;

  const seq = await prisma.invoice.count({ status: "PAID" });
  const receiptNumber = inv.receiptNumber ?? nextReceiptNumber("RCPT", seq + 1);

  const payload = JSON.stringify({
    receipt: receiptNumber,
    invoice: inv.invoiceNumber,
    // Receipt/QR should reflect what the customer actually paid.
    amount: (inv as any).total ?? inv.netPayable,
    property: inv.booking.property?.title,
    bookingId: inv.bookingId,
    issuedAt: inv.issuedAt,
    ref: paymentRef,
    phoneNumber: phoneNumber || null,
    provider: provider || method,
  });
  const { png, payload: qrPayload } = await makeQR(payload);

  // Determine payment method from provider or method parameter
  const finalPaymentMethod = provider || method || inv.paymentMethod || "AZAMPAY";

  const updated = await prisma.invoice.update({
    where: { id: invId },
    data: {
      status: "PAID",
      paidBy: null, // webhook/system
      paidAt: new Date(),
      paymentMethod: finalPaymentMethod,
      paymentRef: paymentRef || inv.paymentRef,
      receiptNumber,
      receiptQrPayload: qrPayload,
      receiptQrPng: png,
    },
    include: { booking: true },
  });

  // If the booking included scheduled transport, publish it to drivers now.
  try {
    const bookingId = Number(updated.bookingId);
    if (Number.isFinite(bookingId) && bookingId > 0) {
      const pending = await prisma.transportBooking.findMany({
        where: {
          paymentRef: `BOOKING:${bookingId}`,
          status: "PAYMENT_PENDING",
        },
        select: {
          id: true,
          vehicleType: true,
          scheduledDate: true,
          fromAddress: true,
          toAddress: true,
          amount: true,
        },
      });

      if (pending.length) {
        const activated = await prisma.transportBooking.updateMany({
          where: {
            paymentRef: `BOOKING:${bookingId}`,
            status: "PAYMENT_PENDING",
          },
          data: {
            status: "PENDING_ASSIGNMENT",
            paymentStatus: "PAID",
            paymentMethod: updated.paymentMethod ?? method ?? null,
            paymentRef: updated.paymentRef ?? paymentRef ?? `BOOKING:${bookingId}`,
          },
        });

        // NOTE: do not broadcast transport offers here.
        // The transport auto-dispatch worker issues targeted offers (top drivers) based on live locations.

        if (activated.count) {
          // no-op; activation succeeded
        }
      }
    }
  } catch (e) {
    console.warn("Failed to activate scheduled transport booking on invoice paid:", e);
  }

  await invalidateOwnerReports(updated.ownerId);
  // Notify owner ASAP (in-app notification + realtime refresh)
  try {
    await notifyOwnerInvoicePaid({
      ownerId: updated.ownerId,
      invoiceId: updated.id,
      bookingId: updated.bookingId,
      receiptNumber: updated.receiptNumber,
      propertyTitle: (inv as any).booking?.property?.title ?? null,
      checkIn: (inv as any).booking?.checkIn ?? null,
      checkOut: (inv as any).booking?.checkOut ?? null,
      // Notify owners with the amount they actually receive.
      amount:
        (updated as any).netPayable != null
          ? Number((updated as any).netPayable)
          : null,
    });
  } catch {}

  // Notify admins (classified breakdown: customer paid vs payout vs commission vs transport)
  try {
    const bookingAny = (inv as any).booking;
    await notifyAdminsInvoicePaid({
      invoiceId: updated.id,
      invoiceNumber: updated.invoiceNumber ?? null,
      bookingId: updated.bookingId,
      ownerId: updated.ownerId,
      receiptNumber: updated.receiptNumber ?? null,
      propertyTitle: bookingAny?.property?.title ?? null,
      totalPaid: (updated as any).total != null ? Number((updated as any).total) : null,
      ownerPayout: (updated as any).netPayable != null ? Number((updated as any).netPayable) : null,
      commissionAmount:
        (updated as any).commissionAmount != null ? Number((updated as any).commissionAmount) : null,
      transportFare: bookingAny?.transportFare != null ? Number(bookingAny.transportFare) : null,
      currency: "TZS",
    });
  } catch {}
  // Best-effort: create a payout record so paid invoices show up in payouts views.
  try {
    if ((prisma as any).payout) {
      const b = (updated as any).booking;
      await (prisma as any).payout.create({
        data: {
          invoiceId: updated.id,
          invoiceNumber: updated.invoiceNumber ?? null,
          tripCode: b?.tripCode ?? b?.code ?? null,
          paidAt: updated.paidAt ?? new Date(),
          paymentMethod: updated.paymentMethod ?? null,
          paymentRef: updated.paymentRef ?? null,
          gross: (updated as any).total ?? null,
          commissionAmount: (updated as any).commissionAmount ?? null,
          netPaid: (updated as any).netPayable ?? null,
          ownerId: updated.ownerId ?? null,
          driverId: b?.driverId ?? null,
          receiptNumber: updated.receiptNumber ?? null,
          createdAt: new Date(),
        },
      });
    }
  } catch (err) {
    console.warn('create payout (webhook) skipped or failed:', String(err));
  }
  // real-time toast for admins
  // Access io from global context (set in index.ts)
  const io = (global as any).io;
  if (io) {
    io.emit("admin:invoice:paid", {
      invoiceId: updated.id,
      ownerId: updated.ownerId,
      bookingId: updated.bookingId,
      receiptNumber: updated.receiptNumber ?? null,
      totalPaid: (updated as any).total ?? null,
      ownerPayout: (updated as any).netPayable ?? null,
      commissionAmount: (updated as any).commissionAmount ?? null,
      transportFare: (inv as any).booking?.transportFare ?? null,
    });
    
    // Emit referral credit update if booking belongs to a referred user
    try {
      const booking = updated.booking;
      if (booking?.userId) {
        // Check if this user was referred by a driver
        const user = await prisma.user.findUnique({
          where: { id: booking.userId },
          select: { referredBy: true, role: true }
        });
        
        if (user?.referredBy) {
          // Only emit for CUSTOMER/USER roles (they earn credits)
          if (user.role === 'CUSTOMER' || user.role === 'USER') {
            const bookingAmount = Number(updated.total || updated.netPayable || 0);
            const creditsEarned = Math.round(bookingAmount * 0.0035); // 0.35% of booking
            
            // Emit credit notification to referring driver
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
            
            // Emit referral update to refresh dashboard
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
  }

  return updated;
}

/** Helper: number close enough */
function near(a: number, b: number, eps = 1) {
  return Math.abs(a - b) <= eps; // TZS is integer typically; allow ±1 TZS drift
}

/**
 * POST /webhooks/azampay
 * AzamPay webhook handler with signature verification
 */
router.post("/azampay", webhookLimiter, async (req: any, res) => {
  try {
    const rawBody =
      Buffer.isBuffer(req.body)
        ? req.body.toString("utf8")
        : typeof req.body === "string"
          ? req.body
          : JSON.stringify(req.body ?? {});
    const signature = req.header("X-Azampay-Signature") || req.header("x-azampay-signature");
    const secret = process.env.AZAMPAY_WEBHOOK_SECRET;

    if (!secret) {
      console.warn("AZAMPAY_WEBHOOK_SECRET not configured");
      return res.status(500).json({ ok: false, error: "Webhook secret not configured" });
    }

    if (!signature) {
      return res.status(400).json({ ok: false, error: "Signature missing" });
    }

    // Verify signature
    const computed = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
    const sig = String(signature).trim().toLowerCase();
    if (!safeEq(computed, sig)) {
      console.warn("Invalid AzamPay webhook signature");
      return res.status(401).json({ ok: false, error: "Invalid signature" });
    }

    const payload = JSON.parse(rawBody);

    // Normalize AzamPay payload
    const eventId = payload.transactionId || payload.id || payload.externalId;
    const paymentRef = payload.externalId || payload.referenceId || payload.orderId;
    const amount = Number(payload.amount || payload.transactionAmount || 0);
    const status = payload.status || payload.transactionStatus || "UNKNOWN";
    
    // Map AzamPay status to our status
    let normalizedStatus: "SUCCESS" | "FAILED" | "PENDING" = "PENDING";
    if (/success|completed|paid|approved/i.test(status)) {
      normalizedStatus = "SUCCESS";
    } else if (/failed|cancelled|rejected|declined/i.test(status)) {
      normalizedStatus = "FAILED";
    }

    if (!eventId) {
      return res.status(400).json({ ok: false, error: "Missing eventId/transactionId" });
    }

    // Idempotency: check if we've already processed this event
    const existing = await prisma.paymentEvent.findFirst({
      where: {
        provider: "AZAMPAY",
        eventId: eventId.toString(),
      },
    });

    if (existing && existing.status === normalizedStatus) {
      return res.json({ ok: true, id: existing.id, message: "Event already processed" });
    }

    // Find invoice by paymentRef
    let invoice = null as any;
    if (paymentRef) {
      invoice = await prisma.invoice.findFirst({
        where: { paymentRef: paymentRef.toString() },
        include: { booking: { include: { user: true, property: true } } },
      });
    }

    // Record the payment event
    const recorded = await prisma.paymentEvent.create({
      data: {
        provider: "AZAMPAY",
        eventId: eventId.toString(),
        invoiceId: invoice?.id ?? null,
        amount: amount,
        currency: payload.currency || "TZS",
        status: normalizedStatus,
        payload: payload,
      },
    });

    // If payment is successful, mark invoice as paid
    if (invoice && normalizedStatus === "SUCCESS") {
      const want = Number(invoice.total || invoice.netPayable || 0);
      
      // Extract phone number and provider from payment event payload or invoice
      const eventPayload = recorded.payload as any;
      const phoneNumber = eventPayload?.phoneNumber || eventPayload?.accountNumber || invoice.booking?.user?.phone || null;
      const provider = eventPayload?.provider || eventPayload?.paymentMethod || invoice.paymentMethod || "AZAMPAY";
      
      // Verify amount matches (allow small drift)
      if (near(amount, want)) {
        const updatedInvoice = await markInvoicePaid(
          invoice.id,
          "AZAMPAY",
          paymentRef || eventId.toString(),
          phoneNumber || undefined,
          provider || undefined
        );

        // Generate booking code and send notification
        if (updatedInvoice.booking?.id) {
          try {
            // Ensure booking code exists
            await generateBookingCodeForBooking(updatedInvoice.booking.id);
            
            // Send booking code notification via SMS and Email
            const notificationResult = await sendBookingCodeNotification(
              updatedInvoice.booking.id,
              { sendSms: true, sendEmail: true }
            );
            
            if (notificationResult.errors.length > 0) {
              console.warn("Booking code notification errors:", notificationResult.errors);
            } else {
              console.log(`Booking code sent: SMS=${notificationResult.smsSent}, Email=${notificationResult.emailSent}`);
            }
          } catch (codeError) {
            console.error("Failed to generate/send booking code:", codeError);
            // Don't fail the webhook if code generation fails
          }
        }

        // Also send payment confirmation SMS (legacy, can be removed later)
        try {
          const userPhone = invoice.booking?.user?.phone;
          if (userPhone) {
            const receiptNumber = updatedInvoice.receiptNumber || `RCPT-${invoice.id}`;
            const smsMessage = `Payment Successful! Your payment of ${amount.toLocaleString()} TZS has been received. Receipt: ${receiptNumber}. Thank you for using NoLSAF!`;
            await sendSms(userPhone, smsMessage);
          }
        } catch (smsErr) {
          console.warn("Failed to send payment confirmation SMS:", smsErr);
          // Don't fail the webhook if SMS fails
        }
      } else {
        console.warn(`Amount mismatch: expected ${want}, received ${amount}`);
      }
    }

    res.json({ ok: true, id: recorded.id });
  } catch (e: any) {
    console.error("AzamPay webhook error:", e);
    return res.status(400).json({ ok: false, error: e.message || "bad request" });
  }
});

export default router;
