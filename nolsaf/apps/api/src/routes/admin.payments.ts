import { Router, type RequestHandler } from "express";
import { prisma } from "@nolsaf/prisma";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();
router.use(
  requireAuth as unknown as RequestHandler,
  requireRole("ADMIN") as unknown as RequestHandler
);

// GET /admin/payments/events?status=&q=&page=&pageSize=
router.get("/events", async (req, res) => {
  const { status, q, page = "1", pageSize = "50" } = req.query as any;
  const where: any = {};
  if (status) where.status = String(status);
  if (q) where.OR = [
    { provider: { contains: String(q), mode: "insensitive" } },
    { eventId: { contains: String(q), mode: "insensitive" } },
    { currency: { contains: String(q), mode: "insensitive" } },
  ];

  const skip = (Number(page) - 1) * Number(pageSize);
  const take = Math.min(Number(pageSize), 100);

  const [items, total] = await Promise.all([
    prisma.paymentEvent.findMany({
      where,
      orderBy: { id: "desc" },
      skip,
      take,
      include: { invoice: { select: { id: true, invoiceNumber: true, ownerId: true } } },
    }),
    prisma.paymentEvent.count({ where }),
  ]);

  res.json({ total, page: Number(page), pageSize: take, items });
});

// GET /admin/payments/events/:id
router.get("/events/:id", async (req, res) => {
  const id = Number(req.params.id);
  const ev = await prisma.paymentEvent.findUnique({
    where: { id },
    include: { invoice: { include: { booking: { include: { property: true } } } } },
  });
  if (!ev) return res.status(404).json({ error: "Payment event not found" });
  res.json(ev);
});

// GET /admin/payments/summary
router.get("/summary", async (_req, res) => {
  // Simple aggregates by status and provider
  const byStatus = await prisma.paymentEvent.groupBy({ by: ["status"], _count: { _all: true } });
  const byProvider = await prisma.paymentEvent.groupBy({ by: ["provider"], _count: { _all: true } });
  res.json({ byStatus, byProvider });
});

export default router;
