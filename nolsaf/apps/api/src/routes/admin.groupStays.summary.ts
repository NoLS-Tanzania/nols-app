import { Router } from "express";
import type { RequestHandler } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { prisma } from "@nolsaf/prisma";

export const router = Router();
router.use(requireAuth as unknown as RequestHandler, requireRole("ADMIN") as unknown as RequestHandler);

/** GET /admin/group-stays/summary */
router.get("/", async (_req, res) => {
  try {
    // Total group bookings
    const totalBookings = await (prisma as any).groupBooking.count();
    
    // Bookings by status
    const pendingBookings = await (prisma as any).groupBooking.count({ where: { status: "PENDING" } });
    const confirmedBookings = await (prisma as any).groupBooking.count({ where: { status: "CONFIRMED" } });
    const processingBookings = await (prisma as any).groupBooking.count({ where: { status: "PROCESSING" } });
    const completedBookings = await (prisma as any).groupBooking.count({ where: { status: "COMPLETED" } });
    const canceledBookings = await (prisma as any).groupBooking.count({ where: { status: "CANCELED" } });

    // Bookings by group type
    const groupTypeCounts: Record<string, number> = {};
    const groupTypes = ["family", "workers", "event", "students", "team", "other"];
    for (const type of groupTypes) {
      try {
        groupTypeCounts[type] = await (prisma as any).groupBooking.count({ where: { groupType: type } });
      } catch (e) {
        groupTypeCounts[type] = 0;
      }
    }

    // Total passengers across all bookings
    let totalPassengers = 0;
    try {
      const bookings = await (prisma as any).groupBooking.findMany({
        select: { headcount: true },
      });
      totalPassengers = bookings.reduce((sum: number, b: any) => sum + (Number(b.headcount) || 0), 0);
    } catch (e) {
      console.warn("Error calculating total passengers:", e);
    }

    // Average headcount
    let averageHeadcount = 0;
    if (totalBookings > 0) {
      averageHeadcount = Math.round(totalPassengers / totalBookings);
    }

    // Recent bookings (last 5)
    const recentBookings = await (prisma as any).groupBooking.findMany({
      select: {
        id: true,
        groupType: true,
        headcount: true,
        toRegion: true,
        status: true,
        createdAt: true,
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    // Bookings by accommodation type
    const accommodationTypeCounts: Record<string, number> = {};
    const accommodationTypes = ["villa", "apartment", "hotel", "hostel", "lodge", "condo", "guest_house", "bungalow", "cabin", "homestay", "townhouse", "house", "dorm", "other"];
    for (const type of accommodationTypes) {
      try {
        accommodationTypeCounts[type] = await (prisma as any).groupBooking.count({ where: { accommodationType: type } });
      } catch (e) {
        accommodationTypeCounts[type] = 0;
      }
    }

    // Arrangements statistics
    let bookingsWithPickup = 0;
    let bookingsWithTransport = 0;
    let bookingsWithMeals = 0;
    let bookingsWithGuide = 0;
    let bookingsWithEquipment = 0;
    try {
      const bookings = await (prisma as any).groupBooking.findMany({
        select: {
          arrPickup: true,
          arrTransport: true,
          arrMeals: true,
          arrGuide: true,
          arrEquipment: true,
        },
      });
      bookings.forEach((b: any) => {
        if (b.arrPickup) bookingsWithPickup++;
        if (b.arrTransport) bookingsWithTransport++;
        if (b.arrMeals) bookingsWithMeals++;
        if (b.arrGuide) bookingsWithGuide++;
        if (b.arrEquipment) bookingsWithEquipment++;
      });
    } catch (e) {
      console.warn("Error calculating arrangements:", e);
    }

    res.json({
      totalBookings,
      pendingBookings,
      confirmedBookings,
      processingBookings,
      completedBookings,
      canceledBookings,
      totalPassengers,
      averageHeadcount,
      groupTypeCounts,
      accommodationTypeCounts,
      arrangements: {
        pickup: bookingsWithPickup,
        transport: bookingsWithTransport,
        meals: bookingsWithMeals,
        guide: bookingsWithGuide,
        equipment: bookingsWithEquipment,
      },
      recentBookings,
    });
  } catch (err) {
    console.error("admin.groupStays.summary error", err);
    res.status(500).json({ error: "failed" });
  }
});

export default router;

