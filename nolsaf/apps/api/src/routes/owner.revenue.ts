import { Router } from "express";
import type { RequestHandler } from "express";
import { prisma } from "@nolsaf/prisma";
import { AuthedRequest, requireAuth, requireRole } from "../middleware/auth.js";
import QRCode from "qrcode";
export const router = Router();
router.use(requireAuth as RequestHandler, requireRole("OWNER") as RequestHandler);

router.get("/invoices", (async (req: AuthedRequest, res) => {
  try {
    const ownerId = req.user!.id;
    const status = req.query.status as string | undefined;
    const propertyId = req.query.propertyId ? Number(req.query.propertyId) : undefined;
    const date_from = req.query.date_from ? new Date(String(req.query.date_from)) : undefined;
    const date_to = req.query.date_to ? new Date(String(req.query.date_to)) : undefined;
    const take = Math.min(Number(req.query.take ?? 100), 500);

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
      include: {
        booking: { include: { property: true } },
      } as any,
      orderBy: { id: "desc" },
      take,
    });

    res.json({ items });
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to load invoices", items: [] });
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
    include: { booking: { include: { property: true, code: true } } } as any,
    orderBy: { id: "desc" },
    take: 1000,
  });

  const header = [
    "invoiceNumber","status","issuedAt","property","bookingId","code",
    "gross","commissionPercent","commissionAmount","netPayable",
    "paidAt","receiptNumber","paymentRef",
  ];
  const lines = [header.join(",")];
  for (const inv of items) {
    const row = [
      inv.invoiceNumber,
      inv.status,
      inv.issuedAt.toISOString(),
      inv.booking?.property?.title ?? "",
      String(inv.bookingId),
      (inv as any).booking?.code?.codeVisible ?? "",
      String(inv.total),
      String(inv.commissionPercent),
      String(inv.commissionAmount),
      String(inv.netPayable),
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
    include: { booking: { include: { property: true, user: true, code: true } } } as any,
  });
  if (!inv) return res.status(404).json({ error: "Not found" });
  res.json(inv);
}) as RequestHandler);


router.get("/invoices/:id/receipt", (async (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  const inv = await prisma.invoice.findFirst({
    where: { id, ownerId: req.user!.id, status: "PAID" },
    include: { booking: { include: { property: true, code: true } } } as any,
  });
  if (!inv) return res.status(404).json({ error: "Receipt not available" });

  const qrPayload = {
    invoiceId: inv.id,
    receiptNumber: inv.receiptNumber,
    paidAt: inv.paidAt,
    netPayable: inv.netPayable,
    paymentRef: inv.paymentRef,
  };

  res.json({ invoice: inv, qrPayload });
}) as RequestHandler);


router.get("/invoices/:id/receipt/qr.png", (async (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  const inv = await prisma.invoice.findFirst({
    where: { id, ownerId: req.user!.id, status: "PAID" },
    include: { booking: { include: { code: true } } } as any,
  });
  if (!inv) return res.status(404).json({ error: "Receipt not available" });

  const payload = JSON.stringify({
    invoiceId: inv.id,
    receiptNumber: inv.receiptNumber,
    paidAt: inv.paidAt,
    netPayable: inv.netPayable,
    paymentRef: inv.paymentRef,
  });

  const png = await QRCode.toBuffer(payload, { type: "png", margin: 1, width: 256 });
  res.setHeader("Content-Type", "image/png");
  res.send(png);
}) as RequestHandler);
