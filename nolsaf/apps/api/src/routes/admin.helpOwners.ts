import { Router } from "express";
import type { RequestHandler } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { prisma } from "@nolsaf/prisma";

export const router = Router();
router.use(requireAuth as unknown as RequestHandler, requireRole("ADMIN") as unknown as RequestHandler);

function differenceInCalendarDays(end: Date | string, start: Date | string) {
  const e = typeof end === "string" ? new Date(end) : end;
  const s = typeof start === "string" ? new Date(start) : start;
  return Math.ceil((e.getTime() - s.getTime()) / 86400000);
}

/**
 * POST /admin/help-owners/validate
 * Preview booking details by code (no state change)
 * Admin can validate any booking code to help owners
 */
router.post("/validate", async (req, res) => {
  const { code } = req.body as { code: string };
  if (!code) return res.status(400).json({ error: "Code is required" });

  try {
    const checkinCode = await prisma.checkinCode.findFirst({
      where: { codeVisible: code },
      include: {
        booking: {
          include: {
            property: {
              include: {
                owner: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    phone: true,
                  },
                },
              },
            },
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        },
      },
    });

    if (!checkinCode) {
      return res.status(404).json({ error: "Invalid or expired code" });
    }

    if (checkinCode.status !== "ACTIVE") {
      return res.status(400).json({ 
        error: `Code is not active (status: ${checkinCode.status})`,
        codeStatus: checkinCode.status,
      });
    }

    const booking = checkinCode.booking;
    const nights = differenceInCalendarDays(booking.checkOut, booking.checkIn);

    const details = {
      bookingId: booking.id,
      codeId: checkinCode.id,
      codeStatus: checkinCode.status,
      property: {
        id: booking.propertyId,
        title: booking.property?.title ?? "-",
        type: booking.property?.type ?? "-",
        owner: booking.property?.owner ? {
          id: booking.property.owner.id,
          name: booking.property.owner.name,
          email: booking.property.owner.email,
          phone: booking.property.owner.phone,
        } : null,
      },
      customer: booking.user ? {
        id: booking.user.id,
        name: booking.user.name,
        email: booking.user.email,
        phone: booking.user.phone,
      } : null,
      guest: {
        fullName: (booking as any).guestName ?? "-",
        phone: (booking as any).guestPhone ?? "-",
        nationality: (booking as any).nationality ?? "-",
        sex: (booking as any).sex ?? "-",
        ageGroup: (booking as any).ageGroup ?? "-",
      },
      booking: {
        roomCode: (booking as any).roomCode ?? "-",
        nights,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        status: booking.status,
        totalAmount: booking.totalAmount,
        currency: (booking as any).currency ?? "TZS",
      },
    };

    return res.json({ ok: true, details });
  } catch (err) {
    console.error("admin.helpOwners.validate error", err);
    res.status(500).json({ error: "Failed to validate code" });
  }
});

/**
 * POST /admin/help-owners/confirm-checkin
 * Confirm check-in on behalf of owner
 */
router.post("/confirm-checkin", async (req, res) => {
  const { bookingId } = req.body as { bookingId: number };
  if (!bookingId) return res.status(400).json({ error: "bookingId is required" });

  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { code: true, property: true },
    });

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    if (booking.status === "CHECKED_IN") {
      return res.status(400).json({ error: "Booking already checked in" });
    }

    if (!booking.code || booking.code.status !== "ACTIVE") {
      return res.status(400).json({ error: "Check-in code is not active" });
    }

    // Update booking status and mark code as used
    const updated = await prisma.$transaction(async (tx) => {
      // Mark code as used
      await tx.checkinCode.update({
        where: { id: booking.code!.id },
        data: {
          status: "USED",
          usedAt: new Date(),
          usedByOwner: booking.property.ownerId, // Track which owner this was for
        },
      });

      // Update booking status
      const updatedBooking = await tx.booking.update({
        where: { id: bookingId },
        data: { status: "CHECKED_IN" },
      });

      return updatedBooking;
    });

    // Emit socket event for real-time updates
    try {
      req.app.get("io")?.emit?.("admin:booking:checked-in", { bookingId: updated.id });
    } catch {}

    return res.json({ 
      ok: true, 
      bookingId: updated.id, 
      status: updated.status,
      message: "Check-in confirmed successfully",
    });
  } catch (err) {
    console.error("admin.helpOwners.confirm-checkin error", err);
    res.status(500).json({ error: "Failed to confirm check-in" });
  }
});

export default router;

