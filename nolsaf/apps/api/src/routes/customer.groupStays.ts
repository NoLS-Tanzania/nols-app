import { Router } from "express";
import type { RequestHandler } from "express";
import { prisma } from "@nolsaf/prisma";
import { AuthedRequest, requireAuth } from "../middleware/auth.js";
import { limitPlanRequestMessages } from "../middleware/rateLimit.js";
import { sanitizeText } from "../lib/sanitize.js";

export const router = Router();
router.use(requireAuth as RequestHandler);

/**
 * GET /api/customer/group-stays
 * Get all group stay bookings for the authenticated customer
 * Query params: status, page, pageSize
 */
router.get("/", async (req: AuthedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { status, page = "1", pageSize = "20" } = req.query as any;
    
    const where: any = { userId };
    
    // Apply status filter if provided
    if (status) {
      where.status = String(status);
    }
    // Note: We return all bookings (including PENDING) so frontend can:
    // 1. Calculate accurate counts for filter buttons
    // 2. Show PENDING in "Pending" filter
    // 3. Hide PENDING from "All" filter (handled on frontend)
    // This matches Plan With Us pattern - visibility is controlled on frontend

    const pageNum = Number(page);
    const pageSizeNum = Number(pageSize);
    const skip = (pageNum - 1) * pageSizeNum;

    const [groupBookings, total] = await Promise.all([
      prisma.groupBooking.findMany({
        where,
        include: {
          passengers: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              nationality: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSizeNum,
      }),
      prisma.groupBooking.count({ where }),
    ]);

    const now = new Date();
    const groupStaysWithValidity = groupBookings.map((gb) => {
      const checkOut = gb.checkOut ? new Date(gb.checkOut) : null;
      // For PENDING bookings, they're still valid (waiting for admin review)
      // For other bookings, check if checkout date hasn't passed and not canceled
      const isValid = gb.status === "PENDING" 
        ? true 
        : checkOut 
          ? checkOut >= now && gb.status !== "CANCELED" 
          : gb.status !== "CANCELED" && gb.status !== "COMPLETED";
      
      // Format passengers to match frontend expectations
      const formattedPassengers = gb.passengers?.map((p) => ({
        id: p.id,
        name: `${p.firstName} ${p.lastName}`.trim(),
        phone: p.phone,
        nationality: p.nationality,
      })) || [];
      
      // Calculate number of guests from passengers or headcount
      const numberOfGuests = formattedPassengers.length > 0 
        ? formattedPassengers.length 
        : (gb.headcount || 0);
      
      // Create a mock arrangement object for compatibility with frontend
      // Since group bookings don't have arrangements initially, we'll use booking data
      const destinationTitle = gb.toLocation 
        ? `${gb.toLocation}${gb.toWard ? `, ${gb.toWard}` : ''}${gb.toDistrict ? `, ${gb.toDistrict}` : ''}`
        : gb.toRegion || "Group Stay";
      
      // Parse admin notes/suggestions if available
      let adminSuggestions = null;
      if (gb.adminNotes) {
        try {
          adminSuggestions = typeof gb.adminNotes === 'string' 
            ? JSON.parse(gb.adminNotes) 
            : gb.adminNotes;
        } catch (e) {
          // If parsing fails, treat as plain text
          adminSuggestions = { notes: gb.adminNotes };
        }
      }
      
      return {
        id: gb.id,
        arrangement: {
          id: gb.id, // Use booking ID as arrangement ID
          property: {
            id: 0, // No property assigned yet for pending bookings
            title: destinationTitle,
            type: gb.accommodationType || "Group Accommodation",
            regionName: gb.toRegion,
            district: gb.toDistrict,
            city: gb.toWard,
          },
        },
        checkIn: gb.checkIn,
        checkOut: gb.checkOut,
        status: gb.status,
        totalAmount: gb.totalAmount,
        numberOfGuests,
        passengers: formattedPassengers,
        isValid,
        createdAt: gb.createdAt,
        updatedAt: gb.updatedAt,
        adminSuggestions, // Include admin suggestions/messages
      };
    });

    return res.json({
      items: groupStaysWithValidity,
      total,
      page: pageNum,
      pageSize: pageSizeNum,
    });
  } catch (error: any) {
    console.error("GET /customer/group-stays error:", error);
    return res.status(500).json({ error: "Failed to fetch group stays" });
  }
});

/**
 * POST /api/customer/group-stays/:id/message
 * Send a follow-up message for a group booking
 * Uses new GroupBookingMessage model for proper conversation storage
 */
router.post("/:id/message", limitPlanRequestMessages, (async (req: AuthedRequest, res) => {
  try {
    const userId = req.user!.id;
    const bookingId = parseInt(String(req.params.id), 10);
    const { messageType, message } = req.body || {};

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: "Message is required" });
    }

    // Get user info for verification and display
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, phone: true },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Verify the group booking belongs to this user
    const groupBooking = await (prisma as any).groupBooking.findFirst({
      where: {
        id: bookingId,
        userId: userId,
      },
    });

    if (!groupBooking) {
      return res.status(404).json({ error: "Group booking not found or access denied" });
    }

    // Sanitize message content to prevent XSS
    const sanitizedMessage = sanitizeText(message);
    const sanitizedMessageType = messageType ? sanitizeText(messageType) : "General";

    // Create message record in GroupBookingMessage table
    await (prisma as any).groupBookingMessage.create({
      data: {
        groupBookingId: bookingId,
        senderId: userId,
        senderRole: "USER",
        senderName: user.name || user.email || "User",
        messageType: sanitizedMessageType,
        body: sanitizedMessage,
        isInternal: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Also update the group booking's updatedAt timestamp
    await (prisma as any).groupBooking.update({
      where: { id: bookingId },
      data: {
        updatedAt: new Date(),
      },
    });

    // Create audit log entry
    try {
      await (prisma as any).groupBookingAudit.create({
        data: {
          groupBookingId: bookingId,
          adminId: userId, // User is acting as the sender
          action: "CUSTOMER_MESSAGE_SENT",
          description: `Customer sent a message: ${sanitizedMessageType}`,
          metadata: {
            messageType: sanitizedMessageType,
            messageLength: sanitizedMessage.length,
          },
          createdAt: new Date(),
        },
      });
    } catch (auditError) {
      console.error("Failed to create audit log for customer message:", auditError);
      // Don't fail the request if audit logging fails
    }

    // Emit real-time update via Socket.IO (non-blocking)
    try {
      const io = (req.app as any)?.get?.("io") || (global as any).io;
      if (io && typeof io.emit === 'function') {
        // Emit new message event to user room
        io.to(`user:${userId}`).emit('group-booking:message:new', {
          groupBookingId: bookingId,
          senderRole: 'USER',
          message: sanitizedMessage,
          messageType: sanitizedMessageType,
          createdAt: new Date().toISOString(),
        });
        
        // Emit to admin room so admins see new messages
        io.to('admin').emit('group-booking:message:new', {
          groupBookingId: bookingId,
          senderRole: 'USER',
          message: sanitizedMessage,
          messageType: sanitizedMessageType,
          createdAt: new Date().toISOString(),
        });
      }
    } catch (socketError: any) {
      console.error("Failed to emit Socket.IO message update:", socketError);
      // Don't fail the request if socket fails
    }

    console.log(`Follow-up message sent for group booking ${bookingId} by user ${userId}`);

    return res.json({
      success: true,
      message: "Message sent successfully",
    });
  } catch (error: any) {
    console.error("POST /customer/group-stays/:id/message error:", error);
    return res.status(500).json({ error: "Failed to send message" });
  }
}) as RequestHandler);

/**
 * GET /api/customer/group-stays/:id/messages
 * Get conversation messages for a group booking (for authenticated customer)
 */
router.get("/:id/messages", (async (req: AuthedRequest, res) => {
  try {
    const userId = req.user!.id;
    const bookingId = parseInt(String(req.params.id), 10);

    // Verify the group booking belongs to this user
    const groupBooking = await (prisma as any).groupBooking.findFirst({
      where: {
        id: bookingId,
        userId: userId,
      },
    });

    if (!groupBooking) {
      return res.status(404).json({ error: "Group booking not found or access denied" });
    }

    // Get all messages for this booking (excluding internal admin notes)
    const messages = await (prisma as any).groupBookingMessage.findMany({
      where: {
        groupBookingId: bookingId,
        isInternal: false, // Only show messages visible to customers
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Format messages for frontend
    const formattedMessages = messages.map((m: any) => ({
      id: m.id,
      messageType: m.messageType || 'General',
      message: m.body,
      senderRole: m.senderRole,
      senderName: m.senderName || m.sender?.name || 'Unknown',
      createdAt: m.createdAt,
      formattedDate: new Date(m.createdAt).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    }));

    return res.json({
      success: true,
      messages: formattedMessages,
    });
  } catch (error: any) {
    console.error("GET /customer/group-stays/:id/messages error:", error);
    return res.status(500).json({ error: "Failed to load messages" });
  }
}) as RequestHandler);

export default router;
