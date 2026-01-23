// apps/api/src/routes/admin.agents.ts
import { Router, Response } from "express";
import type { RequestHandler } from "express";
import { z } from "zod";
import { prisma } from "@nolsaf/prisma";
import { AuthedRequest, requireAuth, requireRole } from "../middleware/auth.js";
import { audit } from "../lib/audit.js";
import { sanitizeText } from "../lib/sanitize.js";
import rateLimit from "express-rate-limit";
import { Prisma } from "@prisma/client";

// ============================================================
// Constants
// ============================================================
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const DEFAULT_MAX_ACTIVE_REQUESTS = 10;
const DEFAULT_AGENT_STATUS = "ACTIVE";
const DEFAULT_AGENT_LEVEL = "BRONZE";
const DEFAULT_PROMOTION_MIN_TRIPS = 30;
const DEFAULT_PROMOTION_MAX_TRIPS = 50;
const DEFAULT_PROMOTION_MIN_REVENUE = 20000000;
const DEFAULT_COMMISSION_PERCENT = 15.0;
const RATING_DECIMAL_PLACES = 1;

// Agent Status Enum
const AGENT_STATUS = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
  SUSPENDED: "SUSPENDED",
} as const;

// Education Level Enum
const EDUCATION_LEVEL = {
  HIGH_SCHOOL: "HIGH_SCHOOL",
  DIPLOMA: "DIPLOMA",
  BACHELORS: "BACHELORS",
  MASTERS: "MASTERS",
  PHD: "PHD",
  OTHER: "OTHER",
} as const;

// Agent Level Enum
const AGENT_LEVEL = {
  BRONZE: "BRONZE",
  SILVER: "SILVER",
  GOLD: "GOLD",
  PLATINUM: "PLATINUM",
} as const;

// ============================================================
// TypeScript Interfaces
// ============================================================
interface AgentResponse {
  id: number;
  userId: number;
  status: string;
  educationLevel: string | null;
  areasOfOperation: string[];
  certifications: any[];
  languages: string[];
  yearsOfExperience: number | null;
  specializations: string[];
  bio: string | null;
  isAvailable: boolean;
  maxActiveRequests: number;
  currentActiveRequests: number;
  performanceMetrics?: any;
  level?: string;
  totalCompletedTrips?: number;
  totalRevenueGenerated?: number | string;
  promotionProgress?: any;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: number;
    name: string | null;
    email: string | null;
    phone: string | null;
    createdAt?: Date;
  };
  assignedPlanRequests?: any[];
  reviews?: any[];
}

interface PaginatedResponse<T> {
  page: number;
  pageSize: number;
  total: number;
  items: T[];
}

// ============================================================
// Rate Limiters
// ============================================================
const limitAgentOperations = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // 100 operations per admin per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please wait before trying again." },
  keyGenerator: (req) => {
    const adminId = (req as AuthedRequest).user?.id;
    return adminId ? `admin-agents:${adminId}` : req.ip || req.socket.remoteAddress || "unknown";
  },
});

// ============================================================
// Zod Validation Schemas
// ============================================================
const certificationSchema = z.object({
  name: z.string().min(1).max(200),
  issuer: z.string().min(1).max(200).optional(),
  year: z.number().int().min(1900).max(2100).optional(),
  expiryDate: z.string().optional(),
}).strict();

const listAgentsQuerySchema = z.object({
  status: z.enum([AGENT_STATUS.ACTIVE, AGENT_STATUS.INACTIVE, AGENT_STATUS.SUSPENDED]).optional(),
  educationLevel: z.enum([
    EDUCATION_LEVEL.HIGH_SCHOOL,
    EDUCATION_LEVEL.DIPLOMA,
    EDUCATION_LEVEL.BACHELORS,
    EDUCATION_LEVEL.MASTERS,
    EDUCATION_LEVEL.PHD,
    EDUCATION_LEVEL.OTHER,
  ]).optional(),
  available: z.enum(["true", "false"]).optional().transform((val) => val === "true"),
  areasOfOperation: z.string().optional(),
  specializations: z.string().optional(),
  languages: z.string().optional(),
  page: z.string().regex(/^\d+$/).optional().transform((val) => Number(val) || 1).default("1"),
  pageSize: z.string().regex(/^\d+$/).optional().transform((val) => Number(val) || DEFAULT_PAGE_SIZE).default(String(DEFAULT_PAGE_SIZE)),
  q: z.string().min(1).max(200).optional(),
}).strict();

const getAgentParamsSchema = z.object({
  id: z.string().regex(/^\d+$/).transform(Number),
}).strict();

const createAgentSchema = z.object({
  userId: z.number().int().positive(),
  status: z.enum([AGENT_STATUS.ACTIVE, AGENT_STATUS.INACTIVE, AGENT_STATUS.SUSPENDED]).optional().default(AGENT_STATUS.ACTIVE),
  educationLevel: z.enum([
    EDUCATION_LEVEL.HIGH_SCHOOL,
    EDUCATION_LEVEL.DIPLOMA,
    EDUCATION_LEVEL.BACHELORS,
    EDUCATION_LEVEL.MASTERS,
    EDUCATION_LEVEL.PHD,
    EDUCATION_LEVEL.OTHER,
  ]).optional(),
  areasOfOperation: z.array(z.string().min(1).max(100)).max(50).optional(),
  certifications: z.array(certificationSchema).max(20).optional(),
  languages: z.array(z.string().min(1).max(50)).max(20).optional(),
  yearsOfExperience: z.number().int().min(0).max(100).optional(),
  specializations: z.array(z.string().min(1).max(100)).max(30).optional(),
  bio: z.string().max(5000).optional(),
  maxActiveRequests: z.number().int().min(1).max(100).optional().default(DEFAULT_MAX_ACTIVE_REQUESTS),
  isAvailable: z.boolean().optional().default(true),
}).strict();

const updateAgentSchema = z.object({
  status: z.enum([AGENT_STATUS.ACTIVE, AGENT_STATUS.INACTIVE, AGENT_STATUS.SUSPENDED]).optional(),
  educationLevel: z.enum([
    EDUCATION_LEVEL.HIGH_SCHOOL,
    EDUCATION_LEVEL.DIPLOMA,
    EDUCATION_LEVEL.BACHELORS,
    EDUCATION_LEVEL.MASTERS,
    EDUCATION_LEVEL.PHD,
    EDUCATION_LEVEL.OTHER,
  ]).optional(),
  areasOfOperation: z.array(z.string().min(1).max(100)).max(50).optional(),
  certifications: z.array(certificationSchema).max(20).optional(),
  languages: z.array(z.string().min(1).max(50)).max(20).optional(),
  yearsOfExperience: z.number().int().min(0).max(100).optional().nullable(),
  specializations: z.array(z.string().min(1).max(100)).max(30).optional(),
  bio: z.string().max(5000).optional().nullable(),
  isAvailable: z.boolean().optional(),
  maxActiveRequests: z.number().int().min(1).max(100).optional(),
}).strict();

const assignAgentSchema = z.object({
  planRequestId: z.number().int().positive(),
}).strict();

// ============================================================
// Helper Functions
// ============================================================
function sendError(res: Response, status: number, message: string, details?: any): void {
  res.status(status).json({
    error: message,
    ...(details && { details }),
  });
}

function sendSuccess<T>(res: Response, data?: T, message?: string, status: number = 200): void {
  res.status(status).json({
    ok: true,
    ...(message && { message }),
    ...(data && { data }),
  });
}

function getAdminId(req: AuthedRequest): number {
  return req.user!.id;
}

function formatAgentResponse(agent: any): AgentResponse {
  return {
    id: agent.id,
    userId: agent.userId,
    status: agent.status,
    educationLevel: agent.educationLevel,
    areasOfOperation: Array.isArray(agent.areasOfOperation) ? agent.areasOfOperation : [],
    certifications: Array.isArray(agent.certifications) ? agent.certifications : [],
    languages: Array.isArray(agent.languages) ? agent.languages : [],
    yearsOfExperience: agent.yearsOfExperience,
    specializations: Array.isArray(agent.specializations) ? agent.specializations : [],
    bio: agent.bio,
    isAvailable: agent.isAvailable,
    maxActiveRequests: agent.maxActiveRequests,
    currentActiveRequests: agent.currentActiveRequests,
    performanceMetrics: agent.performanceMetrics || {},
    level: agent.level || DEFAULT_AGENT_LEVEL,
    totalCompletedTrips: agent.totalCompletedTrips || 0,
    totalRevenueGenerated: agent.totalRevenueGenerated || 0,
    createdAt: agent.createdAt,
    updatedAt: agent.updatedAt,
    user: agent.user,
    ...(agent.assignedPlanRequests && { assignedPlanRequests: agent.assignedPlanRequests }),
    ...(agent.reviews && { reviews: agent.reviews }),
  };
}

// Validation middleware helper
function validate<T extends z.ZodTypeAny>(schema: T, source: "body" | "query" | "params" = "body") {
  return (req: any, res: Response, next: any) => {
    const data = source === "body" ? req.body : source === "query" ? req.query : req.params;
    const result = schema.safeParse(data);
    if (!result.success) {
      return sendError(res, 400, "Invalid request", { errors: result.error.errors });
    }
    if (source === "params") {
      req.validatedParams = result.data;
    } else if (source === "query") {
      req.validatedQuery = result.data;
    } else {
      req.validatedData = result.data;
    }
    next();
  };
}

// ============================================================
// Router Setup
// ============================================================
export const router = Router();
router.use(requireAuth as unknown as RequestHandler);
router.use(requireRole("ADMIN") as unknown as RequestHandler);
router.use(limitAgentOperations);

// ============================================================
// GET /api/admin/agents
// ============================================================
router.get("/", validate(listAgentsQuerySchema, "query"), async (req: any, res) => {
  try {
    const {
      status,
      educationLevel,
      available,
      areasOfOperation,
      specializations,
      languages,
      page,
      pageSize,
      q,
    } = req.validatedQuery;

    const pageNum = Math.max(1, page);
    const pageSizeNum = Math.min(Math.max(1, pageSize), MAX_PAGE_SIZE);
    const skip = (pageNum - 1) * pageSizeNum;
    const take = pageSizeNum;

    // Build where clause with proper Prisma types
    const where: Prisma.AgentWhereInput = {
      user: {
        role: "AGENT",
      },
    };

    if (status) {
      where.status = status;
    }

    if (available !== undefined) {
      where.isAvailable = available;
    }

    if (educationLevel) {
      where.educationLevel = educationLevel;
    }

    // Text search
    if (q) {
      const sanitizedQ = sanitizeText(q);
      where.user = {
        role: "AGENT",
        OR: [
          { name: { contains: sanitizedQ } },
          { email: { contains: sanitizedQ } },
          { phone: { contains: sanitizedQ } },
        ],
      };
    }

    // Fetch agents with user info
    const [total, agents] = await Promise.all([
      prisma.agent.count({ where }),
      prisma.agent.findMany({
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

    // Filter by JSON fields if provided (in memory - Prisma JSON filtering is limited in MySQL)
    let filteredAgents = agents;

    if (areasOfOperation) {
      const areaFilter = sanitizeText(areasOfOperation).toLowerCase();
      filteredAgents = filteredAgents.filter((agent) => {
        const areas = agent.areasOfOperation;
        if (!Array.isArray(areas)) return false;
        return areas.some((area) => {
          if (typeof area !== "string") return false;
          return String(area).toLowerCase().includes(areaFilter);
        });
      });
    }

    if (specializations) {
      const specFilter = sanitizeText(specializations).toLowerCase();
      filteredAgents = filteredAgents.filter((agent) => {
        const specs = agent.specializations;
        if (!Array.isArray(specs)) return false;
        return specs.some((spec) => {
          if (typeof spec !== "string") return false;
          return String(spec).toLowerCase().includes(specFilter);
        });
      });
    }

    if (languages) {
      const langFilter = sanitizeText(languages).toLowerCase();
      filteredAgents = filteredAgents.filter((agent) => {
        const langs = agent.languages;
        if (!Array.isArray(langs)) return false;
        return langs.some((lang) => {
          if (typeof lang !== "string") return false;
          return String(lang).toLowerCase().includes(langFilter);
        });
      });
    }

    // Map to response format
    const items = filteredAgents.map(formatAgentResponse);

    // Adjust total count after filtering
    const filteredTotal = areasOfOperation || specializations || languages
      ? items.length
      : total;

    const response: PaginatedResponse<AgentResponse> = {
      page: pageNum,
      pageSize: pageSizeNum,
      total: filteredTotal,
      items,
    };

    sendSuccess(res, response);
  } catch (err: any) {
    console.error("[GET /admin/agents] Error:", err);
    sendError(res, 500, "Failed to fetch agents");
  }
});

// ============================================================
// GET /api/admin/agents/:id
// ============================================================
router.get("/:id", validate(getAgentParamsSchema, "params"), async (req: any, res) => {
  try {
    const { id } = req.validatedParams;

    const agent = await prisma.agent.findUnique({
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
            communicationRating: true,
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
      return sendError(res, 404, "Agent not found");
    }

    // Calculate average ratings from all reviews
    const reviews = agent.reviews || [];
    let avgPunctualityRating = 0;
    let avgCustomerCareRating = 0;
    let avgCommunicationRating = 0;
    const totalReviews = reviews.length;

    if (totalReviews > 0) {
      const sumPunctuality = reviews.reduce((sum, review) => sum + (review.punctualityRating || 0), 0);
      const sumCustomerCare = reviews.reduce((sum, review) => sum + (review.customerCareRating || 0), 0);
      const sumCommunication = reviews.reduce((sum, review) => sum + (review.communicationRating || 0), 0);
      avgPunctualityRating = Math.round((sumPunctuality / totalReviews) * Math.pow(10, RATING_DECIMAL_PLACES)) / Math.pow(10, RATING_DECIMAL_PLACES);
      avgCustomerCareRating = Math.round((sumCustomerCare / totalReviews) * Math.pow(10, RATING_DECIMAL_PLACES)) / Math.pow(10, RATING_DECIMAL_PLACES);
      avgCommunicationRating = Math.round((sumCommunication / totalReviews) * Math.pow(10, RATING_DECIMAL_PLACES)) / Math.pow(10, RATING_DECIMAL_PLACES);
    }

    // Update performanceMetrics with calculated averages
    const performanceMetrics = (agent.performanceMetrics as any) || {};
    performanceMetrics.punctualityRating = avgPunctualityRating;
    performanceMetrics.customerCareRating = avgCustomerCareRating;
    performanceMetrics.communicationRating = avgCommunicationRating;
    performanceMetrics.totalReviews = totalReviews;

    // Get promotion thresholds from system settings
    const systemSettings = await prisma.systemSetting.findUnique({ where: { id: 1 } });
    const minTrips = systemSettings?.agentPromotionMinTrips || DEFAULT_PROMOTION_MIN_TRIPS;
    const maxTrips = systemSettings?.agentPromotionMaxTrips || DEFAULT_PROMOTION_MAX_TRIPS;
    const minRevenue = systemSettings?.agentPromotionMinRevenue || DEFAULT_PROMOTION_MIN_REVENUE;
    const commissionPercent = systemSettings?.agentCommissionPercent || DEFAULT_COMMISSION_PERCENT;

    // Calculate promotion progress
    const currentTrips = agent.totalCompletedTrips || 0;
    const currentRevenue = Number(agent.totalRevenueGenerated || 0);
    const tripsProgress = Math.min(100, Math.round((currentTrips / minTrips) * 100));
    const revenueProgress = Math.min(100, Math.round((currentRevenue / minRevenue) * 100));
    const overallProgress = Math.min(100, Math.round((tripsProgress + revenueProgress) / 2));

    // Determine if eligible for promotion (must meet BOTH criteria)
    const eligibleForPromotion = currentTrips >= minTrips && currentRevenue >= minRevenue;

    const response: AgentResponse = {
      ...formatAgentResponse(agent),
      performanceMetrics,
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
      assignedPlanRequests: agent.assignedPlanRequests || [],
      reviews: reviews,
    };

    sendSuccess(res, response);
  } catch (err: any) {
    console.error("[GET /admin/agents/:id] Error:", err);
    sendError(res, 500, "Failed to fetch agent");
  }
});

// ============================================================
// POST /api/admin/agents
// ============================================================
router.post("/", validate(createAgentSchema), async (req: any, res) => {
  try {
    const validatedData = req.validatedData;
    const adminId = getAdminId(req as AuthedRequest);

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: validatedData.userId },
    });

    if (!user) {
      return sendError(res, 404, "User not found");
    }

    // Check if agent profile already exists
    const existingAgent = await prisma.agent.findUnique({
      where: { userId: validatedData.userId },
    });

    if (existingAgent) {
      return sendError(res, 400, "Agent profile already exists for this user");
    }

    // Prepare data for agent creation with sanitization
    const agentData: Prisma.AgentCreateInput = {
      user: { connect: { id: validatedData.userId } },
      status: validatedData.status || DEFAULT_AGENT_STATUS,
      educationLevel: validatedData.educationLevel || null,
      yearsOfExperience: validatedData.yearsOfExperience || null,
      bio: validatedData.bio ? sanitizeText(validatedData.bio) : null,
      maxActiveRequests: validatedData.maxActiveRequests || DEFAULT_MAX_ACTIVE_REQUESTS,
      isAvailable: validatedData.isAvailable !== undefined ? validatedData.isAvailable : true,
      currentActiveRequests: 0,
      areasOfOperation: validatedData.areasOfOperation && validatedData.areasOfOperation.length > 0
        ? validatedData.areasOfOperation.map((area: string) => sanitizeText(area))
        : null,
      certifications: validatedData.certifications && validatedData.certifications.length > 0
        ? validatedData.certifications.map((cert: any) => ({
            name: sanitizeText(cert.name),
            issuer: cert.issuer ? sanitizeText(cert.issuer) : undefined,
            year: cert.year,
            expiryDate: cert.expiryDate ? sanitizeText(cert.expiryDate) : undefined,
          }))
        : null,
      languages: validatedData.languages && validatedData.languages.length > 0
        ? validatedData.languages.map((lang: string) => sanitizeText(lang))
        : null,
      specializations: validatedData.specializations && validatedData.specializations.length > 0
        ? validatedData.specializations.map((spec: string) => sanitizeText(spec))
        : null,
    };

    // Use transaction to create agent and update user role
    const result = await prisma.$transaction(async (tx) => {
      // Update user role to AGENT if not already
      if (user.role !== "AGENT") {
        await tx.user.update({
          where: { id: validatedData.userId },
          data: { role: "AGENT" },
        });
      }

      // Create agent profile
      const agent = await tx.agent.create({
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

      return agent;
    });

    // Audit log
    await audit(req as AuthedRequest, "AGENT_CREATED", `agent:${result.id}`, null, {
      userId: validatedData.userId,
      status: result.status,
    });

    sendSuccess(res, formatAgentResponse(result), "Agent created successfully", 201);
  } catch (err: any) {
    console.error("[POST /admin/agents] Error:", err);
    if (err.code === "P2002") {
      return sendError(res, 400, "Agent profile already exists for this user");
    }
    sendError(res, 500, "Failed to create agent", { message: err.message });
  }
});

// ============================================================
// PATCH /api/admin/agents/:id
// ============================================================
router.patch("/:id", validate(getAgentParamsSchema, "params"), validate(updateAgentSchema, "body"), async (req: any, res) => {
  try {
    const { id } = req.validatedParams;
    const validatedData = req.validatedData;
    const adminId = getAdminId(req as AuthedRequest);

    // Get existing agent for audit
    const existingAgent = await prisma.agent.findUnique({
      where: { id: Number(id) },
    });

    if (!existingAgent) {
      return sendError(res, 404, "Agent not found");
    }

    // Prepare update data with sanitization
    const updateData: Prisma.AgentUpdateInput = {};

    if (validatedData.status !== undefined) updateData.status = validatedData.status;
    if (validatedData.educationLevel !== undefined) updateData.educationLevel = validatedData.educationLevel;
    if (validatedData.yearsOfExperience !== undefined) updateData.yearsOfExperience = validatedData.yearsOfExperience;
    if (validatedData.bio !== undefined) updateData.bio = validatedData.bio ? sanitizeText(validatedData.bio) : null;
    if (validatedData.isAvailable !== undefined) updateData.isAvailable = validatedData.isAvailable;
    if (validatedData.maxActiveRequests !== undefined) updateData.maxActiveRequests = validatedData.maxActiveRequests;

    // Handle JSON array fields
    if (validatedData.areasOfOperation !== undefined) {
      updateData.areasOfOperation = validatedData.areasOfOperation.length > 0
        ? validatedData.areasOfOperation.map((area: string) => sanitizeText(area))
        : null;
    }

    if (validatedData.certifications !== undefined) {
      updateData.certifications = validatedData.certifications.length > 0
        ? validatedData.certifications.map((cert: any) => ({
            name: sanitizeText(cert.name),
            issuer: cert.issuer ? sanitizeText(cert.issuer) : undefined,
            year: cert.year,
            expiryDate: cert.expiryDate ? sanitizeText(cert.expiryDate) : undefined,
          }))
        : null;
    }

    if (validatedData.languages !== undefined) {
      updateData.languages = validatedData.languages.length > 0
        ? validatedData.languages.map((lang: string) => sanitizeText(lang))
        : null;
    }

    if (validatedData.specializations !== undefined) {
      updateData.specializations = validatedData.specializations.length > 0
        ? validatedData.specializations.map((spec: string) => sanitizeText(spec))
        : null;
    }

    const agent = await prisma.agent.update({
      where: { id: Number(id) },
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

    // Audit log
    await audit(req as AuthedRequest, "AGENT_UPDATED", `agent:${agent.id}`, existingAgent, agent);

    sendSuccess(res, formatAgentResponse(agent), "Agent updated successfully");
  } catch (err: any) {
    console.error("[PATCH /admin/agents/:id] Error:", err);
    if (err.code === "P2025") {
      return sendError(res, 404, "Agent not found");
    }
    sendError(res, 500, "Failed to update agent");
  }
});

// ============================================================
// POST /api/admin/agents/:id/assign-to-request
// ============================================================
router.post("/:id/assign-to-request", validate(getAgentParamsSchema, "params"), validate(assignAgentSchema, "body"), async (req: any, res) => {
  try {
    const { id } = req.validatedParams;
    const { planRequestId } = req.validatedData;
    const adminId = getAdminId(req as AuthedRequest);

    const agentId = Number(id);

    // Use transaction for atomic assignment
    const result = await prisma.$transaction(async (tx) => {
      // Check if agent exists and is available
      const agent = await tx.agent.findUnique({
        where: { id: agentId },
        include: {
          user: {
            select: {
              name: true,
            },
          },
        },
      });

      if (!agent) {
        throw new Error("Agent not found");
      }

      if (!agent.isAvailable) {
        throw new Error("Agent is not available");
      }

      if (agent.currentActiveRequests >= agent.maxActiveRequests) {
        throw new Error("Agent has reached maximum active requests");
      }

      // Check if plan request exists
      const planRequest = await tx.planRequest.findUnique({
        where: { id: planRequestId },
      });

      if (!planRequest) {
        throw new Error("Plan request not found");
      }

      // Update plan request with agent assignment
      await tx.planRequest.update({
        where: { id: planRequestId },
        data: {
          assignedAgentId: agentId,
          assignedAgent: agent.user?.name || null, // Keep legacy field updated
        },
      });

      // Update agent's current active requests count
      const updatedAgent = await tx.agent.update({
        where: { id: agentId },
        data: {
          currentActiveRequests: agent.currentActiveRequests + 1,
        },
      });

      return { agentId, planRequestId, agentName: agent.user?.name };
    });

    // Audit log
    await audit(req as AuthedRequest, "AGENT_ASSIGNED", `agent:${result.agentId}`, null, {
      planRequestId: result.planRequestId,
      agentName: result.agentName,
    });

    sendSuccess(res, {
      success: true,
      message: "Agent assigned successfully",
      agentId: result.agentId,
      planRequestId: result.planRequestId,
    });
  } catch (err: any) {
    console.error("[POST /admin/agents/:id/assign-to-request] Error:", err);
    if (err.message === "Agent not found") {
      return sendError(res, 404, "Agent not found");
    }
    if (err.message === "Plan request not found") {
      return sendError(res, 404, "Plan request not found");
    }
    if (err.message === "Agent is not available") {
      return sendError(res, 400, "Agent is not available");
    }
    if (err.message === "Agent has reached maximum active requests") {
      return sendError(res, 400, "Agent has reached maximum active requests");
    }
    sendError(res, 500, "Failed to assign agent");
  }
});

export default router;
