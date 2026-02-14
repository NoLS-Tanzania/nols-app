import { Router } from "express";
import type { RequestHandler } from "express";
import { prisma } from "@nolsaf/prisma";
import { AuthedRequest, requireAuth } from "../middleware/auth.js";
import { sanitizeText } from "../lib/sanitize.js";
import { limitPlanRequestMessages } from "../middleware/rateLimit.js";

export const router = Router();
router.use(requireAuth as RequestHandler);

/**
 * GET /api/customer/plan-requests
 * Get all plan-with-us requests for the authenticated customer
 * Query params: status, page, pageSize
 * 
 * OPTIMIZED: Uses userId foreign key for efficient database queries
 * Falls back to email/phone matching for legacy requests without userId
 */
router.get("/", (async (req: AuthedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { status, page = "1", pageSize = "20" } = req.query as any;
    
    // Get user's email/phone for fallback matching
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, phone: true },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const normalizeEmail = (v?: string | null) => (v ? v.trim().toLowerCase() : null);
    const phoneDigits = (v?: string | null) => (v ? v.replace(/\D/g, "") : "");
    const phoneTail = (digits: string, n: number) => (digits.length >= n ? digits.slice(-n) : "");

    const emailRaw = user.email || null;
    const emailNormalized = normalizeEmail(emailRaw);
    const phoneRaw = user.phone || null;
    const phoneDigitsRaw = phoneDigits(phoneRaw);
    const phoneLast9 = phoneTail(phoneDigitsRaw, 9);
    const phoneLast10 = phoneTail(phoneDigitsRaw, 10);

    // Build efficient query: primary match by userId, fallback to email/phone for legacy requests
    // NOTE: legacy requests may have normalized email/phone (or not), so include variants.
    const whereClause: any = {
      OR: [{ userId }],
    };

    const orConditions: any[] = [];
    if (emailRaw) orConditions.push({ email: emailRaw });
    if (emailNormalized && emailNormalized !== emailRaw) orConditions.push({ email: emailNormalized });

    if (phoneRaw) orConditions.push({ phone: phoneRaw });
    if (phoneDigitsRaw) orConditions.push({ phone: phoneDigitsRaw });
    // Heuristic match: last digits catch 0xxx vs 255xxx vs +255xxx formatting.
    if (phoneLast9) orConditions.push({ phone: { endsWith: phoneLast9 } });
    if (phoneLast10) orConditions.push({ phone: { endsWith: phoneLast10 } });

    if (orConditions.length > 0) {
      whereClause.OR.push(...orConditions);
    }
    
    // Apply status filter if provided
    if (status) {
      whereClause.status = String(status);
    }

    // Apply pagination
    const pageNum = Number(page);
    const pageSizeNum = Number(pageSize);
    const skip = (pageNum - 1) * pageSizeNum;
    
    // Use database query instead of fetching all and filtering in memory
    const [paginatedRequests, totalCount] = await Promise.all([
      (prisma as any).planRequest.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSizeNum,
      }),
      (prisma as any).planRequest.count({
        where: whereClause,
      }),
    ]);
    
    console.log('Plan request query results:', {
      userId,
      matchingCount: totalCount,
      paginatedCount: paginatedRequests.length,
      page: pageNum,
      pageSize: pageSizeNum,
    });

    const now = new Date();
    const requestsWithValidity = paginatedRequests.map((r: any) => {
      const dateTo = r.dateTo ? new Date(r.dateTo) : null;
      const isValid = dateTo ? dateTo >= now && r.status !== "COMPLETED" && r.status !== "CANCELED" : r.status !== "COMPLETED" && r.status !== "CANCELED";
      
      return {
        id: r.id,
        role: r.role || "Other",
        tripType: r.tripType || "Other",
        destinations: r.destinations || null,
        dateFrom: r.dateFrom || null,
        dateTo: r.dateTo || null,
        groupSize: r.groupSize || null,
        budget: r.budget ? Number(r.budget) : null,
        notes: r.notes || null,
        status: r.status || "NEW",
        transportRequired: r.transportRequired || false,
        vehicleType: r.vehicleType || null,
        pickupLocation: r.pickupLocation || null,
        dropoffLocation: r.dropoffLocation || null,
        vehiclesNeeded: r.vehiclesNeeded || null,
        passengerCount: r.passengerCount || null,
        adminResponse: r.adminResponse || null,
        suggestedItineraries: r.suggestedItineraries || null,
        requiredPermits: r.requiredPermits || null,
        estimatedTimeline: r.estimatedTimeline || null,
        assignedAgent: r.assignedAgent || null,
        respondedAt: r.respondedAt || null,
        isValid,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      };
    });

    return res.json({
      items: requestsWithValidity,
      total: totalCount,
      page: pageNum,
      pageSize: pageSizeNum,
    });
  } catch (error: any) {
    console.error("GET /customer/plan-requests error:", error);
    return res.status(500).json({ error: "Failed to fetch plan requests" });
  }
}) as RequestHandler);

/**
 * POST /api/customer/plan-requests/:id/claim
 * Attach a plan request to the currently authenticated user.
 *
 * Why: Some legacy submissions may not have userId set (or may have email/phone formatting differences).
 * This endpoint lets a logged-in user reliably “claim” their own request so it appears in /account/event-plans.
 */
router.post("/:id/claim", (async (req: AuthedRequest, res) => {
  try {
    const userId = req.user!.id;
    const requestId = parseInt(String(req.params.id), 10);

    if (!Number.isFinite(requestId)) {
      return res.status(400).json({ error: "Invalid request id" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, phone: true },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const normalizeEmail = (v?: string | null) => (v ? v.trim().toLowerCase() : null);
    const phoneDigits = (v?: string | null) => (v ? v.replace(/\D/g, "") : "");
    const phoneTail = (digits: string, n: number) => (digits.length >= n ? digits.slice(-n) : "");

    const emailRaw = user.email || null;
    const emailNormalized = normalizeEmail(emailRaw);
    const phoneRaw = user.phone || null;
    const phoneDigitsRaw = phoneDigits(phoneRaw);
    const phoneLast9 = phoneTail(phoneDigitsRaw, 9);
    const phoneLast10 = phoneTail(phoneDigitsRaw, 10);

    if (!emailRaw && !phoneRaw) {
      return res.status(400).json({ error: "Your account has no email/phone to verify this request" });
    }

    const whereClause: any = {
      id: requestId,
      OR: [{ userId }],
    };

    const orConditions: any[] = [];
    if (emailRaw) orConditions.push({ email: emailRaw });
    if (emailNormalized && emailNormalized !== emailRaw) orConditions.push({ email: emailNormalized });
    if (phoneRaw) orConditions.push({ phone: phoneRaw });
    if (phoneDigitsRaw) orConditions.push({ phone: phoneDigitsRaw });
    if (phoneLast9) orConditions.push({ phone: { endsWith: phoneLast9 } });
    if (phoneLast10) orConditions.push({ phone: { endsWith: phoneLast10 } });
    if (orConditions.length > 0) {
      whereClause.OR.push(...orConditions);
    }

    const planRequest = await (prisma as any).planRequest.findFirst({
      where: whereClause,
      select: { id: true, userId: true },
    });

    if (!planRequest) {
      return res.status(404).json({ error: "Plan request not found or access denied" });
    }

    if (planRequest.userId && planRequest.userId !== userId) {
      return res.status(409).json({ error: "This request is already linked to another account" });
    }

    await (prisma as any).planRequest.update({
      where: { id: requestId },
      data: {
        userId,
        updatedAt: new Date(),
      },
    });

    return res.json({ success: true });
  } catch (error: any) {
    console.error("POST /customer/plan-requests/:id/claim error:", error);
    return res.status(500).json({ error: "Failed to claim plan request" });
  }
}) as RequestHandler);

/**
 * POST /api/customer/plan-requests/:id/follow-up
 * Send a follow-up message for a plan request
 * Uses new PlanRequestMessage model for proper conversation storage
 */
router.post("/:id/follow-up", limitPlanRequestMessages, (async (req: AuthedRequest, res) => {
  try {
    const authed = req.user;
    if (!authed || typeof authed.id !== "number" || !Number.isFinite(authed.id) || authed.id <= 0) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const userId = authed.id;
    const requestId = parseInt(String(req.params.id), 10);
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

    const normalizeEmail = (v?: string | null) => (v ? v.trim().toLowerCase() : null);
    const phoneDigits = (v?: string | null) => (v ? v.replace(/\D/g, "") : "");
    const phoneTail = (digits: string, n: number) => (digits.length >= n ? digits.slice(-n) : "");

    const emailRaw = user.email || null;
    const emailNormalized = normalizeEmail(emailRaw);
    const phoneRaw = user.phone || null;
    const phoneDigitsRaw = phoneDigits(phoneRaw);
    const phoneLast9 = phoneTail(phoneDigitsRaw, 9);
    const phoneLast10 = phoneTail(phoneDigitsRaw, 10);

    // Verify the plan request belongs to this user (efficient query using userId or robust email/phone fallback)
    const whereClause: any = {
      id: requestId,
      OR: [{ userId }],
    };

    const orConditions: any[] = [];
    if (emailRaw) orConditions.push({ email: emailRaw });
    if (emailNormalized && emailNormalized !== emailRaw) orConditions.push({ email: emailNormalized });
    if (phoneRaw) orConditions.push({ phone: phoneRaw });
    if (phoneDigitsRaw) orConditions.push({ phone: phoneDigitsRaw });
    if (phoneLast9) orConditions.push({ phone: { endsWith: phoneLast9 } });
    if (phoneLast10) orConditions.push({ phone: { endsWith: phoneLast10 } });

    if (orConditions.length > 0) {
      whereClause.OR.push(...orConditions);
    }
    
    const planRequest = await (prisma as any).planRequest.findFirst({
      where: whereClause,
    });

    if (!planRequest) {
      return res.status(404).json({ error: "Plan request not found or access denied" });
    }

    // Sanitize message content to prevent XSS
    const sanitizedMessage = sanitizeText(message);
    const sanitizedMessageType = messageType ? sanitizeText(messageType) : "General";

    // Create message record in new PlanRequestMessage table
    await (prisma as any).planRequestMessage.create({
      data: {
        planRequestId: requestId,
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

    // Also update the plan request's updatedAt timestamp
    await (prisma as any).planRequest.update({
      where: { id: requestId },
      data: {
        updatedAt: new Date(),
      },
    });

    // Emit real-time update via Socket.IO (non-blocking)
    try {
      const io = (req.app as any)?.get?.("io") || (global as any).io;
      if (io && typeof io.emit === 'function') {
        // Emit new message event to user room
        io.to(`user:${userId}`).emit('plan-request:message:new', {
          planRequestId: requestId,
          senderRole: 'USER',
          message: sanitizedMessage,
          createdAt: new Date().toISOString(),
        });
        
        // Emit to admin room so admins see new messages
        io.to('admin').emit('plan-request:message:new', {
          planRequestId: requestId,
          senderRole: 'USER',
          message: sanitizedMessage,
          createdAt: new Date().toISOString(),
        });
      }
    } catch (socketError: any) {
      console.error("Failed to emit Socket.IO message update:", socketError);
      // Don't fail the request if socket fails
    }

    console.log(`Follow-up message sent for plan request ${requestId} by user ${userId}`);

    return res.json({
      success: true,
      message: "Follow-up message sent successfully",
    });
  } catch (error: any) {
    console.error("POST /customer/plan-requests/:id/follow-up error:", error);
    return res.status(500).json({ error: "Failed to send follow-up message" });
  }
}) as RequestHandler);

/**
 * GET /api/customer/plan-requests/:id/messages
 * Get conversation messages for a plan request (for authenticated customer)
 */
router.get("/:id/messages", (async (req: AuthedRequest, res) => {
  try {
    const userId = req.user!.id;
    const requestId = parseInt(String(req.params.id), 10);

    // Get user info for verification
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, phone: true },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const normalizeEmail = (v?: string | null) => (v ? v.trim().toLowerCase() : null);
    const phoneDigits = (v?: string | null) => (v ? v.replace(/\D/g, "") : "");
    const phoneTail = (digits: string, n: number) => (digits.length >= n ? digits.slice(-n) : "");

    const emailRaw = user.email || null;
    const emailNormalized = normalizeEmail(emailRaw);
    const phoneRaw = user.phone || null;
    const phoneDigitsRaw = phoneDigits(phoneRaw);
    const phoneLast9 = phoneTail(phoneDigitsRaw, 9);
    const phoneLast10 = phoneTail(phoneDigitsRaw, 10);

    // Verify the plan request belongs to this user (efficient query using userId + robust email/phone fallback)
    const whereClause: any = {
      id: requestId,
      OR: [{ userId }],
    };

    const orConditions: any[] = [];
    if (emailRaw) orConditions.push({ email: emailRaw });
    if (emailNormalized && emailNormalized !== emailRaw) orConditions.push({ email: emailNormalized });
    if (phoneRaw) orConditions.push({ phone: phoneRaw });
    if (phoneDigitsRaw) orConditions.push({ phone: phoneDigitsRaw });
    if (phoneLast9) orConditions.push({ phone: { endsWith: phoneLast9 } });
    if (phoneLast10) orConditions.push({ phone: { endsWith: phoneLast10 } });
    if (orConditions.length > 0) {
      whereClause.OR.push(...orConditions);
    }
    
    const planRequest = await (prisma as any).planRequest.findFirst({
      where: whereClause,
      select: { id: true },
    });

    if (!planRequest) {
      return res.status(404).json({ error: "Plan request not found or access denied" });
    }

    // Fetch messages ordered by creation time (only non-internal messages)
    const messages = await (prisma as any).planRequestMessage.findMany({
      where: {
        planRequestId: requestId,
        isInternal: false, // Only return non-internal messages
      },
      orderBy: {
        createdAt: "asc",
      },
      select: {
        id: true,
        senderId: true,
        senderRole: true,
        senderName: true,
        messageType: true,
        body: true,
        createdAt: true,
      },
    });

    return res.json({
      success: true,
      messages: messages.map((m: any) => ({
        id: m.id,
        senderId: m.senderId,
        senderRole: m.senderRole,
        senderName: m.senderName,
        messageType: m.messageType,
        message: m.body,
        createdAt: m.createdAt,
      })),
    });
  } catch (error: any) {
    console.error("GET /customer/plan-requests/:id/messages error:", error);
    return res.status(500).json({ error: "Failed to fetch messages" });
  }
}) as RequestHandler);

export default router;

