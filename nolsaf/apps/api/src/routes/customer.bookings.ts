import { Router } from "express";
import type { RequestHandler } from "express";
import { prisma } from "@nolsaf/prisma";
import { AuthedRequest, requireAuth } from "../middleware/auth.js";
import { generateBookingPDF } from "../lib/pdfGenerator.js";

export const router = Router();
router.use(requireAuth as RequestHandler);

/**
 * GET /api/customer/bookings
 * Get all bookings for the authenticated customer
 * Query params: status, page, pageSize
 */
router.get("/", (async (req: AuthedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { status, page = "1", pageSize = "20" } = req.query as any;
    
    const where: any = { userId };
    if (status) {
      where.status = String(status);
    }

    const pageNum = Number(page);
    const pageSizeNum = Number(pageSize);
    const skip = (pageNum - 1) * pageSizeNum;

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: {
          property: {
            select: {
              id: true,
              title: true,
              type: true,
              regionName: true,
              district: true,
              city: true,
              country: true,
              photos: true,
            },
          },
          code: {
            select: {
              id: true,
              code: true,
              status: true,
              generatedAt: true,
              issuedAt: true,
            },
          },
          invoices: {
            select: {
              id: true,
              invoiceNumber: true,
              receiptNumber: true,
              status: true,
              total: true,
              netPayable: true,
              paidAt: true,
            },
            take: 1,
            orderBy: { createdAt: "desc" },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSizeNum,
      }),
      prisma.booking.count({ where }),
    ]);

    // Calculate if bookings are valid (not expired)
    const now = new Date();
    const bookingsWithValidity = bookings.map((booking) => {
      const checkOut = new Date(booking.checkOut);
      const isValid = checkOut >= now && booking.status !== "CANCELED";
      const invoice = booking.invoices?.[0] || null;
      const isPaid = invoice?.status === "PAID";
      
      return {
        id: booking.id,
        property: booking.property,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        status: booking.status,
        totalAmount: booking.totalAmount,
        roomType: (booking as any).roomType || booking.roomCode || null,
        rooms: (booking as any).rooms || 1,
        services: (booking as any).services || null,
        isValid,
        isPaid,
        bookingCode: booking.code?.code || null,
        codeStatus: booking.code?.status || null,
        invoice: invoice,
        createdAt: booking.createdAt,
        updatedAt: booking.updatedAt,
      };
    });

    return res.json({
      items: bookingsWithValidity,
      total,
      page: pageNum,
      pageSize: pageSizeNum,
    });
  } catch (error: any) {
    console.error("GET /customer/bookings error:", error);
    return res.status(500).json({ error: "Failed to fetch bookings" });
  }
}) as RequestHandler);

/**
 * GET /api/customer/bookings/:id
 * Get detailed booking information including full details
 */
router.get("/:id", (async (req: AuthedRequest, res) => {
  try {
    const userId = req.user!.id;
    const bookingId = Number(req.params.id);

    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        userId,
      },
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
        code: true,
        invoices: {
          take: 1,
          orderBy: { createdAt: "desc" },
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
    });

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    // Calculate validity
    const now = new Date();
    const checkOut = new Date(booking.checkOut);
    const isValid = checkOut >= now && booking.status !== "CANCELED";
    const invoice = (booking as any).invoices?.[0] || null;
    const isPaid = invoice?.status === "PAID";

    return res.json({
      ...booking,
      isValid,
      isPaid,
    });
  } catch (error: any) {
    console.error("GET /customer/bookings/:id error:", error);
    return res.status(500).json({ error: "Failed to fetch booking" });
  }
}) as RequestHandler);

/**
 * GET /api/customer/bookings/:id/pdf
 * Generate and download PDF reservation form for a booking
 */
router.get("/:id/pdf", (async (req: AuthedRequest, res) => {
  try {
    const userId = req.user!.id;
    const bookingId = Number(req.params.id);

    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        userId,
      },
      include: {
        property: true,
        code: true,
        invoices: {
          take: 1,
          orderBy: { createdAt: "desc" },
        },
        user: {
          select: {
            name: true,
            phone: true,
          },
        },
      },
    });

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    // Allow generating PDF for both valid and expired bookings as long as a booking code exists.
    // (Expired means after checkout; code may have been USED.)
    if (!booking.code?.code) {
      return res.status(400).json({ error: "Booking code not available" });
    }

    // Prepare booking details for PDF
    const invoice = booking.invoices?.[0] || null;
    const bookingDetails: {
      bookingId: number;
      bookingCode: string;
      guestName: string;
      guestPhone?: string;
      nationality?: string;
      property: {
        title: string;
        type: string;
        regionName?: string;
        district?: string;
        city?: string;
        country: string;
      };
      checkIn: Date;
      checkOut: Date;
      roomType?: string;
      rooms?: number;
      totalAmount: number;
      services?: any;
      invoice?: {
        invoiceNumber?: string;
        receiptNumber?: string;
        paidAt?: Date;
      };
      nights: number;
    } = {
      bookingId: booking.id,
      bookingCode: booking.code!.code,
      guestName: booking.guestName || booking.user?.name || "Guest",
      guestPhone: booking.guestPhone || booking.user?.phone || undefined,
      nationality: booking.nationality || undefined,
      property: {
        title: booking.property?.title || "Property",
        type: booking.property?.type || "Property",
        regionName: booking.property?.regionName || undefined,
        district: booking.property?.district || undefined,
        city: booking.property?.city || undefined,
        country: booking.property?.country || "Tanzania",
      },
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      roomType: (booking as any).roomType || booking.roomCode || undefined,
      rooms: (booking as any).rooms || undefined,
      totalAmount: Number(booking.totalAmount || 0),
      services: (booking as any).services || undefined,
      invoice: invoice ? {
        invoiceNumber: invoice.invoiceNumber || undefined,
        receiptNumber: invoice.receiptNumber || undefined,
        paidAt: invoice.paidAt || undefined,
      } : undefined,
      nights: 0, // Will be calculated below
    };

    // Calculate nights
    const checkInDate = new Date(booking.checkIn);
    const checkOutDate = new Date(booking.checkOut);
    bookingDetails.nights = Math.ceil(
      (checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Generate PDF HTML
    const { html, filename } = await generateBookingPDF(bookingDetails);

    // Return HTML that can be printed as PDF by browser
    // For server-side PDF generation, you'd use puppeteer or similar
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
    return res.send(html);
  } catch (error: any) {
    console.error("GET /customer/bookings/:id/pdf error:", error);
    return res.status(500).json({ error: "Failed to generate PDF" });
  }
}) as RequestHandler);

export default router;
