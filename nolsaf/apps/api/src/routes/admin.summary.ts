import { Router } from "express";
import type { RequestHandler } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { prisma } from "@nolsaf/prisma";
import { withCache, cacheKeys, cacheTags, measureTime } from "../lib/performance.js";
import { getActiveSnapshot } from "../lib/activePresence.js";

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

          // Primary definition of "online": active HTTP or Socket.IO usage seen within the window.
          const presence = getActiveSnapshot(activeWindowMinutes * 60 * 1000);

          // Execute all counts in parallel for better performance
          const [activeSessionsDb, pendingApprovals, invoicesReceived, bookingsCount] = await Promise.all([
            // DB-backed sessions (if used) — keep as a fallback for older deployments.
            (async () => {
              try {
                return await prisma.session.count({ where: { revokedAt: null, lastSeenAt: { gte: sinceActive } } });
              } catch {
                return 0;
              }
            })(),
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

          const activeSessions = presence.total || activeSessionsDb || 0;

          return {
            activeSessions,
            activeSessionsByRole: presence.byRole,
            activeSessionsWindowMinutes: activeWindowMinutes,
            pendingApprovals,
            invoicesReceived,
            bookings: bookingsCount,
          };
        },
        {
          // Presence is time-sensitive; keep this short.
          ttl: 5,
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
