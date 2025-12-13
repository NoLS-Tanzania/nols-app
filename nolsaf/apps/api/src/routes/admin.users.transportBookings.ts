import { Router } from "express";
import type { RequestHandler } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { prisma } from "@nolsaf/prisma";

export const router = Router();
router.use(requireAuth as unknown as RequestHandler, requireRole("ADMIN") as unknown as RequestHandler);

/** GET /admin/users/transport-bookings - Get group bookings with transport requests */
router.get("/", async (req, res) => {
  try {
    const { page = "1", pageSize = "30", status, q } = req.query as any;
    const p = Math.max(1, Number(page) || 1);
    const ps = Math.max(1, Math.min(100, Number(pageSize) || 30));

    const where: any = {
      arrTransport: true, // Only bookings with transport requested
      user: {
        role: "CUSTOMER", // Only customer bookings
      },
    };

    if (status) {
      where.status = String(status);
    }

    if (q) {
      where.OR = [
        { user: { name: { contains: String(q), mode: "insensitive" } } },
        { user: { email: { contains: String(q), mode: "insensitive" } } },
        { user: { phone: { contains: String(q), mode: "insensitive" } } },
        { toRegion: { contains: String(q), mode: "insensitive" } },
        { toLocation: { contains: String(q), mode: "insensitive" } },
      ];
    }

    const [total, bookings] = await Promise.all([
      (prisma as any).groupBooking.count({ where }),
      (prisma as any).groupBooking.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
        },
        orderBy: [
          { checkIn: "asc" }, // Urgent ones (sooner dates) first
          { createdAt: "desc" },
        ],
        skip: (p - 1) * ps,
        take: ps,
      }),
    ]);

    // Determine urgency based on dates
    const bookingsWithUrgency = bookings.map((booking: any) => {
      let urgency: "urgent" | "later" | "specified" | "flexible" = "flexible";
      let urgencyReason = "";

      if (booking.useDates && booking.checkIn) {
        const checkInDate = new Date(booking.checkIn);
        const now = new Date();
        const daysUntil = Math.ceil((checkInDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (daysUntil <= 7 && daysUntil >= 0) {
          urgency = "urgent";
          urgencyReason = `In ${daysUntil} day${daysUntil !== 1 ? "s" : ""}`;
        } else if (daysUntil > 7) {
          urgency = "later";
          urgencyReason = `In ${daysUntil} days`;
        } else if (daysUntil < 0) {
          urgency = "later";
          urgencyReason = "Past date";
        } else {
          urgency = "specified";
          urgencyReason = checkInDate.toLocaleDateString();
        }
      } else {
        urgency = "flexible";
        urgencyReason = "Flexible dates";
      }

      return {
        ...booking,
        urgency,
        urgencyReason,
      };
    });

    res.json({
      items: bookingsWithUrgency,
      total,
      page: p,
      pageSize: ps,
    });
  } catch (err) {
    console.error("admin.users.transportBookings error", err);
    res.status(500).json({ error: "failed" });
  }
});

export default router;

