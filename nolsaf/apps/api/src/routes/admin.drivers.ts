// apps/api/src/routes/admin.drivers.ts
import { Router, RequestHandler } from "express";
import { prisma } from "@nolsaf/prisma";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { Prisma } from "@prisma/client";

export const router = Router();
router.use(requireAuth as unknown as RequestHandler, requireRole("ADMIN") as unknown as RequestHandler);

/** GET /admin/drivers?q=&status=&page=&pageSize= */
router.get("/", async (req, res) => {
  try {
    const { q = "", status = "", page = "1", pageSize = "50" } = req.query as any;

    const where: any = { role: "DRIVER" };
    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { phone: { contains: q, mode: "insensitive" } },
      ];
    }
    if (status) {
      if (status === "SUSPENDED") where.suspendedAt = { not: null };
      if (status === "ACTIVE") where.suspendedAt = null;
    }

    const skip = (Number(page) - 1) * Number(pageSize);
    const take = Math.min(Number(pageSize), 100);

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true, name: true, email: true, phone: true,
          suspendedAt: true, createdAt: true,
          _count: true,
        },
        orderBy: { id: "desc" },
        skip, take,
      }),
      prisma.user.count({ where }),
    ]);

    return res.json({ total, page: Number(page), pageSize: take, items });
  } catch (err: any) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && (err.code === 'P2021' || err.code === 'P2022')) {
      console.warn('Prisma schema mismatch when querying drivers list:', err.message);
      const page = Number((req.query as any).page ?? 1);
      const pageSize = Math.min(Number((req.query as any).pageSize ?? 50), 100);
      return res.json({ total: 0, page, pageSize, items: [] });
    }
    console.error('Unhandled error in GET /admin/drivers:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/** GET /admin/drivers/:id */
router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const driver = await prisma.user.findFirst({
      where: { id, role: "DRIVER" },
      select: {
        id: true, name: true, email: true, phone: true,
        suspendedAt: true, createdAt: true,
        _count: true,
      },
    });
    if (!driver) return res.status(404).json({ error: "Driver not found" });

    const recent = await prisma.booking.findMany({
      where: { driverId: id },
      select: { id: true, status: true, createdAt: true, total: true },
      orderBy: { id: "desc" },
      take: 10,
    });

    return res.json({ driver, snapshot: { recentBookings: recent } });
  } catch (err: any) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && (err.code === 'P2021' || err.code === 'P2022')) {
      console.warn('Prisma schema mismatch when querying driver by id:', err.message);
      return res.status(200).json({ driver: null, snapshot: { recentBookings: [] } });
    }
    console.error('Unhandled error in GET /admin/drivers/:id', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/** POST /admin/drivers/:id/suspend {reason} */
router.post("/:id/suspend", async (req, res) => {
  const id = Number(req.params.id);
  const reason = String(req.body?.reason ?? "");
  const me = (req.user as any).id;

  const updated = await prisma.user.update({ where: { id }, data: { suspendedAt: new Date() } });
  await prisma.adminAudit.create({ data: { adminId: me, targetUserId: id, action: "SUSPEND_DRIVER", details: reason } });

  req.app.get("io")?.emit?.("admin:driver:updated", { driverId: id });
  res.json({ ok: true, driverId: updated.id, suspendedAt: updated.suspendedAt });
});

/** POST /admin/drivers/:id/unsuspend */
router.post("/:id/unsuspend", async (req, res) => {
  const id = Number(req.params.id);
  const me = (req.user as any).id;
  const updated = await prisma.user.update({ where: { id }, data: { suspendedAt: null } });
  await prisma.adminAudit.create({ data: { adminId: me, targetUserId: id, action: "UNSUSPEND_DRIVER" } });

  req.app.get("io")?.emit?.("admin:driver:updated", { driverId: id });
  res.json({ ok: true, driverId: updated.id });
});

export default router;
