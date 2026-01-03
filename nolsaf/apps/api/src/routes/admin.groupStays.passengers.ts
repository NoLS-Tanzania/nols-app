import { Router } from "express";
import type { RequestHandler } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { prisma } from "@nolsaf/prisma";
import type { Prisma } from "@prisma/client";

export const router = Router();
router.use(requireAuth as unknown as RequestHandler, requireRole("ADMIN") as unknown as RequestHandler);

/** GET /admin/group-stays/passengers?bookingId=&groupType=&region=&gender=&nationality=&ageMin=&ageMax=&page=&pageSize=&q= */
router.get("/", async (req, res) => {
  try {
    const { bookingId, groupType, region, gender, nationality, ageMin, ageMax, page = "1", pageSize = "50", q = "" } = req.query as any;

    // Build where clause for passenger filtering
    const where: any = {};

    // Filter by booking ID
    if (bookingId) {
      where.groupBookingId = Number(bookingId);
    }

    // Filter by group type (through booking)
    if (groupType) {
      where.groupBooking = { groupType };
    }

    // Filter by region (through booking)
    if (region) {
      where.groupBooking = { ...where.groupBooking, toRegion: region };
    }

    // Filter by gender
    if (gender) {
      where.gender = gender.toUpperCase();
    }

    // Filter by nationality
    if (nationality) {
      where.nationality = { contains: nationality, mode: "insensitive" };
    }

    // Filter by age range
    if (ageMin || ageMax) {
      where.age = {};
      if (ageMin) where.age.gte = Number(ageMin);
      if (ageMax) where.age.lte = Number(ageMax);
    }

    // Search query
    if (q) {
      where.OR = [
        { firstName: { contains: q, mode: "insensitive" } },
        { lastName: { contains: q, mode: "insensitive" } },
        { phone: { contains: q, mode: "insensitive" } },
        { nationality: { contains: q, mode: "insensitive" } },
        { groupBooking: { user: { name: { contains: q, mode: "insensitive" } } } },
        { groupBooking: { user: { email: { contains: q, mode: "insensitive" } } } },
      ];
    }

    const skip = (Number(page) - 1) * Number(pageSize);
    const take = Math.min(Number(pageSize), 100);

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

    return res.json({ total, page: Number(page), pageSize: take, items: mapped });
  } catch (err: any) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && (err.code === 'P2021' || err.code === 'P2022')) {
      console.warn('Prisma schema mismatch when querying passengers:', err.message);
      const page = Number((req.query as any).page ?? 1);
      const pageSize = Math.min(Number((req.query as any).pageSize ?? 50), 100);
      return res.json({ total: 0, page, pageSize, items: [] });
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

