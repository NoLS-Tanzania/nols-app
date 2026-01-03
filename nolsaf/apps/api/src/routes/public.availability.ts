// apps/api/src/routes/public.availability.ts
// Public endpoint to check property availability for specific dates
import { Router, type Request, type Response } from "express";
import type { RequestHandler } from "express";
import { z } from "zod";
import { prisma } from "@nolsaf/prisma";
import rateLimit from "express-rate-limit";

export const router = Router();

// Rate limiter for availability checks
const availabilityLimiter = rateLimit({
  windowMs: 60_000, // 1 minute
  max: 60, // 60 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many availability requests. Please wait a moment." },
});

// Validation schema
const checkAvailabilitySchema = z.object({
  propertyId: z.number().int().positive(),
  checkIn: z.string().datetime(), // ISO 8601 format
  checkOut: z.string().datetime(),
  roomCode: z.string().max(60).optional().nullable(), // Optional: check specific room
});

/**
 * POST /api/public/availability/check
 * Check property availability for specific dates
 * Returns available rooms/beds count and detailed availability info
 */
router.post("/check", availabilityLimiter, (async (req: Request, res: Response) => {
  try {
    const validationResult = checkAvailabilitySchema.safeParse(req.body);
    if (!validationResult.success) {
      res.status(400).json({
        error: "Invalid request data",
        details: validationResult.error.errors,
      });
      return;
    }

    const { propertyId, checkIn: checkInStr, checkOut: checkOutStr, roomCode } = validationResult.data;

    // Validate dates
    const checkIn = new Date(checkInStr);
    const checkOut = new Date(checkOutStr);
    const now = new Date();

    if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
      res.status(400).json({ error: "Invalid date format" });
      return;
    }

    if (checkIn < now) {
      res.status(400).json({ error: "Check-in date cannot be in the past" });
      return;
    }

    if (checkOut <= checkIn) {
      res.status(400).json({ error: "Check-out date must be after check-in date" });
      return;
    }

    // Fetch property
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: {
        id: true,
        status: true,
        title: true,
        roomsSpec: true,
        layout: true,
        totalBedrooms: true,
        maxGuests: true,
      },
    });

    if (!property) {
      res.status(404).json({ error: "Property not found" });
      return;
    }

    if (property.status !== "APPROVED") {
      res.status(400).json({
        error: "Property is not available for booking",
        reason: `Property status is ${property.status}`,
      });
      return;
    }

    // Get all bookings that overlap with the requested dates
    const conflictingBookings = await prisma.booking.findMany({
      where: {
        propertyId,
        status: {
          in: ["NEW", "CONFIRMED", "CHECKED_IN"],
        },
        AND: [
          {
            checkIn: { lt: checkOut },
          },
          {
            checkOut: { gt: checkIn },
          },
        ],
        ...(roomCode && { roomCode }),
      },
      select: {
        id: true,
        checkIn: true,
        checkOut: true,
        status: true,
        roomCode: true,
      },
    });

    // Get all availability blocks that overlap with the requested dates
    const availabilityBlocks = await prisma.propertyAvailabilityBlock.findMany({
      where: {
        propertyId,
        AND: [
          {
            startDate: { lt: checkOut },
          },
          {
            endDate: { gt: checkIn },
          },
        ],
        ...(roomCode && { roomCode }),
      },
      select: {
        id: true,
        startDate: true,
        endDate: true,
        roomCode: true,
        bedsBlocked: true,
        source: true,
      },
    });

    // Parse roomsSpec to get room types and their capacities
    let roomTypes: Array<{ code?: string; name?: string; beds?: number; rooms?: number }> = [];
    if (property.roomsSpec && typeof property.roomsSpec === "object") {
      const spec = property.roomsSpec as any;
      if (Array.isArray(spec)) {
        roomTypes = spec;
      } else if (spec.rooms && Array.isArray(spec.rooms)) {
        roomTypes = spec.rooms;
      }
    }

    // Calculate availability per room type
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
    if (roomCode) {
      // Check specific room
      const roomType = roomTypes.find((rt) => rt.code === roomCode);
      if (roomType) {
        availabilityByRoomType[roomCode] = {
          totalRooms: roomType.rooms || 1,
          totalBeds: (roomType.beds || 1) * (roomType.rooms || 1),
          bookedRooms: 0,
          bookedBeds: 0,
          blockedRooms: 0,
          blockedBeds: 0,
          availableRooms: roomType.rooms || 1,
          availableBeds: (roomType.beds || 1) * (roomType.rooms || 1),
        };
      }
    } else {
      // Check all room types
      roomTypes.forEach((rt) => {
        const code = rt.code || "default";
        availabilityByRoomType[code] = {
          totalRooms: rt.rooms || property.totalBedrooms || 1,
          totalBeds: (rt.beds || 1) * (rt.rooms || property.totalBedrooms || 1),
          bookedRooms: 0,
          bookedBeds: 0,
          blockedRooms: 0,
          blockedBeds: 0,
          availableRooms: rt.rooms || property.totalBedrooms || 1,
          availableBeds: (rt.beds || 1) * (rt.rooms || property.totalBedrooms || 1),
        };
      });
    }

    // Count bookings by room code
    conflictingBookings.forEach((booking) => {
      const code = booking.roomCode || "default";
      if (availabilityByRoomType[code]) {
        availabilityByRoomType[code].bookedRooms += 1;
        // Assume 1 bed per booking if not specified
        availabilityByRoomType[code].bookedBeds += 1;
      }
    });

    // Count blocks by room code
    availabilityBlocks.forEach((block) => {
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

    // Overall availability
    const totalAvailableRooms = Object.values(availabilityByRoomType).reduce(
      (sum, a) => sum + a.availableRooms,
      0
    );
    const totalAvailableBeds = Object.values(availabilityByRoomType).reduce(
      (sum, a) => sum + a.availableBeds,
      0
    );

    const isAvailable = totalAvailableRooms > 0 || totalAvailableBeds > 0;

    res.json({
      available: isAvailable,
      propertyId,
      checkIn: checkIn.toISOString(),
      checkOut: checkOut.toISOString(),
      roomCode: roomCode || null,
      summary: {
        totalAvailableRooms,
        totalAvailableBeds,
        totalBookedRooms: Object.values(availabilityByRoomType).reduce((sum, a) => sum + a.bookedRooms, 0),
        totalBlockedRooms: Object.values(availabilityByRoomType).reduce((sum, a) => sum + a.blockedRooms, 0),
      },
      byRoomType: availabilityByRoomType,
      conflictingBookings: conflictingBookings.length,
      availabilityBlocks: availabilityBlocks.length,
    });
  } catch (error: any) {
    console.error("POST /api/public/availability/check error:", error);
    res.status(500).json({ error: "Failed to check availability" });
  }
}) as RequestHandler);

export default router;


