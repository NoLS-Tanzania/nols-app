import { Router } from "express";
import type { RequestHandler } from "express";
import { prisma } from "@nolsaf/prisma";
import { validateBookingCode } from "../lib/bookingCodeService.js";

export const router = Router();

/**
 * GET /api/public/booking/:code
 * Public endpoint to view booking details by scanning QR code
 * No authentication required - uses booking code for verification
 */
router.get("/:code", async (req, res) => {
  try {
    const code = req.params.code.trim().toUpperCase();

    // Validate booking code
    const validation = await validateBookingCode(code);

    if (!validation.valid || !validation.booking) {
      return res.status(404).json({ 
        error: "Invalid or expired booking code",
        message: "The booking code you scanned is not valid or has expired."
      });
    }

    const booking = validation.booking;

    // Calculate derived fields
    const checkIn = new Date(booking.checkIn);
    const checkOut = new Date(booking.checkOut);
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));

    // Return booking details (public-safe information)
    return res.json({
      success: true,
      booking: {
        id: booking.id,
        bookingCode: code,
        guestName: booking.guestName || booking.user?.name || "Guest",
        guestPhone: booking.guestPhone || booking.user?.phone || null,
        nationality: booking.nationality || null,
        property: {
          title: booking.property?.title || "Property",
          type: booking.property?.type || "Property",
          regionName: booking.property?.regionName || null,
          district: booking.property?.district || null,
          city: booking.property?.city || null,
          country: booking.property?.country || "Tanzania",
        },
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        nights,
        roomType: (booking as any).roomType || booking.roomCode || null,
        rooms: (booking as any).rooms || 1,
        totalAmount: Number(booking.totalAmount || 0),
        status: booking.status,
        services: (booking as any).services || null,
        invoice: booking.invoice ? {
          invoiceNumber: booking.invoice.invoiceNumber || null,
          receiptNumber: booking.invoice.receiptNumber || null,
          paidAt: booking.invoice.paidAt || null,
        } : null,
      },
    });
  } catch (error: any) {
    console.error("GET /public/booking/:code error:", error);
    return res.status(500).json({ error: "Failed to retrieve booking information" });
  }
});

export default router;
