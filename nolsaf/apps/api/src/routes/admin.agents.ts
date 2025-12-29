import { Router } from "express";
import type { RequestHandler } from "express";
import { prisma } from "@nolsaf/prisma";
import { AuthedRequest, requireAuth, requireRole } from "../middleware/auth.js";
import { Prisma } from "@prisma/client";

export const router = Router();
router.use(requireAuth as unknown as RequestHandler);
router.use(requireRole("ADMIN") as unknown as RequestHandler);

/**
 * GET /api/admin/agents
 * Get all agents with filtering and pagination
 * Query params: status, educationLevel, available, areasOfOperation, specializations, languages, page, pageSize, q
 */
router.get("/", (async (req: AuthedRequest, res) => {
  try {
    const {
      status,
      educationLevel,
      available,
      areasOfOperation,
      specializations,
      languages,
      page = "1",
      pageSize = "20",
      q,
    } = req.query as any;

    const pageNum = Math.max(1, Number(page));
    const pageSizeNum = Math.min(Math.max(1, Number(pageSize)), 100);
    const skip = (pageNum - 1) * pageSizeNum;
    const take = pageSizeNum;

    // Build where clause
    const where: any = {
      user: {
        role: "AGENT",
      },
    };

    if (status && status.trim()) {
      where.status = status.trim();
    }

    if (available !== undefined) {
      where.isAvailable = available === "true" || available === true;
    }

    if (educationLevel && educationLevel.trim()) {
      where.educationLevel = educationLevel.trim();
    }

    // For JSON fields, we'll filter in memory after fetching
    // (Prisma JSON filtering can be complex with MySQL)

    // Text search
    if (q && q.trim()) {
      where.user = {
        ...where.user,
        OR: [
          { name: { contains: q.trim() } },
          { email: { contains: q.trim() } },
          { phone: { contains: q.trim() } },
        ],
      };
    }

    console.log("[GET /admin/agents] Query params:", {
      status,
      educationLevel,
      available,
      areasOfOperation,
      specializations,
      languages,
      q,
      page: pageNum,
      pageSize: pageSizeNum,
    });

    // Fetch agents with user info
    const [total, agents] = await Promise.all([
      (prisma as any).agent.count({ where }),
      (prisma as any).agent.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              createdAt: true,
            },
          },
        },
        skip,
        take,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    // Filter by JSON fields if provided (in memory)
    let filteredAgents = agents;

    if (areasOfOperation && areasOfOperation.trim()) {
      const areaFilter = areasOfOperation.trim().toLowerCase();
      filteredAgents = filteredAgents.filter((agent: any) => {
        const areas = agent.areasOfOperation;
        if (!Array.isArray(areas)) return false;
        return areas.some((area: string) =>
          String(area).toLowerCase().includes(areaFilter)
        );
      });
    }

    if (specializations && specializations.trim()) {
      const specFilter = specializations.trim().toLowerCase();
      filteredAgents = filteredAgents.filter((agent: any) => {
        const specs = agent.specializations;
        if (!Array.isArray(specs)) return false;
        return specs.some((spec: string) =>
          String(spec).toLowerCase().includes(specFilter)
        );
      });
    }

    if (languages && languages.trim()) {
      const langFilter = languages.trim().toLowerCase();
      filteredAgents = filteredAgents.filter((agent: any) => {
        const langs = agent.languages;
        if (!Array.isArray(langs)) return false;
        return langs.some((lang: string) =>
          String(lang).toLowerCase().includes(langFilter)
        );
      });
    }

    // Map to response format
    const items = filteredAgents.map((agent: any) => ({
      id: agent.id,
      userId: agent.userId,
      status: agent.status,
      educationLevel: agent.educationLevel,
      areasOfOperation: agent.areasOfOperation || [],
      certifications: agent.certifications || [],
      languages: agent.languages || [],
      yearsOfExperience: agent.yearsOfExperience,
      specializations: agent.specializations || [],
      bio: agent.bio,
      isAvailable: agent.isAvailable,
      maxActiveRequests: agent.maxActiveRequests,
      currentActiveRequests: agent.currentActiveRequests,
      performanceMetrics: agent.performanceMetrics || {},
      createdAt: agent.createdAt,
      updatedAt: agent.updatedAt,
      user: agent.user,
    }));

    // Adjust total count after filtering
    const filteredTotal = areasOfOperation || specializations || languages
      ? items.length
      : total;

    return res.json({
      page: pageNum,
      pageSize: pageSizeNum,
      total: filteredTotal,
      items,
    });
  } catch (err: any) {
    console.error("GET /admin/agents error:", err);
    return res.status(500).json({ error: "Failed to fetch agents" });
  }
}) as RequestHandler);

/**
 * GET /api/admin/agents/:id
 * Get a single agent by ID
 */
router.get("/:id", (async (req: AuthedRequest, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: "Invalid agent ID" });
    }

    const agent = await (prisma as any).agent.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            createdAt: true,
          },
        },
        assignedPlanRequests: {
          select: {
            id: true,
            role: true,
            tripType: true,
            status: true,
            fullName: true,
            email: true,
            phone: true,
            dateFrom: true,
            dateTo: true,
            groupSize: true,
            budget: true,
            destinations: true,
            notes: true,
            adminResponse: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
        reviews: {
          select: {
            id: true,
            userId: true,
            planRequestId: true,
            punctualityRating: true,
            customerCareRating: true,
            comment: true,
            createdAt: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!agent) {
      return res.status(404).json({ error: "Agent not found" });
    }

    // Calculate average ratings from all reviews
    const reviews = agent.reviews || [];
    let avgPunctualityRating = 0;
    let avgCustomerCareRating = 0;
    let avgCommunicationRating = 0;
    let totalReviews = reviews.length;

    if (totalReviews > 0) {
      const sumPunctuality = reviews.reduce((sum: number, review: any) => sum + (review.punctualityRating || 0), 0);
      const sumCustomerCare = reviews.reduce((sum: number, review: any) => sum + (review.customerCareRating || 0), 0);
      const sumCommunication = reviews.reduce((sum: number, review: any) => sum + (review.communicationRating || 0), 0);
      avgPunctualityRating = Math.round((sumPunctuality / totalReviews) * 10) / 10; // Round to 1 decimal
      avgCustomerCareRating = Math.round((sumCustomerCare / totalReviews) * 10) / 10; // Round to 1 decimal
      avgCommunicationRating = Math.round((sumCommunication / totalReviews) * 10) / 10; // Round to 1 decimal
    }

    // Update performanceMetrics with calculated averages
    const performanceMetrics = agent.performanceMetrics || {};
    performanceMetrics.punctualityRating = avgPunctualityRating;
    performanceMetrics.customerCareRating = avgCustomerCareRating;
    performanceMetrics.communicationRating = avgCommunicationRating;
    performanceMetrics.totalReviews = totalReviews;

    // Get promotion thresholds from system settings
    const systemSettings = await prisma.systemSetting.findUnique({ where: { id: 1 } });
    const minTrips = systemSettings?.agentPromotionMinTrips || 30;
    const maxTrips = systemSettings?.agentPromotionMaxTrips || 50;
    const minRevenue = systemSettings?.agentPromotionMinRevenue || 20000000;
    const commissionPercent = systemSettings?.agentCommissionPercent || 15.0;

    // Calculate promotion progress
    const currentTrips = agent.totalCompletedTrips || 0;
    const currentRevenue = Number(agent.totalRevenueGenerated || 0);
    const tripsProgress = Math.min(100, Math.round((currentTrips / minTrips) * 100));
    const revenueProgress = Math.min(100, Math.round((currentRevenue / minRevenue) * 100));
    const overallProgress = Math.min(100, Math.round((tripsProgress + revenueProgress) / 2));

    // Determine if eligible for promotion (must meet BOTH criteria)
    const eligibleForPromotion = currentTrips >= minTrips && currentRevenue >= minRevenue;

    return res.json({
      id: agent.id,
      userId: agent.userId,
      status: agent.status,
      educationLevel: agent.educationLevel,
      areasOfOperation: agent.areasOfOperation || [],
      certifications: agent.certifications || [],
      languages: agent.languages || [],
      yearsOfExperience: agent.yearsOfExperience,
      specializations: agent.specializations || [],
      bio: agent.bio,
      isAvailable: agent.isAvailable,
      maxActiveRequests: agent.maxActiveRequests,
      currentActiveRequests: agent.currentActiveRequests,
      performanceMetrics: performanceMetrics,
      level: agent.level || "BRONZE",
      totalCompletedTrips: agent.totalCompletedTrips || 0,
      totalRevenueGenerated: agent.totalRevenueGenerated || 0,
      promotionProgress: {
        currentTrips,
        minTrips,
        maxTrips,
        currentRevenue,
        minRevenue,
        tripsProgress,
        revenueProgress,
        overallProgress,
        eligibleForPromotion,
      },
      createdAt: agent.createdAt,
      updatedAt: agent.updatedAt,
      user: agent.user,
      assignedPlanRequests: agent.assignedPlanRequests || [],
      reviews: reviews,
    });
  } catch (err: any) {
    console.error("GET /admin/agents/:id error:", err);
    return res.status(500).json({ error: "Failed to fetch agent" });
  }
}) as RequestHandler);

/**
 * POST /api/admin/agents
 * Create a new agent profile for an existing user
 * Body: { userId, educationLevel, areasOfOperation, certifications, languages, yearsOfExperience, specializations, bio, maxActiveRequests }
 */
router.post("/", (async (req: AuthedRequest, res) => {
  try {
    const {
      userId,
      status,
      educationLevel,
      areasOfOperation,
      certifications,
      languages,
      yearsOfExperience,
      specializations,
      bio,
      maxActiveRequests,
      isAvailable,
    } = req.body || {};

    console.log("[POST /admin/agents] Request body:", {
      userId,
      status,
      educationLevel,
      areasOfOperation,
      certifications,
      languages,
      yearsOfExperience,
      specializations,
      bio,
      maxActiveRequests,
      isAvailable,
    });

    if (!userId || !Number.isFinite(Number(userId))) {
      return res.status(400).json({ error: "Valid userId is required" });
    }

    // Check if user exists and can be an agent
    const user = await prisma.user.findUnique({
      where: { id: Number(userId) },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if agent profile already exists
    const existingAgent = await (prisma as any).agent.findUnique({
      where: { userId: Number(userId) },
    });

    if (existingAgent) {
      return res.status(400).json({ error: "Agent profile already exists for this user" });
    }

    // Update user role to AGENT if not already
    if (user.role !== "AGENT") {
      await prisma.user.update({
        where: { id: Number(userId) },
        data: { role: "AGENT" },
      });
    }

    // Prepare data for agent creation
    const agentData: any = {
      userId: Number(userId),
      status: status && typeof status === "string" && status.trim() ? status.trim() : "ACTIVE",
      educationLevel: educationLevel && typeof educationLevel === "string" && educationLevel.trim() ? educationLevel.trim() : null,
      yearsOfExperience: yearsOfExperience ? Number(yearsOfExperience) : null,
      bio: bio && typeof bio === "string" && bio.trim() ? bio.trim() : null,
      maxActiveRequests: maxActiveRequests ? Number(maxActiveRequests) : 10,
      isAvailable: isAvailable !== undefined ? Boolean(isAvailable) : true,
      currentActiveRequests: 0,
    };

    // Handle JSON array fields - convert empty arrays or undefined to null, otherwise use the array
    if (areasOfOperation !== undefined && Array.isArray(areasOfOperation) && areasOfOperation.length > 0) {
      agentData.areasOfOperation = areasOfOperation;
    } else {
      agentData.areasOfOperation = null;
    }

    if (certifications !== undefined && Array.isArray(certifications) && certifications.length > 0) {
      agentData.certifications = certifications;
    } else {
      agentData.certifications = null;
    }

    if (languages !== undefined && Array.isArray(languages) && languages.length > 0) {
      agentData.languages = languages;
    } else {
      agentData.languages = null;
    }

    if (specializations !== undefined && Array.isArray(specializations) && specializations.length > 0) {
      agentData.specializations = specializations;
    } else {
      agentData.specializations = null;
    }

    console.log("[POST /admin/agents] Creating agent with data:", agentData);

    // Create agent profile
    const agent = await (prisma as any).agent.create({
      data: agentData,
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

    return res.status(201).json({
      id: agent.id,
      userId: agent.userId,
      status: agent.status,
      educationLevel: agent.educationLevel,
      areasOfOperation: agent.areasOfOperation || [],
      certifications: agent.certifications || [],
      languages: agent.languages || [],
      yearsOfExperience: agent.yearsOfExperience,
      specializations: agent.specializations || [],
      bio: agent.bio,
      isAvailable: agent.isAvailable,
      maxActiveRequests: agent.maxActiveRequests,
      currentActiveRequests: agent.currentActiveRequests,
      user: agent.user,
    });
  } catch (err: any) {
    console.error("POST /admin/agents error:", err);
    console.error("Error details:", {
      message: err.message,
      code: err.code,
      meta: err.meta,
      stack: err.stack,
    });
    if (err.code === "P2002") {
      return res.status(400).json({ error: "Agent profile already exists for this user" });
    }
    return res.status(500).json({ 
      error: "Failed to create agent",
      message: err.message || "Unknown error",
    });
  }
}) as RequestHandler);

/**
 * PATCH /api/admin/agents/:id
 * Update an agent profile
 */
router.patch("/:id", (async (req: AuthedRequest, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: "Invalid agent ID" });
    }

    const {
      status,
      educationLevel,
      areasOfOperation,
      certifications,
      languages,
      yearsOfExperience,
      specializations,
      bio,
      isAvailable,
      maxActiveRequests,
    } = req.body || {};

    const updateData: any = {};

    if (status !== undefined) updateData.status = status;
    if (educationLevel !== undefined) updateData.educationLevel = educationLevel;
    if (areasOfOperation !== undefined) updateData.areasOfOperation = areasOfOperation;
    if (certifications !== undefined) updateData.certifications = certifications;
    if (languages !== undefined) updateData.languages = languages;
    if (yearsOfExperience !== undefined) updateData.yearsOfExperience = yearsOfExperience ? Number(yearsOfExperience) : null;
    if (specializations !== undefined) updateData.specializations = specializations;
    if (bio !== undefined) updateData.bio = bio;
    if (isAvailable !== undefined) updateData.isAvailable = isAvailable;
    if (maxActiveRequests !== undefined) updateData.maxActiveRequests = maxActiveRequests ? Number(maxActiveRequests) : 10;

    const agent = await (prisma as any).agent.update({
      where: { id },
      data: updateData,
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

    return res.json({
      id: agent.id,
      userId: agent.userId,
      status: agent.status,
      educationLevel: agent.educationLevel,
      areasOfOperation: agent.areasOfOperation || [],
      certifications: agent.certifications || [],
      languages: agent.languages || [],
      yearsOfExperience: agent.yearsOfExperience,
      specializations: agent.specializations || [],
      bio: agent.bio,
      isAvailable: agent.isAvailable,
      maxActiveRequests: agent.maxActiveRequests,
      currentActiveRequests: agent.currentActiveRequests,
      user: agent.user,
    });
  } catch (err: any) {
    console.error("PATCH /admin/agents/:id error:", err);
    if (err.code === "P2025") {
      return res.status(404).json({ error: "Agent not found" });
    }
    return res.status(500).json({ error: "Failed to update agent" });
  }
}) as RequestHandler);

/**
 * POST /api/admin/agents/:id/assign-to-request
 * Assign an agent to a plan request
 * Body: { planRequestId }
 */
router.post("/:id/assign-to-request", (async (req: AuthedRequest, res) => {
  try {
    const agentId = Number(req.params.id);
    const { planRequestId } = req.body || {};

    if (!Number.isFinite(agentId)) {
      return res.status(400).json({ error: "Invalid agent ID" });
    }

    if (!planRequestId || !Number.isFinite(Number(planRequestId))) {
      return res.status(400).json({ error: "Valid planRequestId is required" });
    }

    // Check if agent exists and is available
    const agent = await (prisma as any).agent.findUnique({
      where: { id: agentId },
    });

    if (!agent) {
      return res.status(404).json({ error: "Agent not found" });
    }

    if (!agent.isAvailable) {
      return res.status(400).json({ error: "Agent is not available" });
    }

    if (agent.currentActiveRequests >= agent.maxActiveRequests) {
      return res.status(400).json({ error: "Agent has reached maximum active requests" });
    }

    // Check if plan request exists
    const planRequest = await (prisma as any).planRequest.findUnique({
      where: { id: Number(planRequestId) },
    });

    if (!planRequest) {
      return res.status(404).json({ error: "Plan request not found" });
    }

    // Update plan request with agent assignment
    await (prisma as any).planRequest.update({
      where: { id: Number(planRequestId) },
      data: {
        assignedAgentId: agentId,
        assignedAgent: agent.user ? agent.user.name : null, // Keep legacy field updated
      },
    });

    // Update agent's current active requests count
    await (prisma as any).agent.update({
      where: { id: agentId },
      data: {
        currentActiveRequests: agent.currentActiveRequests + 1,
      },
    });

    return res.json({
      success: true,
      message: "Agent assigned successfully",
      agentId,
      planRequestId: Number(planRequestId),
    });
  } catch (err: any) {
    console.error("POST /admin/agents/:id/assign-to-request error:", err);
    return res.status(500).json({ error: "Failed to assign agent" });
  }
}) as RequestHandler);

export default router;

