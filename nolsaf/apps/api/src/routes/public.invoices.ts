// apps/api/src/routes/public.invoices.ts
import { Router, Request, Response } from "express";
import { prisma } from "@nolsaf/prisma";
import { z } from "zod";
import rateLimit from "express-rate-limit";

async function getEffectiveCommissionPercent(params: {
  propertyServices: unknown;
}): Promise<number> {
  // Per-property override (admin sets this via /admin/properties/:id -> services.commissionPercent)
  const fromProperty = (() => {
    const services = params.propertyServices as any;
    const v = services?.commissionPercent;
    const n = Number(v);
    if (!Number.isFinite(n)) return null;
    if (n < 0) return 0;
    if (n > 100) return 100;
    return n;
  })();

  if (fromProperty != null) return fromProperty;

  // Global default (SystemSetting singleton)
  try {
    const s =
      (await prisma.systemSetting.findUnique({ where: { id: 1 }, select: { commissionPercent: true } as any })) ??
      (await prisma.systemSetting.create({ data: { id: 1 } } as any));
    const n = Number((s as any)?.commissionPercent ?? 0);
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.min(100, n));
  } catch {
    return 0;
  }
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

// Public endpoints: rate limit to reduce abuse/DoS.
const publicInvoiceLimiter = rateLimit({
  windowMs: 60_000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { ok: false, error: "Too many requests" },
});

const publicInvoiceReadLimiter = rateLimit({
  windowMs: 60_000,
  limit: 120,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { ok: false, error: "Too many requests" },
});

function isPaidLikeInvoice(invoice: { status?: string | null; receiptNumber?: string | null } | null | undefined) {
  if (!invoice) return false;
  if (invoice.status === "PAID") return true;
  // Legacy safety: treat CUSTOMER_PAID as paid only if we have receipt evidence.
  if (invoice.status === "CUSTOMER_PAID" && Boolean(invoice.receiptNumber)) return true;
  return false;
}

function buildPropertyTransportLabel(property: {
  title?: string | null;
  street?: string | null;
  ward?: string | null;
  district?: string | null;
  regionName?: string | null;
  city?: string | null;
} | null | undefined) {
  if (!property) return null;
  const parts = [
    String(property.title || "").trim(),
    String(property.street || "").trim(),
    String(property.ward || "").trim(),
    String(property.district || "").trim(),
    String(property.regionName || "").trim(),
    String(property.city || "").trim(),
  ].filter(Boolean);
  const label = parts.join(" - ").slice(0, 255);
  return label || null;
}

async function publishScheduledTripsForBooking(params: {
  req: Request;
  bookingId: number;
  invoicePaymentRef: string | null | undefined;
  paymentMethod: string | null | undefined;
}) {
  const { req, bookingId, invoicePaymentRef, paymentMethod } = params;
  if (!Number.isFinite(bookingId) || bookingId <= 0) return;

  const pending = await prisma.transportBooking.findMany({
    where: {
      paymentRef: `BOOKING:${bookingId}`,
      status: { in: ["PAYMENT_PENDING", "PENDING_ASSIGNMENT"] },
    },
    select: {
      id: true,
      propertyId: true,
      vehicleType: true,
      scheduledDate: true,
      fromAddress: true,
      fromLatitude: true,
      fromLongitude: true,
      toAddress: true,
      toLatitude: true,
      toLongitude: true,
      amount: true,
      currency: true,
      notes: true,
    },
  });

  if (!pending.length) return;

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      propertyId: true,
      includeTransport: true,
      transportVehicleType: true,
      transportScheduledDate: true,
      transportOriginAddress: true,
      transportFare: true,
      property: {
        select: {
          title: true,
          street: true,
          ward: true,
          district: true,
          regionName: true,
          city: true,
          latitude: true,
          longitude: true,
          currency: true,
        },
      },
    },
  });

  const propertyLabel = buildPropertyTransportLabel(booking?.property);

  await prisma.transportBooking.updateMany({
    where: {
      paymentRef: `BOOKING:${bookingId}`,
      status: { in: ["PAYMENT_PENDING", "PENDING_ASSIGNMENT"] },
    },
    data: {
      status: "PENDING_ASSIGNMENT",
      paymentStatus: "PAID",
      paymentMethod: paymentMethod ?? "INVOICE",
      paymentRef: invoicePaymentRef ?? `BOOKING:${bookingId}`,
    },
  });

  // Hydrate any missing trip details from Booking/Property so drivers always see usable info.
  if (booking) {
    for (const trip of pending) {
      const patch: any = {};

      if (!trip.propertyId) patch.propertyId = booking.propertyId;

      if (!trip.vehicleType && booking.transportVehicleType) {
        patch.vehicleType = booking.transportVehicleType;
      }

      if (!trip.fromAddress && booking.transportOriginAddress) {
        patch.fromAddress = booking.transportOriginAddress;
      }

      if (!trip.toAddress && propertyLabel) {
        patch.toAddress = propertyLabel;
      }

      if (trip.amount == null && booking.transportFare != null) {
        patch.amount = booking.transportFare as any;
      }

      if (!trip.currency && booking.property?.currency) {
        patch.currency = booking.property.currency;
      }

      if ((trip.toLatitude == null || trip.toLongitude == null) && booking.property?.latitude != null && booking.property?.longitude != null) {
        patch.toLatitude = booking.property.latitude as any;
        patch.toLongitude = booking.property.longitude as any;
      }

      const basePolicy = `NoLSAF Auction Policy: Claim only if you can commit to the pickup time. No-shows/cancellations after claiming may affect your driver rating.`;
      const existingNotes = String(trip.notes ?? "").trim();
      if (!existingNotes) {
        patch.notes = basePolicy;
      } else if (/^Booking:\d+\s*(\|.*)?$/.test(existingNotes)) {
        patch.notes = basePolicy;
      }

      if (Object.keys(patch).length) {
        try {
          await prisma.transportBooking.update({
            where: { id: trip.id },
            data: patch,
          });
        } catch {
          // non-fatal
        }
      }
    }
  }

  try {
    const io = ((req.app as any)?.get?.("io") as any) || (global as any).io;
    if (io && typeof io.to === "function") {
      for (const trip of pending) {
        io.to("drivers:available").emit("transport:booking:created", {
          bookingId: trip.id,
          vehicleType: trip.vehicleType ?? booking?.transportVehicleType ?? null,
          scheduledDate: trip.scheduledDate,
          fromAddress: trip.fromAddress ?? booking?.transportOriginAddress ?? null,
          toAddress: trip.toAddress ?? propertyLabel ?? null,
          amount: trip.amount ?? (booking?.transportFare as any) ?? null,
        });
      }
    }
  } catch {
    // non-fatal
  }
}

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
router.post("/from-booking", publicInvoiceLimiter, async (req: Request, res: Response) => {
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
    let existingInvoice = await prisma.invoice.findFirst({
      where: { bookingId: booking.id },
    });

    // Calculate amounts (server-side only)
    const nights = Math.max(
      1,
      Math.ceil(
        (new Date(booking.checkOut).getTime() -
          new Date(booking.checkIn).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    );

    // Prefer authoritative transportFare from the booking record (set at booking creation).
    // Fall back to legacy parsing from specialRequests for older records.
    let transportFare = 0;
    if ((booking as any).includeTransport) {
      const tf = (booking as any).transportFare != null ? Number((booking as any).transportFare) : NaN;
      if (Number.isFinite(tf) && tf > 0) transportFare = tf;
    }

    if (!transportFare) {
      const specialRequests = (booking as any).specialRequests as string | null | undefined;
      const transportInfo = specialRequests?.match(/TRANSPORT_INCLUDED\|fare:(\d+)/);
      if (transportInfo) {
        transportFare = Number(transportInfo[1]) || 0;
      }
    }

    // Use booking.totalAmount if present (authoritative, includes roomsQty + selected room price + transportFare).
    const totalAmount = booking.totalAmount ? Number(booking.totalAmount) : 0;

    // Derive accommodation subtotal for notes/commission. (Avoid recomputing from basePrice; can be wrong for roomsSpec.)
    const accommodationSubtotal = booking.totalAmount
      ? Math.max(0, Number(totalAmount) - Number(transportFare || 0))
      : (() => {
          const basePrice = booking.property.basePrice ? Number(booking.property.basePrice) : 0;
          return basePrice * nights;
        })();

    // Calculate commission (NoLSAF revenue). Owner should receive ONLY the base accommodation fare.
    const commissionPercent = await getEffectiveCommissionPercent({ propertyServices: (booking.property as any).services });
    const { total: accommodationTotal, commission } = calculatePriceWithCommission(
      accommodationSubtotal,
      commissionPercent
    );

    // Customer pays: accommodation (base) + commission + transport.
    // NOTE: booking.totalAmount is base accommodation + transport (no commission).
    const effectiveTotalAmount = Math.round((Number(accommodationTotal) + Number(transportFare || 0)) * 100) / 100;

    if (existingInvoice) {
      const existingTotal = Number((existingInvoice as any).total ?? 0);
      const existingCommissionAmount = existingInvoice.commissionAmount != null ? Number(existingInvoice.commissionAmount) : 0;
      const existingCommissionPercent = existingInvoice.commissionPercent != null ? Number(existingInvoice.commissionPercent) : NaN;
      const existingNetPayable = existingInvoice.netPayable != null ? Number(existingInvoice.netPayable) : NaN;

      const missingOrStaleTotals = (() => {
        if (isPaidLikeInvoice(existingInvoice)) return false;
        if (!Number.isFinite(existingTotal) || existingTotal <= 0) return true;
        // If the invoice total is still equal to booking.totalAmount, it likely predates commission-in-total.
        if (Math.abs(existingTotal - totalAmount) < 0.01 && commission > 0) return true;
        // If commission fields are missing but commission should apply, refresh.
        if ((!Number.isFinite(existingCommissionPercent) || existingInvoice.commissionPercent == null) && commissionPercent > 0) return true;
        if ((!Number.isFinite(existingCommissionAmount) || existingInvoice.commissionAmount == null) && commission > 0) return true;
        // Ensure netPayable reflects accommodation base (excluding transport).
        if (!Number.isFinite(existingNetPayable) || existingInvoice.netPayable == null) return true;
        return false;
      })();

      if (missingOrStaleTotals) {
        existingInvoice = await prisma.invoice.update({
          where: { id: existingInvoice.id },
          data: {
            // Store customer-paid total in `total` and owner receivable in `netPayable`.
            total: effectiveTotalAmount as any,
            netPayable: Math.max(0, Number(accommodationSubtotal || 0)) as any,
            commissionPercent: commissionPercent > 0 ? (commissionPercent as any) : null,
            commissionAmount: commission > 0 ? (commission as any) : null,
          } as any,
        });
      }

      try {
        // Only activate/publish transport once payment is actually confirmed.
        if (isPaidLikeInvoice(existingInvoice)) {
          await publishScheduledTripsForBooking({
            req,
            bookingId: booking.id,
            invoicePaymentRef: existingInvoice.paymentRef,
            paymentMethod: (existingInvoice as any).paymentMethod,
          });
        }
      } catch {}

      return res.status(200).json({
        ok: true,
        invoiceId: existingInvoice.id,
        invoiceNumber: existingInvoice.invoiceNumber,
        paymentRef: existingInvoice.paymentRef,
        status: existingInvoice.status,
        message: "Invoice already exists",
      });
    }

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
      const totalStr = Number(effectiveTotalAmount).toLocaleString();
      
      const roomsQty = Math.max(1, Number((booking as any).roomsQty ?? 1));
      const roomLabel = roomsQty > 1 ? ` × ${roomsQty} rooms` : "";

      const notes = transportFare > 0
        ? `Accommodation: ${accommodationStr} TZS${roomLabel}. Transportation: ${transportStr} TZS. Total: ${totalStr} TZS.`
        : `Accommodation for ${nights} night${nights !== 1 ? 's' : ''}${roomLabel} at ${booking.property.title}. Total: ${totalStr} TZS.`;

      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber: makeInvoiceNumber(booking.id, codeId),
          ownerId: booking.property.ownerId,
          bookingId: booking.id,
          total: effectiveTotalAmount,
          // IMPORTANT: when a booking includes transport, the customer may pay a total that includes transport,
          // but the property owner should only receive the accommodation portion.
          // We store the customer-paid total in `total` and the owner receivable in `netPayable`.
          netPayable: Math.max(0, Number(accommodationSubtotal || 0)) as any,
          commissionPercent: commissionPercent > 0 ? (commissionPercent as any) : null,
          commissionAmount: commission > 0 ? (commission as any) : null,
          taxPercent: 0,
          // Payment lifecycle (production-safe):
          // - Create invoice as REQUESTED (default)
          // - Mark as PAID only from the AzamPay webhook
          paymentRef: `INVREF-${booking.id}-${Date.now()}`,
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

    // Transport activation happens only after webhook-confirmed payment.

    return res.status(201).json({
      ok: true,
      invoiceId: result.invoiceId,
      invoiceNumber: result.invoiceNumber,
      paymentRef: invoice?.paymentRef,
      status: invoice?.status,
      totalAmount: effectiveTotalAmount,
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
router.get("/:id", publicInvoiceReadLimiter, async (req: Request, res: Response) => {
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

    const transportBooking = await prisma.transportBooking.findFirst({
      where: {
        paymentRef: `BOOKING:${invoice.booking.id}`,
      },
      select: {
        amount: true,
        currency: true,
        paymentStatus: true,
        status: true,
      },
    });

    const nights = Math.max(
      1,
      Math.ceil(
        (new Date(invoice.booking.checkOut).getTime() -
          new Date(invoice.booking.checkIn).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    );

    // Price breakdown: keep it consistent with the authoritative total on the invoice.
    // Avoid recomputing accommodation from basePrice because bookings may use roomsSpec pricing and roomsQty.
    const basePrice = invoice.booking.property.basePrice ? Number(invoice.booking.property.basePrice) : 0;
    const totalAmount = Number(invoice.total || 0);
    const taxPercent = invoice.taxPercent ? Number(invoice.taxPercent) : 0;
    // Commission is an internal (admin-only) concept; do not expose it on public invoice breakdown.
    const commission = 0;

    const rawTransportFare = (() => {
      const fromTransportBooking = transportBooking?.amount != null ? Number(transportBooking.amount) : NaN;
      if (Number.isFinite(fromTransportBooking) && fromTransportBooking > 0) return fromTransportBooking;

      if (!invoice.booking.includeTransport) return 0;
      const fromBooking = (invoice.booking as any).transportFare != null ? Number((invoice.booking as any).transportFare) : NaN;
      if (Number.isFinite(fromBooking) && fromBooking > 0) return fromBooking;

      return 0;
    })();

    const transportFare = Math.max(0, Math.min(Number.isFinite(rawTransportFare) ? rawTransportFare : 0, totalAmount));

    const accommodationSubtotal = Math.max(0, totalAmount - transportFare);
    const taxAmount = taxPercent > 0 ? (accommodationSubtotal * taxPercent) / 100 : 0;
    const subtotal = accommodationSubtotal + taxAmount + transportFare;
    const discount = 0;

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
        roomsQty: Math.max(1, Number((invoice.booking as any).roomsQty ?? 1)),
        includeTransport: !!(invoice.booking as any).includeTransport,
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
        transportFare: transportFare,
        commission: commission,
        subtotal: subtotal,
        total: totalAmount,
      },
    });
  } catch (error: any) {
    console.error("GET /api/public/invoices/:id error:", error);
    return res.status(500).json({ error: "Failed to retrieve invoice" });
  }
});

export default router;

