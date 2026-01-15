import { Router } from "express";
import type { RequestHandler } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { prisma } from "@nolsaf/prisma";
import { Prisma } from "@prisma/client";

export const router = Router();
router.use(requireAuth as unknown as RequestHandler, requireRole("ADMIN") as unknown as RequestHandler);

function toPositiveInt(value: unknown): number | undefined {
  const n = typeof value === "string" && value.trim() !== "" ? Number.parseInt(value, 10) : typeof value === "number" ? value : NaN;
  if (!Number.isFinite(n)) return undefined;
  if (!Number.isInteger(n)) return undefined;
  if (n <= 0) return undefined;
  return n;
}

function toNumberOrUndefined(value: unknown): number | undefined {
  const n = typeof value === "string" && value.trim() !== "" ? Number(value) : typeof value === "number" ? value : NaN;
  if (!Number.isFinite(n)) return undefined;
  return n;
}

function toSingleString(value: unknown): string {
  if (Array.isArray(value)) return String(value[0] ?? "");
  if (value === undefined || value === null) return "";
  return String(value);
}

/** GET /admin/group-stays/passengers?bookingId=&groupType=&region=&gender=&nationality=&ageMin=&ageMax=&page=&pageSize=&q= */
router.get("/", async (req, res) => {
  try {
    const { bookingId, groupType, region, gender, nationality, ageMin, ageMax, page = "1", pageSize = "50", q = "" } = req.query as any;

    const bookingIdStr = toSingleString(bookingId).trim();
    const groupTypeStr = toSingleString(groupType).trim();
    const regionStr = toSingleString(region).trim();
    const genderStr = toSingleString(gender).trim();
    const nationalityStr = toSingleString(nationality).trim();
    const ageMinStr = toSingleString(ageMin).trim();
    const ageMaxStr = toSingleString(ageMax).trim();
    const pageStr = toSingleString(page).trim();
    const pageSizeStr = toSingleString(pageSize).trim();
    const qStr = toSingleString(q).trim();

    // Build where clause for passenger filtering
    const where: any = {};

    // Filter by booking ID
    const bookingIdNum = toPositiveInt(bookingIdStr);
    if (bookingIdNum) {
      where.groupBookingId = bookingIdNum;
    }

    // Filter by group type (through booking)
    if (groupTypeStr) {
      where.groupBooking = { groupType: groupTypeStr };
    }

    // Filter by region (through booking)
    if (regionStr) {
      where.groupBooking = { ...where.groupBooking, toRegion: regionStr };
    }

    // Filter by gender
    if (genderStr) {
      where.gender = genderStr.toUpperCase();
    }

    // Filter by nationality
    if (nationalityStr) {
      where.nationality = { contains: nationalityStr };
    }

    // Filter by age range
    if (ageMinStr || ageMaxStr) {
      where.age = {};
      const ageMinNum = toNumberOrUndefined(ageMinStr);
      const ageMaxNum = toNumberOrUndefined(ageMaxStr);
      if (ageMinNum !== undefined) where.age.gte = ageMinNum;
      if (ageMaxNum !== undefined) where.age.lte = ageMaxNum;
      // Avoid sending an empty object to Prisma
      if (Object.keys(where.age).length === 0) delete where.age;
    }

    // Search query
    if (qStr) {
      where.OR = [
        { firstName: { contains: qStr } },
        { lastName: { contains: qStr } },
        { phone: { contains: qStr } },
        { nationality: { contains: qStr } },
        { groupBooking: { user: { name: { contains: qStr } } } },
        { groupBooking: { user: { email: { contains: qStr } } } },
      ];
    }

    const pageNum = toPositiveInt(pageStr) ?? 1;
    const pageSizeNum = toPositiveInt(pageSizeStr) ?? 50;
    const take = Math.min(pageSizeNum, 100);
    const skip = Math.max(0, (pageNum - 1) * take);

    const [items, total] = await Promise.all([
      (prisma as any).groupBookingPassenger.findMany({
        where,
        include: {
          groupBooking: {
            select: {
              id: true,
              groupType: true,
              toRegion: true,
              toDistrict: true,
              checkIn: true,
              checkOut: true,
              status: true,
              user: {
                select: { id: true, name: true, email: true },
              },
            },
          },
        },
        orderBy: { sequenceNumber: "asc" },
        skip,
        take,
      }),
      (prisma as any).groupBookingPassenger.count({ where }),
    ]);

    const mapped = items.map((p: any) => ({
      id: p.id,
      firstName: p.firstName || "N/A",
      lastName: p.lastName || "N/A",
      phone: p.phone || null,
      age: p.age || null,
      gender: p.gender || null,
      nationality: p.nationality || null,
      sequenceNumber: p.sequenceNumber || 0,
      booking: p.groupBooking ? {
        id: p.groupBooking.id,
        groupType: p.groupBooking.groupType || "other",
        destination: `${p.groupBooking.toRegion || "N/A"}${p.groupBooking.toDistrict ? `, ${p.groupBooking.toDistrict}` : ""}`,
        checkIn: p.groupBooking.checkIn,
        checkOut: p.groupBooking.checkOut,
        status: p.groupBooking.status || "PENDING",
        customer: p.groupBooking.user ? {
          id: p.groupBooking.user.id,
          name: p.groupBooking.user.name || "Unknown",
          email: p.groupBooking.user.email,
        } : null,
      } : null,
    }));

    return res.json({ total, page: pageNum, pageSize: take, items: mapped });
  } catch (err: any) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && (err.code === 'P2021' || err.code === 'P2022')) {
      console.warn('Prisma schema mismatch when querying passengers:', err.message);
      const pageNum = toPositiveInt((req.query as any).page) ?? 1;
      const pageSizeNum = Math.min(toPositiveInt((req.query as any).pageSize) ?? 50, 100);
      return res.json({ total: 0, page: pageNum, pageSize: pageSizeNum, items: [] });
    }
    console.error('Unhandled error in GET /admin/group-stays/passengers:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/** GET /admin/group-stays/passengers/stats */
router.get("/stats", async (req, res) => {
  try {
    // Get all passengers
    let passengers: any[] = [];
    try {
      passengers = await (prisma as any).groupBookingPassenger.findMany({
        select: {
          gender: true,
          nationality: true,
          age: true,
          groupBooking: {
            select: {
              groupType: true,
              toRegion: true,
              status: true,
            },
          },
        },
      });
    } catch (prismaErr: any) {
      if (prismaErr instanceof Prisma.PrismaClientKnownRequestError && (prismaErr.code === 'P2021' || prismaErr.code === 'P2022')) {
        console.warn('Prisma schema mismatch when querying passenger statistics:', prismaErr.message);
        // Return empty stats if table doesn't exist
        return res.json({
          totalPassengers: 0,
          averageAge: 0,
          genderStats: {},
          nationalityStats: {},
          ageGroups: {
            "0-17": 0,
            "18-25": 0,
            "26-35": 0,
            "36-50": 0,
            "51-65": 0,
            "65+": 0,
            "Unknown": 0,
          },
          groupTypeStats: {},
          regionStats: {},
          topNationalities: [],
        });
      }
      throw prismaErr;
    }

    // Gender distribution
    const genderStats: Record<string, number> = {};
    passengers.forEach((p: any) => {
      const gender = p.gender || "Unknown";
      genderStats[gender] = (genderStats[gender] || 0) + 1;
    });

    // Nationality distribution (top 10)
    const nationalityStats: Record<string, number> = {};
    passengers.forEach((p: any) => {
      const nationality = p.nationality || "Unknown";
      nationalityStats[nationality] = (nationalityStats[nationality] || 0) + 1;
    });

    // Age distribution
    const ageGroups = {
      "0-17": 0,
      "18-25": 0,
      "26-35": 0,
      "36-50": 0,
      "51-65": 0,
      "65+": 0,
      "Unknown": 0,
    };

    passengers.forEach((p: any) => {
      const age = p.age ? Number(p.age) : null;
      if (age === null) {
        ageGroups["Unknown"]++;
      } else if (age <= 17) {
        ageGroups["0-17"]++;
      } else if (age <= 25) {
        ageGroups["18-25"]++;
      } else if (age <= 35) {
        ageGroups["26-35"]++;
      } else if (age <= 50) {
        ageGroups["36-50"]++;
      } else if (age <= 65) {
        ageGroups["51-65"]++;
      } else {
        ageGroups["65+"]++;
      }
    });

    // Passengers by group type
    const groupTypeStats: Record<string, number> = {};
    passengers.forEach((p: any) => {
      const groupType = p.groupBooking?.groupType || "other";
      groupTypeStats[groupType] = (groupTypeStats[groupType] || 0) + 1;
    });

    // Passengers by region
    const regionStats: Record<string, number> = {};
    passengers.forEach((p: any) => {
      const region = p.groupBooking?.toRegion || "Unknown";
      regionStats[region] = (regionStats[region] || 0) + 1;
    });

    // Total passengers
    const totalPassengers = passengers.length;

    // Average age
    const ages = passengers.map((p: any) => p.age).filter((a: any) => a !== null && !isNaN(Number(a))).map((a: any) => Number(a));
    const averageAge = ages.length > 0 ? Math.round(ages.reduce((sum: number, age: number) => sum + age, 0) / ages.length) : 0;

    // Top nationalities (sorted)
    const topNationalities = Object.entries(nationalityStats)
      .sort(([_, a], [__, b]) => b - a)
      .slice(0, 10)
      .map(([nationality, count]) => ({ nationality, count }));

    // Ensure response is always JSON
    if (!res.headersSent) {
      return res.json({
        totalPassengers,
        averageAge,
        genderStats,
        nationalityStats,
        ageGroups,
        groupTypeStats,
        regionStats,
        topNationalities,
      });
    }
  } catch (err: any) {
    console.error('Error in GET /admin/group-stays/passengers/stats:', err);
    // Ensure we always return JSON, never HTML or other formats
    if (!res.headersSent) {
      return res.status(500).json({ 
        error: 'Internal server error',
        message: err?.message || 'Unknown error occurred'
      });
    }
  }
});

export default router;

