import { Router } from "express";
import type { RequestHandler } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { prisma } from "@nolsaf/prisma";
import { Prisma } from "@nolsaf/prisma";

export const router = Router();
router.use(requireAuth as unknown as RequestHandler, requireRole("ADMIN") as unknown as RequestHandler);

/** GET /admin/plan-with-us/requests?role=&tripType=&status=&date=&start=&end=&page=&pageSize=&q= */
router.get("/", async (req, res) => {
  try {
    const { role, tripType, status, date, start, end, page = "1", pageSize = "50", q = "" } = req.query as any;

    const where: any = {};

    // Filter by role
    if (role) {
      where.role = role;
    }

    // Filter by trip type
    if (tripType) {
      where.tripType = tripType;
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

    try {
      const [items, total] = await Promise.all([
        (prisma as any).planRequest.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip,
          take,
        }),
        (prisma as any).planRequest.count({ where }),
      ]);

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
          budget: r.budget || null,
          notes: r.notes || "",
          status: r.status || "NEW",
          isUrgent,
          hoursSinceCreation,
          customer: {
            name: r.fullName || "Unknown",
            email: r.email || "",
            phone: r.phone || null,
          },
          transportRequired: r.transportRequired === "yes" || r.transportRequired === true,
          // Admin response fields
          adminResponse: r.adminResponse || null,
          suggestedItineraries: r.suggestedItineraries || null,
          requiredPermits: r.requiredPermits || null,
          estimatedTimeline: r.estimatedTimeline || null,
          assignedAgent: r.assignedAgent || null,
          respondedAt: r.respondedAt || null,
          createdAt: r.createdAt,
        };
      });

      return res.json({ total, page: Number(page), pageSize: take, items: mapped });
    } catch (e: any) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && (e.code === 'P2021' || e.code === 'P2022')) {
        console.warn('Prisma schema mismatch when querying plan requests:', e.message);
        const page = Number((req.query as any).page ?? 1);
        const pageSize = Math.min(Number((req.query as any).pageSize ?? 50), 100);
        return res.json({ total: 0, page, pageSize, items: [] });
      }
      throw e;
    }
  } catch (err: any) {
    console.error('Unhandled error in GET /admin/plan-with-us/requests:', err);
    return res.status(500).json({ error: 'Internal server error' });
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
    console.error('Unhandled error in GET /admin/plan-with-us/requests/:id:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/** PATCH /admin/plan-with-us/requests/:id */
router.patch("/:id", async (req, res) => {
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
    } = req.body;

    const updateData: any = {};
    
    if (status) updateData.status = status;
    if (adminResponse !== undefined) updateData.adminResponse = adminResponse;
    if (suggestedItineraries !== undefined) updateData.suggestedItineraries = suggestedItineraries;
    if (requiredPermits !== undefined) updateData.requiredPermits = requiredPermits;
    if (estimatedTimeline !== undefined) updateData.estimatedTimeline = estimatedTimeline;
    if (assignedAgent !== undefined) updateData.assignedAgent = assignedAgent;
    
    // If status is being set to COMPLETED and we have a response, set respondedAt
    if (status === "COMPLETED" && (adminResponse || suggestedItineraries)) {
      updateData.respondedAt = new Date();
    }

    try {
      const updated = await (prisma as any).planRequest.update({
        where: { id },
        data: updateData,
      });

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
    console.error('Unhandled error in PATCH /admin/plan-with-us/requests/:id:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

