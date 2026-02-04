import { Router, RequestHandler } from "express";
import { prisma } from "@nolsaf/prisma";
import { requireAuth, requireRole } from "../middleware/auth.js";

export const router = Router();
router.use(requireAuth as unknown as RequestHandler, requireRole("ADMIN") as unknown as RequestHandler);

/**
 * Calculate driver level based on metrics
 */
async function calculateDriverLevel(driverId: number): Promise<{
  currentLevel: number;
  levelName: string;
  totalEarnings: number;
  totalTrips: number;
  averageRating: number;
  totalReviews: number;
  goalsCompleted: number;
  progress: {
    earnings: number;
    trips: number;
    rating: number;
    reviews: number;
    goals: number;
  };
  levelBenefits: string[];
}> {
  let totalEarnings = 0;
  let totalTrips = 0;
  let averageRating = 0;
  let totalReviews = 0;
  let goalsCompleted = 0;

  try {
    // Calculate total earnings from completed bookings with invoices
    if ((prisma as any).booking && (prisma as any).invoice) {
      const where = {
        driverId,
        status: {
          in: ['COMPLETED', 'FINISHED', 'PAID', 'CONFIRMED'],
        },
      };

      let bookings: any[] = [];
      try {
        // Current schema uses Booking.invoices (plural)
        bookings = await (prisma as any).booking.findMany({
          where,
          include: {
            invoices: {
              where: {
                status: {
                  in: ['PAID', 'APPROVED', 'VERIFIED'],
                },
              },
            },
          },
        });
      } catch (e: any) {
        const message = String(e?.message || '');
        if (message.includes('Unknown field `invoices`') || message.includes('Unknown field "invoices"')) {
          // Older schema used Booking.invoice
          bookings = await (prisma as any).booking.findMany({
            where,
            include: {
              invoice: {
                where: {
                  status: {
                    in: ['PAID', 'APPROVED', 'VERIFIED'],
                  },
                },
              },
            },
          });
        } else {
          throw e;
        }
      }

      totalTrips = bookings.length;
      totalEarnings = bookings.reduce((sum: number, b: any) => {
        const invoicesRaw = (b as any).invoices ?? (b as any).invoice;
        const invoices = Array.isArray(invoicesRaw) ? invoicesRaw : invoicesRaw ? [invoicesRaw] : [];

        const bookingInvoiceTotal = invoices.reduce((invoiceSum: number, inv: any) => {
          return invoiceSum + Number(inv?.total ?? inv?.totalAmount ?? inv?.amount ?? 0);
        }, 0);

        return sum + bookingInvoiceTotal;
      }, 0);
    } else if ((prisma as any).booking) {
      // Fallback: if no invoice model, try to get price from booking
      const bookings = await (prisma as any).booking.findMany({
        where: {
          driverId,
          status: {
            in: ['COMPLETED', 'FINISHED', 'PAID', 'CONFIRMED'],
          },
        },
        select: {
          price: true,
          totalAmount: true,
        },
      });

      totalTrips = bookings.length;
      totalEarnings = bookings.reduce((sum: number, b: any) => {
        return sum + (Number(b.totalAmount || b.price || 0));
      }, 0);
    }
  } catch (e) {
    console.warn('Failed to fetch trips/earnings for driver', driverId, e);
  }

  // Get driver rating and reviews
  try {
    const driver = await prisma.user.findUnique({
      where: { id: driverId },
      select: { rating: true } as any,
    });
    if (driver && typeof (driver as any).rating === 'number') {
      averageRating = (driver as any).rating;
    }

    if ((prisma as any).review) {
      const reviewCount = await (prisma as any).review.count({
        where: { driverId },
      });
      totalReviews = reviewCount;
    } else {
      totalReviews = averageRating > 0 ? Math.round(averageRating * 25) : 0;
    }
  } catch (e) {
    console.warn('Failed to fetch rating/reviews for driver', driverId, e);
  }

  // Count completed goals
  try {
    if ((prisma as any).adminAudit) {
      const goalCompletions = await (prisma as any).adminAudit.count({
        where: {
          targetUserId: driverId,
          action: {
            in: ['GOAL_COMPLETED', 'ACHIEVEMENT_UNLOCKED'],
          },
        },
      });
      goalsCompleted = goalCompletions;
    }
  } catch (e) {
    console.warn('Failed to fetch goals for driver', driverId, e);
  }

  // Calculate level: Silver (1), Gold (2), Diamond (3)
  // Earnings thresholds in TZS: Silver: 0-500K, Gold: 500K-2M, Diamond: 2M+
  let currentLevel = 1;
  let levelName = "Silver";

  // Get driver level thresholds from business config
  const { getDriverLevelThresholds } = await import("../lib/business-config.js");
  const thresholds = await getDriverLevelThresholds();
  const earningsForDiamond = thresholds.diamond;
  const earningsForGold = thresholds.gold;

  if (totalEarnings >= earningsForDiamond || (totalTrips >= 500 && averageRating >= 4.8)) {
    currentLevel = 3;
    levelName = "Diamond";
  } else if (totalEarnings >= earningsForGold || (totalTrips >= 200 && averageRating >= 4.6)) {
    currentLevel = 2;
    levelName = "Gold";
  }

  // Calculate requirements for next level
  const earningsForNextLevel = currentLevel === 3 ? 0 : (currentLevel === 1 ? earningsForGold : earningsForDiamond);
  const tripsForNextLevel = currentLevel === 3 ? 0 : (currentLevel === 1 ? 200 : 500);
  const ratingForNextLevel = currentLevel === 3 ? 0 : (currentLevel === 1 ? 4.6 : 4.8);
  const reviewsForNextLevel = currentLevel === 3 ? 0 : (currentLevel === 1 ? 100 : 300);
  const goalsForNextLevel = currentLevel === 3 ? 0 : (currentLevel === 1 ? 10 : 25);

  // Calculate progress percentages
  const progress = {
    earnings: currentLevel === 3 ? 100 : Math.min((totalEarnings / earningsForNextLevel) * 100, 100),
    trips: currentLevel === 3 ? 100 : Math.min((totalTrips / tripsForNextLevel) * 100, 100),
    rating: currentLevel === 3 ? 100 : Math.min((averageRating / ratingForNextLevel) * 100, 100),
    reviews: currentLevel === 3 ? 100 : Math.min((totalReviews / reviewsForNextLevel) * 100, 100),
    goals: currentLevel === 3 ? 100 : Math.min((goalsCompleted / goalsForNextLevel) * 100, 100),
  };

  // Level benefits
  const getLevelBenefits = (level: number): string[] => {
    const benefits: { [key: number]: string[] } = {
      1: ["Standard support", "Standard commission rate", "Access to basic features", "Basic trip assignments"],
      2: ["Priority support", "10% bonus on earnings", "Access to premium features", "Priority trip assignments", "Early access to new features"],
      3: ["Elite support", "20% bonus on earnings", "Access to all features", "Highest priority assignments", "Exclusive partnerships", "Lifetime benefits", "Brand Ambassador", "Invited to events"],
    };
    return benefits[level] || benefits[1];
  };

  return {
    currentLevel,
    levelName,
    totalEarnings: Math.round(totalEarnings),
    totalTrips,
    averageRating: parseFloat(averageRating.toFixed(1)),
    totalReviews,
    goalsCompleted,
    progress: {
      earnings: Math.round(progress.earnings),
      trips: Math.round(progress.trips),
      rating: Math.round(progress.rating),
      reviews: Math.round(progress.reviews),
      goals: Math.round(progress.goals),
    },
    levelBenefits: getLevelBenefits(currentLevel),
  };
}

/**
 * GET /admin/drivers/levels
 * Get all drivers with their level information
 * Query params: level?, search?, page?, pageSize?
 */
router.get("/", async (req, res) => {
  try {
    const { level, search, page = "1", pageSize = "50" } = req.query as any;

    const where: any = { role: "DRIVER" };
    
    if (search) {
      const q = String(search).trim().slice(0, 120);
      if (!q) {
        // no-op
      } else
      where.OR = [
        { name: { contains: q } },
        { email: { contains: q } },
        { phone: { contains: q } },
      ];
    }

    const skip = (Number(page) - 1) * Number(pageSize);
    const take = Math.min(Number(pageSize), 100);

    const [drivers, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          suspendedAt: true,
          createdAt: true,
          region: true,
          district: true,
          vehicleType: true,
          plateNumber: true,
        },
        orderBy: { id: "desc" },
        skip,
        take,
      }),
      prisma.user.count({ where }),
    ]);

    // Calculate level for each driver
    const driversWithLevels = await Promise.all(
      drivers.map(async (driver) => {
        const levelData = await calculateDriverLevel(driver.id);
        return {
          ...driver,
          ...levelData,
        };
      })
    );

    // Filter by level if specified
    let filteredDrivers = driversWithLevels;
    if (level) {
      const levelNum = Number(level);
      filteredDrivers = driversWithLevels.filter((d) => d.currentLevel === levelNum);
    }

    // Calculate summary statistics
    const summary = {
      total: filteredDrivers.length,
      silver: filteredDrivers.filter((d) => d.currentLevel === 1).length,
      gold: filteredDrivers.filter((d) => d.currentLevel === 2).length,
      diamond: filteredDrivers.filter((d) => d.currentLevel === 3).length,
    };

    return res.json({
      drivers: filteredDrivers,
      summary,
      total: filteredDrivers.length,
      page: Number(page),
      pageSize: take,
    });
  } catch (err: any) {
    console.error('Failed to fetch driver levels', err);
    return res.status(500).json({ error: 'Failed to fetch driver levels', message: err.message });
  }
});

/**
 * GET /admin/drivers/levels/:id
 * Get detailed level information for a specific driver
 */
router.get("/:id", async (req, res) => {
  try {
    const driverId = Number(req.params.id);

    const driver = await prisma.user.findUnique({
      where: { id: driverId, role: "DRIVER" },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        suspendedAt: true,
        createdAt: true,
        region: true,
        district: true,
      },
    });

    if (!driver) {
      return res.status(404).json({ error: "Driver not found" });
    }

    const levelData = await calculateDriverLevel(driverId);

    return res.json({
      driver,
      ...levelData,
    });
  } catch (err: any) {
    console.error('Failed to fetch driver level details', err);
    return res.status(500).json({ error: 'Failed to fetch driver level details', message: err.message });
  }
});

export default router;

