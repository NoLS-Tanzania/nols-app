import { Router, RequestHandler } from "express";
import { prisma } from "@nolsaf/prisma";
import { requireAuth, requireRole, AuthedRequest } from "../middleware/auth.js";

export const router = Router();
router.use(requireAuth as unknown as RequestHandler, requireRole("ADMIN") as unknown as RequestHandler);

/**
 * GET /admin/drivers/level-messages
 * Get all driver level messages
 */
router.get("/", async (req, res) => {
  try {
    // Fetch messages from AdminAudit where action is DRIVER_LEVEL_MESSAGE
    let messages: any[] = [];

    try {
      if ((prisma as any).adminAudit) {
        const audits = await (prisma as any).adminAudit.findMany({
          where: {
            action: "DRIVER_LEVEL_MESSAGE",
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 100,
        });

        // Group by driver and get latest message per driver
        const driverMessages = new Map<number, any>();

        for (const audit of audits) {
          const driverId = audit.targetUserId || audit.performedBy;
          if (!driverMessages.has(driverId)) {
            // Get driver info
            const driver = await prisma.user.findUnique({
              where: { id: driverId },
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            });

            if (driver) {
              const details = audit.details as any;
              driverMessages.set(driverId, {
                id: audit.id,
                driverId: driver.id,
                driverName: driver.name || driver.email || `Driver ${driver.id}`,
                driverEmail: driver.email || "",
                driverPhone: driver.phone,
                message: details?.message || "",
                status: "PENDING", // Default status
                createdAt: audit.createdAt,
                responses: [],
              });
            }
          }
        }

        messages = Array.from(driverMessages.values());
      }
    } catch (e) {
      console.warn("Failed to fetch level messages from audit", e);
    }

    return res.json({ messages });
  } catch (err: any) {
    console.error("Failed to fetch driver level messages", err);
    return res.status(500).json({ error: "Failed to fetch messages", message: err.message });
  }
});

/**
 * POST /admin/drivers/level-messages/:id/respond
 * Respond to a driver level message
 */
router.post("/:id/respond", async (req, res) => {
  try {
    const messageId = Number(req.params.id);
    const { message } = req.body;
    const admin = (req as AuthedRequest).user!;

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return res.status(400).json({ error: "Message is required" });
    }

    // Get the original message
    let originalMessage: any = null;
    try {
      if ((prisma as any).adminAudit) {
        originalMessage = await (prisma as any).adminAudit.findUnique({
          where: { id: messageId },
        });
      }
    } catch (e) {
      console.warn("Failed to find original message", e);
    }

    if (!originalMessage) {
      return res.status(404).json({ error: "Message not found" });
    }

    const driverId = originalMessage.targetUserId || originalMessage.performedBy;

    // Create response audit entry
    try {
      if ((prisma as any).adminAudit) {
        await (prisma as any).adminAudit.create({
          data: {
            action: "DRIVER_LEVEL_MESSAGE_RESPONSE",
            performedBy: admin.id,
            targetUserId: driverId,
            details: {
              originalMessageId: messageId,
              message: message.trim(),
              adminName: admin.name || admin.email || "Admin",
              timestamp: new Date().toISOString(),
            } as any,
          },
        });
      }
    } catch (e) {
      console.warn("Failed to create response audit", e);
    }

    // Emit Socket.IO notification to driver
    const app = (req as any).app;
    const io = app?.get("io");
    if (io && typeof io.emit === "function") {
      io.to(`driver:${driverId}`).emit("admin-level-message-response", {
        messageId,
        response: message.trim(),
        adminName: admin.name || admin.email || "Admin",
        timestamp: new Date().toISOString(),
      });
    }

    return res.json({ success: true, message: "Response sent successfully" });
  } catch (err: any) {
    console.error("Failed to send response", err);
    return res.status(500).json({ error: "Failed to send response", message: err.message });
  }
});

/**
 * POST /admin/drivers/level-messages/:id/resolve
 * Mark a message as resolved
 */
router.post("/:id/resolve", async (req, res) => {
  try {
    const messageId = Number(req.params.id);

    // Update message status (you can add a status field to AdminAudit or use a separate table)
    // For now, we'll create a resolution audit entry
    try {
      if ((prisma as any).adminAudit) {
        const originalMessage = await (prisma as any).adminAudit.findUnique({
          where: { id: messageId },
        });

        if (originalMessage) {
          const admin = (req as AuthedRequest).user!;
          const driverId = originalMessage.targetUserId || originalMessage.performedBy;

          await (prisma as any).adminAudit.create({
            data: {
              action: "DRIVER_LEVEL_MESSAGE_RESOLVED",
              performedBy: admin.id,
              targetUserId: driverId,
              details: {
                originalMessageId: messageId,
                resolvedBy: admin.name || admin.email || "Admin",
                timestamp: new Date().toISOString(),
              } as any,
            },
          });
        }
      }
    } catch (e) {
      console.warn("Failed to mark message as resolved", e);
    }

    return res.json({ success: true, message: "Message marked as resolved" });
  } catch (err: any) {
    console.error("Failed to resolve message", err);
    return res.status(500).json({ error: "Failed to resolve message", message: err.message });
  }
});

export default router;

