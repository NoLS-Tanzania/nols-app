import { Router } from "express";
import type { RequestHandler } from "express";
import { prisma } from "@nolsaf/prisma";
import { requireAuth, AuthedRequest } from "../middleware/auth.js";
import { Server as SocketIOServer } from "socket.io";

const router = Router();
router.use(requireAuth as unknown as RequestHandler);

/**
 * GET /driver/level
 * Returns driver level information including progress toward next level
 */
const getDriverLevel: RequestHandler = async (req, res) => {
  try {
    const user = (req as AuthedRequest).user!;
    const driverId = user.id;

    // Fetch driver statistics
    let totalEarnings = 0;
    let totalTrips = 0;
    let averageRating = 0;
    let totalReviews = 0;
    let goalsCompleted = 0;

    try {
      // Calculate total earnings from completed bookings with invoices
      if ((prisma as any).booking && (prisma as any).invoice) {
        const bookings = await (prisma as any).booking.findMany({
          where: {
            driverId,
            status: {
              in: ['COMPLETED', 'FINISHED', 'PAID', 'CONFIRMED'],
            },
          },
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

        totalTrips = bookings.length;
        totalEarnings = bookings.reduce((sum: number, b: any) => {
          // Sum total amount from invoices (revenue generated for NoLSAF)
          const invoiceTotal = b.invoice && b.invoice.length > 0 
            ? Number(b.invoice[0].total || b.invoice[0].totalAmount || 0)
            : 0;
          return sum + invoiceTotal;
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
      console.warn('Failed to fetch trips/earnings', e);
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

      // Count reviews (if there's a review/rating table)
      if ((prisma as any).review) {
        const reviewCount = await (prisma as any).review.count({
          where: { driverId },
        });
        totalReviews = reviewCount;
      } else {
        // Fallback: estimate reviews from rating (if rating exists, assume some reviews)
        totalReviews = averageRating > 0 ? Math.round(averageRating * 25) : 0;
      }
    } catch (e) {
      console.warn('Failed to fetch rating/reviews', e);
    }

    // Count completed goals (from AdminAudit or a goals table)
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
      console.warn('Failed to fetch goals', e);
    }

    // Calculate level based on total earnings, trips, rating, reviews, and goals
    // Level system: Silver (1), Gold (2), Diamond (3)
    // Earnings thresholds in TZS: Silver: 0-500K, Gold: 500K-2M, Diamond: 2M+
    let currentLevel = 1;
    let levelName = "Silver";
    let nextLevel = 2;
    let nextLevelName = "Gold";

    // Get driver level thresholds from business config
    const { getDriverLevelThresholds } = await import("../lib/business-config.js");
    const thresholds = await getDriverLevelThresholds();
    const earningsForDiamond = thresholds.diamond;
    const earningsForGold = thresholds.gold;

    if (totalEarnings >= earningsForDiamond || (totalTrips >= 500 && averageRating >= 4.8)) {
      currentLevel = 3;
      levelName = "Diamond";
      nextLevel = 3;
      nextLevelName = "Diamond";
    } else if (totalEarnings >= earningsForGold || (totalTrips >= 200 && averageRating >= 4.6)) {
      currentLevel = 2;
      levelName = "Gold";
      nextLevel = 3;
      nextLevelName = "Diamond";
    } else {
      currentLevel = 1;
      levelName = "Silver";
      nextLevel = 2;
      nextLevelName = "Gold";
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

    return res.json({
      currentLevel,
      levelName,
      nextLevel,
      nextLevelName,
      totalEarnings: Math.round(totalEarnings),
      earningsForNextLevel,
      totalTrips,
      tripsForNextLevel,
      averageRating: parseFloat(averageRating.toFixed(1)),
      ratingForNextLevel,
      totalReviews,
      reviewsForNextLevel,
      goalsCompleted,
      goalsForNextLevel,
      progress: {
        earnings: Math.round(progress.earnings),
        trips: Math.round(progress.trips),
        rating: Math.round(progress.rating),
        reviews: Math.round(progress.reviews),
        goals: Math.round(progress.goals),
      },
      levelBenefits: getLevelBenefits(currentLevel),
      nextLevelBenefits: getLevelBenefits(nextLevel),
    });
  } catch (err: any) {
    console.error('Failed to fetch driver level', err);
    return res.status(500).json({ error: 'Failed to fetch driver level' });
  }
};

router.get('/', getDriverLevel as unknown as RequestHandler);

/**
 * POST /driver/level/message
 * Send a message to admin about driver level
 */
const sendLevelMessage: RequestHandler = async (req, res) => {
  try {
    const user = (req as AuthedRequest).user!;
    const driverId = user.id;
    const { message } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Store message (you can use a messages table or admin notifications)
    // For now, we'll use a simple approach with AdminAudit or create a level_messages table
    try {
      if ((prisma as any).adminAudit) {
        await (prisma as any).adminAudit.create({
          data: {
            action: 'DRIVER_LEVEL_MESSAGE',
            performedBy: driverId,
            targetUserId: driverId,
            details: {
              message: message.trim(),
              level: (await prisma.user.findUnique({ where: { id: driverId }, select: { role: true } as any }))?.role || 'DRIVER',
              timestamp: new Date().toISOString(),
            } as any,
          },
        });
      }
    } catch (e) {
      console.warn('Failed to create level message audit', e);
    }

    // Emit Socket.IO notification to admins
    const app = (req as any).app;
    const io = app?.get('io');
    if (io && typeof io.emit === 'function') {
      io.to('admin').emit('driver-level-message', {
        driverId,
        driverName: user.name || user.email || `Driver ${driverId}`,
        message: message.trim(),
        timestamp: new Date().toISOString(),
      });
    }

    return res.json({ success: true, message: 'Message sent successfully' });
  } catch (err: any) {
    console.error('Failed to send level message', err);
    return res.status(500).json({ error: 'Failed to send message' });
  }
};

router.post('/message', requireAuth as unknown as RequestHandler, sendLevelMessage as unknown as RequestHandler);

export default router;

