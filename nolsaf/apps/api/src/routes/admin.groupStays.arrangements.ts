import { Router } from "express";
import type { RequestHandler } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { prisma } from "@nolsaf/prisma";
import { Prisma } from "@prisma/client";

export const router = Router();
router.use(requireAuth as unknown as RequestHandler, requireRole("ADMIN") as unknown as RequestHandler);

/** GET /admin/group-stays/arrangements?arrType=&groupType=&region=&status=&page=&pageSize=&q= */
router.get("/", async (req, res) => {
  try {
    const { arrType, groupType, region, status, page = "1", pageSize = "50", q = "" } = req.query as any;

    const where: any = {};

    // Filter by arrangement type
    if (arrType) {
      switch (arrType) {
        case "pickup":
          where.arrPickup = true;
          break;
        case "transport":
          where.arrTransport = true;
          break;
        case "meals":
          where.arrMeals = true;
          break;
        case "guide":
          where.arrGuide = true;
          break;
        case "equipment":
          where.arrEquipment = true;
          break;
      }
    }

    // Filter by group type
    if (groupType) {
      where.groupType = groupType;
    }

    // Filter by region
    if (region) {
      where.toRegion = region;
    }

    // Filter by status
    if (status) {
      where.status = status;
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
      groupType: b.groupType,
      customer: b.user ? {
        id: b.user.id,
        name: b.user.name || "Unknown User",
        email: b.user.email,
        phone: b.user.phone,
      } : null,
      destination: {
        region: b.toRegion,
        district: b.toDistrict,
        ward: b.toWard,
        location: b.toLocation,
      },
      headcount: b.headcount,
      checkIn: b.checkIn,
      checkOut: b.checkOut,
      status: b.status,
      arrangements: {
        pickup: b.arrPickup || false,
        transport: b.arrTransport || false,
        meals: b.arrMeals || false,
        guide: b.arrGuide || false,
        equipment: b.arrEquipment || false,
      },
      createdAt: b.createdAt,
    }));

    return res.json({ total, page: Number(page), pageSize: take, items: mapped });
  } catch (err: any) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && (err.code === 'P2021' || err.code === 'P2022')) {
      console.warn('Prisma schema mismatch when querying arrangements:', err.message);
      const page = Number((req.query as any).page ?? 1);
      const pageSize = Math.min(Number((req.query as any).pageSize ?? 50), 100);
      return res.json({ total: 0, page, pageSize, items: [] });
    }
    console.error('Unhandled error in GET /admin/group-stays/arrangements:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/** GET /admin/group-stays/arrangements/stats */
router.get("/stats", async (req, res) => {
  try {
    // Get all bookings with arrangements
    const bookings = await (prisma as any).groupBooking.findMany({
      select: {
        arrPickup: true,
        arrTransport: true,
        arrMeals: true,
        arrGuide: true,
        arrEquipment: true,
        groupType: true,
        toRegion: true,
        status: true,
        createdAt: true,
      },
    });

    // Count arrangements
    const arrangementCounts = {
      pickup: 0,
      transport: 0,
      meals: 0,
      guide: 0,
      equipment: 0,
    };

    // Arrangements by group type
    const groupTypeArrangements: Record<string, Record<string, number>> = {};
    const groupTypes = ["family", "workers", "event", "students", "team", "other"];

    // Arrangements by region
    const regionArrangements: Record<string, Record<string, number>> = {};

    // Arrangements by status
    const statusArrangements: Record<string, Record<string, number>> = {};

    bookings.forEach((b: any) => {
      if (b.arrPickup) arrangementCounts.pickup++;
      if (b.arrTransport) arrangementCounts.transport++;
      if (b.arrMeals) arrangementCounts.meals++;
      if (b.arrGuide) arrangementCounts.guide++;
      if (b.arrEquipment) arrangementCounts.equipment++;

      const groupType = b.groupType || "other";
      if (!groupTypeArrangements[groupType]) {
        groupTypeArrangements[groupType] = { pickup: 0, transport: 0, meals: 0, guide: 0, equipment: 0 };
      }
      if (b.arrPickup) groupTypeArrangements[groupType].pickup++;
      if (b.arrTransport) groupTypeArrangements[groupType].transport++;
      if (b.arrMeals) groupTypeArrangements[groupType].meals++;
      if (b.arrGuide) groupTypeArrangements[groupType].guide++;
      if (b.arrEquipment) groupTypeArrangements[groupType].equipment++;

      const region = b.toRegion || "Unknown";
      if (!regionArrangements[region]) {
        regionArrangements[region] = { pickup: 0, transport: 0, meals: 0, guide: 0, equipment: 0 };
      }
      if (b.arrPickup) regionArrangements[region].pickup++;
      if (b.arrTransport) regionArrangements[region].transport++;
      if (b.arrMeals) regionArrangements[region].meals++;
      if (b.arrGuide) regionArrangements[region].guide++;
      if (b.arrEquipment) regionArrangements[region].equipment++;

      const status = b.status || "PENDING";
      if (!statusArrangements[status]) {
        statusArrangements[status] = { pickup: 0, transport: 0, meals: 0, guide: 0, equipment: 0 };
      }
      if (b.arrPickup) statusArrangements[status].pickup++;
      if (b.arrTransport) statusArrangements[status].transport++;
      if (b.arrMeals) statusArrangements[status].meals++;
      if (b.arrGuide) statusArrangements[status].guide++;
      if (b.arrEquipment) statusArrangements[status].equipment++;
    });

    // Top regions by arrangements
    const topRegions = Object.entries(regionArrangements)
      .map(([region, counts]) => ({
        region,
        total: counts.pickup + counts.transport + counts.meals + counts.guide + counts.equipment,
        ...counts,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    // Total bookings with at least one arrangement
    const bookingsWithArrangements = bookings.filter((b: any) => 
      b.arrPickup || b.arrTransport || b.arrMeals || b.arrGuide || b.arrEquipment
    ).length;

    return res.json({
      arrangementCounts,
      groupTypeArrangements,
      regionArrangements,
      statusArrangements,
      topRegions,
      bookingsWithArrangements,
      totalBookings: bookings.length,
    });
  } catch (err) {
    console.error('Error in GET /admin/group-stays/arrangements/stats:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

