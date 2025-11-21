import { Router } from "express";
import type { RequestHandler } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { prisma } from "@nolsaf/prisma";

export const router = Router();
router.use(requireAuth as unknown as RequestHandler, requireRole("ADMIN") as unknown as RequestHandler);

/**
 * GET /api/admin/summary
 * Returns small summary numbers used in the admin dashboard monitoring block.
 * - activeSessions: sessions with lastSeenAt within the recent window and not revoked
 * - pendingApprovals: properties with status = 'PENDING'
 * - invoicesReceived: invoices created in the last 24 hours
 * - bookings: bookings created in the last 24 hours
 */
router.get("/", async (_req, res) => {
  try {
    const now = new Date();
    const activeWindowMinutes = 15; // consider a user active if seen within this many minutes
    const sinceActive = new Date(now.getTime() - activeWindowMinutes * 60 * 1000);

    const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Count values. Some deployments may have a different Booking model (no `createdAt`),
    // so perform the booking count with a safe fallback to avoid Prisma validation errors.
    const activeSessions = await prisma.session.count({ where: { revokedAt: null, lastSeenAt: { gte: sinceActive } } });
    const pendingApprovals = await prisma.property.count({ where: { status: 'PENDING' } });
    const invoicesReceived = await prisma.invoice.count({ where: { createdAt: { gte: since24h } } });

    let bookingsCount: number;
    try {
      bookingsCount = await prisma.booking.count({ where: { createdAt: { gte: since24h } } });
    } catch (err) {
      // If the Booking model doesn't have `createdAt` (older schema), fall back to a total count.
      try {
        bookingsCount = await prisma.booking.count();
      } catch (err2) {
        console.warn('Unable to count bookings (schema mismatch):', err2);
        bookingsCount = 0;
      }
    }

    res.json({ activeSessions, pendingApprovals, invoicesReceived, bookings: bookingsCount });
  } catch (err) {
    console.error('admin.summary error', err);
    res.status(500).json({ error: 'failed' });
  }
});

export default router;
