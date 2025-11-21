// apps/api/src/routes/admin.revenue.ts
import { Router } from "express";
import { prisma } from "@nolsaf/prisma";
import { Prisma } from "@prisma/client";
import express from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { makeQR } from "../lib/qr.js";
import { toCsv } from "../lib/csv.js";
import { invalidateOwnerReports } from "../lib/cache.js";

export const router = Router();
router.use(requireAuth as express.RequestHandler, requireRole("ADMIN") as express.RequestHandler);

/** Utility: compute commission/tax/net */
function compute(invoice: any, cfg?: { commissionPercent?: number; taxPercent?: number }) {
  const commissionPercent = Number(cfg?.commissionPercent ?? invoice.commissionPercent ?? 0);
  const taxPercent = Number(cfg?.taxPercent ?? invoice.taxPercent ?? 0);
  const total = Number(invoice.total ?? 0);
  const commissionAmount = +(total * (commissionPercent / 100)).toFixed(2);
  const taxOnCommission = +(commissionAmount * (taxPercent / 100)).toFixed(2);
  const netPayable = +(total - commissionAmount - taxOnCommission).toFixed(2);
  return { total, commissionPercent, commissionAmount, taxPercent, netPayable };
}

function nextInvoiceNumber(prefix = "INV", seq: number) {
  const y = new Date().getFullYear();
  return `${prefix}/${y}/${String(seq).padStart(5, "0")}`;
}
function nextReceiptNumber(prefix = "RCPT", seq: number) {
  const y = new Date().getFullYear();
  return `${prefix}/${y}/${String(seq).padStart(5, "0")}`;
}

/** GET /admin/invoices */
router.get("/invoices", async (req, res) => {
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
      where.OR = [
        { invoiceNumber: { contains: q, mode: "insensitive" } },
        { receiptNumber: { contains: q, mode: "insensitive" } },
        { booking: { property: { title: { contains: q, mode: "insensitive" } } } },
      ];
    }

    const skip = (Number(page) - 1) * Number(pageSize);
    const take = Math.min(Number(pageSize), 100);

    const [items, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: { booking: { include: { property: true } } },
        orderBy: { id: "desc" },
        skip, take,
      }),
      prisma.invoice.count({ where }),
    ]);

    res.json({ total, page: Number(page), pageSize: take, items });
  } catch (err: any) {
    // If the DB schema is out-of-date (missing column), Prisma will throw P2022
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2022") {
      console.error("Prisma schema mismatch error in /admin/invoices:", err.message);
      return res.status(500).json({ error: "Database schema mismatch: missing column(s). Please run migrations.", detail: err.message });
    }
    console.error("Unhandled error in GET /admin/invoices:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/** GET /admin/invoices/:id */
router.get("/invoices/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const inv = await prisma.invoice.findUnique({
      where: { id },
      include: {
        booking: { include: { property: { include: { owner: true } } } },
      },
    });
    if (!inv) return res.status(404).json({ error: "Invoice not found" });
    res.json(inv);
  } catch (err: any) {
    console.error("Error in GET /admin/invoices/:id", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/** POST /admin/invoices/:id/verify { notes? } */
router.post("/invoices/:id/verify", async (req, res) => {
  try {
    const id = Number(req.params.id);
  const adminId = (req.user as any)!.id;
    const notes = String(req.body?.notes ?? "");

    const updated = await prisma.invoice.update({
      where: { id },
      data: { status: "VERIFIED", verifiedBy: adminId, verifiedAt: new Date(), notes },
      include: { booking: true },
    });

    await invalidateOwnerReports(updated.ownerId);
    res.json({ ok: true, invoice: updated });
  } catch (err: any) {
    console.error("Error in POST /admin/invoices/:id/verify", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /admin/invoices/:id/approve
 * Optionally override commissionPercent/taxPercent for this invoice.
 * body: { commissionPercent?, taxPercent? }
 * - Ensures a stable paymentRef (used by your payment gateway + webhook)
 */
router.post("/invoices/:id/approve", async (req, res) => {
  try {
    const id = Number(req.params.id);
  const adminId = (req.user as any)!.id;
    const { commissionPercent, taxPercent } = req.body || {};

    const inv = await prisma.invoice.findUnique({ where: { id }, include: { booking: true } });
    if (!inv) return res.status(404).json({ error: "Invoice not found" });
    if (inv.status === "PAID") return res.status(400).json({ error: "Already PAID" });

    const calc = compute(inv, { commissionPercent, taxPercent });

    // simple invoice numbering from sequence
    const seq = await prisma.invoice.count({});
    const invoiceNumber = inv.invoiceNumber ?? nextInvoiceNumber("INV", seq + 1);

    // ensure stable paymentRef for gateway + webhook reconciliation
    const paymentRef = inv.paymentRef ?? `INVREF-${inv.id}-${Date.now()}`;

    const updated = await prisma.invoice.update({
      where: { id },
      data: {
        status: "APPROVED",
        approvedBy: adminId,
        approvedAt: new Date(),
        invoiceNumber,
        commissionPercent: calc.commissionPercent,
        commissionAmount: calc.commissionAmount,
        taxPercent: calc.taxPercent,
        netPayable: calc.netPayable,
        paymentRef, // <<—— critical
      },
      include: { booking: true },
    });

    await invalidateOwnerReports(updated.ownerId);
    res.json({
      ok: true,
      invoice: updated,
      paymentRef: updated.paymentRef, // UI can use this to initiate pay-link / STK push
    });
  } catch (err: any) {
    console.error("Error in POST /admin/invoices/:id/approve", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /admin/invoices/:id/mark-paid
 * body: { method, ref }
 * - stamps PAID, generates receiptNumber, QR payload & PNG
 * - emits socket "admin:invoice:paid" so Admin UI auto-refreshes
 */
router.post("/invoices/:id/mark-paid", async (req, res) => {
  try {
    const id = Number(req.params.id);
  const adminId = (req.user as any)!.id;
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
      amount: inv.netPayable,
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

    // 🔔 Notify Admin dashboards (and/or Owner if you also listen there)
    try {
      req.app.get("io")?.emit?.("admin:invoice:paid", {
        invoiceId: updated.id,
        ownerId: updated.ownerId,
      });
    } catch {}

    res.json({ ok: true, invoice: updated });
  } catch (err: any) {
    console.error("Error in POST /admin/invoices/:id/mark-paid", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/** GET /admin/invoices/:id/receipt.png — serve QR PNG */
router.get("/invoices/:id/receipt.png", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const inv = await prisma.invoice.findUnique({ where: { id }, select: { receiptQrPng: true } });
    if (!inv || !inv.receiptQrPng) return res.status(404).send("No receipt QR");
    res.setHeader("Content-Type", "image/png");
    res.send(Buffer.from(inv.receiptQrPng));
  } catch (err: any) {
    console.error("Error in GET /admin/invoices/:id/receipt.png", err);
    res.status(500).send("Internal server error");
  }
});

/** GET /admin/invoices/export.csv?status=...&from=...&to=...&q=... */
router.get("/invoices/export.csv", async (req, res) => {
  try {
    const { status, from, to, ownerId, q } = req.query as any;

    const where: any = {};
    if (status) where.status = status;
    if (ownerId) where.ownerId = Number(ownerId);
    if (from || to) {
      where.issuedAt = {};
      if (from) where.issuedAt.gte = new Date(String(from));
      if (to) where.issuedAt.lte = new Date(String(to));
    }
    if (q) {
      where.OR = [
        { invoiceNumber: { contains: q, mode: "insensitive" } },
        { receiptNumber: { contains: q, mode: "insensitive" } },
        { paymentRef: { contains: q, mode: "insensitive" } },
        { booking: { property: { title: { contains: q, mode: "insensitive" } } } },
      ];
    }

    const rows = await prisma.invoice.findMany({
      where,
      include: { booking: { include: { property: true } } },
      orderBy: { id: "desc" },
      take: 5000,
    });

    const csv = toCsv(
      rows.map((r: any) => ({
        id: r.id,
        invoiceNumber: r.invoiceNumber,
        receiptNumber: r.receiptNumber ?? "",
        status: r.status,
        issuedAt: r.issuedAt.toISOString(),
        property: r.booking.property?.title ?? `#${r.booking.propertyId}`,
        total: r.total,
        commissionPercent: r.commissionPercent,
        commissionAmount: r.commissionAmount,
        taxPercent: r.taxPercent,
        netPayable: r.netPayable,
        paidAt: r.paidAt ? r.paidAt.toISOString() : "",
        paymentMethod: r.paymentMethod ?? "",
        paymentRef: r.paymentRef ?? "",
      })),
      [
        "id","invoiceNumber","receiptNumber","status","issuedAt","property",
        "total","commissionPercent","commissionAmount","taxPercent","netPayable",
        "paidAt","paymentMethod","paymentRef"
      ]
    );

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="invoices_export.csv"`);
    res.send(csv);
  } catch (err: any) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2022") {
      console.error("Prisma schema mismatch error in /admin/invoices/export.csv:", err.message);
      return res.status(500).json({ error: "Database schema mismatch: missing column(s). Please run migrations.", detail: err.message });
    }
    console.error("Error in GET /admin/invoices/export.csv", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
// apps/api/src/routes/admin.revenue.ts

// GET /admin/properties
// Returns aggregated revenue by property (top-N by total). Query: ?top=10
router.get('/properties', async (req, res) => {
  try {
    const top = Math.max(1, Math.min(200, Number(req.query.top ?? 10)));
    const rows: Array<any> = await prisma.$queryRaw`
      SELECT p.id AS id, p.title AS name,
        COALESCE(SUM(i.total), 0) AS total,
        COALESCE(SUM(i.commissionAmount), 0) AS commission_total,
        COALESCE(SUM(i.subscriptionAmount), 0) AS subscription_total
      FROM Invoice i
      JOIN Booking b ON i.bookingId = b.id
      JOIN Property p ON b.propertyId = p.id
      WHERE i.status IN ('APPROVED', 'PAID')
      GROUP BY p.id, p.title
      ORDER BY total DESC
      LIMIT ${top}
    ` as any;

    // Normalize numbers
    const result = rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      total: Number(r.total ?? 0),
      commission: Number(r.commission_total ?? 0),
      subscription: Number(r.subscription_total ?? 0),
    }));
    res.json(result);
  } catch (err: any) {
    console.error('Error in GET /admin/properties', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /admin/revenue/series?from=&to=&interval=hour|day|month
 * Returns rows with label, commission_total, subscription_total
 */
router.get('/series', async (req, res) => {
  try {
    const { from, to, interval = 'day' } = req.query as any;
    const toDate = to ? new Date(String(to)) : new Date();
    const fromDate = from ? new Date(String(from)) : new Date(Date.now() - 30 * 24 * 3600 * 1000);

    const sqlFromIso = fromDate.toISOString();
    const sqlToIso = toDate.toISOString();

    let fmt = '%Y-%m-%d';
    if (interval === 'hour') fmt = '%Y-%m-%d %H:00';
    if (interval === 'month') fmt = '%Y-%m';

    const rows: Array<any> = await prisma.$queryRaw`
      SELECT DATE_FORMAT(CONVERT_TZ(i.issuedAt, '+00:00', '+03:00'), ${fmt}) AS label,
        COALESCE(SUM(i.commissionAmount),0) AS commission_total,
        COALESCE(SUM(i.subscriptionAmount),0) AS subscription_total
      FROM Invoice i
      WHERE i.status IN ('APPROVED','PAID') AND i.issuedAt BETWEEN ${sqlFromIso} AND ${sqlToIso}
      GROUP BY label
      ORDER BY label
    ` as any;

    // normalize
    const result = rows.map((r: any) => ({ label: r.label, commission: Number(r.commission_total ?? 0), subscription: Number(r.subscription_total ?? 0) }));
    res.json(result);
  } catch (err: any) {
    console.error('Error in GET /admin/revenue/series', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /admin/revenue/summary
 * Lightweight summary for card display: returns today's and yesterday's combined totals and a delta label
 */
router.get('/summary', async (req, res) => {
  try {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(todayStart.getDate() - 1);
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayStart.getDate() + 1);

    const fromIso = yesterdayStart.toISOString();
    const toIso = todayEnd.toISOString();

    const rows: Array<any> = await prisma.$queryRaw`
      SELECT
        COALESCE(SUM(CASE WHEN DATE(CONVERT_TZ(i.issuedAt, '+00:00', '+03:00')) = DATE(CONVERT_TZ(${todayStart.toISOString()}, '+00:00', '+03:00')) THEN COALESCE(i.commissionAmount,0)+COALESCE(i.subscriptionAmount,0) ELSE 0 END),0) AS today_total,
        COALESCE(SUM(CASE WHEN DATE(CONVERT_TZ(i.issuedAt, '+00:00', '+03:00')) = DATE(CONVERT_TZ(${yesterdayStart.toISOString()}, '+00:00', '+03:00')) THEN COALESCE(i.commissionAmount,0)+COALESCE(i.subscriptionAmount,0) ELSE 0 END),0) AS yesterday_total
      FROM Invoice i
      WHERE i.status IN ('APPROVED','PAID') AND i.issuedAt BETWEEN ${fromIso} AND ${toIso}
    ` as any;

    const today = Number(rows?.[0]?.today_total ?? 0);
    const yesterday = Number(rows?.[0]?.yesterday_total ?? 0);
    let deltaLabel = '0%';
    if (yesterday > 0) {
      const pct = Math.round(((today - yesterday) / yesterday) * 100);
      deltaLabel = `${pct >= 0 ? '+' : ''}${pct}%`;
    } else if (today > 0) {
      deltaLabel = `+${Math.round((today / 1) * 100)}%`;
    }

    res.json({ today, yesterday, delta: deltaLabel });
  } catch (err: any) {
    console.error('Error in GET /admin/revenue/summary', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});