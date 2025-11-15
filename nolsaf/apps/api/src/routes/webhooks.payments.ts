// apps/api/src/routes/webhooks.payments.ts
import { Router } from "express";
import { prisma } from "@nolsaf/prisma";
import { hmacSha256Hex, safeEq } from "../lib/signature.js";
import { makeQR } from "../lib/qr.js";
import bodyParser from "body-parser"; // for raw parser here
import { invalidateOwnerReports } from "../lib/cache.js";

const router = Router();

// raw parser just for webhooks
router.use(bodyParser.raw({ type: "*/*", limit: "1mb" }));

/** helper: number close enough */
function near(a: number, b: number, eps = 1) {
  return Math.abs(a - b) <= eps; // TZS is integer typically; allow ±1 TZS drift
}

// naive sequences for receipt/invoice numbers if needed
function nextReceiptNumber(prefix = "RCPT", seq: number) {
  const y = new Date().getFullYear();
  return `${prefix}/${y}/${String(seq).padStart(5, "0")}`;
}

async function markInvoicePaid(invId: number, method: string, paymentRef: string) {
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
    amount: inv.netPayable,
    property: inv.booking.property?.title,
    bookingId: inv.bookingId,
    issuedAt: inv.issuedAt,
    ref: paymentRef,
  });
  const { png, payload: qrPayload } = await makeQR(payload);

  const updated = await prisma.invoice.update({
    where: { id: invId },
    data: {
      status: "PAID",
      paidBy: null, // webhook/system
      paidAt: new Date(),
      paymentMethod: method,
      paymentRef: paymentRef || inv.paymentRef,
      receiptNumber,
      receiptQrPayload: qrPayload,
      receiptQrPng: png,
    },
    include: { booking: true },
  });

  await invalidateOwnerReports(updated.ownerId);
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
  (router as any).stack?.[0]?.handle?.app?.get?.("io")?.emit?.("admin:invoice:paid", {
    invoiceId: updated.id,
    ownerId: updated.ownerId,
  });

  return updated;
}

/** Common processor */
async function processEvent(opts: {
  provider: "MPESA" | "TIGOPESA";
  rawBody: string;
  headerSignature: string | undefined;
  secret: string | undefined;
}) {
  const { provider, rawBody, headerSignature, secret } = opts;
  if (!secret) throw new Error("secret missing");
  if (!headerSignature) throw new Error("signature missing");

  const computed = hmacSha256Hex(secret, rawBody);
  if (!safeEq(computed, headerSignature)) throw new Error("bad signature");

  const payload = JSON.parse(rawBody);

  // ——— Map provider payloads to a normalized shape ———
  // Adjust this to your exact gateway schema.
  type Norm = {
    eventId: string;
    paymentRef?: string;  // your ref/order id you set when initiating
    invoiceNumber?: string;
    amount: number;
    currency?: string;
    status: "SUCCESS" | "FAILED" | "PENDING";
    payer?: string;
  };

  let norm: Norm;
  if (provider === "MPESA") {
    norm = {
      eventId: payload?.TransactionID ?? payload?.txId ?? payload?.id,
      paymentRef: payload?.AccountReference ?? payload?.accountRef ?? payload?.orderId,
      amount: Number(payload?.Amount ?? payload?.amount ?? 0),
      currency: payload?.Currency ?? "TZS",
      status: /success/i.test(payload?.ResultCode || payload?.status) ? "SUCCESS"
            : /pending/i.test(payload?.status) ? "PENDING" : "FAILED",
      payer: payload?.MSISDN ?? payload?.payer,
    };
  } else {
    // Tigo Pesa example
    norm = {
      eventId: payload?.transactionId ?? payload?.id,
      paymentRef: payload?.referenceId ?? payload?.orderId,
      amount: Number(payload?.amount ?? 0),
      currency: payload?.currency ?? "TZS",
      status: /success|completed/i.test(payload?.status) ? "SUCCESS"
            : /pending/i.test(payload?.status) ? "PENDING" : "FAILED",
      payer: payload?.msisdn,
    };
  }

  if (!norm.eventId) throw new Error("missing eventId");

  // idempotency: if we’ve seen this event, return early
  const existing = await prisma.paymentEvent.findUnique({ where: { eventId: norm.eventId } });
  if (existing) return existing;

  // try to locate the invoice by paymentRef or invoiceNumber
  let invoice = null as any;
  if (norm.paymentRef) {
    invoice = await prisma.invoice.findFirst({ where: { paymentRef: norm.paymentRef } });
  }
  if (!invoice && norm.invoiceNumber) {
    invoice = await prisma.invoice.findFirst({ where: { invoiceNumber: norm.invoiceNumber } });
  }

  // Record the event first (even if we don't find invoice yet)
  const recorded = await prisma.paymentEvent.create({
    data: {
      provider,
      eventId: norm.eventId,
      invoiceId: invoice?.id ?? null,
      amount: norm.amount,
      currency: norm.currency ?? "TZS",
      status: norm.status,
      payload,
    },
  });

  // If SUCCESS, try to mark invoice PAID (amount sanity check)
  if (invoice && norm.status === "SUCCESS") {
    const want = Number(invoice.netPayable);
    if (near(norm.amount, want)) {
      await markInvoicePaid(invoice.id, provider, norm.paymentRef || norm.invoiceNumber || norm.eventId);
    }
  }

  return recorded;
}

/** M-Pesa webhook: POST /webhooks/mpesa */
router.post("/mpesa", async (req: any, res) => {
  try {
    const sig = req.header("X-Mpesa-Signature") || req.header("x-mpesa-signature");
    const secret = process.env.MPESA_WEBHOOK_SECRET;
    const rec = await processEvent({
      provider: "MPESA",
      rawBody: req.rawBody?.toString?.("utf8") ?? req.body?.toString?.() ?? "",
      headerSignature: sig,
      secret,
    });
    res.json({ ok: true, id: rec.id });
  } catch (e: any) {
    return res.status(400).json({ ok: false, error: e.message || "bad request" });
  }
});

/** Tigo Pesa webhook: POST /webhooks/tigopesa */
router.post("/tigopesa", async (req: any, res) => {
  try {
    const sig = req.header("X-Tigo-Signature") || req.header("x-tigo-signature");
    const secret = process.env.TIGO_WEBHOOK_SECRET;
    const rec = await processEvent({
      provider: "TIGOPESA",
      rawBody: req.rawBody?.toString?.("utf8") ?? req.body?.toString?.() ?? "",
      headerSignature: sig,
      secret,
    });
    res.json({ ok: true, id: rec.id });
  } catch (e: any) {
    return res.status(400).json({ ok: false, error: e.message || "bad request" });
  }
});

export default router;
