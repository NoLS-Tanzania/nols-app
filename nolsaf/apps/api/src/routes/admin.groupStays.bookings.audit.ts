/**
 * @fileoverview Group Booking Audit History API
 * @module routes/admin.groupStays.bookings.audit
 * 
 * Provides endpoints for tracking and retrieving audit history of admin actions on group bookings.
 */

import { Router } from "express";
import type { RequestHandler } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { prisma } from "@nolsaf/prisma";
import { notifyUser } from "../lib/notifications.js";
import { sanitizeText } from "../lib/sanitize.js";

export const router = Router();
router.use(requireAuth as unknown as RequestHandler, requireRole("ADMIN") as unknown as RequestHandler);

/**
 * GET /admin/group-stays/bookings/:id/audit
 * Get audit history for a group booking
 */
router.get("/:id/audit", async (req, res) => {
  try {
    const bookingId = Number(req.params.id);
    if (!bookingId || isNaN(bookingId)) {
      return res.status(400).json({ error: "Invalid booking ID" });
    }

    const audits = await (prisma as any).groupBookingAudit.findMany({
      where: { groupBookingId: bookingId },
      include: {
        admin: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json({
      items: audits,
      total: audits.length,
    });
  } catch (err: any) {
    console.error("Error in GET /admin/group-stays/bookings/:id/audit:", err);
    return res.status(500).json({ error: "Failed to load audit history" });
  }
});

/**
 * GET /admin/group-stays/bookings/:id/messages
 * Get all conversation messages for a group booking (admin view - includes internal messages)
 */
router.get("/:id/messages", async (req: any, res) => {
  try {
    const bookingId = Number(req.params.id);
    if (!bookingId || isNaN(bookingId)) {
      return res.status(400).json({ error: "Invalid booking ID" });
    }

    // Get all messages for this booking (admin can see all messages including internal)
    const messages = await (prisma as any).groupBookingMessage.findMany({
      where: {
        groupBookingId: bookingId,
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
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
      isInternal: m.isInternal || false,
    }));

    return res.json({
      success: true,
      messages: formattedMessages,
    });
  } catch (err: any) {
    console.error("Error in GET /admin/group-stays/bookings/:id/messages:", err);
    return res.status(500).json({ error: "Failed to load messages" });
  }
});

/**
 * POST /admin/group-stays/bookings/:id/message
 * Send a message to customer and log audit entry
 */
router.post("/:id/message", async (req: any, res) => {
  try {
    const bookingId = Number(req.params.id);
    const { message } = req.body;
    const adminId = req.user!.id;

    if (!bookingId || isNaN(bookingId)) {
      return res.status(400).json({ error: "Invalid booking ID" });
    }

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "Message is required" });
    }

    // Verify booking exists
    const booking = await (prisma as any).groupBooking.findUnique({
      where: { id: bookingId },
      select: { id: true, userId: true, status: true },
    });

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    // Get admin info for message sender
    const admin = await prisma.user.findUnique({
      where: { id: adminId },
      select: { id: true, name: true, email: true },
    });

    // Sanitize message content
    const sanitizedMessage = sanitizeText(message);
    const messageText = sanitizedMessage.toLowerCase();
    let newStatus: string | null = null;
    let statusChangeAction = "MESSAGE_SENT";
    let notificationTitle = "Group Stay Update";
    let notificationBody = message.trim();

    // Detect message type and determine status change
    if (messageText.includes("reviewing") || messageText.includes("currently reviewing") || messageText.includes("received your booking request")) {
      // Reviewing message - change from PENDING to REVIEWING
      if (booking.status === "PENDING") {
        newStatus = "REVIEWING";
        statusChangeAction = "STATUS_CHANGED_TO_REVIEWING";
        notificationTitle = "Your Group Stay is Under Review";
        notificationBody = "Thank you for your interest in using NoLSaf! We have received your booking request and our team is currently reviewing it. We will get back to you soon with accommodation options and pricing tailored to your group's needs.";
      }
    } else if (messageText.includes("processing") || messageText.includes("now processing") || messageText.includes("working on finding")) {
      // Processing message - change to PROCESSING
      if (booking.status === "PENDING" || booking.status === "REVIEWING") {
        newStatus = "PROCESSING";
        statusChangeAction = "STATUS_CHANGED_TO_PROCESSING";
        notificationTitle = "Your Group Stay is Being Processed";
        notificationBody = "Great news! We're now processing your group stay booking. Our team is working on finding the best accommodation options for your group. We'll contact you shortly with recommendations and pricing details.";
      }
    } else if (messageText.includes("confirmed") || messageText.includes("booking has been confirmed")) {
      // Confirmed message - change to CONFIRMED
      if (booking.status !== "CONFIRMED" && booking.status !== "COMPLETED") {
        newStatus = "CONFIRMED";
        statusChangeAction = "STATUS_CHANGED_TO_CONFIRMED";
        notificationTitle = "Your Group Stay is Confirmed";
        notificationBody = "Excellent! Your group stay booking has been confirmed. We've found suitable accommodation options for your group. Please review the recommendations we've sent and let us know if you'd like to proceed.";
      }
    }

    // Update booking status if needed
    if (newStatus && newStatus !== booking.status) {
      await (prisma as any).groupBooking.update({
        where: { id: bookingId },
        data: { status: newStatus },
      });

      // Create audit log for status change
      await (prisma as any).groupBookingAudit.create({
        data: {
          groupBookingId: bookingId,
          adminId,
          action: statusChangeAction,
          description: `Status changed from ${booking.status} to ${newStatus} via message`,
          metadata: {
            previousStatus: booking.status,
            newStatus: newStatus,
            message: message.trim(),
          },
        },
      });
    } else {
      // Create audit log entry for message only
      await (prisma as any).groupBookingAudit.create({
        data: {
          groupBookingId: bookingId,
          adminId,
          action: "MESSAGE_SENT",
          description: `Admin sent message to customer`,
          metadata: {
            message: sanitizedMessage,
            messageLength: sanitizedMessage.length,
          },
        },
      });
    }

    // Create message record in GroupBookingMessage table
    await (prisma as any).groupBookingMessage.create({
      data: {
        groupBookingId: bookingId,
        senderId: adminId,
        senderRole: "ADMIN",
        senderName: admin?.name || admin?.email || "Admin",
        messageType: statusChangeAction !== "MESSAGE_SENT" ? statusChangeAction : "Admin Response",
        body: sanitizedMessage,
        isInternal: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Send notification to user
    try {
      await notifyUser(booking.userId, "group_stay_update", {
        bookingId: booking.id,
        status: newStatus || booking.status,
        title: notificationTitle,
        body: notificationBody,
        message: sanitizedMessage,
      });

      // Also create a custom notification with the actual message
      await (prisma as any).notification.create({
        data: {
          userId: booking.userId,
          ownerId: null,
          title: notificationTitle,
          body: notificationBody,
          unread: true,
          meta: {
            type: "group_stay",
            bookingId: booking.id,
            status: newStatus || booking.status,
          },
          type: "group_stay",
        },
      });

      // Emit real-time notification and message update
      try {
        const io = (req.app as any)?.get?.("io") || (global as any).io;
        if (io && typeof io.to === "function") {
          // Emit notification
          io.to(`user:${booking.userId}`).emit("notification:new", {
            title: notificationTitle,
            body: notificationBody,
            type: "group_stay",
            bookingId: booking.id,
          });
          
          // Emit new message event
          io.to(`user:${booking.userId}`).emit('group-booking:message:new', {
            groupBookingId: bookingId,
            senderRole: 'ADMIN',
            message: sanitizedMessage,
            messageType: statusChangeAction !== "MESSAGE_SENT" ? statusChangeAction : "Admin Response",
            createdAt: new Date().toISOString(),
          });
          
          // Also emit to admin room
          io.to('admin').emit('group-booking:message:new', {
            groupBookingId: bookingId,
            senderRole: 'ADMIN',
            message: sanitizedMessage,
            messageType: statusChangeAction !== "MESSAGE_SENT" ? statusChangeAction : "Admin Response",
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
      message: "Message sent and logged",
      statusChanged: !!newStatus,
      newStatus: newStatus || undefined,
    });
  } catch (err: any) {
    console.error("Error in POST /admin/group-stays/bookings/:id/message:", err);
    return res.status(500).json({ error: "Failed to send message" });
  }
});

export default router;

