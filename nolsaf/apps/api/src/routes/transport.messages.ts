import { Router, type Response } from "express";
import type { RequestHandler } from "express";
import { prisma } from "@nolsaf/prisma";
import { AuthedRequest, requireAuth } from "../middleware/auth.js";
import { z } from "zod";
import { sanitizeText } from "../lib/sanitize.js";
import { audit } from "../lib/audit.js";

export const router = Router();

// All routes require authentication
router.use(requireAuth as RequestHandler);

/**
 * POST /api/transport-bookings/:id/messages
 * Send a message in a transport booking conversation
 * Body: { message: string, messageType?: "TEXT" | "IMAGE" | "LOCATION" | "SYSTEM" }
 */
router.post("/:id/messages", (async (req: AuthedRequest, res: Response) => {
  try {
    const user = req.user!;
    const bookingId = Number(req.params.id);
    
    if (!Number.isFinite(bookingId)) {
      res.status(400).json({ error: "Invalid booking ID" });
      return;
    }

    // Validate request body
    const schema = z.object({
      message: z.string().min(1).max(5000),
      messageType: z.enum(["TEXT", "IMAGE", "LOCATION", "SYSTEM"]).optional().default("TEXT"),
    });

    const body = schema.parse(req.body);
    const sanitizedMessage = sanitizeText(body.message);

    // Verify booking exists and user has access
    const booking = await prisma.transportBooking.findUnique({
      where: { id: bookingId },
      include: {
        user: { select: { id: true } },
        driver: { select: { id: true } },
      },
    });

    if (!booking) {
      res.status(404).json({ error: "Transport booking not found" });
      return;
    }

    // Verify user is driver, passenger, or admin
    const isPassenger = booking.userId === user.id;
    const isDriver = booking.driverId === user.id;
    const isAdmin = user.role === "ADMIN";

    if (!isPassenger && !isDriver && !isAdmin) {
      res.status(403).json({ error: "Unauthorized to send messages for this booking" });
      return;
    }

    // Determine sender type
    let senderType: "DRIVER" | "PASSENGER" | "ADMIN";
    if (isAdmin) {
      senderType = "ADMIN";
    } else if (isDriver) {
      senderType = "DRIVER";
    } else {
      senderType = "PASSENGER";
    }

    // Create message
    const message = await prisma.transportMessage.create({
      data: {
        transportBookingId: bookingId,
        senderId: user.id,
        senderType,
        message: sanitizedMessage,
        messageType: body.messageType,
      },
      include: {
        transportBooking: {
          select: {
            id: true,
            userId: true,
            driverId: true,
          },
        },
      },
    });

    // Audit log for message creation
    try {
      await audit(req, "TRANSPORT_MESSAGE_SENT", `transport-booking:${bookingId}`, null, {
        messageId: message.id,
        senderType,
        messageLength: sanitizedMessage.length,
        messageType: body.messageType,
      });
    } catch (auditError) {
      console.warn("Failed to create audit log for transport message:", auditError);
      // Don't fail the request if audit logging fails
    }

    // Emit real-time event via Socket.IO
    try {
      const io = (req.app && (req.app as any).get && (req.app as any).get("io")) || (global as any).io;
      if (io && typeof io.to === "function") {
        // Notify passenger
        if (booking.userId) {
          io.to(`user:${booking.userId}`).emit("transport:message:new", {
            bookingId,
            message: {
              id: message.id,
              message: message.message,
              senderType: message.senderType,
              senderId: message.senderId,
              createdAt: message.createdAt,
            },
          });
        }
        // Notify driver
        if (booking.driverId) {
          io.to(`driver:${booking.driverId}`).emit("transport:message:new", {
            bookingId,
            message: {
              id: message.id,
              message: message.message,
              senderType: message.senderType,
              senderId: message.senderId,
              createdAt: message.createdAt,
            },
          });
        }
        // Notify admins (if admin sent message, notify other admins)
        if (isAdmin) {
          io.to("admin:all").emit("transport:message:new", {
            bookingId,
            message: {
              id: message.id,
              message: message.message,
              senderType: message.senderType,
              senderId: message.senderId,
              createdAt: message.createdAt,
            },
          });
        }
      }
    } catch (socketError) {
      console.warn("Failed to emit socket event:", socketError);
      // Don't fail the request if socket fails
    }

    res.status(201).json({
      id: message.id,
      message: message.message,
      senderType: message.senderType,
      senderId: message.senderId,
      messageType: message.messageType,
      createdAt: message.createdAt,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid request", details: error.issues });
      return;
    }
    console.error("POST /transport-bookings/:id/messages error:", error);
    res.status(500).json({ error: "Failed to send message" });
  }
}) as RequestHandler);

/**
 * GET /api/transport-bookings/:id/messages
 * Get all messages for a transport booking
 * Query: ?page=1&pageSize=50&unreadOnly=false
 */
router.get("/:id/messages", (async (req: AuthedRequest, res: Response) => {
  try {
    const user = req.user!;
    const bookingId = Number(req.params.id);
    const { page = "1", pageSize = "50", unreadOnly = "false" } = req.query as any;

    if (!Number.isFinite(bookingId)) {
      res.status(400).json({ error: "Invalid booking ID" });
      return;
    }

    // Verify booking exists and user has access
    const booking = await prisma.transportBooking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        userId: true,
        driverId: true,
      },
    });

    if (!booking) {
      res.status(404).json({ error: "Transport booking not found" });
      return;
    }

    // Verify user is driver, passenger, or admin
    const isPassenger = booking.userId === user.id;
    const isDriver = booking.driverId === user.id;
    const isAdmin = user.role === "ADMIN";

    if (!isPassenger && !isDriver && !isAdmin) {
      res.status(403).json({ error: "Unauthorized to view messages for this booking" });
      return;
    }

    const pageNum = Number(page);
    const pageSizeNum = Math.min(Number(pageSize), 100);
    const skip = (pageNum - 1) * pageSizeNum;

    const where: any = {
      transportBookingId: bookingId,
    };

    if (unreadOnly === "true") {
      where.readAt = null;
      // Only show unread messages not sent by current user
      where.NOT = {
        senderId: user.id,
      };
    }

    const [messages, total] = await Promise.all([
      prisma.transportMessage.findMany({
        where,
        orderBy: { createdAt: "asc" },
        skip,
        take: pageSizeNum,
        include: {
          transportBooking: {
            select: {
              id: true,
              userId: true,
              driverId: true,
            },
          },
        },
      }),
      prisma.transportMessage.count({ where }),
    ]);

    res.json({
      items: messages.map((msg) => ({
        id: msg.id,
        message: msg.message,
        senderType: msg.senderType,
        senderId: msg.senderId,
        messageType: msg.messageType,
        readAt: msg.readAt,
        createdAt: msg.createdAt,
      })),
      total,
      page: pageNum,
      pageSize: pageSizeNum,
    });
  } catch (error: any) {
    console.error("GET /transport-bookings/:id/messages error:", error);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
}) as RequestHandler);

/**
 * POST /api/transport-bookings/:id/messages/:messageId/read
 * Mark a message as read
 */
router.post("/:id/messages/:messageId/read", (async (req: AuthedRequest, res: Response) => {
  try {
    const user = req.user!;
    const bookingId = Number(req.params.id);
    const messageId = Number(req.params.messageId);

    if (!Number.isFinite(bookingId) || !Number.isFinite(messageId)) {
      res.status(400).json({ error: "Invalid booking or message ID" });
      return;
    }

    // Verify booking exists and user has access
    const booking = await prisma.transportBooking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        userId: true,
        driverId: true,
      },
    });

    if (!booking) {
      res.status(404).json({ error: "Transport booking not found" });
      return;
    }

    // Verify user is driver, passenger, or admin
    const isPassenger = booking.userId === user.id;
    const isDriver = booking.driverId === user.id;
    const isAdmin = user.role === "ADMIN";

    if (!isPassenger && !isDriver && !isAdmin) {
      res.status(403).json({ error: "Unauthorized" });
      return;
    }

    // Verify message exists and belongs to booking
    const message = await prisma.transportMessage.findFirst({
      where: {
        id: messageId,
        transportBookingId: bookingId,
      },
    });

    if (!message) {
      res.status(404).json({ error: "Message not found" });
      return;
    }

    // Only mark as read if not already read and not sent by current user
    if (!message.readAt && message.senderId !== user.id) {
      await prisma.transportMessage.update({
        where: { id: messageId },
        data: { readAt: new Date() },
      });
    }

    res.json({ ok: true });
  } catch (error: any) {
    console.error("POST /transport-bookings/:id/messages/:messageId/read error:", error);
    res.status(500).json({ error: "Failed to mark message as read" });
  }
}) as RequestHandler);

/**
 * POST /api/transport-bookings/:id/messages/read-all
 * Mark all unread messages in a booking as read
 */
router.post("/:id/messages/read-all", (async (req: AuthedRequest, res: Response) => {
  try {
    const user = req.user!;
    const bookingId = Number(req.params.id);

    if (!Number.isFinite(bookingId)) {
      res.status(400).json({ error: "Invalid booking ID" });
      return;
    }

    // Verify booking exists and user has access
    const booking = await prisma.transportBooking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        userId: true,
        driverId: true,
      },
    });

    if (!booking) {
      res.status(404).json({ error: "Transport booking not found" });
      return;
    }

    // Verify user is driver, passenger, or admin
    const isPassenger = booking.userId === user.id;
    const isDriver = booking.driverId === user.id;
    const isAdmin = user.role === "ADMIN";

    if (!isPassenger && !isDriver && !isAdmin) {
      res.status(403).json({ error: "Unauthorized" });
      return;
    }

    // Mark all unread messages (not sent by current user) as read
    const result = await prisma.transportMessage.updateMany({
      where: {
        transportBookingId: bookingId,
        readAt: null,
        NOT: {
          senderId: user.id,
        },
      },
      data: {
        readAt: new Date(),
      },
    });

    res.json({ ok: true, count: result.count });
  } catch (error: any) {
    console.error("POST /transport-bookings/:id/messages/read-all error:", error);
    res.status(500).json({ error: "Failed to mark messages as read" });
  }
}) as RequestHandler);

export default router;


