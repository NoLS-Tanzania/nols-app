// apps/api/src/routes/owner.groupStays.ts
import { Router, type Request, type Response } from "express";
import { prisma } from "@nolsaf/prisma";
import { requireAuth, requireRole, type AuthedRequest } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { sanitizeText } from "../lib/sanitize.js";
import { notifyUser, notifyOwner } from "../lib/notifications.js";
import { limitOwnerGroupStayMessages } from "../middleware/rateLimit.js";
import { z } from "zod";
import type { RequestHandler } from "express";

const router = Router();
router.use(requireAuth as unknown as RequestHandler, requireRole("OWNER") as unknown as RequestHandler);

// Zod validation schema for message sending
// Note: Owners cannot "Accept Offer" or "Request Changes" - these are admin-only actions
// Owners can only provide details, special offers, check-in instructions, and general communication
const sendMessageSchema = z.object({
  message: z.string()
    .min(1, "Message cannot be empty")
    .max(5000, "Message cannot exceed 5000 characters")
    .trim(),
  messageType: z.enum([
    "General",
    "Provide Details",
    "Special Offers",
    "Check-in Instructions",
    "Welcome Message",
    "Amenities Information",
    "Other"
  ]).optional().default("General"),
}).strict();

/**
 * GET /owner/group-stays
 * Get all group stays assigned to this owner
 */
router.get("/", asyncHandler(async (req: Request, res: Response) => {
  res.setHeader("Content-Type", "application/json");
  
  const r = req as AuthedRequest;
  const ownerId = r.user?.id;
  
  if (!ownerId || typeof ownerId !== "number") {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Validate and sanitize query parameters
  const status = typeof req.query.status === "string" ? req.query.status.trim().toUpperCase() : undefined;
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 50));

  // Validate status if provided
  const validStatuses = ["PENDING", "PROCESSING", "CONFIRMED", "COMPLETED", "CANCELED", "CANCELLED"];
  if (status && !validStatuses.includes(status)) {
    return res.status(400).json({ error: "Invalid status value" });
  }

  // Filter by assigned owner
  const where: any = {
    assignedOwnerId: ownerId,
  };

  if (status) {
    where.status = status;
  }

  const skip = (page - 1) * pageSize;
  const take = pageSize;

  try {
    const [items, total] = await Promise.all([
      prisma.groupBooking.findMany({
        where,
        select: {
          id: true,
          groupType: true,
          accommodationType: true,
          headcount: true,
          roomsNeeded: true,
          toRegion: true,
          toDistrict: true,
          toWard: true,
          toLocation: true,
          checkIn: true,
          checkOut: true,
          status: true,
          recommendedPropertyIds: true,
          confirmedPropertyId: true,
          createdAt: true,
          // Arrangement fields
          arrPickup: true,
          arrTransport: true,
          arrMeals: true,
          arrGuide: true,
          arrEquipment: true,
          pickupLocation: true,
          pickupTime: true,
          arrangementNotes: true,
          user: {
            select: { id: true, name: true, email: true, phone: true },
          },
          assignedOwner: {
            select: { id: true, name: true, email: true, phone: true },
          },
          confirmedProperty: {
            select: { id: true, title: true, type: true, status: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      prisma.groupBooking.count({ where }),
    ]);

    return res.json({
      items,
      total,
      page,
      pageSize,
    });
  } catch (err: any) {
    console.error("Error fetching owner group stays:", err);
    return res.status(500).json({ error: "Failed to fetch group stays" });
  }
}));

/**
 * GET /owner/group-stays/:id
 * Get details of a specific group stay
 */
router.get("/:id", asyncHandler(async (req: Request, res: Response) => {
  res.setHeader("Content-Type", "application/json");
  
  const r = req as AuthedRequest;
  const ownerId = r.user?.id;
  
  if (!ownerId || typeof ownerId !== "number") {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Validate and sanitize ID parameter
  const groupBookingId = Number(req.params.id);
  if (!groupBookingId || isNaN(groupBookingId) || groupBookingId <= 0) {
    return res.status(400).json({ error: "Invalid group stay ID" });
  }

  try {
    const groupBooking = await prisma.groupBooking.findFirst({
      where: {
        id: groupBookingId,
        assignedOwnerId: ownerId,
      },
      select: {
        id: true,
        groupType: true,
        accommodationType: true,
        headcount: true,
        roomsNeeded: true,
        toRegion: true,
        toDistrict: true,
        toWard: true,
        toLocation: true,
        checkIn: true,
        checkOut: true,
        status: true,
        confirmedPropertyId: true,
        createdAt: true,
        // Arrangement fields
        arrPickup: true,
        arrTransport: true,
        arrMeals: true,
        arrGuide: true,
        arrEquipment: true,
        pickupLocation: true,
        pickupTime: true,
        arrangementNotes: true,
        user: {
          select: { id: true, name: true, email: true, phone: true },
        },
        confirmedProperty: {
          select: { id: true, title: true, type: true, status: true },
        },
        passengers: {
          orderBy: { sequenceNumber: "asc" },
        },
        messages: {
          orderBy: { createdAt: "asc" },
          take: 50,
        },
      },
    });

    if (!groupBooking) {
      return res.status(404).json({ error: "Group stay not found or not assigned to you" });
    }

    return res.json(groupBooking);
  } catch (err: any) {
    console.error("Error fetching group stay details:", err);
    return res.status(500).json({ error: "Failed to fetch group stay details" });
  }
}));

/**
 * POST /owner/group-stays/:id/message
 * Send a message to the customer about the group stay
 */
router.post("/:id/message", limitOwnerGroupStayMessages, asyncHandler(async (req: Request, res: Response) => {
  res.setHeader("Content-Type", "application/json");
  
  const r = req as AuthedRequest;
  const ownerId = r.user?.id;
  
  if (!ownerId || typeof ownerId !== "number") {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const groupBookingId = Number(req.params.id);
  if (!groupBookingId || isNaN(groupBookingId) || groupBookingId <= 0) {
    return res.status(400).json({ error: "Invalid group stay ID" });
  }

  // Validate request body with Zod
  const validationResult = sendMessageSchema.safeParse(req.body);
  if (!validationResult.success) {
    const errors = validationResult.error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ');
    return res.status(400).json({ error: "Validation failed", details: errors });
  }

  const { message, messageType } = validationResult.data;

  try {
    // Check if owner account is suspended
    const owner = await prisma.user.findUnique({
      where: { id: ownerId },
      select: { 
        id: true, 
        name: true, 
        email: true, 
        suspendedAt: true,
        role: true 
      },
    });

    if (!owner) {
      return res.status(404).json({ error: "Owner account not found" });
    }

    if (owner.suspendedAt) {
      return res.status(403).json({ 
        error: "Account suspended", 
        code: "ACCOUNT_SUSPENDED",
        message: "Your account has been suspended. Please contact support for assistance." 
      });
    }

    // Verify owner has at least one active/approved property
    const activePropertyCount = await prisma.property.count({
      where: {
        ownerId: ownerId,
        status: {
          in: ["APPROVED", "ACTIVE"],
        },
      },
    });

    if (activePropertyCount === 0) {
      return res.status(403).json({ 
        error: "No active properties", 
        code: "NO_ACTIVE_PROPERTIES",
        message: "You must have at least one active property to send messages to customers." 
      });
    }

    // Verify the group booking is assigned to this owner
    const groupBooking = await prisma.groupBooking.findFirst({
      where: {
        id: groupBookingId,
        assignedOwnerId: ownerId,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!groupBooking) {
      return res.status(404).json({ error: "Group stay not found or not assigned to you" });
    }

    // Sanitize message content (message is already validated and trimmed by Zod)
    const sanitizedMessage = sanitizeText(message);
    const sanitizedMessageType = messageType || "Owner Response";

    // Create message record
    await prisma.groupBookingMessage.create({
      data: {
        groupBookingId: groupBookingId,
        senderId: ownerId,
        senderRole: "OWNER",
        senderName: owner?.name || owner?.email || "Property Owner",
        messageType: sanitizedMessageType,
        body: sanitizedMessage,
        isInternal: false,
      },
    });

    // Create audit log entry
    try {
      await prisma.groupBookingAudit.create({
        data: {
          groupBookingId: groupBookingId,
          adminId: ownerId, // Using ownerId for audit tracking
          action: "OWNER_MESSAGE_SENT",
          description: `Owner sent message to customer`,
          metadata: {
            messageType: sanitizedMessageType,
            messageLength: sanitizedMessage.length,
          },
        },
      });
    } catch (auditError) {
      console.error("Failed to create audit log for owner message:", auditError);
      // Don't fail the request if audit logging fails
    }

    // Send notification to customer
    try {
      await notifyUser(groupBooking.userId, "group_stay_update", {
        bookingId: groupBooking.id,
        status: groupBooking.status,
        title: "Message from Property Owner",
        body: sanitizedMessage,
        message: sanitizedMessage,
      });

      // Create a custom notification
      await prisma.notification.create({
        data: {
          userId: groupBooking.userId,
          ownerId: null,
          title: "Message from Property Owner",
          body: sanitizedMessage.substring(0, 200), // Truncate for notification
          unread: true,
          meta: {
            type: "group_stay",
            bookingId: groupBooking.id,
            status: groupBooking.status,
          },
          type: "group_stay",
        },
      });

      // Emit real-time notification and message update
      try {
        const io = (req.app as any)?.get?.("io") || (global as any).io;
        if (io && typeof io.to === "function") {
          // Emit notification
          io.to(`user:${groupBooking.userId}`).emit("notification:new", {
            title: "Message from Property Owner",
            body: sanitizedMessage.substring(0, 200),
            type: "group_stay",
            bookingId: groupBooking.id,
          });
          
          // Emit new message event
          io.to(`user:${groupBooking.userId}`).emit("group-booking:message:new", {
            groupBookingId: groupBookingId,
            senderRole: "OWNER",
            message: sanitizedMessage,
            messageType: sanitizedMessageType,
            createdAt: new Date().toISOString(),
          });
        }
      } catch (ioErr) {
        console.error("Failed to emit Socket.IO updates:", ioErr);
        // Ignore real-time errors
      }
    } catch (notifyErr) {
      console.error("Failed to send notification to user:", notifyErr);
      // Don't fail the request if notification fails
    }

    return res.json({
      success: true,
      message: "Message sent successfully",
    });
  } catch (err: any) {
    console.error("Error sending owner message:", err);
    return res.status(500).json({ error: "Failed to send message" });
  }
}));

/**
 * POST /owner/group-stays/:id/accept
 * Owner formally accepts the group stay assignment
 * This confirms the owner's commitment to host the group
 */
router.post("/:id/accept", asyncHandler(async (req: Request, res: Response) => {
  res.setHeader("Content-Type", "application/json");
  
  const r = req as AuthedRequest;
  const ownerId = r.user?.id;
  
  if (!ownerId || typeof ownerId !== "number") {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const groupBookingId = Number(req.params.id);
  if (!groupBookingId || isNaN(groupBookingId) || groupBookingId <= 0) {
    return res.status(400).json({ error: "Invalid group stay ID" });
  }

  try {
    // Verify the group booking is assigned to this owner and has confirmed property
    const groupBooking = await prisma.groupBooking.findFirst({
      where: {
        id: groupBookingId,
        assignedOwnerId: ownerId,
        confirmedPropertyId: { not: null }, // Must have confirmed property
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        confirmedProperty: {
          select: { id: true, title: true, ownerId: true },
        },
        assignedOwner: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!groupBooking) {
      return res.status(404).json({ 
        error: "Group stay not found, not assigned to you, or property not confirmed yet" 
      });
    }

    // Verify owner matches property owner
    if (groupBooking.confirmedProperty?.ownerId !== ownerId) {
      return res.status(403).json({ 
        error: "You are not the owner of the confirmed property for this group stay" 
      });
    }

    // Check if already accepted (idempotent)
    // We'll use a status field or check if there's already an acceptance message/audit
    const existingAcceptance = await prisma.groupBookingAudit.findFirst({
      where: {
        groupBookingId: groupBookingId,
        action: "OWNER_ACCEPTED_ASSIGNMENT",
      },
    });

    if (existingAcceptance) {
      return res.status(400).json({ 
        error: "Assignment already accepted",
        alreadyAccepted: true 
      });
    }

    // Create audit log for acceptance
    const adminId = ownerId; // Using ownerId for audit tracking
    await prisma.groupBookingAudit.create({
      data: {
        groupBookingId: groupBookingId,
        adminId: adminId,
        action: "OWNER_ACCEPTED_ASSIGNMENT",
        description: `Owner accepted group stay assignment and committed to hosting the group`,
        metadata: {
          ownerId: ownerId,
          ownerName: groupBooking.assignedOwner?.name || groupBooking.assignedOwner?.email || null,
          propertyId: groupBooking.confirmedPropertyId,
          propertyTitle: groupBooking.confirmedProperty?.title || null,
          acceptedAt: new Date().toISOString(),
        },
      },
    });

    // Update booking status to indicate owner acceptance (if needed)
    // Status might already be CONFIRMED, but we can add a timestamp
    await prisma.groupBooking.update({
      where: { id: groupBookingId },
      data: {
        // Optionally update a field to track owner acceptance
        // For now, we'll just use the audit log
      },
    });

    // Notify customer that owner has accepted
    try {
      await notifyUser(groupBooking.userId, "group_stay_owner_accepted", {
        bookingId: groupBooking.id,
        ownerName: groupBooking.assignedOwner?.name || "Property Owner",
        propertyTitle: groupBooking.confirmedProperty?.title || "Property",
        status: groupBooking.status,
      });

      // Create notification for customer
      await prisma.notification.create({
        data: {
          userId: groupBooking.userId,
          ownerId: null,
          title: "Property Owner Has Accepted Your Group Stay",
          body: `${groupBooking.assignedOwner?.name || "The property owner"} has accepted your group stay assignment. They will contact you shortly with details about your stay.`,
          unread: true,
          type: "group_stay",
          meta: {
            type: "group_stay",
            bookingId: groupBooking.id,
            propertyId: groupBooking.confirmedPropertyId,
            status: groupBooking.status,
            ownerAccepted: true,
          },
        },
      });

      // Emit real-time notification
      try {
        const io = (req.app as any)?.get?.("io") || (global as any).io;
        if (io && typeof io.to === "function") {
          io.to(`user:${groupBooking.userId}`).emit("notification:new", {
            title: "Property Owner Has Accepted Your Group Stay",
            body: `${groupBooking.assignedOwner?.name || "The property owner"} has accepted your group stay assignment.`,
            type: "group_stay",
            bookingId: groupBooking.id,
          });
        }
      } catch (ioErr) {
        console.error("Failed to emit Socket.IO notification:", ioErr);
      }
    } catch (notifyErr) {
      console.error("Failed to notify customer:", notifyErr);
      // Don't fail the request if notification fails
    }

    return res.json({
      success: true,
      message: "Assignment accepted successfully",
      groupBooking: {
        id: groupBooking.id,
        status: groupBooking.status,
      },
    });
  } catch (err: any) {
    console.error("Error accepting group stay assignment:", err);
    return res.status(500).json({ error: "Failed to accept assignment" });
  }
}));

export default router;

