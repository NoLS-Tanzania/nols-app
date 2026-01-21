import { Router, type Response } from "express";
import type { RequestHandler } from "express";
import { prisma } from "@nolsaf/prisma";
import { AuthedRequest, requireAuth, requireRole } from "../middleware/auth.js";
import { audit } from "../lib/audit.js";
import { z } from "zod";
import { limitDriverTripClaim, limitDriverTripsList } from "../middleware/rateLimit.js";
import { AUTO_DISPATCH_GRACE_MS, AUTO_DISPATCH_LOOKAHEAD_MS } from "../lib/transportPolicy.js";

export const router = Router();

const MAX_CLAIMS_PER_BOOKING = 5;
const CLAIM_WINDOW_HOURS = 72;

// All routes require driver authentication
router.use(requireAuth as RequestHandler);
router.use(requireRole("DRIVER") as RequestHandler);

function firstQueryValue(value: unknown): unknown {
  return Array.isArray(value) ? value[0] : value;
}

const paginationSchema = z.object({
  page: z.preprocess(
    (v) => firstQueryValue(v),
    z.coerce.number().int().min(1).default(1)
  ),
  pageSize: z.preprocess(
    (v) => firstQueryValue(v),
    z.coerce.number().int().min(1).max(50).default(20)
  ),
});

const scheduledQuerySchema = paginationSchema.extend({
  vehicleType: z
    .preprocess((v) => firstQueryValue(v), z.string().trim().min(1).max(50))
    .optional(),
});

const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

function badRequest(res: Response, message: string, issues?: unknown) {
  return res.status(400).json({ error: message, issues });
}

function normalizeDriverVehicleType(vehicleType?: string): "BODA" | "BAJAJI" | "CAR" | "XL" | null {
  if (!vehicleType) return null;
  const v = vehicleType.toLowerCase();
  if (v.includes("motor") || v.includes("boda") || v.includes("bike")) return "BODA";
  if (v.includes("tuktuk") || v.includes("bajaji") || v.includes("tuk") || v.includes("auto")) return "BAJAJI";
  if (v.includes("xl") || v.includes("van") || v.includes("hiace") || v.includes("coaster") || v.includes("minibus")) return "XL";
  if (v.includes("car") || v.includes("sedan") || v.includes("suv")) return "CAR";
  return null;
}

function normalizeAreaName(v?: string | null): string {
  return String(v ?? "").trim().toLowerCase();
}

function parseOperationAreas(v?: string | null): string[] {
  const raw = String(v ?? "").trim();
  if (!raw) return [];
  return raw
    .split(/[;,|]/g)
    .map((x) => normalizeAreaName(x))
    .filter(Boolean);
}

function getAllowedAreasForDriver(driver: any): string[] {
  const areas = new Set<string>();
  const region = normalizeAreaName(driver?.region);
  if (region) areas.add(region);
  for (const a of parseOperationAreas(driver?.operationArea)) areas.add(a);
  return Array.from(areas);
}

function isTripWithinAreas(trip: any, allowedAreas: string[]): boolean {
  if (!allowedAreas.length) return false;
  const tripAreas = [trip?.fromRegion, trip?.toRegion, trip?.property?.regionName]
    .map((x) => normalizeAreaName(x))
    .filter(Boolean);
  return tripAreas.some((a) => allowedAreas.includes(a));
}

function getAreaIneligibilityReason(driver: any, trip: any): string | null {
  const allowedAreas = getAllowedAreasForDriver(driver);
  if (!allowedAreas.length) return "Set your region/operation area in your profile to claim trips";
  if (!isTripWithinAreas(trip, allowedAreas)) {
    const driverAreaLabel = String(driver?.region || driver?.operationArea || "").trim();
    const tripAreaLabel = String(trip?.fromRegion || trip?.toRegion || trip?.property?.regionName || "").trim();
    return `This trip is outside your area of operation${tripAreaLabel ? ` (${tripAreaLabel})` : ""}${driverAreaLabel ? `. Your area: ${driverAreaLabel}` : ""}`;
  }
  return null;
}

function getClaimOpensAt(pickupAt: Date): Date {
  return new Date(pickupAt.getTime() - CLAIM_WINDOW_HOURS * 60 * 60 * 1000);
}

function getAutoDispatchEndsAt(createdAt: Date): Date {
  return new Date(createdAt.getTime() + AUTO_DISPATCH_GRACE_MS);
}

function getClaimReasonForDriver({
  bookingVehicleType,
  driverNormalizedVehicleType,
  isVipDriver,
}: {
  bookingVehicleType?: string | null;
  driverNormalizedVehicleType: "BODA" | "BAJAJI" | "CAR" | "XL" | null;
  isVipDriver: boolean;
}): string | null {
  if (!bookingVehicleType) return null;
  if (bookingVehicleType === "PREMIUM") {
    return isVipDriver ? null : "VIP drivers only";
  }
  if (bookingVehicleType === "BODA" || bookingVehicleType === "BAJAJI" || bookingVehicleType === "CAR" || bookingVehicleType === "XL") {
    if (!driverNormalizedVehicleType) return `Your profile vehicle type isn't set`;
    if (driverNormalizedVehicleType !== bookingVehicleType) return `This trip requires ${bookingVehicleType}`;
  }
  return null;
}

/**
 * GET /api/driver/trips/scheduled
 * Get scheduled trips available for driver to claim
 * Query: ?vehicleType=BODA&page=1&pageSize=20
 */
router.get("/scheduled", limitDriverTripsList, (async (req: AuthedRequest, res: Response) => {
  try {
    const user = req.user!;
    const parsed = scheduledQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return badRequest(res, "Invalid query parameters", parsed.error.flatten());
    }
    const { vehicleType, page: pageNum, pageSize: pageSizeNum } = parsed.data;
    const skip = (pageNum - 1) * pageSizeNum;

    const now = new Date();
    const autoDispatchGraceCutoff = new Date(now.getTime() - AUTO_DISPATCH_GRACE_MS);
    const autoDispatchLookaheadCutoff = new Date(now.getTime() + AUTO_DISPATCH_LOOKAHEAD_MS);

    const driver = await prisma.user.findUnique({
      where: { id: user.id },
      select: { vehicleType: true, isVipDriver: true, region: true, operationArea: true } as any,
    });
    const driverNormalizedVehicleType = normalizeDriverVehicleType((driver as any)?.vehicleType || undefined);
    const isVipDriver = Boolean((driver as any)?.isVipDriver);
    const allowedAreas = getAllowedAreasForDriver(driver);

    // Get driver's vehicle type preference (if stored in user profile)
    // For now, we'll filter by vehicleType query param if provided

    const where: any = {
      status: "PENDING_ASSIGNMENT",
      driverId: null, // Not yet assigned
      paymentStatus: "PAID", // Only show paid trips
      scheduledDate: {
        gte: now, // Only future trips
      },
    };

    // For near-term trips (happening soon), the system attempts auto-dispatch first.
    // Only expose to claim workflow after the grace window expires.
    where.AND = where.AND || [];
    where.AND.push({
      OR: [
        // Far future trips are always eligible to show (claim window still applies).
        { scheduledDate: { gte: autoDispatchLookaheadCutoff } },
        // Near-term trips only show after auto-dispatch grace ends.
        { createdAt: { lte: autoDispatchGraceCutoff } },
      ],
    });

    // Area-of-operation restriction: drivers only see trips in their region/operationArea.
    if (allowedAreas.length) {
      const inAreas = { in: allowedAreas };
      where.AND.push({ OR: [{ fromRegion: inAreas }, { toRegion: inAreas }, { property: { regionName: inAreas } }] });
    } else {
      // No operation area configured -> show nothing (and canClaim will be false with reason).
      where.id = -1;
    }

    if (vehicleType) where.vehicleType = vehicleType;

    const [trips, total] = await Promise.all([
      prisma.transportBooking.findMany({
        where,
        include: {
          _count: { select: { claims: true } },
          claims: {
            where: { driverId: user.id },
            select: { id: true, status: true } as any,
            take: 1,
          } as any,
          user: {
            select: {
              id: true,
              name: true,
              phone: true,
              email: true,
            },
          },
          property: {
            select: {
              id: true,
              title: true,
              regionName: true,
              district: true,
              ward: true,
            },
          },
        },
        orderBy: { scheduledDate: "asc" },
        skip,
        take: pageSizeNum,
      }),
      prisma.transportBooking.count({ where }),
    ]);

    res.json({
      items: trips.map((trip) => ({
        claimCount: (trip as any)._count?.claims ?? 0,
        claimsRemaining: Math.max(0, MAX_CLAIMS_PER_BOOKING - ((trip as any)._count?.claims ?? 0)),
        claimLimit: MAX_CLAIMS_PER_BOOKING,
        claimWindowHours: CLAIM_WINDOW_HOURS,
        claimOpensAt: getClaimOpensAt(new Date(trip.pickupTime || trip.scheduledDate)).toISOString(),
        canClaim: (() => {
          const pickupAt = new Date(trip.pickupTime || trip.scheduledDate);
          const opensAt = getClaimOpensAt(pickupAt);
          const autoEndsAt = getAutoDispatchEndsAt(new Date(trip.createdAt));
          const inImmediateWindow = pickupAt < autoDispatchLookaheadCutoff;

          return (
            !Boolean((trip as any).claims?.length) &&
            Math.max(0, MAX_CLAIMS_PER_BOOKING - ((trip as any)._count?.claims ?? 0)) > 0 &&
            now >= opensAt &&
            (!inImmediateWindow || now >= autoEndsAt) &&
            getAreaIneligibilityReason(driver, trip) === null &&
            getClaimReasonForDriver({
              bookingVehicleType: trip.vehicleType,
              driverNormalizedVehicleType,
              isVipDriver,
            }) === null
          );
        })(),
        claimIneligibilityReason: (() => {
          const opensAt = getClaimOpensAt(new Date(trip.pickupTime || trip.scheduledDate));
          if (now < opensAt) return "Claims open 72 hours before pickup";
          if (Boolean((trip as any).claims?.length)) return "You already submitted a claim";

          const pickupAt = new Date(trip.pickupTime || trip.scheduledDate);
          const autoEndsAt = getAutoDispatchEndsAt(new Date(trip.createdAt));
          const inImmediateWindow = pickupAt < autoDispatchLookaheadCutoff;
          if (inImmediateWindow && now < autoEndsAt) {
            const minsLeft = Math.max(1, Math.ceil((autoEndsAt.getTime() - now.getTime()) / 60000));
            return `Auto-allocating a driver (try again in ~${minsLeft} min)`;
          }
          const count = (trip as any)._count?.claims ?? 0;
          if (count >= MAX_CLAIMS_PER_BOOKING) return "No claims left";
          const areaReason = getAreaIneligibilityReason(driver, trip);
          if (areaReason) return areaReason;
          return (
            getClaimReasonForDriver({
              bookingVehicleType: trip.vehicleType,
              driverNormalizedVehicleType,
              isVipDriver,
            }) || null
          );
        })(),
        id: trip.id,
        vehicleType: trip.vehicleType,
        scheduledDate: trip.scheduledDate,
        pickupTime: trip.pickupTime,
        fromAddress: trip.fromAddress,
        fromLatitude: trip.fromLatitude,
        fromLongitude: trip.fromLongitude,
        toAddress: trip.toAddress || trip.property?.title,
        toLatitude: trip.toLatitude,
        toLongitude: trip.toLongitude,
        amount: trip.amount,
        currency: trip.currency,
        numberOfPassengers: trip.numberOfPassengers,
        arrivalType: trip.arrivalType,
        arrivalNumber: trip.arrivalNumber,
        transportCompany: trip.transportCompany,
        arrivalTime: trip.arrivalTime,
        pickupLocation: trip.pickupLocation,
        notes: trip.notes,
        passenger: trip.user,
        property: trip.property,
        createdAt: trip.createdAt,
      })),
      total,
      page: pageNum,
      pageSize: pageSizeNum,
    });
  } catch (error: any) {
    console.error("GET /driver/trips/scheduled error:", error);
    res.status(500).json({ error: "Failed to fetch scheduled trips" });
  }
}) as RequestHandler);

/**
 * GET /api/driver/trips/claims/pending
 * Trips this driver has claimed that are awaiting NoLSAF team review.
 */
router.get("/claims/pending", limitDriverTripsList, (async (req: AuthedRequest, res: Response) => {
  try {
    const user = req.user!;
    const parsed = paginationSchema.safeParse(req.query);
    if (!parsed.success) {
      return badRequest(res, "Invalid query parameters", parsed.error.flatten());
    }
    const { page: pageNum, pageSize: pageSizeNum } = parsed.data;
    const skip = (pageNum - 1) * pageSizeNum;

    const now = new Date();

    const where: any = {
      driverId: user.id,
      status: "PENDING",
      booking: {
        scheduledDate: { gte: now },
      },
    };

    const [claims, total] = await Promise.all([
      (prisma as any).transportBookingClaim.findMany({
        where,
        include: {
          booking: {
            include: {
              user: { select: { id: true, name: true, phone: true, email: true } },
              property: { select: { id: true, title: true, regionName: true, district: true, ward: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSizeNum,
      }),
      (prisma as any).transportBookingClaim.count({ where }),
    ]);

    res.json({
      items: claims.map((c: any) => {
        const trip = c.booking;
        return {
          id: trip.id,
          claimId: c.id,
          claimStatus: c.status,
          claimCreatedAt: c.createdAt,
          vehicleType: trip.vehicleType,
          scheduledDate: trip.scheduledDate,
          pickupTime: trip.pickupTime,
          fromAddress: trip.fromAddress,
          fromLatitude: trip.fromLatitude,
          fromLongitude: trip.fromLongitude,
          toAddress: trip.toAddress || trip.property?.title,
          toLatitude: trip.toLatitude,
          toLongitude: trip.toLongitude,
          amount: trip.amount,
          currency: trip.currency,
          numberOfPassengers: trip.numberOfPassengers,
          arrivalType: trip.arrivalType,
          arrivalNumber: trip.arrivalNumber,
          transportCompany: trip.transportCompany,
          arrivalTime: trip.arrivalTime,
          pickupLocation: trip.pickupLocation,
          notes: trip.notes,
          passenger: trip.user,
          property: trip.property,
          status: trip.status,
          createdAt: trip.createdAt,
        };
      }),
      total,
      page: pageNum,
      pageSize: pageSizeNum,
    });
  } catch (error: any) {
    console.error("GET /driver/trips/claims/pending error:", error);
    res.status(500).json({ error: "Failed to fetch pending claims" });
  }
}) as RequestHandler);

/**
 * GET /api/driver/trips/claims/finished
 * Trips completed by this driver (for history + ratings).
 */
router.get("/claims/finished", limitDriverTripsList, (async (req: AuthedRequest, res: Response) => {
  try {
    const user = req.user!;
    const parsed = paginationSchema.safeParse(req.query);
    if (!parsed.success) {
      return badRequest(res, "Invalid query parameters", parsed.error.flatten());
    }
    const { page: pageNum, pageSize: pageSizeNum } = parsed.data;
    const skip = (pageNum - 1) * pageSizeNum;

    const where: any = {
      driverId: user.id,
      status: { in: ["COMPLETED", "FINISHED"] },
    };

    const [trips, total] = await Promise.all([
      prisma.transportBooking.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, phone: true, email: true } },
              property: { select: { id: true, title: true, regionName: true, district: true, ward: true } },
        },
        orderBy: { scheduledDate: "desc" },
        skip,
        take: pageSizeNum,
      }),
      prisma.transportBooking.count({ where }),
    ]);

    res.json({
      items: trips.map((trip) => ({
        id: trip.id,
        vehicleType: trip.vehicleType,
        scheduledDate: trip.scheduledDate,
        pickupTime: trip.pickupTime,
        fromAddress: trip.fromAddress,
        fromLatitude: trip.fromLatitude,
        fromLongitude: trip.fromLongitude,
        toAddress: trip.toAddress || trip.property?.title,
        toLatitude: trip.toLatitude,
        toLongitude: trip.toLongitude,
        amount: trip.amount,
        currency: trip.currency,
        numberOfPassengers: trip.numberOfPassengers,
        arrivalType: trip.arrivalType,
        arrivalNumber: trip.arrivalNumber,
        transportCompany: trip.transportCompany,
        arrivalTime: trip.arrivalTime,
        pickupLocation: trip.pickupLocation,
        notes: trip.notes,
        passenger: trip.user,
        property: trip.property,
        status: trip.status,
        userRating: trip.userRating,
        userReview: trip.userReview,
        driverRating: trip.driverRating,
        driverReview: trip.driverReview,
        createdAt: trip.createdAt,
      })),
      total,
      page: pageNum,
      pageSize: pageSizeNum,
    });
  } catch (error: any) {
    console.error("GET /driver/trips/claims/finished error:", error);
    res.status(500).json({ error: "Failed to fetch finished trips" });
  }
}) as RequestHandler);

/**
 * POST /api/driver/trips/:id/claim
 * Driver claims a scheduled trip (competitive advantage feature)
 */
router.post("/:id/claim", limitDriverTripClaim, (async (req: AuthedRequest, res: Response) => {
  try {
    const user = req.user!;
    const parsed = idParamSchema.safeParse(req.params);
    if (!parsed.success) {
      return badRequest(res, "Invalid trip ID", parsed.error.flatten());
    }
    const tripId = parsed.data.id;

    // Use transaction to prevent race conditions
    const result = await prisma.$transaction(async (tx) => {
      const driver = await tx.user.findUnique({
        where: { id: user.id },
        select: { vehicleType: true, isVipDriver: true, region: true, operationArea: true } as any,
      });
      if (!driver) {
        throw new Error("Driver not found");
      }

      // Check if trip exists and is available
      const trip = await tx.transportBooking.findUnique({
        where: { id: tripId },
        include: {
          user: { select: { id: true, name: true, phone: true } },
          property: { select: { id: true, title: true, regionName: true, district: true, ward: true } },
        },
      });

      if (!trip) {
        throw new Error("Trip not found");
      }

      if (trip.status !== "PENDING_ASSIGNMENT") {
        throw new Error("Trip is not available for claiming");
      }

      if (trip.paymentStatus !== "PAID") {
        throw new Error("Trip is not yet paid");
      }

      if (trip.driverId !== null) {
        throw new Error("Trip has already been assigned");
      }

      // Area-of-operation restriction
      const areaReason = getAreaIneligibilityReason(driver, trip);
      if (areaReason) {
        const err: any = new Error(areaReason);
        err.code = "OUT_OF_AREA";
        throw err;
      }

      // Check if trip is in the future
      if (new Date(trip.scheduledDate) < new Date()) {
        throw new Error("Cannot claim past trips");
      }

      const pickupAt = new Date(trip.pickupTime || trip.scheduledDate);
      const opensAt = getClaimOpensAt(pickupAt);
      const now = new Date();

      // If the trip is happening soon, the platform tries auto-dispatch first.
      // Only allow claim after the grace window expires.
      const autoEndsAt = getAutoDispatchEndsAt(new Date(trip.createdAt));
      const inImmediateWindow = pickupAt.getTime() < now.getTime() + AUTO_DISPATCH_LOOKAHEAD_MS;
      if (inImmediateWindow && now < autoEndsAt) {
        const minsLeft = Math.max(1, Math.ceil((autoEndsAt.getTime() - now.getTime()) / 60000));
        const err: any = new Error(`Auto-allocating a driver (try again in ~${minsLeft} min)`);
        err.code = "AUTO_DISPATCH_IN_PROGRESS";
        err.availableAt = autoEndsAt.toISOString();
        throw err;
      }

      if (now < opensAt) {
        const hoursLeft = Math.ceil((opensAt.getTime() - now.getTime()) / (60 * 60 * 1000));
        const err: any = new Error(`Claims open 72 hours before pickup (opens in ~${hoursLeft}h)`);
        err.code = "CLAIMS_NOT_OPEN";
        err.opensAt = opensAt.toISOString();
        throw err;
      }

      // Enforce eligibility (VIP + vehicle type matching)
      const driverNormalizedVehicleType = normalizeDriverVehicleType((driver as any).vehicleType || undefined);
      const isVipDriver = Boolean((driver as any).isVipDriver);
      const reason = getClaimReasonForDriver({
        bookingVehicleType: trip.vehicleType,
        driverNormalizedVehicleType,
        isVipDriver,
      });
      if (reason) {
        const err: any = new Error(reason);
        err.code = "NOT_ELIGIBLE";
        throw err;
      }

      // Enforce claim range (max 5 claims)
      const existingCount = await (tx as any).transportBookingClaim.count({
        where: {
          bookingId: tripId,
          status: { in: ["PENDING", "ACCEPTED"] },
        },
      });
      if (existingCount >= MAX_CLAIMS_PER_BOOKING) {
        throw new Error("No claims left");
      }

      const existingByDriver = await (tx as any).transportBookingClaim.findUnique({
        where: { bookingId_driverId: { bookingId: tripId, driverId: user.id } },
        select: { id: true } as any,
      });
      if (existingByDriver) {
        throw new Error("You already submitted a claim for this trip");
      }

      const claim = await (tx as any).transportBookingClaim.create({
        data: {
          bookingId: tripId,
          driverId: user.id,
          status: "PENDING",
        },
      });

      // Driver submits a claim. NoLSAF team reviews before awarding.
      const updated = await tx.transportBooking.findUnique({
        where: { id: tripId },
        include: {
          user: { select: { id: true, name: true, phone: true, email: true } },
          property: { select: { id: true, title: true, regionName: true, district: true, ward: true } },
        },
      });

      if (!updated) {
        throw new Error("Trip not found");
      }

      // Create notifications
      try {
        await tx.notification.create({
          data: {
            userId: user.id,
            title: "Claim submitted",
            body: `Your claim is pending review for the trip on ${new Date(updated.scheduledDate).toLocaleDateString()}.`,
            unread: true,
            type: "ride",
            meta: {
              transportBookingId: updated.id,
              status: "CLAIM_PENDING",
              claimId: claim.id,
            },
          },
        });
      } catch (notifError) {
        console.warn("Failed to create notifications:", notifError);
        // Don't fail the claim if notifications fail
      }

      return { updated, claim };
    });

    // Audit log for driver claim
    try {
      // Fetch driver name for audit log
      const driverUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { name: true, email: true },
      });
      
      await audit(req, "TRANSPORT_BOOKING_CLAIM_SUBMITTED", `transport-booking:${result.id}`, {
        status: "PENDING_ASSIGNMENT",
        driverId: null,
      }, {
        status: "CLAIM_PENDING",
        driverId: user.id,
        driverName: driverUser?.name || driverUser?.email || `User ${user.id}`,
      });
    } catch (auditError) {
      console.warn("Failed to create audit log for driver claim:", auditError);
      // Don't fail the request if audit logging fails
    }

    // Emit real-time event
    try {
      const io = (req.app && (req.app as any).get && (req.app as any).get("io")) || (global as any).io;
      if (io && typeof io.to === "function") {
        io.to(`driver:${user.id}`).emit("transport:booking:claim_submitted", {
          transportBookingId: (result as any).updated.id,
          status: "CLAIM_PENDING",
        });
      }
    } catch (socketError) {
      console.warn("Failed to emit socket event:", socketError);
    }

    res.json({
      ok: true,
      claim: {
        id: (result as any).claim.id,
        status: (result as any).claim.status,
        createdAt: (result as any).claim.createdAt,
      },
      trip: {
        id: (result as any).updated.id,
        status: (result as any).updated.status,
        scheduledDate: (result as any).updated.scheduledDate,
        passenger: (result as any).updated.user,
        property: (result as any).updated.property,
      },
    });
  } catch (error: any) {
    console.error("POST /driver/trips/:id/claim error:", error);
    const statusCode =
      error?.code === "NOT_ELIGIBLE" ? 403 :
      error?.code === "CLAIMS_NOT_OPEN" ? 409 :
      error.message.includes("not found") ? 404 :
      error.message.includes("not available") || error.message.includes("already") || error.message.includes("No claims left") ? 409 :
      500;
    res.status(statusCode).json({
      error: error.message || "Failed to claim trip",
      opensAt: error?.opensAt,
    });
  }
}) as RequestHandler);

/**
 * GET /api/driver/trips/scheduled/assigned
 * Get driver's assigned scheduled trips
 */
router.get("/scheduled/assigned", limitDriverTripsList, (async (req: AuthedRequest, res: Response) => {
  try {
    const user = req.user!;
    const parsed = paginationSchema.safeParse(req.query);
    if (!parsed.success) {
      return badRequest(res, "Invalid query parameters", parsed.error.flatten());
    }
    const { page: pageNum, pageSize: pageSizeNum } = parsed.data;
    const skip = (pageNum - 1) * pageSizeNum;

    const where: any = {
      driverId: user.id,
      scheduledDate: {
        gte: new Date(), // Only future trips
      },
      status: {
        // Keep legacy statuses but also include the schema's documented status values.
        // Some admin/ops flows assign driverId without changing status away from PENDING.
        in: ["ASSIGNED", "CONFIRMED", "PENDING", "IN_PROGRESS"],
      },
    };

    const [trips, total] = await Promise.all([
      prisma.transportBooking.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              phone: true,
              email: true,
            },
          },
          property: {
            select: {
              id: true,
              title: true,
              regionName: true,
              district: true,
            },
          },
        },
        orderBy: { scheduledDate: "asc" },
        skip,
        take: pageSizeNum,
      }),
      prisma.transportBooking.count({ where }),
    ]);

    res.json({
      items: trips.map((trip) => ({
        id: trip.id,
        vehicleType: trip.vehicleType,
        scheduledDate: trip.scheduledDate,
        pickupTime: trip.pickupTime,
        fromAddress: trip.fromAddress,
        fromLatitude: trip.fromLatitude,
        fromLongitude: trip.fromLongitude,
        toAddress: trip.toAddress || trip.property?.title,
        toLatitude: trip.toLatitude,
        toLongitude: trip.toLongitude,
        amount: trip.amount,
        currency: trip.currency,
        numberOfPassengers: trip.numberOfPassengers,
        arrivalType: trip.arrivalType,
        arrivalNumber: trip.arrivalNumber,
        transportCompany: trip.transportCompany,
        arrivalTime: trip.arrivalTime,
        pickupLocation: trip.pickupLocation,
        notes: trip.notes,
        passenger: trip.user,
        property: trip.property,
        status: trip.status,
        createdAt: trip.createdAt,
      })),
      total,
      page: pageNum,
      pageSize: pageSizeNum,
    });
  } catch (error: any) {
    console.error("GET /driver/trips/scheduled/assigned error:", error);
    res.status(500).json({ error: "Failed to fetch assigned trips" });
  }
}) as RequestHandler);

export default router;

