import { Router, RequestHandler } from "express";
import { prisma } from "@nolsaf/prisma";
import { requireAuth, requireRole } from "../middleware/auth.js";

export const router = Router();
router.use(requireAuth as unknown as RequestHandler, requireRole("DRIVER") as unknown as RequestHandler);

/**
 * GET /api/driver/performance
 * Returns driver performance metrics for bonus eligibility tracking
 */
router.get("/", async (req, res) => {
  try {
    const user = (req as any).user;
    const driverId = user?.id;
    if (!driverId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const sixMonthsAgo = new Date(now);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    // Get driver info
    const driver = await prisma.user.findUnique({
      where: { id: Number(driverId) },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        rating: true,
      },
    });

    if (!driver) {
      return res.status(404).json({ error: "Driver not found" });
    }

    // Calculate months of service
    const monthsOfService = Math.floor(
      (now.getTime() - new Date(driver.createdAt).getTime()) / (1000 * 60 * 60 * 24 * 30)
    );

    // Get trips for current month
    let monthlyTrips: any[] = [];
    let totalTrips = 0;
    let completedTrips = 0;
    let cancelledTrips = 0;
    let activeDays = new Set<string>();

    try {
      // Try TransportBooking first (for transport rides)
      try {
        monthlyTrips = await prisma.transportBooking.findMany({
          where: {
            driverId: Number(driverId),
            scheduledDate: { gte: startOfMonth },
          },
          select: {
            id: true,
            status: true,
            scheduledDate: true,
          },
        });

        // Get all-time trips count
        totalTrips = await prisma.transportBooking.count({
          where: { driverId: Number(driverId) },
        });

        // Count completed and cancelled
        completedTrips = monthlyTrips.filter(
          (t: any) => t.status === "COMPLETED" || t.status === "CONFIRMED" || t.status === "IN_PROGRESS"
        ).length;
        cancelledTrips = monthlyTrips.filter((t: any) => t.status === "CANCELED" || t.status === "CANCELLED").length;

        // Count active days (days with at least one trip)
        monthlyTrips.forEach((trip: any) => {
          if (trip.scheduledDate) {
            const date = new Date(trip.scheduledDate).toISOString().split("T")[0];
            activeDays.add(date);
          }
        });
      } catch (transportErr: any) {
        // If TransportBooking fails, try Booking model (for property bookings with driver)
        try {
          monthlyTrips = await prisma.booking.findMany({
            where: {
              driverId: Number(driverId),
              checkIn: { gte: startOfMonth },
            },
            select: {
              id: true,
              status: true,
              checkIn: true,
            },
          });

          // Get all-time trips count
          totalTrips = await prisma.booking.count({
            where: { driverId: Number(driverId) },
          });

          // Count completed and cancelled
          completedTrips = monthlyTrips.filter(
            (t: any) => t.status === "CHECKED_IN" || t.status === "CHECKED_OUT" || t.status === "CONFIRMED"
          ).length;
          cancelledTrips = monthlyTrips.filter((t: any) => t.status === "CANCELED" || t.status === "CANCELLED").length;

          // Count active days (days with at least one trip)
          monthlyTrips.forEach((trip: any) => {
            if (trip.checkIn) {
              const date = new Date(trip.checkIn).toISOString().split("T")[0];
              activeDays.add(date);
            }
          });
        } catch (bookingErr: any) {
          console.warn("Failed to fetch trips from both TransportBooking and Booking", { transportErr, bookingErr });
        }
      }
    } catch (e) {
      console.warn("Failed to fetch trips for performance metrics", e);
    }

    // Calculate completion rate
    const totalMonthlyTrips = monthlyTrips.length;
    const completionRate = totalMonthlyTrips > 0 
      ? Math.round((completedTrips / totalMonthlyTrips) * 100) 
      : 0;

    // Calculate cancellation rate
    const cancellationRate = totalMonthlyTrips > 0
      ? Math.round((cancelledTrips / totalMonthlyTrips) * 100)
      : 0;

    // Get rating
    const rating = driver.rating ? Number(driver.rating) : 0;

    // Calculate performance scores for each bonus type
    const performanceMetrics = {
      // Performance Excellence criteria
      rating: rating,
      completionRate: completionRate,
      cancellationRate: cancellationRate,
      meetsPerformanceExcellence: rating >= 4.7 && completionRate >= 95 && cancellationRate < 5,

      // Volume Achievement criteria
      monthlyTrips: totalMonthlyTrips,
      totalTrips: totalTrips,
      activeDaysThisMonth: activeDays.size,
      meetsVolumeMilestone: totalMonthlyTrips >= 50, // Can be 50, 100, 150, 200+

      // Loyalty & Retention criteria
      monthsOfService: monthsOfService,
      meetsLoyaltyCriteria: monthsOfService >= 6 && activeDays.size >= 20,
    };

    // Calculate progress percentages
    const progress = {
      performanceExcellence: {
        rating: Math.min(100, Math.round((rating / 4.7) * 100)),
        completionRate: Math.min(100, completionRate),
        cancellationRate: Math.max(0, 100 - (cancellationRate * 20)), // Lower is better
      },
      volumeAchievement: {
        trips: Math.min(100, Math.round((totalMonthlyTrips / 200) * 100)), // Progress toward 200 trips
        activeDays: Math.min(100, Math.round((activeDays.size / 30) * 100)),
      },
      loyaltyRetention: {
        monthsOfService: Math.min(100, Math.round((monthsOfService / 12) * 100)),
        activeDays: Math.min(100, Math.round((activeDays.size / 20) * 100)),
      },
    };

    return res.json({
      driver: {
        id: driver.id,
        name: driver.name,
        email: driver.email,
      },
      metrics: performanceMetrics,
      progress,
      period: {
        current: now.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
        startOfMonth: startOfMonth.toISOString(),
        endOfMonth: now.toISOString(),
      },
      totalReviews: 0, // Reviews count not available in current schema
    });
  } catch (err: any) {
    console.error("Error fetching driver performance:", err);
    return res.status(500).json({ error: "Internal server error", message: err.message });
  }
});

export default router;

