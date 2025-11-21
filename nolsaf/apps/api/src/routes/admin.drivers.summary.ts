import { Router } from "express";
import type { RequestHandler } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { prisma } from "@nolsaf/prisma";

export const router = Router();
router.use(requireAuth as unknown as RequestHandler, requireRole("ADMIN") as unknown as RequestHandler);

/** GET /admin/drivers/summary */
router.get("/", async (_req, res) => {
  try {
    const totalDrivers = await prisma.user.count({ where: { role: "DRIVER" } });
    const activeDrivers = await prisma.user.count({ where: { role: "DRIVER", suspendedAt: null } });
    const suspendedDrivers = await prisma.user.count({ where: { role: "DRIVER", suspendedAt: { not: null } } });

    // top bookings (driver with most bookings)
    const top = await prisma.booking.groupBy({
      by: ["driverId"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 1,
    });
    const topBookings = (top[0]?._count?.id) ?? 0;

    const recentDrivers = await prisma.user.findMany({
      where: { role: "DRIVER" },
      select: { id: true, name: true, email: true, phone: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    res.json({ totalDrivers, activeDrivers, suspendedDrivers, topBookings, recentDrivers });
  } catch (err) {
    console.error("admin.drivers.summary error", err);
    res.status(500).json({ error: "failed" });
  }
});

export default router;
