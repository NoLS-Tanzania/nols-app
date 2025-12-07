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
    // Use invoices/paid records to find driver bookings since Booking might not have driverId directly
    let topBookings = 0;
    try {
      // Try to get bookings through invoices or trips
      const invoices = await prisma.invoice.findMany({
        where: {
          booking: { driverId: { not: null } as any },
        },
        select: {
          booking: {
            select: { driverId: true as any },
          },
        },
      });
      
      const driverCounts = new Map<number, number>();
      invoices.forEach((inv: any) => {
        const driverId = inv.booking?.driverId;
        if (driverId) {
          driverCounts.set(driverId, (driverCounts.get(driverId) || 0) + 1);
        }
      });
      
      const counts = Array.from(driverCounts.values());
      topBookings = counts.length > 0 ? Math.max(...counts) : 0;
    } catch (e) {
      console.warn("Error calculating top bookings:", e);
    }

    // Get booking performance breakdown
    let bookingPerformance: { high: number; medium: number; low: number; none: number } = { high: 0, medium: 0, low: 0, none: 0 };
    try {
      // Get bookings through invoices since Booking model might not have driverId directly
      const invoices = await prisma.invoice.findMany({
        where: {
          booking: { driverId: { not: null } as any },
        },
        select: {
          booking: {
            select: { driverId: true as any },
          },
        },
      });
      
      const driverCounts = new Map<number, number>();
      invoices.forEach((inv: any) => {
        const driverId = inv.booking?.driverId;
        if (driverId) {
          driverCounts.set(driverId, (driverCounts.get(driverId) || 0) + 1);
        }
      });
      
      const driverBookings = Array.from(driverCounts.entries()).map(([driverId, count]) => ({
        driverId,
        _count: { id: count },
      }));

      const driverIds = await prisma.user.findMany({
        where: { role: "DRIVER" },
        select: { id: true },
      });

      const bookingCounts = new Map(driverBookings.map((b: any) => [b.driverId, b._count.id]));
      
      driverIds.forEach((driver) => {
        const count = bookingCounts.get(driver.id) || 0;
        if (count >= 50) bookingPerformance.high++;
        else if (count >= 10) bookingPerformance.medium++;
        else if (count > 0) bookingPerformance.low++;
        else bookingPerformance.none++;
      });
    } catch (e) {
      // If booking model doesn't exist or has issues, use defaults
      bookingPerformance = { high: 0, medium: 0, low: 0, none: totalDrivers };
    }

    const recentDrivers = await prisma.user.findMany({
      where: { role: "DRIVER" },
      select: { id: true, name: true, email: true, phone: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    res.json({ 
      totalDrivers, 
      activeDrivers, 
      suspendedDrivers, 
      topBookings, 
      recentDrivers,
      bookingPerformance 
    });
  } catch (err) {
    console.error("admin.drivers.summary error", err);
    res.status(500).json({ error: "failed" });
  }
});

export default router;
