// apps/api/src/routes/public.invoices.ts
import { Router, Request, Response } from "express";
import { prisma } from "@nolsaf/prisma";
import { z } from "zod";
// Commission calculation helpers (duplicated from web app to avoid dependency)
function getPropertyCommission(propertyType: string, systemCommission: number = 0): number {
  // For now, use a simple commission structure
  // In production, this should be configurable per property
  return systemCommission; // Default 0% commission, can be configured
}

function calculatePriceWithCommission(
  originalPrice: number,
  commissionPercent: number
): { total: number; commission: number } {
  if (!originalPrice || originalPrice <= 0 || !Number.isFinite(originalPrice)) {
    return { total: 0, commission: 0 };
  }

  if (!Number.isFinite(commissionPercent) || commissionPercent <= 0) {
    return { total: originalPrice, commission: 0 };
  }

  const safeCommission = Math.max(0, Math.min(100, commissionPercent));
  const commissionAmount = (originalPrice * safeCommission) / 100;
  const finalPrice = originalPrice + commissionAmount;

  return {
    total: Math.round(finalPrice * 100) / 100,
    commission: Math.round(commissionAmount * 100) / 100,
  };
}

const router = Router();

// Helper to format an invoice number
function makeInvoiceNumber(bookingId: number, codeId: number) {
  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  return `INV-${ym}-${bookingId}-${codeId}`;
}

// Validation schema
const createInvoiceSchema = z.object({
  bookingId: z.number().int().positive(),
});

/**
 * POST /api/public/invoices/from-booking
 * Create invoice from booking (public endpoint, no authentication required)
 * 
 * Security:
 * - Input validation
 * - Booking validation
 * - Server-side amount calculation
 * - Duplicate prevention
 */
router.post("/from-booking", async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validationResult = createInvoiceSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: "Invalid request data",
        details: validationResult.error.errors,
      });
    }

    const { bookingId } = validationResult.data;

    // Fetch booking with property and code
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
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

    if (booking.property.status !== "APPROVED") {
      return res.status(400).json({
        error: "Property is not available",
        reason: `Property status is ${booking.property.status}`,
      });
    }

    // Check if invoice already exists
    const existingInvoice = await prisma.invoice.findFirst({
      where: { bookingId: booking.id },
    });

    if (existingInvoice) {
      return res.status(200).json({
        ok: true,
        invoiceId: existingInvoice.id,
        invoiceNumber: existingInvoice.invoiceNumber,
        paymentRef: existingInvoice.paymentRef,
        status: existingInvoice.status,
        message: "Invoice already exists",
      });
    }

    // Calculate amounts (server-side only)
    const nights = Math.max(
      1,
      Math.ceil(
        (new Date(booking.checkOut).getTime() -
          new Date(booking.checkIn).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    );

    // Extract transport info from specialRequests if present
    let transportFare = 0;
    const specialRequests = (booking as any).specialRequests as string | null | undefined;
    const transportInfo = specialRequests?.match(/TRANSPORT_INCLUDED\|fare:(\d+)/);
    if (transportInfo) {
      transportFare = Number(transportInfo[1]) || 0;
    }

    const basePrice = booking.property.basePrice
      ? Number(booking.property.basePrice)
      : 0;
    const accommodationSubtotal = basePrice * nights;

    // Calculate commission (default 0% for now, can be configured)
    const commissionPercent = getPropertyCommission(booking.property.type, 0);
    const { total: accommodationTotal, commission } = calculatePriceWithCommission(
      accommodationSubtotal,
      commissionPercent
    );

    // Use booking.totalAmount if it exists (includes transport), otherwise calculate
    const totalAmount = booking.totalAmount 
      ? Number(booking.totalAmount) 
      : accommodationTotal + transportFare;

    // Generate booking code if it doesn't exist
    let codeId: number;
    if (!booking.code) {
      // Generate code
      const crypto = await import("crypto");
      const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      let code: string;
      let attempts = 0;
      const maxAttempts = 10;

      while (attempts < maxAttempts) {
        code = "";
        for (let i = 0; i < 8; i++) {
          code += alphabet[crypto.randomInt(0, alphabet.length)];
        }
        const codeHash = crypto.createHash("sha256").update(code).digest("hex");

        try {
          const codeRecord = await prisma.checkinCode.create({
            data: {
              bookingId: booking.id,
              code: code,
              codeHash: codeHash,
              codeVisible: code,
              status: "ACTIVE",
              generatedAt: new Date(),
            },
          });
          codeId = codeRecord.id;
          break;
        } catch (error: any) {
          if (error?.code === "P2002") {
            attempts++;
            continue;
          }
          throw error;
        }
      }

      if (!codeId!) {
        throw new Error("Failed to generate booking code");
      }
    } else {
      codeId = booking.code.id;
    }

    // Create invoice in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Double-check for duplicate
      const duplicate = await tx.invoice.findFirst({
        where: { bookingId: booking.id },
      });
      if (duplicate) {
        return { duplicate: duplicate.id };
      }

      // Create invoice
      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber: makeInvoiceNumber(booking.id, codeId),
          ownerId: booking.property.ownerId,
          bookingId: booking.id,
          checkinCodeId: codeId,
          title: `${booking.property.title} — Accommodation Invoice`,
          currency: booking.property.currency || "TZS",
          senderName: booking.property.owner.name || `Owner #${booking.property.ownerId}`,
          senderPhone: booking.property.owner.phone || null,
          receiverName: "NoLSAF",
          receiverAddress: "Dar es Salaam, Tanzania",
          receiverPhone: "+255",
          subtotal: accommodationSubtotal,
          taxPercent: 0,
          taxAmount: 0,
          total: totalAmount,
          netPayable: totalAmount, // Amount to be paid (includes transport if applicable)
          status: "APPROVED", // Auto-approve for public bookings
          paymentRef: `INVREF-${booking.id}-${Date.now()}`,
          notes: transportFare > 0 
            ? `Includes transportation fare: ${transportFare.toLocaleString()} TZS`
            : null,
          // Note: Invoice model doesn't have currency field, it's stored on property
        } as any,
      });

      // Note: Invoice items are not stored separately in this schema
      // The invoice description/details are in the invoice itself

      return { invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber };
    });

    if ("duplicate" in result) {
      const invoice = await prisma.invoice.findUnique({
        where: { id: result.duplicate },
      });
      return res.status(200).json({
        ok: true,
        invoiceId: result.duplicate,
        invoiceNumber: invoice?.invoiceNumber,
        paymentRef: invoice?.paymentRef,
        status: invoice?.status,
        message: "Invoice already exists",
      });
    }

    // Fetch created invoice
    const invoice = await prisma.invoice.findUnique({
      where: { id: result.invoiceId },
    });

    return res.status(201).json({
      ok: true,
      invoiceId: result.invoiceId,
      invoiceNumber: result.invoiceNumber,
      paymentRef: invoice?.paymentRef,
      status: invoice?.status,
      totalAmount: totalAmount,
      currency: booking.property.currency || "TZS",
      booking: {
        id: booking.id,
        bookingCode: booking.code?.code,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        nights: nights,
      },
    });
  } catch (error: any) {
    console.error("POST /api/public/invoices/from-booking error:", error);
    return res.status(500).json({
      error: "Failed to create invoice",
      message: process.env.NODE_ENV === "development" ? error?.message : undefined,
    });
  }
});

/**
 * GET /api/public/invoices/:id
 * Get invoice details (public endpoint, no authentication required)
 */
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const invoiceId = Number(req.params.id);
    if (!invoiceId || isNaN(invoiceId)) {
      return res.status(400).json({ error: "Invalid invoice ID" });
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        booking: {
          include: {
            property: {
              select: {
                id: true,
                title: true,
                photos: true,
                type: true,
                currency: true,
              },
            },
            code: {
              select: {
                code: true,
                status: true,
              },
            },
          },
        },
      },
    });

    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    const nights = Math.ceil(
      (new Date(invoice.booking.checkOut).getTime() -
        new Date(invoice.booking.checkIn).getTime()) /
        (1000 * 60 * 60 * 24)
    );

    return res.json({
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      paymentRef: invoice.paymentRef,
      status: invoice.status,
      totalAmount: Number(invoice.total || 0),
      currency: invoice.booking.property.currency || "TZS",
      booking: {
        id: invoice.booking.id,
        bookingCode: invoice.booking.code?.code || null,
        checkIn: invoice.booking.checkIn,
        checkOut: invoice.booking.checkOut,
        nights: nights,
      },
      property: {
        id: invoice.booking.property.id,
        title: invoice.booking.property.title,
        primaryImage: Array.isArray(invoice.booking.property.photos) && invoice.booking.property.photos.length > 0
          ? invoice.booking.property.photos[0]
          : null,
      },
    });
  } catch (error: any) {
    console.error("GET /api/public/invoices/:id error:", error);
    return res.status(500).json({ error: "Failed to retrieve invoice" });
  }
});

export default router;

