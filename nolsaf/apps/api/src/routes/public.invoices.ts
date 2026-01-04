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
      let codeGenerated = false;
      let generatedCodeId: number | undefined;

      while (attempts < maxAttempts && !codeGenerated) {
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
          generatedCodeId = codeRecord.id;
          codeGenerated = true;
        } catch (error: any) {
          if (error?.code === "P2002") {
            attempts++;
            continue;
          }
          throw error;
        }
      }

      if (!codeGenerated || !generatedCodeId) {
        throw new Error("Failed to generate booking code after multiple attempts");
      }
      codeId = generatedCodeId;
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

      // Create invoice (only using fields that exist in the Invoice model)
      // Format notes safely
      const accommodationStr = Number(accommodationSubtotal).toLocaleString();
      const transportStr = Number(transportFare).toLocaleString();
      const totalStr = Number(totalAmount).toLocaleString();
      
      const notes = transportFare > 0 
        ? `Accommodation: ${accommodationStr} TZS. Transportation: ${transportStr} TZS. Total: ${totalStr} TZS.`
        : `Accommodation for ${nights} night${nights !== 1 ? 's' : ''} at ${booking.property.title}. Total: ${totalStr} TZS.`;

      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber: makeInvoiceNumber(booking.id, codeId),
          ownerId: booking.property.ownerId,
          bookingId: booking.id,
          total: totalAmount,
          netPayable: totalAmount, // Amount to be paid (includes transport if applicable)
          commissionPercent: commissionPercent > 0 ? commissionPercent : null,
          commissionAmount: commission > 0 ? commission : null,
          taxPercent: 0,
          // This record represents a customer-paid booking receipt, not an owner-submitted invoice claim.
          // It must NOT enter the owner-invoice verification pipeline.
          status: "CUSTOMER_PAID",
          paymentRef: `INVREF-${booking.id}-${Date.now()}`,
          paidAt: new Date(),
          notes: notes,
        },
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
    console.error("Error details:", {
      message: error?.message,
      code: error?.code,
      stack: error?.stack,
    });

    // Handle Prisma errors
    if (error?.code === "P2002") {
      return res.status(409).json({ 
        error: "Invoice conflict detected",
        message: "An invoice with similar details already exists",
      });
    }

    // Generic error response (include message in development for debugging)
    return res.status(500).json({
      error: "Failed to create invoice",
      message: process.env.NODE_ENV === "development" ? error?.message : "An unexpected error occurred. Please try again.",
      ...(process.env.NODE_ENV === "development" && { 
        details: {
          code: error?.code,
          name: error?.name,
        }
      }),
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
                basePrice: true,
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

    // Calculate price breakdown
    const basePrice = invoice.booking.property.basePrice ? Number(invoice.booking.property.basePrice) : 0;
    const accommodationSubtotal = basePrice * nights;
    const totalAmount = Number(invoice.total || 0);
    const taxPercent = invoice.taxPercent ? Number(invoice.taxPercent) : 0;
    const taxAmount = taxPercent > 0 ? (accommodationSubtotal * taxPercent) / 100 : 0;
    const commission = invoice.commissionAmount ? Number(invoice.commissionAmount) : 0;
    
    // Calculate subtotal (accommodation + tax + commission)
    const subtotalBeforeTransport = accommodationSubtotal + taxAmount + commission;
    const transportFare = totalAmount > subtotalBeforeTransport ? totalAmount - subtotalBeforeTransport : 0;
    
    // Calculate discount if total is less than expected
    const expectedTotal = accommodationSubtotal + taxAmount + commission + transportFare;
    const discount = expectedTotal > totalAmount ? expectedTotal - totalAmount : 0;

    return res.json({
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      receiptNumber: invoice.receiptNumber || null,
      paymentRef: invoice.paymentRef,
      status: invoice.status,
      paidAt: invoice.paidAt || null,
      paymentMethod: (invoice as any).paymentMethod || null,
      totalAmount: totalAmount,
      currency: invoice.booking.property.currency || "TZS",
      booking: {
        id: invoice.booking.id,
        bookingCode: invoice.booking.code?.code || null,
        checkIn: invoice.booking.checkIn,
        checkOut: invoice.booking.checkOut,
        nights: nights,
        guestName: invoice.booking.guestName || null,
        guestPhone: invoice.booking.guestPhone || null,
        roomCode: invoice.booking.roomCode || null,
        totalAmount: Number(invoice.booking.totalAmount || 0),
      },
      property: {
        id: invoice.booking.property.id,
        title: invoice.booking.property.title,
        type: invoice.booking.property.type,
        primaryImage: Array.isArray(invoice.booking.property.photos) && invoice.booking.property.photos.length > 0
          ? invoice.booking.property.photos[0]
          : null,
        basePrice: basePrice,
      },
      // Provide QR as data URL if present (useful for receipt page)
      receiptQrPng: invoice.receiptQrPng
        ? `data:image/png;base64,${Buffer.from(invoice.receiptQrPng as any).toString("base64")}`
        : null,
      priceBreakdown: {
        accommodationSubtotal: accommodationSubtotal,
        taxPercent: taxPercent,
        taxAmount: taxAmount,
        discount: discount,
        transportFare: transportFare > 0 ? transportFare : 0,
        commission: commission,
        subtotal: subtotalBeforeTransport + transportFare,
        total: totalAmount,
      },
    });
  } catch (error: any) {
    console.error("GET /api/public/invoices/:id error:", error);
    return res.status(500).json({ error: "Failed to retrieve invoice" });
  }
});

export default router;

