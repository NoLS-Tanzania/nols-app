import { Router } from "express";
import type { RequestHandler } from "express";
import { prisma } from "@nolsaf/prisma";
import { AuthedRequest, requireAuth, requireRole } from "../middleware/auth.js";
import QRCode from "qrcode";
import { Prisma } from "@prisma/client";
import { getEffectiveCommissionPercent, resolveOwnerPayoutAmount } from "../lib/accommodationPayout.js";
export const router = Router();
router.use(requireAuth as RequestHandler, requireRole("OWNER") as RequestHandler);

function extractPropertyCommissionPercent(propertyServices: unknown, fallbackPercent: number): number {
  const value = Number((propertyServices as any)?.commissionPercent);
  return Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : fallbackPercent;
}

router.get("/invoices", (async (req: AuthedRequest, res) => {
  try {
    const ownerId = req.user!.id;
    const status = req.query.status as string | undefined;
    const propertyId = req.query.propertyId ? Number(req.query.propertyId) : undefined;
    const date_from = req.query.date_from ? new Date(String(req.query.date_from)) : undefined;
    const date_to = req.query.date_to ? new Date(String(req.query.date_to)) : undefined;
    const beforeIdRaw = req.query.beforeId ? Number(req.query.beforeId) : undefined;
    const beforeId = Number.isFinite(beforeIdRaw as any) ? beforeIdRaw : undefined;
    const take = Math.min(Math.max(Number(req.query.take ?? 50), 1), 200);

    const where: any = { ownerId };
    if (status) {
      const parts = String(status)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      where.status = parts.length > 1 ? { in: parts } : (parts[0] as any);
    }
    if (date_from || date_to) {
      where.issuedAt = {};
      if (date_from) where.issuedAt.gte = date_from;
      if (date_to) where.issuedAt.lte = date_to;
    }
    if (propertyId) where.booking = { propertyId };
    if (beforeId) where.id = { lt: beforeId };

    // Keep payload lean: do not fetch blobs/notes/QR data for list views.
    const defaultCommissionPercent = await getEffectiveCommissionPercent(null);
    const rows = await prisma.invoice.findMany({
      where,
      orderBy: { id: "desc" },
      take: take + 1,
      select: {
        id: true,
        invoiceNumber: true,
        status: true,
        issuedAt: true,
        paidAt: true,
        total: true,
        netPayable: true,
        receiptNumber: true,
        paymentRef: true,
        booking: {
          select: {
            id: true,
            totalAmount: true,
            transportFare: true,
            property: {
              select: {
                id: true,
                title: true,
                services: true,
              },
            },
          },
        },
      },
    });

    const hasMore = rows.length > take;
    const items = hasMore ? rows.slice(0, take) : rows;
    const nextBeforeId = items.length ? items[items.length - 1]!.id : null;

    // Owners should not see platform commission/service fee amounts.
    // Always expose only the owner payout amount.
    const masked = items.map((inv: any) => {
      const commissionPercent = extractPropertyCommissionPercent(inv?.booking?.property?.services, defaultCommissionPercent);
      const payout = resolveOwnerPayoutAmount({
        invoiceNumber: inv.invoiceNumber,
        invoiceTotal: inv.total,
        netPayable: inv.netPayable,
        bookingTotalAmount: inv?.booking?.totalAmount,
        transportFare: inv?.booking?.transportFare,
        commissionPercent,
      });
      return {
        ...inv,
        total: payout,
        netPayable: payout,
        commissionPercent: null,
        commissionAmount: null,
        taxPercent: null,
        notes: null,
      };
    });

    res.json({ items: masked, hasMore, nextBeforeId });
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to load invoices", items: [] });
  }
}) as RequestHandler);

router.get("/stats", (async (req: AuthedRequest, res) => {
  try {
    const ownerId = req.user!.id;
    const status = req.query.status as string | undefined;
    const propertyId = req.query.propertyId ? Number(req.query.propertyId) : undefined;
    const date_from = req.query.date_from ? new Date(String(req.query.date_from)) : undefined;
    const date_to = req.query.date_to ? new Date(String(req.query.date_to)) : undefined;

    const defaultCommissionPercent = await getEffectiveCommissionPercent(null);
    const where: any = { ownerId };
    if (status) {
      const parts = String(status)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      where.status = parts.length > 1 ? { in: parts } : (parts[0] as any);
    }
    if (date_from || date_to) {
      where.issuedAt = {};
      if (date_from) where.issuedAt.gte = date_from;
      if (date_to) where.issuedAt.lte = date_to;
    }
    if (propertyId) where.booking = { propertyId };

    const items = await prisma.invoice.findMany({
      where,
      select: {
        id: true,
        status: true,
        invoiceNumber: true,
        total: true,
        netPayable: true,
        booking: {
          select: {
            totalAmount: true,
            transportFare: true,
            property: { select: { services: true } },
          },
        },
      },
    });

    const payouts = items.map((inv: any) => {
      const commissionPercent = extractPropertyCommissionPercent(inv?.booking?.property?.services, defaultCommissionPercent);
      return resolveOwnerPayoutAmount({
        invoiceNumber: inv.invoiceNumber,
        invoiceTotal: inv.total,
        netPayable: inv.netPayable,
        bookingTotalAmount: inv?.booking?.totalAmount,
        transportFare: inv?.booking?.transportFare,
        commissionPercent,
      });
    });

    const totalInvoices = items.length;
    const paidInvoices = items.filter((inv) => String(inv.status).toUpperCase() === "PAID").length;
    const pendingInvoices = Math.max(0, totalInvoices - paidInvoices);

    const totalRevenue = payouts.reduce((sum, payout) => sum + payout, 0);
    const paidRevenue = items.reduce((sum, inv: any, index) => {
      return String(inv.status).toUpperCase() === "PAID" ? sum + payouts[index]! : sum;
    }, 0);
    const pendingRevenue = Math.max(0, totalRevenue - paidRevenue);

    res.json({
      totalRevenue,
      paidRevenue,
      pendingRevenue,
      totalInvoices,
      paidInvoices,
      pendingInvoices,
    });
  } catch {
    return res.status(500).json({
      error: "Failed to load stats",
      totalRevenue: 0,
      paidRevenue: 0,
      pendingRevenue: 0,
      totalInvoices: 0,
      paidInvoices: 0,
      pendingInvoices: 0,
    });
  }
}) as RequestHandler);

router.get("/invoices.csv", (async (req: AuthedRequest, res) => {
  const ownerId = req.user!.id;
  const status = req.query.status as string | undefined;
  const propertyId = req.query.propertyId ? Number(req.query.propertyId) : undefined;
  const date_from = req.query.date_from ? new Date(String(req.query.date_from)) : undefined;
  const date_to = req.query.date_to ? new Date(String(req.query.date_to)) : undefined;

  const where: any = { ownerId };
  if (status) where.status = status as any;
  if (date_from || date_to) {
    where.issuedAt = {};
    if (date_from) where.issuedAt.gte = date_from;
    if (date_to) where.issuedAt.lte = date_to;
  }
  if (propertyId) where.booking = { propertyId };

  const items = await prisma.invoice.findMany({
    where,
    include: {
      booking: {
        include: {
          property: { select: { id: true, title: true, services: true } },
          code: true,
        },
      },
    } as any,
    orderBy: { id: "desc" },
    take: 1000,
  });

  const defaultCommissionPercent = await getEffectiveCommissionPercent(null);

  const header = [
    "invoiceNumber","status","issuedAt","property","bookingId","code",
    "ownerPayout",
    "paidAt","receiptNumber","paymentRef",
  ];
  const lines = [header.join(",")];
  for (const inv of items) {
    const commissionPercent = extractPropertyCommissionPercent((inv as any)?.booking?.property?.services, defaultCommissionPercent);
    const payout = resolveOwnerPayoutAmount({
      invoiceNumber: (inv as any).invoiceNumber,
      invoiceTotal: (inv as any).total,
      netPayable: (inv as any).netPayable,
      bookingTotalAmount: (inv as any)?.booking?.totalAmount,
      transportFare: (inv as any)?.booking?.transportFare,
      commissionPercent,
    });
    const row = [
      inv.invoiceNumber,
      inv.status,
      inv.issuedAt.toISOString(),
      inv.booking?.property?.title ?? "",
      String(inv.bookingId),
      (inv as any).booking?.code?.codeVisible ?? "",
      String(payout),
      inv.paidAt ? inv.paidAt.toISOString() : "",
      inv.receiptNumber ?? "",
      inv.paymentRef ?? "",
    ].map(v => `"${String(v).replace(/"/g, '""')}"`);
    lines.push(row.join(","));
  }

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="nolsaf-revenue.csv"`);
  res.send(lines.join("\n"));
}) as RequestHandler);

router.get("/invoices/:id", (async (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  const inv = await prisma.invoice.findFirst({
    where: { id, ownerId: req.user!.id },
    include: {
      booking: {
        include: {
          property: { select: { id: true, title: true, services: true } },
          user: true,
          code: true,
        },
      },
    } as any,
  });
  if (!inv) return res.status(404).json({ error: "Not found" });
  const commissionPercent = await getEffectiveCommissionPercent((inv as any)?.booking?.property?.services);
  const payout = resolveOwnerPayoutAmount({
    invoiceNumber: (inv as any).invoiceNumber,
    invoiceTotal: (inv as any).total,
    netPayable: (inv as any).netPayable,
    bookingTotalAmount: (inv as any)?.booking?.totalAmount,
    transportFare: (inv as any)?.booking?.transportFare,
    commissionPercent,
  });
  res.json({
    ...(inv as any),
    total: payout,
    netPayable: payout,
    commissionPercent: null,
    commissionAmount: null,
    notes: null,
  });
}) as RequestHandler);


router.get("/invoices/:id/receipt", (async (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  const inv = await prisma.invoice.findFirst({
    where: { id, ownerId: req.user!.id, status: "PAID" },
    include: {
      booking: {
        include: {
          property: {
            select: {
              id: true,
              title: true,
              type: true,
              regionName: true,
              district: true,
              city: true,
              country: true,
              services: true,
              photos: true,
              images: {
                where: { status: "READY" },
                take: 1,
                orderBy: { createdAt: "asc" },
                select: { url: true, thumbnailUrl: true },
              },
            },
          },
          code: true,
        },
      },
    } as any,
  });
  if (!inv) return res.status(404).json({ error: "Receipt not available" });

  const commissionPercent = await getEffectiveCommissionPercent((inv as any)?.booking?.property?.services);
  const payout = resolveOwnerPayoutAmount({
    invoiceNumber: (inv as any).invoiceNumber,
    invoiceTotal: (inv as any).total,
    netPayable: (inv as any).netPayable,
    bookingTotalAmount: (inv as any)?.booking?.totalAmount,
    transportFare: (inv as any)?.booking?.transportFare,
    commissionPercent,
  });

  const safeInvoice = {
    ...(inv as any),
    total: payout,
    netPayable: payout,
    commissionPercent: null,
    commissionAmount: null,
    notes: null,
  };

  const qrPayload = {
    invoiceId: inv.id,
    receiptNumber: inv.receiptNumber,
    paidAt: inv.paidAt,
    ownerPayout: payout,
    paymentRef: inv.paymentRef,
  };

  res.json({ invoice: safeInvoice, qrPayload });
}) as RequestHandler);


router.get("/invoices/:id/receipt/qr.png", (async (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  const inv = await prisma.invoice.findFirst({
    where: { id, ownerId: req.user!.id, status: "PAID" },
    include: { booking: { include: { code: true, property: { select: { services: true } } } } } as any,
  });
  if (!inv) return res.status(404).json({ error: "Receipt not available" });

  const commissionPercent = await getEffectiveCommissionPercent((inv as any)?.booking?.property?.services);
  const payout = resolveOwnerPayoutAmount({
    invoiceNumber: (inv as any).invoiceNumber,
    invoiceTotal: (inv as any).total,
    netPayable: (inv as any).netPayable,
    bookingTotalAmount: (inv as any)?.booking?.totalAmount,
    transportFare: (inv as any)?.booking?.transportFare,
    commissionPercent,
  });

  const payload = JSON.stringify({
    invoiceId: inv.id,
    receiptNumber: inv.receiptNumber,
    paidAt: inv.paidAt,
    ownerPayout: payout,
    paymentRef: inv.paymentRef,
  });

  const png = await QRCode.toBuffer(payload, { type: "png", margin: 1, width: 256 });
  res.setHeader("Content-Type", "image/png");
  res.send(png);
}) as RequestHandler);
