import { Router } from "express";
import type { RequestHandler } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { prisma } from "@nolsaf/prisma";
import { withCache, cacheKeys, cacheTags, measureTime } from "../lib/performance.js";

export const router = Router();
router.use(requireAuth as unknown as RequestHandler, requireRole("ADMIN") as unknown as RequestHandler);

/**
 * GET /api/admin/summary
 * Returns small summary numbers used in the admin dashboard monitoring block.
 * - activeSessions: sessions with lastSeenAt within the recent window and not revoked
 * - pendingApprovals: properties with status = 'PENDING'
 * - invoicesReceived: invoices created in the last 24 hours
 * - bookings: bookings created in the last 24 hours
 * 
 * Performance: Cached for 60 seconds to reduce database load
 */
router.get("/", async (_req, res) => {
  try {
    const { result, duration } = await measureTime('admin.summary', async () => {
      return await withCache(
        cacheKeys.adminSummary(),
        async () => {
          const now = new Date();
          const activeWindowMinutes = 15; // consider a user active if seen within this many minutes
          const sinceActive = new Date(now.getTime() - activeWindowMinutes * 60 * 1000);
          const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

          // Execute all counts in parallel for better performance
          const [activeSessions, pendingApprovals, invoicesReceived, bookingsCount] = await Promise.all([
            prisma.session.count({ where: { revokedAt: null, lastSeenAt: { gte: sinceActive } } }),
            prisma.property.count({ where: { status: 'PENDING' } }),
            prisma.invoice.count({ where: { createdAt: { gte: since24h } } }),
            (async () => {
              try {
                return await prisma.booking.count({ where: { createdAt: { gte: since24h } } });
              } catch (err) {
                // If the Booking model doesn't have `createdAt` (older schema), fall back to a total count.
                try {
                  return await prisma.booking.count();
                } catch (err2) {
                  console.warn('Unable to count bookings (schema mismatch):', err2);
                  return 0;
                }
              }
            })(),
          ]);

          return { activeSessions, pendingApprovals, invoicesReceived, bookings: bookingsCount };
        },
        {
          ttl: 60, // Cache for 60 seconds (dashboard refreshes frequently)
          tags: [cacheTags.adminSummary],
        }
      );
    });

    // Add performance header for monitoring
    res.set('X-Response-Time', `${duration.toFixed(2)}ms`);
    res.json(result);
  } catch (err) {
    console.error('admin.summary error', err);
    res.status(500).json({ error: 'failed' });
  }
});

export default router;
