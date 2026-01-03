import { Router, type Response } from "express";
import type { RequestHandler } from "express";
import { prisma } from "@nolsaf/prisma";
import { AuthedRequest, requireAuth, requireRole } from "../middleware/auth.js";
import { audit } from "../lib/audit.js";

export const router = Router();

// All routes require driver authentication
router.use(requireAuth as RequestHandler);
router.use(requireRole("DRIVER") as RequestHandler);

/**
 * GET /api/driver/trips/scheduled
 * Get scheduled trips available for driver to claim
 * Query: ?vehicleType=BODA&page=1&pageSize=20
 */
router.get("/scheduled", (async (req: AuthedRequest, res: Response) => {
  try {
    const user = req.user!;
    const { vehicleType, page = "1", pageSize = "20" } = req.query as any;

    const pageNum = Number(page);
    const pageSizeNum = Math.min(Number(pageSize), 50);
    const skip = (pageNum - 1) * pageSizeNum;

    // Get driver's vehicle type preference (if stored in user profile)
    // For now, we'll filter by vehicleType query param if provided

    const where: any = {
      status: "PENDING_ASSIGNMENT",
      driverId: null, // Not yet assigned
      scheduledDate: {
        gte: new Date(), // Only future trips
      },
    };

    if (vehicleType) {
      where.vehicleType = vehicleType;
    }

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
 * POST /api/driver/trips/:id/claim
 * Driver claims a scheduled trip (competitive advantage feature)
 */
router.post("/:id/claim", (async (req: AuthedRequest, res: Response) => {
  try {
    const user = req.user!;
    const tripId = Number(req.params.id);

    if (!Number.isFinite(tripId)) {
      res.status(400).json({ error: "Invalid trip ID" });
      return;
    }

    // Use transaction to prevent race conditions
    const result = await prisma.$transaction(async (tx) => {
      // Check if trip exists and is available
      const trip = await tx.transportBooking.findUnique({
        where: { id: tripId },
        include: {
          user: { select: { id: true, name: true, phone: true } },
        },
      });

      if (!trip) {
        throw new Error("Trip not found");
      }

      if (trip.status !== "PENDING_ASSIGNMENT") {
        throw new Error("Trip is not available for claiming");
      }

      if (trip.driverId !== null) {
        throw new Error("Trip has already been assigned");
      }

      // Check if trip is in the future
      if (new Date(trip.scheduledDate) < new Date()) {
        throw new Error("Cannot claim past trips");
      }

      // Assign trip to driver
      const updated = await tx.transportBooking.update({
        where: { id: tripId },
        data: {
          driverId: user.id,
          status: "ASSIGNED",
        },
        include: {
          user: { select: { id: true, name: true, phone: true, email: true } },
          property: { select: { id: true, title: true } },
        },
      });

      // Create notifications
      try {
        await tx.notification.create({
          data: {
            userId: updated.userId,
            title: "Driver assigned to your ride",
            body: `Your ride on ${new Date(updated.scheduledDate).toLocaleDateString()} has been assigned to a driver.`,
            unread: true,
            type: "ride",
            meta: {
              transportBookingId: updated.id,
              status: updated.status,
              driverId: updated.driverId,
            },
          },
        });

        await tx.notification.create({
          data: {
            userId: user.id,
            title: "Trip claimed successfully",
            body: `You've claimed a trip scheduled for ${new Date(updated.scheduledDate).toLocaleDateString()}.`,
            unread: true,
            type: "ride",
            meta: {
              transportBookingId: updated.id,
              status: updated.status,
            },
          },
        });
      } catch (notifError) {
        console.warn("Failed to create notifications:", notifError);
        // Don't fail the claim if notifications fail
      }

      return updated;
    });

    // Audit log for driver claim
    try {
      // Fetch driver name for audit log
      const driverUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { name: true, email: true },
      });
      
      await audit(req, "TRANSPORT_BOOKING_CLAIMED", `transport-booking:${result.id}`, {
        status: "PENDING_ASSIGNMENT",
        driverId: null,
      }, {
        status: result.status,
        driverId: result.driverId,
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
        io.to(`driver:${user.id}`).emit("transport:booking:assigned", {
          transportBookingId: result.id,
          status: result.status,
        });
        io.to(`user:${result.userId}`).emit("transport:booking:assigned", {
          transportBookingId: result.id,
          status: result.status,
          driverId: result.driverId,
        });
      }
    } catch (socketError) {
      console.warn("Failed to emit socket event:", socketError);
    }

    res.json({
      ok: true,
      trip: {
        id: result.id,
        status: result.status,
        scheduledDate: result.scheduledDate,
        passenger: result.user,
        property: result.property,
      },
    });
  } catch (error: any) {
    console.error("POST /driver/trips/:id/claim error:", error);
    const statusCode = error.message.includes("not found") ? 404 : error.message.includes("not available") || error.message.includes("already") ? 409 : 500;
    res.status(statusCode).json({
      error: error.message || "Failed to claim trip",
    });
  }
}) as RequestHandler);

/**
 * GET /api/driver/trips/scheduled/assigned
 * Get driver's assigned scheduled trips
 */
router.get("/scheduled/assigned", (async (req: AuthedRequest, res: Response) => {
  try {
    const user = req.user!;
    const { page = "1", pageSize = "20" } = req.query as any;

    const pageNum = Number(page);
    const pageSizeNum = Math.min(Number(pageSize), 50);
    const skip = (pageNum - 1) * pageSizeNum;

    const where: any = {
      driverId: user.id,
      scheduledDate: {
        gte: new Date(), // Only future trips
      },
      status: {
        in: ["ASSIGNED", "CONFIRMED"],
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

