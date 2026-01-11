import { Router } from "express";
import type { RequestHandler } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { prisma } from "@nolsaf/prisma";
import { Prisma } from "@prisma/client";
import { sanitizeText } from "../lib/sanitize.js";
import { limitPlanRequestMessages } from "../middleware/rateLimit.js";
import { AuthedRequest } from "../middleware/auth.js";
import { sendMail } from "../lib/mailer.js";
import { getPlanRequestResponseEmail, getPlanRequestAgentAssignmentEmail } from "../lib/planRequestEmailTemplates.js";
import { notifyUser } from "../lib/notifications.js";
import { z } from "zod";
import { audit } from "../lib/audit.js";
import rateLimit from "express-rate-limit";

export const router = Router();
router.use(requireAuth as unknown as RequestHandler, requireRole("ADMIN") as unknown as RequestHandler);

// Rate limiters
const limitPlanRequestList = rateLimit({
  windowMs: 60_000, // 1 minute
  max: 30, // 30 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please wait a moment and try again." },
});

const limitPlanRequestUpdate = rateLimit({
  windowMs: 60_000, // 1 minute
  max: 10, // 10 updates per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many update requests. Please wait a moment and try again." },
});

// Validation schemas
const updateRequestSchema = z.object({
  status: z.enum(["NEW", "IN_PROGRESS", "COMPLETED"]).optional(),
  adminResponse: z.string().max(10000).optional().nullable(),
  suggestedItineraries: z.string().max(50000).optional().nullable(),
  requiredPermits: z.string().max(5000).optional().nullable(),
  estimatedTimeline: z.string().max(2000).optional().nullable(),
  assignedAgent: z.string().max(200).optional().nullable(),
  assignedAgentId: z.number().int().positive().nullable().optional(),
}).strict();

// Validation middleware
function validateUpdateRequest(req: any, res: any, next: any) {
  const result = updateRequestSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ 
      error: "Invalid request data", 
      details: result.error.errors.map(e => ({ path: e.path.join('.'), message: e.message }))
    });
  }
  req.validatedBody = result.data;
  next();
}

/** GET /admin/plan-with-us/requests?role=&tripType=&status=&date=&start=&end=&page=&pageSize=&q= */
router.get("/", limitPlanRequestList, async (req, res) => {
  try {
    const { role, tripType, status, date, start, end, page = "1", pageSize = "50", q = "" } = req.query as any;

    console.log('GET /admin/plan-with-us/requests - Query params:', { role, tripType, status, date, start, end, page, pageSize, q });

    const where: any = {};

    // Filter by role - exact match (VARCHAR fields don't support contains with mode)
    if (role && role.trim()) {
      where.role = role.trim();
    }

    // Filter by trip type - exact match (VARCHAR fields don't support contains with mode)
    if (tripType && tripType.trim()) {
      where.tripType = tripType.trim();
    }

    // Filter by status (map PENDING to NEW for backward compatibility)
    if (status) {
      if (status === "PENDING") {
        where.status = "NEW";
      } else {
        where.status = status;
      }
    }

    // Date filtering
    if (date) {
      const s = new Date(String(date) + "T00:00:00.000Z");
      const e = new Date(String(date) + "T23:59:59.999Z");
      where.createdAt = { gte: s, lte: e };
    } else if (start || end) {
      const s = start ? new Date(String(start) + "T00:00:00.000Z") : new Date(0);
      const e = end ? new Date(String(end) + "T23:59:59.999Z") : new Date();
      where.createdAt = { gte: s, lte: e };
    }

    // Search query
    if (q) {
      where.OR = [
        { fullName: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { phone: { contains: q, mode: "insensitive" } },
        { destinations: { contains: q, mode: "insensitive" } },
        { notes: { contains: q, mode: "insensitive" } },
      ];
    }

    const skip = (Number(page) - 1) * Number(pageSize);
    const take = Math.min(Number(pageSize), 100);

    console.log('GET /admin/plan-with-us/requests - Prisma where clause:', JSON.stringify(where, null, 2));

    try {
      // First, check total count without filters to verify data exists
      const totalCount = await (prisma as any).planRequest.count().catch((e: any) => {
        console.error('Error counting all plan requests:', e.message, e.code);
        return 0;
      });
      console.log(`GET /admin/plan-with-us/requests - Total requests in database (no filters): ${totalCount}`);

      const [items, total] = await Promise.all([
        (prisma as any).planRequest.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip,
          take,
        }).catch((e: any) => {
          console.error('Error in planRequest.findMany:', e.message, e.code, e.stack);
          throw e;
        }),
        (prisma as any).planRequest.count({ where }).catch((e: any) => {
          console.error('Error in planRequest.count:', e.message, e.code);
          throw e;
        }),
      ]);

      console.log(`GET /admin/plan-with-us/requests - Found ${items.length} items (total: ${total}) with filters:`, JSON.stringify(where));
      if (items.length === 0 && totalCount > 0) {
        console.warn('WARNING: No items found but database has', totalCount, 'total requests. Where clause:', JSON.stringify(where));
      }

      const mapped = items.map((r: any) => {
        const notes = (r.notes || "").toLowerCase();
        const isUrgent = notes.includes("urgent");
        
        // Calculate response time (hours since creation)
        const createdAt = new Date(r.createdAt);
        const now = new Date();
        const hoursSinceCreation = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60));
        
        return {
          id: r.id,
          role: r.role || "Other",
          tripType: r.tripType || "Other",
          destinations: r.destinations || "",
          dateFrom: r.dateFrom || null,
          dateTo: r.dateTo || null,
          groupSize: r.groupSize || null,
          budget: r.budget ? String(r.budget) : null,
          notes: r.notes || "",
          status: r.status || "NEW",
          isUrgent,
          hoursSinceCreation,
          customer: {
            name: r.fullName || "Unknown",
            email: r.email || "",
            phone: r.phone || null,
          },
          transportRequired: r.transportRequired === true || r.transportRequired === "yes" || r.transportRequired === "true",
          // Admin response fields
          adminResponse: r.adminResponse || null,
          suggestedItineraries: r.suggestedItineraries || null,
          requiredPermits: r.requiredPermits || null,
          estimatedTimeline: r.estimatedTimeline || null,
          assignedAgent: r.assignedAgent || null,
          assignedAgentId: r.assignedAgentId || null,
          respondedAt: r.respondedAt || null,
          createdAt: r.createdAt,
        };
      });

      return res.json({ 
        total: total || 0, 
        page: Number(page), 
        pageSize: take, 
        items: Array.isArray(mapped) ? mapped : [] 
      });
    } catch (e: any) {
      console.error('GET /admin/plan-with-us/requests - Prisma error:', e);
      if (e instanceof Prisma.PrismaClientKnownRequestError && (e.code === 'P2021' || e.code === 'P2022')) {
        console.warn('Prisma schema mismatch when querying plan requests:', e.message);
        const pageNum = Number((req.query as any).page ?? 1);
        const pageSizeNum = Math.min(Number((req.query as any).pageSize ?? 50), 100);
        return res.json({ total: 0, page: pageNum, pageSize: pageSizeNum, items: [] });
      }
      throw e;
    }
  } catch (err: any) {
    console.error('Unhandled error in GET /admin/plan-with-us/requests:', err);
    console.error('Error stack:', err?.stack);
    const pageNum = Number((req.query as any).page ?? 1);
    const pageSizeNum = Math.min(Number((req.query as any).pageSize ?? 50), 100);
    return res.status(500).json({ 
      error: 'Internal server error', 
      message: err?.message,
      total: 0,
      page: pageNum,
      pageSize: pageSizeNum,
      items: []
    });
  }
});

/** GET /admin/plan-with-us/requests/stats?period=7d|30d|month|year */
router.get("/stats", async (req, res) => {
  try {
    const { period = "30d" } = req.query as any;
    let startDate: Date;
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);

    switch (period) {
      case "7d":
        startDate = new Date();
        startDate.setDate(endDate.getDate() - 6);
        break;
      case "30d":
        startDate = new Date();
        startDate.setDate(endDate.getDate() - 29);
        break;
      case "month":
        startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
        break;
      case "year":
        startDate = new Date(endDate.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date();
        startDate.setDate(endDate.getDate() - 29);
    }
    startDate.setHours(0, 0, 0, 0);

    try {
      const requests = await (prisma as any).planRequest.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        select: {
          createdAt: true,
          role: true,
          tripType: true,
          status: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      });

      const trendsMap = new Map<string, { count: number; pending: number; inProgress: number; completed: number }>();
      const roleBreakdown: Record<string, number> = {};
      const tripTypeBreakdown: Record<string, number> = {};

      // Initialize map with all dates in the range
      let currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const dateKey = currentDate.toISOString().split('T')[0];
        trendsMap.set(dateKey, { count: 0, pending: 0, inProgress: 0, completed: 0 });
        currentDate.setDate(currentDate.getDate() + 1);
      }

      requests.forEach((req: any) => {
        const dateKey = req.createdAt.toISOString().split('T')[0];
        const stat = trendsMap.get(dateKey);
        if (stat) {
          stat.count++;
          if (req.status === "NEW" || req.status === "PENDING") stat.pending++;
          if (req.status === "IN_PROGRESS") stat.inProgress++;
          if (req.status === "COMPLETED") stat.completed++;
        }

        const role = req.role || "Other";
        roleBreakdown[role] = (roleBreakdown[role] || 0) + 1;

        const tripType = req.tripType || "Other";
        tripTypeBreakdown[tripType] = (tripTypeBreakdown[tripType] || 0) + 1;
      });

      const trends = Array.from(trendsMap.entries()).map(([date, data]) => ({
        date,
        count: data.count,
        pending: data.pending,
        inProgress: data.inProgress,
        completed: data.completed,
      }));

      return res.json({ trends, roleBreakdown, tripTypeBreakdown, period, startDate, endDate });
    } catch (e: any) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && (e.code === 'P2021' || e.code === 'P2022')) {
        console.warn('Prisma schema mismatch when querying plan request stats:', e.message);
        return res.json({ trends: [], roleBreakdown: {}, tripTypeBreakdown: {}, period, startDate, endDate });
      }
      throw e;
    }
  } catch (err) {
    console.error("admin.planWithUs.requests.stats error", err);
    res.status(500).json({ error: "failed" });
  }
});

/** POST /admin/plan-with-us/requests/:id/message - Send a quick message response to user */
router.post("/:id/message", limitPlanRequestMessages, (async (req: AuthedRequest, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: "Invalid request ID" });
    }

    const { message } = req.body || {};

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: "Message is required" });
    }

    // Get the plan request
    const planRequest = await (prisma as any).planRequest.findUnique({
      where: { id },
    });

    if (!planRequest) {
      return res.status(404).json({ error: "Plan request not found" });
    }

    // Get admin user info
    const adminUser = req.user;
    if (!adminUser) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Fetch admin user details to get name
    const adminUserDetails = await prisma.user.findUnique({
      where: { id: adminUser.id },
      select: { id: true, name: true, email: true },
    });

    // Sanitize message content to prevent XSS
    const sanitizedMessage = sanitizeText(message);

    // Create message record in new PlanRequestMessage table
    await (prisma as any).planRequestMessage.create({
      data: {
        planRequestId: id,
        senderId: adminUser.id,
        senderRole: "ADMIN",
        senderName: adminUserDetails?.name || "Admin",
        messageType: "Admin Response",
        body: sanitizedMessage,
        isInternal: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Also update the plan request's updatedAt timestamp
    await (prisma as any).planRequest.update({
      where: { id },
      data: {
        updatedAt: new Date(),
      },
    });

    // Audit log the message
    await audit(
      req as AuthedRequest,
      "PLAN_REQUEST_MESSAGE_SENT",
      `plan-request:${id}`,
      null,
      { messageLength: sanitizedMessage.length, senderId: adminUser.id }
    );

    return res.json({
      success: true,
      message: "Message sent successfully",
    });
  } catch (error: any) {
    const isProduction = process.env.NODE_ENV === "production";
    console.error("POST /admin/plan-with-us/requests/:id/message error:", error);
    
    // Don't expose internal error details in production
    return res.status(500).json({ 
      error: "Failed to send message",
      ...(isProduction ? {} : { details: error?.message })
    });
  }
}) as RequestHandler);

/** GET /admin/plan-with-us/requests/:id/messages - Get conversation messages for a plan request */
router.get("/:id/messages", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: "Invalid request ID" });
    }

    // Verify plan request exists
    const planRequest = await (prisma as any).planRequest.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!planRequest) {
      return res.status(404).json({ error: "Plan request not found" });
    }

    // Fetch messages ordered by creation time
    const messages = await (prisma as any).planRequestMessage.findMany({
      where: {
        planRequestId: id,
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
    console.error("GET /admin/plan-with-us/requests/:id/messages error:", error);
    return res.status(500).json({ error: "Failed to fetch messages" });
  }
});

/** GET /admin/plan-with-us/requests/:id */
router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: "Invalid request ID" });
    }

    try {
      const request = await (prisma as any).planRequest.findUnique({
        where: { id },
      });

      if (!request) {
        return res.status(404).json({ error: "Request not found" });
      }

      const notes = (request.notes || "").toLowerCase();
      const isUrgent = notes.includes("urgent");
      
      const createdAt = new Date(request.createdAt);
      const now = new Date();
      const hoursSinceCreation = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60));

      const mapped = {
        id: request.id,
        role: request.role || "Other",
        tripType: request.tripType || "Other",
        destinations: request.destinations || "",
        dateFrom: request.dateFrom || null,
        dateTo: request.dateTo || null,
        groupSize: request.groupSize || null,
        budget: request.budget || null,
        notes: request.notes || "",
        status: request.status || "NEW",
        isUrgent,
        hoursSinceCreation,
        customer: {
          name: request.fullName || "Unknown",
          email: request.email || "",
          phone: request.phone || null,
        },
        transportRequired: request.transportRequired === "yes" || request.transportRequired === true,
        // Transport details
        vehicleType: request.vehicleType || null,
        pickupLocation: request.pickupLocation || null,
        dropoffLocation: request.dropoffLocation || null,
        vehiclesNeeded: request.vehiclesNeeded || null,
        passengerCount: request.passengerCount || null,
        vehicleRequirements: request.vehicleRequirements || null,
        // Role-specific fields (stored as JSON or text)
        roleSpecificData: request.roleSpecificData || {},
        // Admin response fields
        adminResponse: request.adminResponse || null,
        suggestedItineraries: request.suggestedItineraries || null,
        requiredPermits: request.requiredPermits || null,
        estimatedTimeline: request.estimatedTimeline || null,
          assignedAgent: request.assignedAgent || null,
          assignedAgentId: request.assignedAgentId || null,
          respondedAt: request.respondedAt || null,
          createdAt: request.createdAt,
          updatedAt: request.updatedAt,
      };

      return res.json(mapped);
    } catch (e: any) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && (e.code === 'P2021' || e.code === 'P2022')) {
        console.warn('Prisma schema mismatch when querying plan request:', e.message);
        return res.status(404).json({ error: "Request not found" });
      }
      throw e;
    }
  } catch (err: any) {
    const isProd = process.env.NODE_ENV === "production";
    console.error('Unhandled error in GET /admin/plan-with-us/requests/:id:', err);
    return res.status(500).json({ 
      error: 'Internal server error',
      ...(isProd ? {} : { details: err?.message })
    });
  }
});

/** PATCH /admin/plan-with-us/requests/:id */
router.patch("/:id", limitPlanRequestUpdate, validateUpdateRequest, (async (req: AuthedRequest, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: "Invalid request ID" });
    }

    const {
      status,
      adminResponse,
      suggestedItineraries,
      requiredPermits,
      estimatedTimeline,
      assignedAgent,
      assignedAgentId,
    } = (req as any).validatedBody;

    // Get the current plan request to check previous status and agent assignment
    const currentRequest = await (prisma as any).planRequest.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        assignedAgentId: true,
        budget: true,
        email: true,
        fullName: true,
        role: true,
        tripType: true,
        userId: true,
      },
    });

    if (!currentRequest) {
      return res.status(404).json({ error: "Plan request not found" });
    }

    const updateData: any = {};
    
    if (status) updateData.status = status;
    // Sanitize all text inputs to prevent XSS
    if (adminResponse !== undefined && adminResponse !== null) {
      updateData.adminResponse = sanitizeText(adminResponse);
    }
    if (suggestedItineraries !== undefined && suggestedItineraries !== null) {
      updateData.suggestedItineraries = sanitizeText(suggestedItineraries);
    }
    if (requiredPermits !== undefined && requiredPermits !== null) {
      updateData.requiredPermits = sanitizeText(requiredPermits);
    }
    if (estimatedTimeline !== undefined && estimatedTimeline !== null) {
      updateData.estimatedTimeline = sanitizeText(estimatedTimeline);
    }
    if (assignedAgent !== undefined && assignedAgent !== null) {
      updateData.assignedAgent = sanitizeText(assignedAgent);
    }
    if (assignedAgentId !== undefined && assignedAgentId !== null) {
      updateData.assignedAgentId = Number(assignedAgentId);
      // If agent is assigned and it's a new assignment (and request is not already COMPLETED), increment their workload
      if (currentRequest.assignedAgentId !== Number(assignedAgentId) && currentRequest.status !== "COMPLETED") {
        const agent = await (prisma as any).agent.findUnique({
          where: { id: Number(assignedAgentId) },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        });
        if (agent) {
          await (prisma as any).agent.update({
            where: { id: Number(assignedAgentId) },
            data: {
              currentActiveRequests: { increment: 1 },
            },
          });
          
          // Send email notification to agent about assignment (non-blocking)
          if (agent.user?.email) {
            try {
              const agentEmail = getPlanRequestAgentAssignmentEmail({
                agentName: agent.user.name || "Agent",
                requestId: currentRequest.id,
                customerName: currentRequest.fullName || "Customer",
                role: currentRequest.role || undefined,
                tripType: currentRequest.tripType || undefined,
              });
              
              await sendMail(agent.user.email, agentEmail.subject, agentEmail.html);
              console.log(`Email notification sent to agent: ${agent.user.email}`);
            } catch (agentEmailError: any) {
              console.error("Failed to send agent assignment email:", agentEmailError);
              // Don't fail the request if email fails
            }
          }
        }
      }
    }
    
    // If status is being set to COMPLETED and we have a response, set respondedAt
    if (status === "COMPLETED" && (adminResponse || suggestedItineraries)) {
      updateData.respondedAt = new Date();
    }

    // Handle agent promotion metrics when status changes to COMPLETED
    // Use transaction to ensure atomicity (both request update and agent metrics update succeed or fail together)
    const agentIdToUpdate = (status === "COMPLETED" && currentRequest.status !== "COMPLETED") 
      ? (updateData.assignedAgentId || currentRequest.assignedAgentId) 
      : null;
    
    if (agentIdToUpdate) {
      try {
        // Get system settings for commission percentage
        const systemSettings = await prisma.systemSetting.findUnique({ where: { id: 1 } });
        const commissionPercent = Number(systemSettings?.agentCommissionPercent || 15.0);

        // Get the agent
        const agent = await (prisma as any).agent.findUnique({
          where: { id: Number(agentIdToUpdate) },
          select: {
            id: true,
            totalCompletedTrips: true,
            totalRevenueGenerated: true,
            currentActiveRequests: true,
          },
        });

        if (agent) {
          // Calculate commission revenue from budget
          const budget = currentRequest.budget ? Number(currentRequest.budget) : 0;
          const commissionRevenue = budget > 0 ? (budget * commissionPercent) / 100 : 0;

          // Use transaction to ensure both updates succeed or fail together
          const result = await prisma.$transaction(async (tx: any) => {
            // Update plan request status
            const updatedRequest = await tx.planRequest.update({
              where: { id },
              data: updateData,
            });

            // Update agent's promotion metrics and decrement active requests atomically
            await tx.agent.update({
              where: { id: Number(agentIdToUpdate) },
              data: {
                totalCompletedTrips: { increment: 1 },
                totalRevenueGenerated: { increment: commissionRevenue },
                currentActiveRequests: Math.max(0, (agent.currentActiveRequests || 0) - 1),
              },
            });

            return updatedRequest;
          });

          console.log(`[Agent Promotion] Updated agent ${agentIdToUpdate}: +1 trip, +${commissionRevenue.toFixed(2)} TZS revenue (from budget ${budget}, commission ${commissionPercent}%), -1 active request`);

          // Send email notification to customer if admin responded (status = COMPLETED with response fields)
          try {
            const adminUser = req.user;
            // Fetch admin user details to get name
            const adminUserDetails = adminUser ? await prisma.user.findUnique({
              where: { id: adminUser.id },
              select: { name: true },
            }) : null;
            const customerEmail = getPlanRequestResponseEmail({
              customerName: currentRequest.fullName || "Customer",
              requestId: currentRequest.id,
              adminName: adminUserDetails?.name || undefined,
              hasItineraries: !!result.suggestedItineraries,
              hasPermits: !!result.requiredPermits,
              hasTimeline: !!result.estimatedTimeline,
            });
            
            await sendMail(currentRequest.email, customerEmail.subject, customerEmail.html);
            console.log(`Email notification sent to customer: ${currentRequest.email}`);
            
            // Also create in-app notification for user
            if (currentRequest.userId) {
              await notifyUser(currentRequest.userId, 'plan_request_response', {
                requestId: currentRequest.id,
                status: 'COMPLETED',
              });
            }
          } catch (emailError: any) {
            console.error("Failed to send customer email notification:", emailError);
            // Don't fail the request if email fails
          }

          // Emit real-time update via Socket.IO (non-blocking)
          try {
            const io = (req.app as any)?.get?.("io") || (global as any).io;
            if (io && typeof io.emit === 'function') {
              // Emit to admin room
              io.to('admin').emit('plan-request:updated', {
                id: result.id,
                status: result.status,
                assignedAgentId: result.assignedAgentId,
              });
              
              // Emit to user room if userId exists
              if (currentRequest.userId) {
                io.to(`user:${currentRequest.userId}`).emit('plan-request:updated', {
                  id: result.id,
                  status: result.status,
                });
              }
            }
          } catch (socketError: any) {
            console.error("Failed to emit Socket.IO update:", socketError);
            // Don't fail the request if socket fails
          }

          return res.json({
            id: result.id,
            status: result.status,
            adminResponse: result.adminResponse,
            suggestedItineraries: result.suggestedItineraries,
            requiredPermits: result.requiredPermits,
            estimatedTimeline: result.estimatedTimeline,
            assignedAgent: result.assignedAgent,
            respondedAt: result.respondedAt,
          });
        }
      } catch (agentError: any) {
        // Log error and fail the request update
        console.error(`[Agent Promotion] Failed to update agent metrics for agent ${agentIdToUpdate}:`, agentError);
        return res.status(500).json({ 
          error: "Failed to update agent promotion metrics",
          message: agentError?.message || "Internal server error"
        });
      }
    }

    try {
      const updated = await (prisma as any).planRequest.update({
        where: { id },
        data: updateData,
      });

      // Send email notification to customer if admin responded (status = COMPLETED with response fields)
      if (status === "COMPLETED" && (adminResponse || suggestedItineraries || requiredPermits || estimatedTimeline)) {
        try {
          const adminUser = req.user;
          // Fetch admin user details to get name
          const adminUserDetails = adminUser ? await prisma.user.findUnique({
            where: { id: adminUser.id },
            select: { name: true },
          }) : null;
          const customerEmail = getPlanRequestResponseEmail({
            customerName: currentRequest.fullName || "Customer",
            requestId: currentRequest.id,
            adminName: adminUserDetails?.name || undefined,
            hasItineraries: !!suggestedItineraries,
            hasPermits: !!requiredPermits,
            hasTimeline: !!estimatedTimeline,
          });
          
          await sendMail(currentRequest.email, customerEmail.subject, customerEmail.html);
          console.log(`Email notification sent to customer: ${currentRequest.email}`);
          
          // Also create in-app notification for user
          if (currentRequest.userId) {
            await notifyUser(currentRequest.userId, 'plan_request_response', {
              requestId: currentRequest.id,
              status: 'COMPLETED',
            });
          }
        } catch (emailError: any) {
          console.error("Failed to send customer email notification:", emailError);
          // Don't fail the request if email fails
        }
      }

      // Emit real-time update via Socket.IO (non-blocking)
      try {
        const io = (req.app as any)?.get?.("io") || (global as any).io;
        if (io && typeof io.emit === 'function') {
          // Emit to admin room
          io.to('admin').emit('plan-request:updated', {
            id: updated.id,
            status: updated.status,
            assignedAgentId: updated.assignedAgentId,
          });
          
          // Emit to user room if userId exists
          if (currentRequest.userId) {
            io.to(`user:${currentRequest.userId}`).emit('plan-request:updated', {
              id: updated.id,
              status: updated.status,
            });
          }
        }
      } catch (socketError: any) {
        console.error("Failed to emit Socket.IO update:", socketError);
        // Don't fail the request if socket fails
      }

      return res.json({
        id: updated.id,
        status: updated.status,
        adminResponse: updated.adminResponse,
        suggestedItineraries: updated.suggestedItineraries,
        requiredPermits: updated.requiredPermits,
        estimatedTimeline: updated.estimatedTimeline,
        assignedAgent: updated.assignedAgent,
        respondedAt: updated.respondedAt,
      });
    } catch (e: any) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && (e.code === 'P2021' || e.code === 'P2022')) {
        console.warn('Prisma schema mismatch when updating plan request:', e.message);
        return res.status(404).json({ error: "Request not found" });
      }
      throw e;
    }
  } catch (err: any) {
    const isProd = process.env.NODE_ENV === "production";
    console.error('Unhandled error in PATCH /admin/plan-with-us/requests/:id:', err);
    return res.status(500).json({ 
      error: 'Internal server error',
      ...(isProd ? {} : { details: err?.message })
    });
  }
}) as RequestHandler);

export default router;

