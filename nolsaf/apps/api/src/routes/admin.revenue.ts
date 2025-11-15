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

    const seq = await prisma.invoice.count({ status: "PAID" });
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