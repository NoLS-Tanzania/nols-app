// apps/api/src/routes/public.bookings.ts
// apps/api/src/routes/public.bookings.ts
import { Router, Request, Response } from "express";
import { prisma } from "@nolsaf/prisma";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import crypto from "crypto";
import { checkPropertyAvailability, checkGuestCapacity } from "../lib/bookingAvailability.js";
import { sanitizeText } from "../lib/sanitize.js";

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
  // Flexible arrival fields
  arrivalType: z.enum(["FLIGHT", "BUS", "TRAIN", "FERRY", "OTHER"]).optional().nullable(),
  arrivalNumber: z.string().max(50).optional().nullable(),
  transportCompany: z.string().max(100).optional().nullable(),
  arrivalTime: z.string().datetime().optional().nullable(),
  pickupLocation: z.string().max(255).optional().nullable(),
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

    // Check guest capacity
    const capacityCheck = await checkGuestCapacity(
      data.propertyId,
      data.adults || 1,
      data.children || 0,
      data.pets || 0
    );
    if (!capacityCheck.canAccommodate) {
      return res.status(400).json({
        error: "Guest capacity exceeded",
        message: capacityCheck.message,
        maxGuests: capacityCheck.maxGuests,
      });
    }

    // Check property availability (with database lock to prevent concurrent bookings)
    // Use a transaction with SELECT FOR UPDATE to lock the property row
    // Enhanced to include availability blocks (external bookings)
    // Now checks capacity, not just conflicts (matching availability checker logic)
    const availabilityCheck = await prisma.$transaction(async (tx) => {
      // Lock property row to prevent concurrent bookings (parameterized query for security)
      await tx.$executeRaw`
        SELECT id FROM Property WHERE id = ${data.propertyId} FOR UPDATE
      `;

      // Fetch property to get room specifications
      const propertyForCheck = await tx.property.findUnique({
        where: { id: data.propertyId },
        select: {
          id: true,
          roomsSpec: true,
          totalBedrooms: true,
        },
      });

      if (!propertyForCheck) {
        return {
          available: false,
          conflictingBookings: undefined,
          conflictingBlocks: undefined,
        };
      }

      // Now check availability within the locked transaction
      // We need to use the transaction client for the availability check
      const conflictingBookings = await tx.booking.findMany({
        where: {
          propertyId: data.propertyId,
          status: {
            in: ["NEW", "CONFIRMED", "CHECKED_IN"],
          },
          AND: [
            {
              checkIn: {
                lt: checkOut,
              },
            },
            {
              checkOut: {
                gt: checkIn,
              },
            },
          ],
          ...(data.roomCode && { roomCode: data.roomCode }),
        },
        select: {
          id: true,
          checkIn: true,
          checkOut: true,
          status: true,
          guestName: true,
          roomCode: true,
        },
      });

      // Check availability blocks (external bookings from Airbnb, Booking.com, etc.)
      const conflictingBlocks = await tx.propertyAvailabilityBlock.findMany({
        where: {
          propertyId: data.propertyId,
          AND: [
            {
              startDate: {
                lt: checkOut,
              },
            },
            {
              endDate: {
                gt: checkIn,
              },
            },
          ],
          ...(data.roomCode && { roomCode: data.roomCode }),
        },
        select: {
          id: true,
          startDate: true,
          endDate: true,
          roomCode: true,
          source: true,
          bedsBlocked: true,
        },
      });

      // Parse roomsSpec to get room types and their capacities
      let roomTypes: Array<{ code?: string; roomCode?: string; name?: string; beds?: number; rooms?: number; roomsCount?: number }> = [];
      if (propertyForCheck.roomsSpec && typeof propertyForCheck.roomsSpec === "object") {
        const spec = propertyForCheck.roomsSpec as any;
        if (Array.isArray(spec)) {
          roomTypes = spec;
        } else if (spec.rooms && Array.isArray(spec.rooms)) {
          roomTypes = spec.rooms;
        }
      }

      // Calculate availability per room type (matching availability checker logic)
      const availabilityByRoomType: Record<string, {
        totalRooms: number;
        totalBeds: number;
        bookedRooms: number;
        bookedBeds: number;
        blockedRooms: number;
        blockedBeds: number;
        availableRooms: number;
        availableBeds: number;
      }> = {};

      // Initialize room types
      if (data.roomCode) {
        // Check specific room - try to find by code first
        let roomType = roomTypes.find((rt) => rt.code === data.roomCode || rt.roomCode === data.roomCode);
        
        // If not found by code, check if roomCode is actually an index
        if (!roomType) {
          const roomIndex = Number(data.roomCode);
          if (!isNaN(roomIndex) && roomIndex >= 0 && roomIndex < roomTypes.length) {
            roomType = roomTypes[roomIndex];
          }
        }
        
        if (roomType) {
          // Use the roomCode from data, or generate one from the room type
          const code = data.roomCode;
          availabilityByRoomType[code] = {
            totalRooms: roomType.rooms || roomType.roomsCount || 1,
            totalBeds: (roomType.beds || 1) * (roomType.rooms || roomType.roomsCount || 1),
            bookedRooms: 0,
            bookedBeds: 0,
            blockedRooms: 0,
            blockedBeds: 0,
            availableRooms: roomType.rooms || roomType.roomsCount || 1,
            availableBeds: (roomType.beds || 1) * (roomType.rooms || roomType.roomsCount || 1),
          };
        } else {
          // Room not found - this shouldn't happen, but fallback to checking all rooms
          // This handles edge cases where roomCode doesn't match
          if (roomTypes.length > 0) {
            roomTypes.forEach((rt) => {
              const code = rt.code || rt.roomCode || "default";
              if (!availabilityByRoomType[code]) {
                availabilityByRoomType[code] = {
                  totalRooms: rt.rooms || rt.roomsCount || propertyForCheck.totalBedrooms || 1,
                  totalBeds: (rt.beds || 1) * (rt.rooms || rt.roomsCount || propertyForCheck.totalBedrooms || 1),
                  bookedRooms: 0,
                  bookedBeds: 0,
                  blockedRooms: 0,
                  blockedBeds: 0,
                  availableRooms: rt.rooms || rt.roomsCount || propertyForCheck.totalBedrooms || 1,
                  availableBeds: (rt.beds || 1) * (rt.rooms || rt.roomsCount || propertyForCheck.totalBedrooms || 1),
                };
              }
            });
          }
        }
      } else {
        // Check all room types
        if (roomTypes.length > 0) {
          roomTypes.forEach((rt) => {
            const code = rt.code || "default";
            availabilityByRoomType[code] = {
              totalRooms: rt.rooms || propertyForCheck.totalBedrooms || 1,
              totalBeds: (rt.beds || 1) * (rt.rooms || propertyForCheck.totalBedrooms || 1),
              bookedRooms: 0,
              bookedBeds: 0,
              blockedRooms: 0,
              blockedBeds: 0,
              availableRooms: rt.rooms || propertyForCheck.totalBedrooms || 1,
              availableBeds: (rt.beds || 1) * (rt.rooms || propertyForCheck.totalBedrooms || 1),
            };
          });
        } else {
          // Fallback: use totalBedrooms if no room spec
          availabilityByRoomType["default"] = {
            totalRooms: propertyForCheck.totalBedrooms || 1,
            totalBeds: (propertyForCheck.totalBedrooms || 1) * 2, // Assume 2 beds per room
            bookedRooms: 0,
            bookedBeds: 0,
            blockedRooms: 0,
            blockedBeds: 0,
            availableRooms: propertyForCheck.totalBedrooms || 1,
            availableBeds: (propertyForCheck.totalBedrooms || 1) * 2,
          };
        }
      }

      // Count bookings by room code
      conflictingBookings.forEach((booking) => {
        const code = booking.roomCode || "default";
        if (availabilityByRoomType[code]) {
          availabilityByRoomType[code].bookedRooms += 1;
          availabilityByRoomType[code].bookedBeds += 1; // Assume 1 bed per booking
        }
      });

      // Count blocks by room code
      conflictingBlocks.forEach((block) => {
        const code = block.roomCode || "default";
        if (availabilityByRoomType[code]) {
          availabilityByRoomType[code].blockedRooms += 1;
          availabilityByRoomType[code].blockedBeds += block.bedsBlocked || 1;
        }
      });

      // Calculate available counts
      Object.keys(availabilityByRoomType).forEach((code) => {
        const avail = availabilityByRoomType[code];
        avail.availableRooms = Math.max(0, avail.totalRooms - avail.bookedRooms - avail.blockedRooms);
        avail.availableBeds = Math.max(0, avail.totalBeds - avail.bookedBeds - avail.blockedBeds);
      });

      // Overall availability - check if there's still capacity
      const totalAvailableRooms = Object.values(availabilityByRoomType).reduce(
        (sum, a) => sum + a.availableRooms,
        0
      );
      const totalAvailableBeds = Object.values(availabilityByRoomType).reduce(
        (sum, a) => sum + a.availableBeds,
        0
      );

      const isAvailable = totalAvailableRooms > 0 || totalAvailableBeds > 0;

      return {
        available: isAvailable,
        conflictingBookings: conflictingBookings.length > 0 ? conflictingBookings : undefined,
        conflictingBlocks: conflictingBlocks.length > 0 ? conflictingBlocks : undefined,
        totalAvailableRooms,
        totalAvailableBeds,
      };
    });

    if (!availabilityCheck.available) {
      const conflictReasons: string[] = [];
      if (availabilityCheck.conflictingBookings && availabilityCheck.conflictingBookings.length > 0) {
        conflictReasons.push(`${availabilityCheck.conflictingBookings.length} existing booking(s)`);
      }
      if (availabilityCheck.conflictingBlocks && availabilityCheck.conflictingBlocks.length > 0) {
        const sources = availabilityCheck.conflictingBlocks.map((b) => b.source || "external").join(", ");
        conflictReasons.push(`Blocked by external booking(s) from: ${sources}`);
      }

      const availableRooms = availabilityCheck.totalAvailableRooms ?? 0;
      const availableBeds = availabilityCheck.totalAvailableBeds ?? 0;

      return res.status(409).json({
        error: "Property not available for selected dates",
        message: `The property is fully booked for the selected dates. ${conflictReasons.join(". ")}. Available: ${availableRooms} rooms, ${availableBeds} beds.`,
        conflictingBookings: availabilityCheck.conflictingBookings?.map((b) => ({
          id: b.id,
          checkIn: b.checkIn,
          checkOut: b.checkOut,
          status: b.status,
          roomCode: b.roomCode,
        })),
        conflictingBlocks: availabilityCheck.conflictingBlocks?.map((b) => ({
          id: b.id,
          startDate: b.startDate,
          endDate: b.endDate,
          roomCode: b.roomCode,
          source: b.source,
        })),
        totalAvailableRooms: availableRooms,
        totalAvailableBeds: availableBeds,
      });
    }

    // Sanitize user inputs
    const sanitizedGuestName = sanitizeText(data.guestName);
    const sanitizedGuestPhone = sanitizeText(data.guestPhone);
    const sanitizedGuestEmail = data.guestEmail ? sanitizeText(data.guestEmail) : null;
    const sanitizedNationality = data.nationality ? sanitizeText(data.nationality) : null;
    const sanitizedRoomCode = data.roomCode ? sanitizeText(data.roomCode) : null;
    const sanitizedTransportAddress = data.transportOriginAddress ? sanitizeText(data.transportOriginAddress) : null;

    // Calculate booking amount (server-side only - NEVER trust client)
    // If roomCode is provided, use that room's price from roomsSpec, otherwise use basePrice
    let pricePerNight = property.basePrice ? Number(property.basePrice) : 0;
    
    if (data.roomCode && property.roomsSpec) {
      // Parse roomsSpec to find the selected room's price
      let roomTypes: Array<{ code?: string; pricePerNight?: number; price?: number }> = [];
      if (typeof property.roomsSpec === "object") {
        const spec = property.roomsSpec as any;
        if (Array.isArray(spec)) {
          roomTypes = spec;
        } else if (spec.rooms && Array.isArray(spec.rooms)) {
          roomTypes = spec.rooms;
        }
      }
      
      // Find the selected room type
      const selectedRoom = roomTypes.find((rt) => rt.code === data.roomCode);
      if (selectedRoom) {
        const roomPrice = selectedRoom.pricePerNight ?? selectedRoom.price ?? null;
        if (roomPrice && Number.isFinite(Number(roomPrice)) && Number(roomPrice) > 0) {
          pricePerNight = Number(roomPrice);
        }
      }
    }
    
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

    // Create booking and booking code in a transaction with row-level locking
    const result = await prisma.$transaction(async (tx) => {
      // Double-check availability with lock (prevent race conditions)
      await tx.$executeRaw`
        SELECT id FROM Property WHERE id = ${data.propertyId} FOR UPDATE
      `;

      // Final availability check within transaction using transaction client
      // Include both bookings and availability blocks
      const finalConflictingBookings = await tx.booking.findMany({
        where: {
          propertyId: data.propertyId,
          status: {
            in: ["NEW", "CONFIRMED", "CHECKED_IN"],
          },
          AND: [
            {
              checkIn: {
                lt: checkOut,
              },
            },
            {
              checkOut: {
                gt: checkIn,
              },
            },
          ],
          ...(data.roomCode && { roomCode: data.roomCode }),
        },
      });

      const finalConflictingBlocks = await tx.propertyAvailabilityBlock.findMany({
        where: {
          propertyId: data.propertyId,
          AND: [
            {
              startDate: {
                lt: checkOut,
              },
            },
            {
              endDate: {
                gt: checkIn,
              },
            },
          ],
          ...(data.roomCode && { roomCode: data.roomCode }),
        },
      });

      // Fetch property to check capacity (matching availability checker logic)
      const propertyForFinalCheck = await tx.property.findUnique({
        where: { id: data.propertyId },
        select: {
          roomsSpec: true,
          totalBedrooms: true,
        },
      });

      if (!propertyForFinalCheck) {
        throw new Error("Property not found");
      }

      // Parse roomsSpec to get room types and their capacities
      let roomTypes: Array<{ code?: string; roomCode?: string; name?: string; beds?: number; rooms?: number; roomsCount?: number }> = [];
      if (propertyForFinalCheck.roomsSpec && typeof propertyForFinalCheck.roomsSpec === "object") {
        const spec = propertyForFinalCheck.roomsSpec as any;
        if (Array.isArray(spec)) {
          roomTypes = spec;
        } else if (spec.rooms && Array.isArray(spec.rooms)) {
          roomTypes = spec.rooms;
        }
      }

      // Calculate availability per room type
      const finalAvailabilityByRoomType: Record<string, {
        totalRooms: number;
        totalBeds: number;
        bookedRooms: number;
        bookedBeds: number;
        blockedRooms: number;
        blockedBeds: number;
        availableRooms: number;
        availableBeds: number;
      }> = {};

      // Initialize room types
      if (data.roomCode) {
        // Check specific room - try to find by code first
        let roomType = roomTypes.find((rt) => rt.code === data.roomCode || rt.roomCode === data.roomCode);
        
        // If not found by code, check if roomCode is actually an index
        if (!roomType) {
          const roomIndex = Number(data.roomCode);
          if (!isNaN(roomIndex) && roomIndex >= 0 && roomIndex < roomTypes.length) {
            roomType = roomTypes[roomIndex];
          }
        }
        
        if (roomType) {
          // Use the roomCode from data, or generate one from the room type
          const code = data.roomCode;
          finalAvailabilityByRoomType[code] = {
            totalRooms: roomType.rooms || roomType.roomsCount || 1,
            totalBeds: (roomType.beds || 1) * (roomType.rooms || roomType.roomsCount || 1),
            bookedRooms: 0,
            bookedBeds: 0,
            blockedRooms: 0,
            blockedBeds: 0,
            availableRooms: roomType.rooms || roomType.roomsCount || 1,
            availableBeds: (roomType.beds || 1) * (roomType.rooms || roomType.roomsCount || 1),
          };
        } else {
          // Room not found - this shouldn't happen, but fallback to checking all rooms
          if (roomTypes.length > 0) {
            roomTypes.forEach((rt) => {
              const code = rt.code || rt.roomCode || "default";
              if (!finalAvailabilityByRoomType[code]) {
                finalAvailabilityByRoomType[code] = {
                  totalRooms: rt.rooms || rt.roomsCount || propertyForFinalCheck.totalBedrooms || 1,
                  totalBeds: (rt.beds || 1) * (rt.rooms || rt.roomsCount || propertyForFinalCheck.totalBedrooms || 1),
                  bookedRooms: 0,
                  bookedBeds: 0,
                  blockedRooms: 0,
                  blockedBeds: 0,
                  availableRooms: rt.rooms || rt.roomsCount || propertyForFinalCheck.totalBedrooms || 1,
                  availableBeds: (rt.beds || 1) * (rt.rooms || rt.roomsCount || propertyForFinalCheck.totalBedrooms || 1),
                };
              }
            });
          }
        }
      } else {
        if (roomTypes.length > 0) {
          roomTypes.forEach((rt) => {
            const code = rt.code || "default";
            finalAvailabilityByRoomType[code] = {
              totalRooms: rt.rooms || propertyForFinalCheck.totalBedrooms || 1,
              totalBeds: (rt.beds || 1) * (rt.rooms || propertyForFinalCheck.totalBedrooms || 1),
              bookedRooms: 0,
              bookedBeds: 0,
              blockedRooms: 0,
              blockedBeds: 0,
              availableRooms: rt.rooms || propertyForFinalCheck.totalBedrooms || 1,
              availableBeds: (rt.beds || 1) * (rt.rooms || propertyForFinalCheck.totalBedrooms || 1),
            };
          });
        } else {
          finalAvailabilityByRoomType["default"] = {
            totalRooms: propertyForFinalCheck.totalBedrooms || 1,
            totalBeds: (propertyForFinalCheck.totalBedrooms || 1) * 2,
            bookedRooms: 0,
            bookedBeds: 0,
            blockedRooms: 0,
            blockedBeds: 0,
            availableRooms: propertyForFinalCheck.totalBedrooms || 1,
            availableBeds: (propertyForFinalCheck.totalBedrooms || 1) * 2,
          };
        }
      }

      // Count bookings by room code
      finalConflictingBookings.forEach((booking) => {
        const code = booking.roomCode || "default";
        if (finalAvailabilityByRoomType[code]) {
          finalAvailabilityByRoomType[code].bookedRooms += 1;
          finalAvailabilityByRoomType[code].bookedBeds += 1;
        }
      });

      // Count blocks by room code
      finalConflictingBlocks.forEach((block) => {
        const code = block.roomCode || "default";
        if (finalAvailabilityByRoomType[code]) {
          finalAvailabilityByRoomType[code].blockedRooms += 1;
          finalAvailabilityByRoomType[code].blockedBeds += (block as any).bedsBlocked || 1;
        }
      });

      // Calculate available counts
      Object.keys(finalAvailabilityByRoomType).forEach((code) => {
        const avail = finalAvailabilityByRoomType[code];
        avail.availableRooms = Math.max(0, avail.totalRooms - avail.bookedRooms - avail.blockedRooms);
        avail.availableBeds = Math.max(0, avail.totalBeds - avail.bookedBeds - avail.blockedBeds);
      });

      // Check if there's still capacity available
      const finalTotalAvailableRooms = Object.values(finalAvailabilityByRoomType).reduce(
        (sum, a) => sum + a.availableRooms,
        0
      );
      const finalTotalAvailableBeds = Object.values(finalAvailabilityByRoomType).reduce(
        (sum, a) => sum + a.availableBeds,
        0
      );

      if (finalTotalAvailableRooms <= 0 && finalTotalAvailableBeds <= 0) {
        throw new Error("Property became unavailable during booking process - no capacity remaining");
      }

      // Create booking with sanitized data
      const booking = await tx.booking.create({
        data: {
          propertyId: data.propertyId,
          userId: userId,
          status: "NEW",
          checkIn: checkIn,
          checkOut: checkOut,
          totalAmount: totalAmount,
          roomCode: sanitizedRoomCode,
          guestName: sanitizedGuestName,
          guestPhone: sanitizedGuestPhone,
          nationality: sanitizedNationality,
          sex: data.sex || null,
          ageGroup: data.ageGroup || null,
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
    console.error("Error details:", {
      message: error?.message,
      code: error?.code,
      stack: error?.stack,
    });

    // Handle Prisma errors
    if (error?.code === "P2002") {
      return res.status(409).json({ 
        error: "Booking conflict detected",
        message: "A booking with similar details already exists",
      });
    }

    // Handle validation errors
    if (error?.name === "ZodError") {
      return res.status(400).json({
        error: "Invalid request data",
        details: error.errors,
      });
    }

    // Generic error response (include message in development for debugging)
    return res.status(500).json({
      error: "Failed to create booking",
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

