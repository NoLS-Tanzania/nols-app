/**
 * @fileoverview Group Stay Property Recommendations API
 * @module routes/admin.groupStays.recommendations
 * 
 * Provides endpoints for admins to search and recommend properties for group bookings.
 */

import { Router } from "express";
import type { RequestHandler } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { prisma } from "@nolsaf/prisma";

export const router = Router();
router.use(requireAuth as unknown as RequestHandler, requireRole("ADMIN") as unknown as RequestHandler);

/**
 * GET /admin/group-stays/recommendations/search
 * Search properties that match group stay requirements
 * 
 * Query params:
 * - region: Destination region name
 * - district: Destination district (optional)
 * - accommodationType: Type of accommodation (villa, hotel, etc.)
 * - minRooms: Minimum number of rooms needed
 * - headcount: Total number of people
 * - page: Page number (default: 1)
 * - pageSize: Results per page (default: 20)
 */
router.get("/search", async (req, res) => {
  try {
    const { 
      region, 
      district, 
      accommodationType, 
      minRooms, 
      headcount,
      page = "1", 
      pageSize = "20" 
    } = req.query as any;

    const where: any = {
      status: "APPROVED", // Only show approved properties
    };

    // Filter by region
    if (region) {
      where.regionName = { contains: String(region) };
    }

    // Filter by district
    if (district) {
      where.district = { contains: String(district) };
    }

    // Filter by accommodation type
    if (accommodationType) {
      // Map group stay accommodation types to property types
      const typeMap: Record<string, string> = {
        villa: "VILLA",
        apartment: "APARTMENT",
        hotel: "HOTEL",
        hostel: "HOSTEL",
        lodge: "LODGE",
        condo: "CONDO",
        guest_house: "GUEST_HOUSE",
        bungalow: "BUNGALOW",
        cabin: "CABIN",
        homestay: "HOMESTAY",
        townhouse: "TOWNHOUSE",
        house: "HOUSE",
        dorm: "DORM",
        other: "OTHER",
      };
      const propertyType = typeMap[accommodationType.toLowerCase()] || accommodationType.toUpperCase();
      where.type = propertyType;
    }

    // Filter by minimum rooms (if roomsSpec is available)
    // Note: This is a simplified check - in production, you'd parse roomsSpec JSON
    if (minRooms) {
      const minRoomsNum = Number(minRooms);
      if (!isNaN(minRoomsNum)) {
        // Properties should have at least the required number of rooms
        // This is a basic check - you might need to parse roomsSpec JSON for accurate filtering
        where.roomsSpec = { not: null }; // At least has room specifications
      }
    }

    const skip = (Number(page) - 1) * Number(pageSize);
    const take = Math.min(Number(pageSize), 50);

    let properties: any[] = [];
    let total = 0;

    try {
      [properties, total] = await Promise.all([
        (prisma as any).property.findMany({
          where,
          include: {
            owner: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
            images: {
              where: { status: "READY" },
              take: 1,
              orderBy: { createdAt: "asc" },
              select: {
                url: true,
                thumbnailUrl: true,
              },
            },
          },
          // Use indexed id column for sorting to avoid "Out of sort memory" errors
          // NOTE: id is monotonic and approximates "newest" (higher id = more recent)
          orderBy: { id: "desc" },
          skip,
          take,
        }),
        (prisma as any).property.count({ where }),
      ]);
    } catch (queryErr: any) {
      console.error("Database query error:", queryErr);
      // If images relation fails, try without it
      if (queryErr?.message?.includes("images") || queryErr?.code === "P2021" || queryErr?.code === "P2022") {
        console.warn("Retrying query without images relation");
        [properties, total] = await Promise.all([
          (prisma as any).property.findMany({
            where,
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
            // Use indexed id column for sorting to avoid "Out of sort memory" errors
            orderBy: { id: "desc" },
            skip,
            take,
          }),
          (prisma as any).property.count({ where }),
        ]);
      } else if (queryErr?.message?.includes("sort memory") || queryErr?.cause?.originalCode === "1038") {
        // Handle sort memory errors specifically - retry with indexed sort
        console.warn("Sort memory error detected, retrying with indexed sort");
        [properties, total] = await Promise.all([
          (prisma as any).property.findMany({
            where,
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
            // Use indexed id column for sorting to avoid "Out of sort memory" errors
            orderBy: { id: "desc" },
            skip,
            take,
          }),
          (prisma as any).property.count({ where }),
        ]);
      } else {
        throw queryErr;
      }
    }

    // Map properties to response format
    const mapped = properties.map((p: any) => ({
      id: p.id,
      title: p.title || `Property #${p.id}`,
      type: p.type,
      regionName: p.regionName,
      district: p.district,
      city: p.city,
      basePrice: p.basePrice ? Number(p.basePrice) : null,
      currency: p.currency || "TZS",
      description: p.description,
      roomsSpec: p.roomsSpec,
      services: p.services,
      owner: p.owner ? {
        id: p.owner.id,
        name: p.owner.name,
        email: p.owner.email,
        phone: p.owner.phone,
      } : null,
      imageUrl: (p.images && Array.isArray(p.images) && p.images.length > 0) 
        ? (p.images[0]?.url || p.images[0]?.thumbnailUrl || null)
        : (p.photos && Array.isArray(p.photos) && p.photos.length > 0 ? p.photos[0] : null),
      thumbnailUrl: (p.images && Array.isArray(p.images) && p.images.length > 0) 
        ? p.images[0]?.thumbnailUrl || null
        : null,
    }));

    return res.json({
      items: mapped,
      total,
      page: Number(page),
      pageSize: take,
    });
  } catch (err: any) {
    console.error("Error in GET /admin/group-stays/recommendations/search:", err);
    console.error("Error details:", {
      message: err?.message,
      stack: err?.stack,
      code: err?.code,
      name: err?.name,
    });
    return res.status(500).json({ 
      error: "Failed to search properties",
      details: process.env.NODE_ENV === 'development' ? err?.message : undefined,
    });
  }
});

/**
 * PATCH /admin/group-stays/bookings/:id/recommendations
 * Attach recommended properties to a group booking
 * 
 * Body: { propertyIds: [1, 2] } - Array of 1-2 property IDs
 */
router.patch("/bookings/:id/recommendations", async (req, res) => {
  try {
    const bookingId = Number(req.params.id);
    const { propertyIds } = req.body as { propertyIds: number[] };

    if (!bookingId || isNaN(bookingId)) {
      return res.status(400).json({ error: "Invalid booking ID" });
    }

    if (!Array.isArray(propertyIds) || propertyIds.length === 0 || propertyIds.length > 2) {
      return res.status(400).json({ error: "Must provide 1-2 property IDs" });
    }

    // Verify properties exist and are approved
    const properties = await (prisma as any).property.findMany({
      where: {
        id: { in: propertyIds },
        status: "APPROVED",
      },
      select: { id: true },
    });

    if (properties.length !== propertyIds.length) {
      return res.status(400).json({ error: "One or more properties not found or not approved" });
    }

    // Get admin ID from request
    const adminId = (req as any).user?.id;
    if (!adminId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Update booking with recommended properties
    const updated = await (prisma as any).groupBooking.update({
      where: { id: bookingId },
      data: {
        recommendedPropertyIds: propertyIds,
        status: "PROCESSING", // Move to processing when properties are recommended
      },
      include: {
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

    // Create audit log entry
    try {
      await (prisma as any).groupBookingAudit.create({
        data: {
          groupBookingId: bookingId,
          adminId,
          action: "PROPERTY_RECOMMENDED",
          description: `Admin recommended ${propertyIds.length} propert${propertyIds.length > 1 ? 'ies' : 'y'} to customer`,
          metadata: {
            propertyIds,
            previousStatus: "PENDING",
            newStatus: "PROCESSING",
          },
        },
      });
    } catch (auditErr) {
      console.error("Failed to create audit log:", auditErr);
      // Don't fail the request if audit logging fails
    }

    // TODO: Send notification to user about property recommendations

    return res.json({
      success: true,
      booking: {
        id: updated.id,
        recommendedPropertyIds: updated.recommendedPropertyIds,
        status: updated.status,
      },
    });
  } catch (err: any) {
    console.error("Error in PATCH /admin/group-stays/bookings/:id/recommendations:", err);
    return res.status(500).json({ error: "Failed to attach recommendations" });
  }
});

/**
 * PATCH /admin/group-stays/bookings/:id/confirm-property
 * User confirms a recommended property
 * 
 * Body: { propertyId: 1 }
 */
router.patch("/bookings/:id/confirm-property", async (req, res) => {
  try {
    const bookingId = Number(req.params.id);
    const { propertyId } = req.body as { propertyId: number };

    if (!bookingId || isNaN(bookingId)) {
      return res.status(400).json({ error: "Invalid booking ID" });
    }

    if (!propertyId || isNaN(propertyId)) {
      return res.status(400).json({ error: "Invalid property ID" });
    }

    // Get booking to verify recommended properties
    const booking = await (prisma as any).groupBooking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        recommendedPropertyIds: true,
        userId: true,
      },
    });

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    const recommendedIds = Array.isArray(booking.recommendedPropertyIds) 
      ? booking.recommendedPropertyIds 
      : [];

    if (!recommendedIds.includes(propertyId)) {
      return res.status(400).json({ error: "Property not in recommended list" });
    }

    // Verify property exists and is approved
    const property = await (prisma as any).property.findUnique({
      where: { id: propertyId },
      select: { id: true, status: true, ownerId: true, title: true },
    });

    if (!property || property.status !== "APPROVED") {
      return res.status(400).json({ error: "Property not found or not approved" });
    }

    // Update booking with confirmed property and auto-assign owner
    const updated = await (prisma as any).groupBooking.update({
      where: { id: bookingId },
      data: {
        confirmedPropertyId: propertyId,
        propertyConfirmedAt: new Date(),
        assignedOwnerId: property.ownerId, // Auto-assign property owner
        ownerAssignedAt: new Date(),
        status: "CONFIRMED",
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        assignedOwner: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    // Create audit log for auto-assignment
    try {
      const adminId = (req as any).user?.id;
      if (adminId) {
        await (prisma as any).groupBookingAudit.create({
          data: {
            groupBookingId: bookingId,
            adminId: adminId,
            action: "OWNER_AUTO_ASSIGNED",
            description: `Owner auto-assigned after user confirmed property. Property Owner: ${updated.assignedOwner?.name || updated.assignedOwner?.email || `#${property.ownerId}`}`,
            metadata: { 
              propertyId, 
              ownerId: property.ownerId,
              ownerName: updated.assignedOwner?.name || updated.assignedOwner?.email || null,
              autoAssigned: true 
            },
          },
        });
      }
    } catch (auditError) {
      console.warn("Failed to create audit log for auto-assignment:", auditError);
    }

    // Notify property owner about the booking assignment
    try {
      const { notifyOwner } = await import("../lib/notifications.js");
      if (property.ownerId && updated.assignedOwner) {
        await notifyOwner(property.ownerId, "group_stay_assigned", {
          bookingId: bookingId,
          propertyId: propertyId,
          groupType: updated.groupType || "Group Stay",
          headcount: updated.headcount || 0,
          checkIn: updated.checkIn,
          checkOut: updated.checkOut,
          customerName: updated.user?.name || "Customer",
        });

        // Create notification for owner
        await prisma.notification.create({
          data: {
            userId: property.ownerId,
            ownerId: property.ownerId,
            title: "New Group Stay Assignment",
            body: `You have been assigned to handle a group stay booking for ${updated.user?.name || "a customer"}. The customer has confirmed interest in your property.`,
            unread: true,
            type: "group_stay",
            meta: {
              type: "group_stay",
              bookingId: bookingId,
              propertyId: propertyId,
              status: "CONFIRMED",
            },
          },
        });

        // Emit real-time notification to owner
        try {
          const io = (req.app as any)?.get?.("io") || (global as any).io;
          if (io && typeof io.to === "function") {
            io.to(`owner:${property.ownerId}`).emit("notification:new", {
              title: "New Group Stay Assignment",
              body: `You have been assigned to handle a group stay booking for ${updated.user?.name || "a customer"}.`,
              type: "group_stay",
              bookingId: bookingId,
            });
          }
        } catch (ioErr) {
          console.error("Failed to emit Socket.IO notification to owner:", ioErr);
        }
      }
    } catch (notifyErr) {
      console.error("Failed to notify owner:", notifyErr);
      // Don't fail the request if notification fails
    }

    // Send confirmation notification to user
    try {
      const { notifyUser } = await import("../lib/notifications.js");
      await notifyUser(updated.userId, "group_stay_confirmed", {
        bookingId: bookingId,
        propertyId: propertyId,
        propertyTitle: property.title || "Property",
        status: "CONFIRMED",
      });

      // Create notification for user
      await prisma.notification.create({
        data: {
          userId: updated.userId,
          ownerId: null,
          title: "Property Confirmation Received",
          body: `Thank you for confirming your interest. We've assigned a property owner to handle your group stay. They will contact you shortly with details.`,
          unread: true,
          type: "group_stay",
          meta: {
            type: "group_stay",
            bookingId: bookingId,
            propertyId: propertyId,
            status: "CONFIRMED",
          },
        },
      });
    } catch (userNotifyErr) {
      console.error("Failed to notify user:", userNotifyErr);
      // Don't fail the request if notification fails
    }

    return res.json({
      success: true,
      booking: {
        id: updated.id,
        confirmedPropertyId: updated.confirmedPropertyId,
        assignedOwnerId: updated.assignedOwnerId,
        status: updated.status,
      },
    });
  } catch (err: any) {
    console.error("Error in PATCH /admin/group-stays/bookings/:id/confirm-property:", err);
    return res.status(500).json({ error: "Failed to confirm property" });
  }
});

export default router;

