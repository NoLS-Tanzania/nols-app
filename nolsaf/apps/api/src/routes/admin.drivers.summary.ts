import { Router } from "express";
import type { RequestHandler } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { prisma } from "@nolsaf/prisma";

export const router = Router();
router.use(requireAuth as unknown as RequestHandler, requireRole("ADMIN") as unknown as RequestHandler);

/** GET /admin/drivers/summary */
router.get("/", async (_req, res) => {
  try {
    let totalDrivers = 0;
    let activeDrivers = 0;
    let suspendedDrivers = 0;
    
    try {
      totalDrivers = await prisma.user.count({ where: { role: "DRIVER" } });
    } catch (e: any) {
      console.warn("Error counting total drivers:", e);
    }
    
    try {
      activeDrivers = await prisma.user.count({ where: { role: "DRIVER", suspendedAt: null } });
    } catch (e: any) {
      // If suspendedAt field doesn't exist, assume all drivers are active
      console.warn("Error counting active drivers (suspendedAt field may not exist):", e);
      activeDrivers = totalDrivers;
    }
    
    try {
      suspendedDrivers = await prisma.user.count({ where: { role: "DRIVER", suspendedAt: { not: null } } });
    } catch (e: any) {
      console.warn("Error counting suspended drivers:", e);
      suspendedDrivers = 0;
    }

    // top bookings (driver with most transport bookings)
    // Use TransportBooking model which has driverId field
    let topBookings = 0;
    try {
      // Check if transportBooking exists in Prisma client
      if (!prisma.transportBooking) {
        console.warn("TransportBooking model not found in Prisma client. Run 'npx prisma generate' to regenerate.");
        topBookings = 0;
      } else {
        // Get all transport bookings with drivers and count manually
        const transportBookings = await prisma.transportBooking.findMany({
          where: { 
            driverId: { not: null } 
          },
          select: { driverId: true },
        });
        
        const driverCounts = new Map<number, number>();
        transportBookings.forEach(tb => {
          if (tb.driverId) {
            driverCounts.set(tb.driverId, (driverCounts.get(tb.driverId) || 0) + 1);
          }
        });
        
        if (driverCounts.size > 0) {
          const counts = Array.from(driverCounts.values());
          topBookings = Math.max(...counts);
        }
      }
    } catch (e: any) {
      console.warn("Error calculating top bookings from TransportBooking:", e?.message || e);
      topBookings = 0;
    }

    // Get booking performance breakdown based on TransportBooking counts
    let bookingPerformance: { high: number; medium: number; low: number; none: number } = { high: 0, medium: 0, low: 0, none: 0 };
    try {
      // Check if transportBooking exists in Prisma client
      if (!prisma.transportBooking) {
        console.warn("TransportBooking model not found in Prisma client. Run 'npx prisma generate' to regenerate.");
        bookingPerformance = { high: 0, medium: 0, low: 0, none: totalDrivers };
      } else {
        // Get transport booking counts per driver
        const transportBookings = await prisma.transportBooking.findMany({
          where: { 
            driverId: { not: null } 
          },
          select: { driverId: true },
        });
        
        const bookingCounts = new Map<number, number>();
        transportBookings.forEach(tb => {
          if (tb.driverId) {
            bookingCounts.set(tb.driverId, (bookingCounts.get(tb.driverId) || 0) + 1);
          }
        });
        
        // Get all drivers and categorize by booking count
        const allDrivers = await prisma.user.findMany({
          where: { role: "DRIVER" },
          select: { id: true },
        });
        
        allDrivers.forEach(driver => {
          const count = bookingCounts.get(driver.id) || 0;
          if (count >= 50) bookingPerformance.high++;
          else if (count >= 10) bookingPerformance.medium++;
          else if (count > 0) bookingPerformance.low++;
          else bookingPerformance.none++;
        });
      }
    } catch (e: any) {
      console.warn("Error calculating booking performance from TransportBooking:", e?.message || e);
      // Fallback: all drivers in "none" category
      bookingPerformance = { high: 0, medium: 0, low: 0, none: totalDrivers };
    }

    let recentDrivers: any[] = [];
    try {
      recentDrivers = await prisma.user.findMany({
        where: { role: "DRIVER" },
        select: { id: true, name: true, email: true, phone: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      });
    } catch (e: any) {
      console.warn("Error fetching recent drivers:", e);
      recentDrivers = [];
    }

    res.json({ 
      totalDrivers, 
      activeDrivers, 
      suspendedDrivers, 
      topBookings, 
      recentDrivers,
      bookingPerformance 
    });
  } catch (err: any) {
    console.error("admin.drivers.summary error", err);
    console.error("Error details:", {
      message: err?.message,
      code: err?.code,
      stack: err?.stack,
    });
    res.status(500).json({ 
      error: "failed",
      message: err?.message || "Internal server error",
      details: process.env.NODE_ENV === 'development' ? err?.stack : undefined
    });
  }
});

export default router;
