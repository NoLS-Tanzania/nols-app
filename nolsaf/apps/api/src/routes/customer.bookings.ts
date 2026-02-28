import { Router } from "express";
import type { RequestHandler } from "express";
import { prisma } from "@nolsaf/prisma";
import { AuthedRequest, requireAuth } from "../middleware/auth.js";
import { generateBookingTicketPdf } from "../lib/pdfDocuments.js";

export const router = Router();
router.use(requireAuth as RequestHandler);

function buildPhoneVariants(phoneRaw: string | null | undefined): string[] {
  const raw = String(phoneRaw ?? "").trim();
  if (!raw) return [];

  const compact = raw.replace(/\s+/g, "").replace(/-/g, "");
  const noPlus = compact.replace(/^\+/, "");
  const digitsOnly = noPlus.replace(/\D+/g, "");

  const variants = new Set<string>([raw, compact, noPlus]);
  if (digitsOnly) variants.add(digitsOnly);

  // Tanzania-friendly normalization: 0XXXXXXXXX <-> 255XXXXXXXXX
  if (digitsOnly.length === 9) {
    variants.add("0" + digitsOnly);
    variants.add("255" + digitsOnly);
    variants.add("+255" + digitsOnly);
  }

  if (digitsOnly.startsWith("0") && digitsOnly.length === 10) {
    const t = "255" + digitsOnly.slice(1);
    variants.add(t);
    variants.add("+" + t);
  }

  if (digitsOnly.startsWith("255") && digitsOnly.length === 12) {
    variants.add(digitsOnly);
    variants.add("+" + digitsOnly);
    variants.add("0" + digitsOnly.slice(3));
  }

  return Array.from(variants).filter(Boolean);
}

async function getUserContact(userId: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, phone: true, email: true },
  });
  return { id: userId, phone: user?.phone ?? null, email: user?.email ?? null };
}

function getTail9Digits(phoneRaw: string | null | undefined): string | null {
  const raw = String(phoneRaw ?? "").trim();
  if (!raw) return null;
  const digits = raw.replace(/\D+/g, "");
  if (digits.length < 9) return null;
  return digits.slice(-9);
}

async function findLegacyBookingIdsByPhoneTail(tail9: string): Promise<number[]> {
  try {
    const rows = await prisma.$queryRaw<Array<{ id: number }>>`
      SELECT id
      FROM \`booking\`
      WHERE \`userId\` IS NULL
        AND \`guestPhone\` IS NOT NULL
        AND RIGHT(REGEXP_REPLACE(\`guestPhone\`, '[^0-9]', ''), 9) = ${tail9}
    `;

    return rows.map((r: { id: number }) => r.id);
  } catch (error) {
    // If the DB doesn't support REGEXP_REPLACE (older MySQL), try a best-effort fallback
    // that strips the most common separators.
    try {
      const rows = await prisma.$queryRaw<Array<{ id: number }>>`
        SELECT id
        FROM \`booking\`
        WHERE \`userId\` IS NULL
          AND \`guestPhone\` IS NOT NULL
          AND RIGHT(
            REPLACE(REPLACE(REPLACE(REPLACE(\`guestPhone\`, ' ', ''), '-', ''), '+', ''), '\\t', ''),
            9
          ) = ${tail9}
      `;

      return rows.map((r: { id: number }) => r.id);
    } catch (fallbackError) {
      console.warn(
        "Legacy phone match query failed; falling back to userId-only.",
        error,
        fallbackError
      );
      return [];
    }
  }
}

function buildCustomerBookingWhere(user: { id: number }, legacyBookingIds: number[]) {
  const or: any[] = [{ userId: user.id }];
  if (legacyBookingIds.length) {
    or.push({ id: { in: legacyBookingIds } });
  }
  return { OR: or };
}

/**
 * GET /api/customer/bookings
 * Get all bookings for the authenticated customer
 * Query params: status, page, pageSize
 */
router.get("/", (async (req: AuthedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { status, page = "1", pageSize = "20" } = req.query as any;
    
    const userContact = await getUserContact(userId);

    const tail9 = getTail9Digits(userContact.phone);
    const legacyBookingIds = tail9 ? await findLegacyBookingIdsByPhoneTail(tail9) : [];

    const where: any = {
      AND: [
        buildCustomerBookingWhere({ id: userId }, legacyBookingIds),
      ],
    };

    if (status) where.AND.push({ status: String(status) });

    const pageNum = Math.max(1, Number(page) || 1);
    const pageSizeNum = Math.min(50, Math.max(1, Number(pageSize) || 20));
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
    type BookingRow = (typeof bookings)[number];
    const bookingsWithValidity = bookings.map((booking: BookingRow) => {
      const checkOut = new Date(booking.checkOut);
      const isValid = checkOut >= now && booking.status !== "CANCELED";
      const invoice = booking.invoices?.[0] || null;
      const isPaid =
        invoice?.status === "PAID" ||
        (invoice?.status === "CUSTOMER_PAID" && Boolean(invoice?.receiptNumber));
      
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

    const userContact = await getUserContact(userId);

    const tail9 = getTail9Digits(userContact.phone);
    const legacyBookingIds = tail9 ? await findLegacyBookingIdsByPhoneTail(tail9) : [];

    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        ...buildCustomerBookingWhere({ id: userId }, legacyBookingIds),
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
    const isPaid =
      invoice?.status === "PAID" ||
      (invoice?.status === "CUSTOMER_PAID" && Boolean((invoice as any)?.receiptNumber));

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

    const userContact = await getUserContact(userId);

    const tail9 = getTail9Digits(userContact.phone);
    const legacyBookingIds = tail9 ? await findLegacyBookingIdsByPhoneTail(tail9) : [];

    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        ...buildCustomerBookingWhere({ id: userId }, legacyBookingIds),
      },
      include: {
        property: true,
        code: true,
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
    if (!booking.code?.codeVisible) {
      return res.status(400).json({ error: "Booking code not available" });
    }

    // Prepare booking details for PDF
    const bookingDetails = {
      bookingId: booking.id,
      bookingCode: booking.code!.codeVisible,
      guestName: booking.guestName || booking.user?.name || "Guest",
      guestPhone: booking.guestPhone || booking.user?.phone || undefined,
      propertyName: booking.property?.title || "Property",
      propertyLocation: [booking.property?.regionName, booking.property?.district, booking.property?.city]
        .filter(Boolean).join(", ") || null,
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      rooms: booking.roomsQty ?? 1,
      totalAmount: Number(booking.totalAmount || 0),
      confirmedAt: (booking as any).confirmedAt ?? null,
    };

    const nights = Math.max(1, Math.ceil(
      (new Date(booking.checkOut).getTime() - new Date(booking.checkIn).getTime()) / 86400000
    ));
    const codeVisible = booking.code!.codeVisible;
    const propertySlug = (booking.property?.title ?? "booking").replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase();
    const filename = `Reservation-${codeVisible}-${propertySlug}.pdf`;

    // Generate real binary PDF using pdfkit (no browser print dialog needed)
    const pdfBuffer = await generateBookingTicketPdf({ ...bookingDetails, nights } as any);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", String(pdfBuffer.length));
    return res.send(pdfBuffer);
  } catch (error: any) {
    console.error("GET /customer/bookings/:id/pdf error:", error);
    return res.status(500).json({ error: "Failed to generate PDF" });
  }
}) as RequestHandler);

export default router;
