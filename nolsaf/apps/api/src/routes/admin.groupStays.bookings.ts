import { Router } from "express";
import type { RequestHandler } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { prisma } from "@nolsaf/prisma";
import { Prisma } from "@prisma/client";

export const router = Router();
router.use(requireAuth as unknown as RequestHandler, requireRole("ADMIN") as unknown as RequestHandler);

/** GET /admin/group-stays/bookings?status=&groupType=&region=&date=&start=&end=&page=&pageSize=&q= */
router.get("/", async (req, res) => {
  try {
    const { status, groupType, region, date, start, end, page = "1", pageSize = "50", q = "" } = req.query as any;

    const where: any = {};

    // Filter by status - only if status is a non-empty string
    if (status && String(status).trim() !== '') {
      where.status = String(status).trim();
    }

    // Filter by group type - only if groupType is a non-empty string
    if (groupType && String(groupType).trim() !== '') {
      where.groupType = String(groupType).trim();
    }

    // Filter by region - only if region is a non-empty string
    if (region && String(region).trim() !== '') {
      where.toRegion = String(region).trim();
    }

    // Date filtering - only apply if dates are actually provided (not empty strings)
    if (date && String(date).trim() !== '') {
      const s = new Date(String(date).trim() + "T00:00:00.000Z");
      const e = new Date(String(date).trim() + "T23:59:59.999Z");
      if (!isNaN(s.getTime()) && !isNaN(e.getTime())) {
        where.checkIn = { gte: s, lte: e };
      }
    } else if (start && end && String(start).trim() !== '' && String(end).trim() !== '') {
      // Only apply date range filter if both start and end are provided
      const s = new Date(String(start).trim() + "T00:00:00.000Z");
      const e = new Date(String(end).trim() + "T23:59:59.999Z");
      if (!isNaN(s.getTime()) && !isNaN(e.getTime())) {
        where.checkIn = { gte: s, lte: e };
      }
    }

    // Search query - only if q is a non-empty string
    if (q && String(q).trim() !== '') {
      where.OR = [
        { user: { name: { contains: String(q).trim(), mode: "insensitive" } } },
        { user: { email: { contains: String(q).trim(), mode: "insensitive" } } },
        { toRegion: { contains: String(q).trim(), mode: "insensitive" } },
        { toDistrict: { contains: String(q).trim(), mode: "insensitive" } },
        { toLocation: { contains: String(q).trim(), mode: "insensitive" } },
      ];
    }

    const skip = (Number(page) - 1) * Number(pageSize);
    const take = Math.min(Number(pageSize), 100);

    // Build query - use include for user (same as summary endpoint)
    const queryOptions: any = {
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    };

    // Only add where if it has conditions - if empty object, Prisma returns all
    if (Object.keys(where).length > 0) {
      queryOptions.where = where;
    }

    const countOptions: any = Object.keys(where).length > 0 ? { where } : {};

    const [items, total] = await Promise.all([
      (prisma as any).groupBooking.findMany(queryOptions),
      (prisma as any).groupBooking.count(countOptions),
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
      status: b.status || "PENDING",
      user: b.user ? {
        id: b.user.id,
        name: b.user.name || "Unknown User",
        email: b.user.email,
        phone: b.user.phone,
      } : null,
      createdAt: b.createdAt,
      // Arrangements
      arrPickup: b.arrPickup || false,
      arrTransport: b.arrTransport || false,
      arrMeals: b.arrMeals || false,
      arrGuide: b.arrGuide || false,
      arrEquipment: b.arrEquipment || false,
    }));

    return res.json({ total, page: Number(page), pageSize: take, items: mapped });
  } catch (err: any) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && (err.code === 'P2021' || err.code === 'P2022')) {
      console.warn('Prisma schema mismatch when querying group bookings:', err.message);
      const page = Number((req.query as any).page ?? 1);
      const pageSize = Math.min(Number((req.query as any).pageSize ?? 50), 100);
      return res.json({ total: 0, page, pageSize, items: [] });
    }
    console.error('Unhandled error in GET /admin/group-stays/bookings:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/** GET /admin/group-stays/bookings/stats?period=7d|30d|month|year */
router.get("/stats", async (req, res) => {
  try {
    const { period = "30d" } = req.query as any;

    let startDate: Date;
    let endDate = new Date();
    endDate.setHours(23, 59, 59, 999);

    switch (period) {
      case "7d":
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        break;
      case "30d":
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
        break;
      case "month":
        startDate = new Date();
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        break;
      case "year":
        startDate = new Date();
        startDate.setMonth(0, 1);
        startDate.setHours(0, 0, 0, 0);
        break;
      default:
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
    }

    startDate.setHours(0, 0, 0, 0);

    // Get all bookings in the date range
    const bookings = await (prisma as any).groupBooking.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        createdAt: true,
        status: true,
        headcount: true,
      },
    });

    // Group by date
    const dateMap = new Map<string, { count: number; confirmed: number; totalHeadcount: number }>();

    bookings.forEach((b: any) => {
      const dateKey = new Date(b.createdAt).toISOString().split("T")[0];
      const existing = dateMap.get(dateKey) || { count: 0, confirmed: 0, totalHeadcount: 0 };
      existing.count += 1;
      if (b.status === "CONFIRMED" || b.status === "COMPLETED") {
        existing.confirmed += 1;
      }
      existing.totalHeadcount += Number(b.headcount) || 0;
      dateMap.set(dateKey, existing);
    });

    // Fill in all dates in range
    const stats: Array<{ date: string; count: number; confirmed: number; totalHeadcount: number }> = [];
    const current = new Date(startDate);
    while (current <= endDate) {
      const dateKey = current.toISOString().split("T")[0];
      const data = dateMap.get(dateKey) || { count: 0, confirmed: 0, totalHeadcount: 0 };
      stats.push({
        date: dateKey,
        ...data,
      });
      current.setDate(current.getDate() + 1);
    }

    return res.json({
      stats,
      period,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });
  } catch (err) {
    console.error('Error in GET /admin/group-stays/bookings/stats:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/** GET /admin/group-stays/bookings/:id - Get single booking details */
router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id || isNaN(id)) {
      return res.status(400).json({ error: "Invalid booking ID" });
    }

    const booking = await (prisma as any).groupBooking.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true },
        },
      },
    });

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    const mapped = {
      id: booking.id,
      groupType: booking.groupType || "other",
      accommodationType: booking.accommodationType || "other",
      headcount: booking.headcount || 0,
      roomsNeeded: booking.roomsNeeded || 0,
      toRegion: booking.toRegion || "N/A",
      toDistrict: booking.toDistrict || null,
      toLocation: booking.toLocation || null,
      checkIn: booking.checkIn || null,
      checkOut: booking.checkOut || null,
      status: booking.status || "PENDING",
      user: booking.user ? {
        id: booking.user.id,
        name: booking.user.name || "Unknown User",
        email: booking.user.email,
        phone: booking.user.phone,
      } : null,
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt || null,
      // Arrangements
      arrPickup: booking.arrPickup || false,
      arrTransport: booking.arrTransport || false,
      arrMeals: booking.arrMeals || false,
      arrGuide: booking.arrGuide || false,
      arrEquipment: booking.arrEquipment || false,
      // Additional fields that might exist
      pickupLocation: booking.pickupLocation || null,
      pickupTime: booking.pickupTime || null,
      arrangementNotes: booking.arrangementNotes || null,
      notes: booking.notes || null,
    };

    return res.json(mapped);
  } catch (err: any) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && (err.code === 'P2021' || err.code === 'P2022')) {
      console.warn('Prisma schema mismatch when querying group booking:', err.message);
      return res.status(404).json({ error: "Booking not found" });
    }
    console.error('Error in GET /admin/group-stays/bookings/:id:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

