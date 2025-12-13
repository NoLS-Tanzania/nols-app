import { Router } from "express";
import { z } from "zod";
import { prisma } from "@nolsaf/prisma";

const router = Router();

/**
 * GET /driver/dashboard
 * Returns comprehensive dashboard statistics for the authenticated driver
 */
router.get("/", async (req, res) => {
  try {
    const driverId = (req as any).userId;
    if (!driverId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Fetch today's trips
    const todaysTrips = await db.trip.findMany({
      where: {
        driverId: Number(driverId),
        createdAt: {
          gte: today,
          lt: tomorrow,
        },
      },
      include: {
        booking: {
          include: {
            invoice: true,
          },
        },
      },
    });

    // Calculate today's stats
    const todaysRides = todaysTrips.length;
    const todayEarnings = todaysTrips.reduce((sum: number, trip: any) => {
      const invoiceAmount = trip.booking?.invoice?.totalAmount || 0;
      return sum + Number(invoiceAmount);
    }, 0);

    // Calculate acceptance rate (trips accepted / trips offered)
    const tripsOffered = await db.trip.count({
      where: {
        driverId: Number(driverId),
        createdAt: {
          gte: today,
          lt: tomorrow,
        },
      },
    });
    const tripsAccepted = todaysTrips.filter((t: any) => t.status !== 'CANCELLED').length;
    const acceptanceRate = tripsOffered > 0 ? Math.round((tripsAccepted / tripsOffered) * 100) : 100;

    // Calculate earnings breakdown (base fare, tips, bonuses)
    const baseFare = todaysTrips.reduce((sum: number, trip: any) => sum + (Number(trip.baseFare) || 0), 0);
    const tips = todaysTrips.reduce((sum: number, trip: any) => sum + (Number(trip.tip) || 0), 0);
    const bonuses = todaysTrips.reduce((sum: number, trip: any) => sum + (Number(trip.bonus) || 0), 0);

    // Get driver profile for rating
    const driver = await db.user.findUnique({
      where: { id: Number(driverId) },
      select: {
        rating: true,
        _count: {
          select: {
            reviewsReceived: true,
          },
        },
      },
    });

    const rating = driver?.rating ? Number(driver.rating).toFixed(1) : "0.0";
    const totalReviews = driver?._count?.reviewsReceived || 0;

    // Calculate online hours (sessions today)
    const sessions = await db.driverSession.findMany({
      where: {
        driverId: Number(driverId),
        startedAt: {
          gte: today,
          lt: tomorrow,
        },
      },
    });

    const onlineHours = sessions.reduce((total: number, session: any) => {
      const start = new Date(session.startedAt).getTime();
      const end = session.endedAt ? new Date(session.endedAt).getTime() : Date.now();
      return total + (end - start) / (1000 * 60 * 60);
    }, 0);

    // Check if peak hours are active
    const currentHour = new Date().getHours();
    const isPeakTime = currentHour >= 16 && currentHour < 19; // 4PM - 7PM
    const peakHours = isPeakTime
      ? {
          active: true,
          start: "4:00 PM",
          end: "7:00 PM",
          multiplier: 2.5,
          timeLeft: `${19 - currentHour} hrs`,
        }
      : null;

    // Get earnings for last 7 days
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

    const earningsChart = [];
    for (let i = 0; i < 7; i++) {
      const dayStart = new Date(sevenDaysAgo);
      dayStart.setDate(dayStart.getDate() + i);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const dayTrips = await db.trip.findMany({
        where: {
          driverId: Number(driverId),
          createdAt: {
            gte: dayStart,
            lt: dayEnd,
          },
        },
        include: {
          booking: {
            include: {
              invoice: true,
            },
          },
        },
      });

      const dayEarnings = dayTrips.reduce((sum: number, trip: any) => {
        return sum + Number(trip.booking?.invoice?.totalAmount || 0);
      }, 0);

      const dayName = dayStart.toLocaleDateString("en-US", { weekday: "short" });
      earningsChart.push({ day: dayName, amount: dayEarnings });
    }

    // Get trips by hour for today
    const hourlyTrips: Record<string, number> = {
      "6AM": 0,
      "9AM": 0,
      "12PM": 0,
      "3PM": 0,
      "6PM": 0,
      "9PM": 0,
    };

    todaysTrips.forEach((trip: any) => {
      const hour = new Date(trip.createdAt).getHours();
      if (hour >= 6 && hour < 9) hourlyTrips["6AM"]++;
      else if (hour >= 9 && hour < 12) hourlyTrips["9AM"]++;
      else if (hour >= 12 && hour < 15) hourlyTrips["12PM"]++;
      else if (hour >= 15 && hour < 18) hourlyTrips["3PM"]++;
      else if (hour >= 18 && hour < 21) hourlyTrips["6PM"]++;
      else if (hour >= 21 || hour < 6) hourlyTrips["9PM"]++;
    });

    const tripsChart = Object.entries(hourlyTrips).map(([hour, trips]) => ({
      hour,
      trips,
    }));

    // Demand zones (mock data - replace with actual logic)
    const demandZones = [
      { name: "Masaki", level: "high" as const },
      { name: "Mikocheni", level: "medium" as const },
      { name: "Sinza", level: "low" as const },
    ];

    // Recent trips (last 5)
    const recentTripsData = await db.trip.findMany({
      where: {
        driverId: Number(driverId),
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
      include: {
        booking: {
          include: {
            invoice: true,
          },
        },
      },
    });

    const recentTrips = recentTripsData.map((trip: any) => ({
      id: String(trip.id),
      time: new Date(trip.createdAt).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      }),
      from: trip.pickupLocation || "Unknown",
      to: trip.dropoffLocation || "Unknown",
      distance: trip.distance ? `${Number(trip.distance).toFixed(1)}km` : "N/A",
      amount: Number(trip.booking?.invoice?.totalAmount || 0),
    }));

    // Check for reminders
    const reminders = [];

    // Check insurance expiry
    const documents = await db.driverDocument.findMany({
      where: {
        driverId: Number(driverId),
        type: "INSURANCE",
      },
      orderBy: {
        expiryDate: "desc",
      },
      take: 1,
    });

    if (documents[0]?.expiryDate) {
      const daysUntilExpiry = Math.ceil(
        (new Date(documents[0].expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      if (daysUntilExpiry <= 30 && daysUntilExpiry > 0) {
        reminders.push({
          id: "insurance-expiry",
          type: "warning" as const,
          message: `Insurance expires in ${daysUntilExpiry} days`,
          action: "Renew Now",
          actionLink: "/driver/management?tab=documents",
        });
      }
    }

    // Break reminder if driving for more than 4 hours
    if (onlineHours >= 4) {
      reminders.push({
        id: "break-reminder",
        type: "info" as const,
        message: `Take a break - you've been driving ${onlineHours.toFixed(1)} hours`,
      });
    }

    // Today's goal (default: 100,000 TZS, can be customized per driver)
    const todayGoal = 100000;
    const goalProgress = Math.min(Math.round((todayEarnings / todayGoal) * 100), 100);

    return res.json({
      todayGoal,
      todayEarnings,
      goalProgress,
      todaysRides,
      acceptanceRate,
      earningsBreakdown: {
        base: baseFare,
        tips,
        bonus: bonuses,
      },
      rating: parseFloat(rating),
      totalReviews,
      onlineHours: parseFloat(onlineHours.toFixed(1)),
      peakHours,
      earningsChart,
      tripsChart,
      demandZones,
      recentTrips,
      reminders,
    });
  } catch (error) {
    console.error("Error fetching driver dashboard:", error);
    return res.status(500).json({ error: "Failed to fetch dashboard data" });
  }
});

export default router;
