import { Router } from "express";
import type { RequestHandler } from "express";
import { prisma } from "@nolsaf/prisma";
import { requireAuth, AuthedRequest } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth as unknown as RequestHandler);

/**
 * GET /driver/bonus/history
 * Returns bonus history for the authenticated driver
 */
const getBonusHistory: RequestHandler = async (req, res) => {
  try {
    const user = (req as AuthedRequest).user!;
    const driverId = user.id;

    // Try to fetch from AdminAudit where action is 'GRANT_BONUS' and targetUserId matches driver
    // Or from a dedicated Bonus table if it exists
    let bonuses: any[] = [];

    try {
      // Check if AdminAudit has bonus grants for this driver
      const auditRecords = await prisma.adminAudit.findMany({
        where: {
          targetUserId: driverId,
          action: 'GRANT_BONUS',
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 100,
      });

      bonuses = auditRecords.map((record: any) => {
        const details = typeof record.details === 'string' ? JSON.parse(record.details) : record.details;
        return {
          id: String(record.id),
          date: record.createdAt || new Date().toISOString(),
          amount: Number(details.bonusAmount || 0),
          period: details.to ? new Date(details.to).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Unknown',
          status: 'paid' as const,
          reason: details.reason || null,
          paidAt: record.createdAt || null,
        };
      });
    } catch (e) {
      // If AdminAudit doesn't exist or query fails, try alternative approach
      console.warn('AdminAudit query failed, trying alternative bonus sources', e);
    }

    // Alternative: Check if there's a Bonus table
    try {
      if ((prisma as any).bonus) {
        const bonusRecords = await (prisma as any).bonus.findMany({
          where: { driverId },
          orderBy: { createdAt: 'desc' },
        });
        
        if (bonusRecords.length > 0) {
          bonuses = bonusRecords.map((b: any) => ({
            id: String(b.id),
            date: b.createdAt || b.date || new Date().toISOString(),
            amount: Number(b.amount || b.bonusAmount || 0),
            period: b.period || new Date(b.createdAt || b.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
            status: (b.status || 'pending').toLowerCase(),
            reason: b.reason || null,
            paidAt: b.paidAt || b.settledAt || null,
          }));
        }
      }
    } catch (e) {
      // Bonus table doesn't exist, continue with audit records
    }

    // If no bonuses found, return empty array
    return res.json(bonuses);
  } catch (err: any) {
    console.error('Failed to fetch bonus history', err);
    return res.status(500).json({ error: 'Failed to fetch bonus history' });
  }
};

/**
 * GET /driver/bonus/eligibility
 * Returns eligibility status for the authenticated driver
 */
const getBonusEligibility: RequestHandler = async (req, res) => {
  try {
    const user = (req as AuthedRequest).user!;
    const driverId = user.id;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);

    // Get driver stats for current month
    let tripsCompleted = 0;
    let currentEarnings = 0;
    let currentRating = 0;

    try {
      // Count trips/bookings for current month
      if ((prisma as any).booking) {
        const bookings = await (prisma as any).booking.findMany({
          where: {
            driverId,
            scheduledAt: {
              gte: monthStart,
              lte: monthEnd,
            },
            status: {
              in: ['COMPLETED', 'FINISHED', 'PAID', 'CONFIRMED'],
            },
          },
        });
        tripsCompleted = bookings.length;
        currentEarnings = bookings.reduce((sum: number, b: any) => sum + (Number(b.price || b.amount || 0)), 0);
      }
    } catch (e) {
      console.warn('Failed to fetch trips/earnings', e);
    }

    // Get driver rating
    try {
      const driver = await prisma.user.findUnique({
        where: { id: driverId },
        select: { rating: true } as any,
      });
      if (driver && typeof (driver as any).rating === 'number') {
        currentRating = (driver as any).rating;
      }
    } catch (e) {
      console.warn('Failed to fetch rating', e);
    }

    // Eligibility criteria (configurable via system settings)
    const tripsRequired = 50;
    const ratingRequired = 4.5;
    const earningsRequired = 500000; // TZS

    const tripsProgress = tripsRequired > 0 ? Math.min(100, (tripsCompleted / tripsRequired) * 100) : 100;
    const ratingProgress = ratingRequired > 0 ? Math.min(100, (currentRating / ratingRequired) * 100) : 100;
    const earningsProgress = earningsRequired > 0 ? Math.min(100, (currentEarnings / earningsRequired) * 100) : 100;

    const eligible = tripsCompleted >= tripsRequired && currentRating >= ratingRequired && currentEarnings >= earningsRequired;

    const currentPeriod = today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const nextBonusDate = new Date(today.getFullYear(), today.getMonth() + 1, 1).toISOString();

    return res.json({
      eligible,
      currentPeriod,
      tripsRequired,
      tripsCompleted,
      ratingRequired,
      currentRating,
      earningsRequired,
      currentEarnings,
      nextBonusDate,
      progress: {
        trips: Math.round(tripsProgress),
        rating: Math.round(ratingProgress),
        earnings: Math.round(earningsProgress),
      },
    });
  } catch (err: any) {
    console.error('Failed to fetch bonus eligibility', err);
    return res.status(500).json({ error: 'Failed to fetch bonus eligibility' });
  }
};

router.get('/history', getBonusHistory as unknown as RequestHandler);
router.get('/eligibility', getBonusEligibility as unknown as RequestHandler);

export default router;

