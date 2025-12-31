// apps/api/src/routes/public.bookings.ts
// apps/api/src/routes/public.bookings.ts
import { Router, Request, Response } from "express";
import { prisma } from "@nolsaf/prisma";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import crypto from "crypto";

// Helper function to calculate distance (Haversine formula)
function calculateDistance(origin: { latitude: number; longitude: number }, destination: { latitude: number; longitude: number }): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(destination.latitude - origin.latitude);
  const dLon = toRadians(destination.longitude - origin.longitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(origin.latitude)) *
      Math.cos(toRadians(destination.latitude)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round((R * c) * 100) / 100;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

const router = Router();

// Rate limiting for booking creation (5 requests per 15 minutes)
const bookingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: "Too many booking requests, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
});

// Validation schema for booking creation
const createBookingSchema = z.object({
  propertyId: z.number().int().positive(),
  checkIn: z.string().datetime(), // ISO 8601 format
  checkOut: z.string().datetime(),
  guestName: z.string().min(2).max(160),
  guestPhone: z.string().min(10).max(40),
  guestEmail: z.string().email().optional().nullable(),
  nationality: z.string().max(80).optional().nullable(),
  sex: z.enum(["Male", "Female", "Other"]).optional().nullable(),
  ageGroup: z.enum(["Adult", "Child"]).optional().nullable(),
  roomCode: z.string().max(60).optional().nullable(),
  specialRequests: z.string().max(1000).optional().nullable(),
  adults: z.number().int().min(1).max(100).optional().default(1),
  children: z.number().int().min(0).max(100).optional().default(0),
  pets: z.number().int().min(0).max(10).optional().default(0),
  // Transportation fields
  includeTransport: z.boolean().optional().default(false),
  transportOriginLat: z.number().optional().nullable(),
  transportOriginLng: z.number().optional().nullable(),
  transportOriginAddress: z.string().max(255).optional().nullable(),
  transportFare: z.number().optional().nullable(), // Pre-calculated fare from frontend
});

/**
 * POST /api/public/bookings
 * Create a new booking (public endpoint, no authentication required)
 * 
 * Security:
 * - Rate limiting (5 requests per 15 minutes)
 * - Input validation
 * - Property validation (must be approved)
 * - Date validation
 * - Amount calculation (server-side only)
 */
router.post("/", bookingLimiter, async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validationResult = createBookingSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: "Invalid request data",
        details: validationResult.error.errors,
      });
    }

    const data = validationResult.data;

    // Validate dates
    const checkIn = new Date(data.checkIn);
    const checkOut = new Date(data.checkOut);
    const now = new Date();

    if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
      return res.status(400).json({ error: "Invalid date format" });
    }

    if (checkIn < now) {
      return res.status(400).json({ error: "Check-in date cannot be in the past" });
    }

    if (checkOut <= checkIn) {
      return res.status(400).json({ error: "Check-out date must be after check-in date" });
    }

    // Calculate nights
    const nights = Math.max(1, Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)));

    // Fetch property and validate
    const property = await prisma.property.findUnique({
      where: { id: data.propertyId },
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
    });

    if (!property) {
      return res.status(404).json({ error: "Property not found" });
    }

    if (property.status !== "APPROVED") {
      return res.status(400).json({
        error: "Property is not available for booking",
        reason: `Property status is ${property.status}`,
      });
    }

    // Calculate booking amount (server-side only - NEVER trust client)
    const pricePerNight = property.basePrice ? Number(property.basePrice) : 0;
    let accommodationAmount = pricePerNight * nights;
    
    // Add transportation fare if included
    let transportFare = 0;
    if (data.includeTransport && data.transportFare) {
      // Validate transport fare (minimum 2000 TZS)
      transportFare = Math.max(2000, Number(data.transportFare));
      
      // Verify transport fare calculation if origin coordinates provided
      if (data.transportOriginLat && data.transportOriginLng && property.latitude && property.longitude) {
        // Recalculate on server to verify (basic validation)
        const distance = calculateDistance(
          { latitude: Number(data.transportOriginLat), longitude: Number(data.transportOriginLng) },
          { latitude: Number(property.latitude), longitude: Number(property.longitude) }
        );
        const minFare = 2000;
        const estimatedFare = minFare + (distance * 500); // Base + per km
        
        // Allow some variance (client might have surge multiplier), but ensure minimum
        if (transportFare < estimatedFare * 0.8) {
          transportFare = Math.max(minFare, estimatedFare);
        }
      }
    }
    
    const totalAmount = accommodationAmount + transportFare;

    // Check if user exists (optional - for logged-in users)
    let userId: number | null = null;
    if (data.guestEmail) {
      const user = await prisma.user.findUnique({
        where: { email: data.guestEmail },
      });
      if (user) {
        userId = user.id;
      }
    }

    // Create booking and booking code in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create booking
      const booking = await tx.booking.create({
        data: {
          propertyId: data.propertyId,
          userId: userId,
          status: "NEW",
          checkIn: checkIn,
          checkOut: checkOut,
          totalAmount: totalAmount,
          roomCode: data.roomCode || null,
          guestName: data.guestName,
          guestPhone: data.guestPhone,
          nationality: data.nationality || null,
          sex: data.sex || null,
          ageGroup: data.ageGroup || null,
          // Store transport info in specialRequests if transport is included
          // Format: "TRANSPORT_INCLUDED|fare:2000|origin:lat,lng|address:..."
          specialRequests: data.includeTransport && data.transportFare
            ? `TRANSPORT_INCLUDED|fare:${transportFare}|origin:${data.transportOriginLat},${data.transportOriginLng}|address:${data.transportOriginAddress || ""}`
            : data.specialRequests || null,
        },
      });

      // Generate booking code within transaction
      // Check if code already exists
      const existing = await tx.checkinCode.findUnique({
        where: { bookingId: booking.id },
      });

      let codeResult;
      if (existing && existing.status === "ACTIVE") {
        codeResult = existing;
      } else {
        // Generate unique code
        const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // No 0, O, I, 1
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
            codeResult = await tx.checkinCode.create({
              data: {
                bookingId: booking.id,
                code: code,
                codeHash: codeHash,
                codeVisible: code,
                status: "ACTIVE",
                generatedAt: new Date(),
              },
            });
            break;
          } catch (error: any) {
            if (error?.code === "P2002" || error?.message?.includes("Unique constraint")) {
              attempts++;
              continue;
            }
            throw error;
          }
        }

        if (!codeResult) {
          throw new Error("Failed to generate unique booking code after multiple attempts");
        }
      }

      return {
        bookingId: booking.id,
        bookingCode: codeResult.code,
        totalAmount: totalAmount,
        accommodationAmount: accommodationAmount,
        transportFare: transportFare,
        nights: nights,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
      };
    });

    // Return success response
    return res.status(201).json({
      ok: true,
      bookingId: result.bookingId,
      bookingCode: result.bookingCode,
      totalAmount: result.totalAmount,
      accommodationAmount: result.accommodationAmount,
      transportFare: result.transportFare,
      nights: result.nights,
      checkIn: result.checkIn.toISOString(),
      checkOut: result.checkOut.toISOString(),
      currency: property.currency || "TZS",
      property: {
        id: property.id,
        title: property.title,
      },
      message: "Booking created successfully",
    });
  } catch (error: any) {
    console.error("POST /api/public/bookings error:", error);

    // Handle Prisma errors
    if (error?.code === "P2002") {
      return res.status(409).json({ error: "Booking conflict detected" });
    }

    // Generic error response (don't expose internal details)
    return res.status(500).json({
      error: "Failed to create booking",
      message: process.env.NODE_ENV === "development" ? error?.message : undefined,
    });
  }
});

/**
 * GET /api/public/bookings/:id
 * Get booking details by ID (public, but limited information)
 */
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const bookingId = Number(req.params.id);
    if (!bookingId || isNaN(bookingId)) {
      return res.status(400).json({ error: "Invalid booking ID" });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
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
          },
        },
        code: {
          select: {
            code: true,
            status: true,
          },
        },
      },
    });

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    const nights = Math.ceil(
      (new Date(booking.checkOut).getTime() - new Date(booking.checkIn).getTime()) /
        (1000 * 60 * 60 * 24)
    );

    return res.json({
      ok: true,
      booking: {
        id: booking.id,
        bookingCode: booking.code?.code || null,
        guestName: booking.guestName,
        guestPhone: booking.guestPhone,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        nights: nights,
        totalAmount: Number(booking.totalAmount),
        status: booking.status,
        property: booking.property,
      },
    });
  } catch (error: any) {
    console.error("GET /api/public/bookings/:id error:", error);
    return res.status(500).json({ error: "Failed to retrieve booking" });
  }
});

export default router;

