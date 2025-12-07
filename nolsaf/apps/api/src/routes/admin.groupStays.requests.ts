import { Router } from "express";
import type { RequestHandler } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { prisma } from "@nolsaf/prisma";
import { Prisma } from "@nolsaf/prisma";

export const router = Router();
router.use(requireAuth as unknown as RequestHandler, requireRole("ADMIN") as unknown as RequestHandler);

/** GET /admin/group-stays/requests?groupType=&region=&date=&start=&end=&page=&pageSize=&q= */
router.get("/", async (req, res) => {
  try {
    const { groupType, region, date, start, end, page = "1", pageSize = "50", q = "" } = req.query as any;

    const where: any = {
      status: "PENDING", // Only show pending requests
    };

    // Filter by group type
    if (groupType) {
      where.groupType = groupType;
    }

    // Filter by region
    if (region) {
      where.toRegion = region;
    }

    // Date filtering (by check-in date)
    if (date) {
      const s = new Date(String(date) + "T00:00:00.000Z");
      const e = new Date(String(date) + "T23:59:59.999Z");
      where.checkIn = { gte: s, lte: e };
    } else if (start || end) {
      const s = start ? new Date(String(start) + "T00:00:00.000Z") : new Date(0);
      const e = end ? new Date(String(end) + "T23:59:59.999Z") : new Date();
      where.checkIn = { gte: s, lte: e };
    }

    // Search query
    if (q) {
      where.OR = [
        { user: { name: { contains: q, mode: "insensitive" } } },
        { user: { email: { contains: q, mode: "insensitive" } } },
        { toRegion: { contains: q, mode: "insensitive" } },
        { toDistrict: { contains: q, mode: "insensitive" } },
        { toLocation: { contains: q, mode: "insensitive" } },
      ];
    }

    const skip = (Number(page) - 1) * Number(pageSize);
    const take = Math.min(Number(pageSize), 100);

    const [items, total] = await Promise.all([
      (prisma as any).groupBooking.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, email: true, phone: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      (prisma as any).groupBooking.count({ where }),
    ]);

    const mapped = items.map((b: any) => ({
      id: b.id,
      groupType: b.groupType || "other",
      accommodationType: b.accommodationType || "other",
      headcount: b.headcount || 0,
      roomsNeeded: b.roomsNeeded || 0,
      toRegion: b.toRegion || "N/A",
      toDistrict: b.toDistrict || null,
      toLocation: b.toLocation || null,
      checkIn: b.checkIn || null,
      checkOut: b.checkOut || null,
      createdAt: b.createdAt,
      user: b.user ? {
        id: b.user.id,
        name: b.user.name || "Unknown User",
        email: b.user.email,
        phone: b.user.phone,
      } : null,
      // Arrangements
      arrPickup: b.arrPickup || false,
      arrTransport: b.arrTransport || false,
      arrMeals: b.arrMeals || false,
      arrGuide: b.arrGuide || false,
      arrEquipment: b.arrEquipment || false,
      pickupLocation: b.pickupLocation || null,
      pickupTime: b.pickupTime || null,
      arrangementNotes: b.arrangementNotes || null,
    }));

    return res.json({ total, page: Number(page), pageSize: take, items: mapped });
  } catch (err: any) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && (err.code === 'P2021' || err.code === 'P2022')) {
      console.warn('Prisma schema mismatch when querying group requests:', err.message);
      const page = Number((req.query as any).page ?? 1);
      const pageSize = Math.min(Number((req.query as any).pageSize ?? 50), 100);
      return res.json({ total: 0, page, pageSize, items: [] });
    }
    console.error('Unhandled error in GET /admin/group-stays/requests:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/** GET /admin/group-stays/requests/stats */
router.get("/stats", async (req, res) => {
  try {
    // Get pending requests by group type
    const groupTypeStats: Record<string, number> = {};
    const groupTypes = ["family", "workers", "event", "students", "team", "other"];
    
    for (const type of groupTypes) {
      try {
        groupTypeStats[type] = await (prisma as any).groupBooking.count({
          where: { status: "PENDING", groupType: type },
        });
      } catch (e) {
        groupTypeStats[type] = 0;
      }
    }

    // Get pending requests by region
    const regionStats: Record<string, number> = {};
    try {
      const bookings = await (prisma as any).groupBooking.findMany({
        where: { status: "PENDING" },
        select: { toRegion: true },
      });
      
      bookings.forEach((b: any) => {
        const region = b.toRegion || "Unknown";
        regionStats[region] = (regionStats[region] || 0) + 1;
      });
    } catch (e) {
      console.warn("Error calculating region stats:", e);
    }

    // Get pending requests by accommodation type
    const accommodationStats: Record<string, number> = {};
    const accommodationTypes = ["villa", "apartment", "hotel", "hostel", "lodge", "condo", "guest_house", "bungalow", "cabin", "homestay", "townhouse", "house", "dorm", "other"];
    
    for (const type of accommodationTypes) {
      try {
        accommodationStats[type] = await (prisma as any).groupBooking.count({
          where: { status: "PENDING", accommodationType: type },
        });
      } catch (e) {
        accommodationStats[type] = 0;
      }
    }

    // Get requests by date (last 30 days)
    const dateStats: Array<{ date: string; count: number }> = [];
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    try {
      const bookings = await (prisma as any).groupBooking.findMany({
        where: {
          status: "PENDING",
          createdAt: { gte: thirtyDaysAgo },
        },
        select: { createdAt: true },
      });

      const dateMap = new Map<string, number>();
      bookings.forEach((b: any) => {
        const dateKey = new Date(b.createdAt).toISOString().split("T")[0];
        dateMap.set(dateKey, (dateMap.get(dateKey) || 0) + 1);
      });

      const current = new Date(thirtyDaysAgo);
      while (current <= today) {
        const dateKey = current.toISOString().split("T")[0];
        dateStats.push({
          date: dateKey,
          count: dateMap.get(dateKey) || 0,
        });
        current.setDate(current.getDate() + 1);
      }
    } catch (e) {
      console.warn("Error calculating date stats:", e);
    }

    // Get total pending count
    const totalPending = await (prisma as any).groupBooking.count({ where: { status: "PENDING" } });

    // Get requests with arrangements
    let withArrangements = 0;
    try {
      const bookings = await (prisma as any).groupBooking.findMany({
        where: { status: "PENDING" },
        select: {
          arrPickup: true,
          arrTransport: true,
          arrMeals: true,
          arrGuide: true,
          arrEquipment: true,
        },
      });
      bookings.forEach((b: any) => {
        if (b.arrPickup || b.arrTransport || b.arrMeals || b.arrGuide || b.arrEquipment) {
          withArrangements++;
        }
      });
    } catch (e) {
      console.warn("Error calculating arrangements:", e);
    }

    return res.json({
      totalPending,
      groupTypeStats,
      regionStats,
      accommodationStats,
      dateStats,
      withArrangements,
    });
  } catch (err) {
    console.error('Error in GET /admin/group-stays/requests/stats:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

