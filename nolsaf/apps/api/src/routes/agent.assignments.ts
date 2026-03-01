import { Router } from "express";
import type { RequestHandler } from "express";
import { z } from "zod";
import { prisma } from "@nolsaf/prisma";
import { AuthedRequest, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { limitAgentNotifyAdmin, limitAgentPortalRead } from "../middleware/rateLimit.js";

const router = Router();

const RATING_DECIMAL_PLACES = 1;

function roundRating(value: number) {
  const f = Math.pow(10, RATING_DECIMAL_PLACES);
  return Math.round(value * f) / f;
}

const listQuerySchema = z
  .object({
    page: z
      .string()
      .regex(/^\d+$/)
      .optional()
      .default("1")
      .transform((v) => Number(v) || 1),
    pageSize: z
      .string()
      .regex(/^\d+$/)
      .optional()
      .default("20")
      .transform((v) => Math.min(Math.max(Number(v) || 20, 1), 100)),
    status: z.string().min(1).max(50).optional(),
  })
  .strict();

const idParamsSchema = z
  .object({
    id: z.string().min(1).max(64),
  })
  .strict();

const notifyAdminSchema = z
  .object({
    title: z.string().min(1).max(200),
    body: z.string().min(1).max(5000),
    meta: z.any().optional(),
  })
  .strict();

type AgentGateResult =
  | { ok: true; agent: any }
  | { ok: false; status: number; error: string; message: string };

async function getActiveAgent(req: AuthedRequest): Promise<AgentGateResult> {
  const userId = req.user!.id;

  const agent = await prisma.agent.findUnique({
    where: { userId },
    select: {
      id: true,
      status: true,
      level: true,
      educationLevel: true,
      areasOfOperation: true,
      certifications: true,
      languages: true,
      yearsOfExperience: true,
      specializations: true,
      bio: true,
      isAvailable: true,
      maxActiveRequests: true,
      currentActiveRequests: true,
      createdAt: true,
      updatedAt: true,
      applications: {
        take: 1,
        orderBy: { submittedAt: 'desc' },
        select: {
          id: true,
          status: true,
          submittedAt: true,
          reviewedAt: true,
          fullName: true,
          nationality: true,
          region: true,
          district: true,
          job: {
            select: {
              id: true,
              title: true,
              type: true,
              category: true,
              department: true,
            },
          },
        },
      },
      user: { select: { id: true, name: true, fullName: true, email: true, phone: true, role: true, nationality: true, region: true, district: true } },
    },
  });

  if (!agent) {
    return {
      ok: false,
      status: 404,
      error: "AGENT_PROFILE_MISSING",
      message: "Agent profile not found",
    };
  }

  const status = String(agent.status || "").toUpperCase();
  if (status !== "ACTIVE") {
    return {
      ok: false,
      status: 403,
      error: "AGENT_INACTIVE",
      message: "Agent account inactive",
    };
  }

  return { ok: true, agent };
}

// GET /api/agent/me
router.get(
  "/me",
  requireRole("AGENT") as RequestHandler,
  limitAgentPortalRead as any,
  asyncHandler(async (req: any, res) => {
    const gate = await getActiveAgent(req as AuthedRequest);
    if (!gate.ok) return res.status(gate.status).json({ ok: false, error: gate.error, message: gate.message });
    const agent = gate.agent;

    // Best-effort sync: populate nationality/region/district/fullName on the User record
    // from the linked JobApplication if they are missing. This covers agents who were
    // provisioned before these fields were copied during the HIRED flow.
    try {
      const linkedApp = (agent as any).applications?.[0];
      const u = agent.user as any;
      if (linkedApp && (!u?.nationality || !u?.region || !u?.district || !u?.fullName)) {
        const appNationality = typeof linkedApp.nationality === "string" ? linkedApp.nationality.trim() : "";
        const appRegion     = typeof linkedApp.region      === "string" ? linkedApp.region.trim()      : "";
        const appDistrict   = typeof linkedApp.district    === "string" ? linkedApp.district.trim()    : "";
        const appFullName   = typeof linkedApp.fullName    === "string" ? linkedApp.fullName.trim()    : "";
        const syncUpdate: Record<string, string> = {};
        if (!u?.nationality && appNationality) syncUpdate.nationality = appNationality;
        if (!u?.region      && appRegion)      syncUpdate.region      = appRegion;
        if (!u?.district    && appDistrict)    syncUpdate.district    = appDistrict;
        if (!u?.fullName    && appFullName)    syncUpdate.fullName    = appFullName;
        if (Object.keys(syncUpdate).length > 0) {
          await prisma.user.update({ where: { id: u.id }, data: syncUpdate as any });
          Object.assign(agent.user, syncUpdate); // reflect in current response
        }
      }
    } catch {
      // non-blocking — ignore sync failures
    }

    const reviewsAgg = await prisma.agentReview.aggregate({
      where: { agentId: agent.id },
      _avg: {
        punctualityRating: true,
        customerCareRating: true,
        communicationRating: true,
      },
      _count: { _all: true },
    });

    const avgPunctuality = typeof (reviewsAgg as any)?._avg?.punctualityRating === "number" ? (reviewsAgg as any)._avg.punctualityRating : null;
    const avgCustomerCare = typeof (reviewsAgg as any)?._avg?.customerCareRating === "number" ? (reviewsAgg as any)._avg.customerCareRating : null;
    const avgCommunication = typeof (reviewsAgg as any)?._avg?.communicationRating === "number" ? (reviewsAgg as any)._avg.communicationRating : null;
    const totalReviews = Number((reviewsAgg as any)?._count?._all ?? 0) || 0;

    const overallRatingRaw =
      avgPunctuality != null && avgCustomerCare != null && avgCommunication != null
        ? (avgPunctuality + avgCustomerCare + avgCommunication) / 3
        : null;

    const performanceMetrics = {
      totalReviews,
      punctualityRating: avgPunctuality != null ? roundRating(avgPunctuality) : null,
      customerCareRating: avgCustomerCare != null ? roundRating(avgCustomerCare) : null,
      communicationRating: avgCommunication != null ? roundRating(avgCommunication) : null,
      overallRating: overallRatingRaw != null ? roundRating(overallRatingRaw) : null,
    };

    return res.json({
      ok: true,
      agent: {
        id: agent.id,
        status: agent.status,
        level: (agent as any).level ?? null,
        educationLevel: (agent as any).educationLevel ?? null,
        areasOfOperation: (agent as any).areasOfOperation ?? null,
        certifications: (agent as any).certifications ?? null,
        languages: (agent as any).languages ?? null,
        yearsOfExperience: (agent as any).yearsOfExperience ?? null,
        specializations: (agent as any).specializations ?? null,
        bio: (agent as any).bio ?? null,
        isAvailable: (agent as any).isAvailable ?? null,
        maxActiveRequests: (agent as any).maxActiveRequests ?? null,
        currentActiveRequests: (agent as any).currentActiveRequests ?? null,
        employmentCommencedAt: (agent as any).createdAt ?? null,
        employmentType: (agent as any)?.applications?.[0]?.job?.type ?? null,
        employmentTitle: (agent as any)?.applications?.[0]?.job?.title ?? null,
        application: (agent as any).applications?.[0] ?? null,
        performanceMetrics,
        user: agent.user,
      },
    });
  })
);

// POST /api/agent/notify-admin
// Allows an agent to send an inbox notification/message to admins.
router.post(
  "/notify-admin",
  requireRole("AGENT") as RequestHandler,
  limitAgentNotifyAdmin as any,
  asyncHandler(async (req: any, res) => {
    const authed = req?.user;
    const authedId = authed?.id;
    const authedRole = String(authed?.role ?? "").toUpperCase();
    if (typeof authedId !== "number" || !Number.isFinite(authedId) || authedId <= 0 || authedRole !== "AGENT") {
      return res.status(401).json({ ok: false, error: "unauthorized" });
    }

    const parsed = notifyAdminSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: "invalid_body" });
    }

    const gate = await getActiveAgent(req as AuthedRequest);
    if (!gate.ok) return res.status(gate.status).json({ ok: false, error: gate.error, message: gate.message });
    const agent = gate.agent;
    if (agent?.user?.id && agent.user.id !== authedId) {
      return res.status(403).json({ ok: false, error: "forbidden" });
    }

    const meta = {
      ...(parsed.data.meta && typeof parsed.data.meta === "object" ? parsed.data.meta : {}),
      source: "agent",
      agentId: agent.id,
      agentUserId: agent.user?.id,
      agentName: agent.user?.name ?? null,
      agentEmail: agent.user?.email ?? null,
    };

    const created = await prisma.notification.create({
      data: {
        userId: null,
        ownerId: null,
        title: parsed.data.title,
        body: parsed.data.body,
        unread: true,
        meta,
        type: "agent",
      },
      select: { id: true },
    });

    return res.json({ ok: true, id: created.id });
  })
);

// GET /api/agent/assignments
// Currently backed by PlanRequest assignments (AssignedAgent relation).
router.get(
  "/assignments",
  requireRole("AGENT") as RequestHandler,
  limitAgentPortalRead as any,
  asyncHandler(async (req: any, res) => {
    const gate = await getActiveAgent(req as AuthedRequest);
    if (!gate.ok) return res.status(gate.status).json({ ok: false, error: gate.error, message: gate.message });
    const agent = gate.agent;

    const parsed = listQuerySchema.safeParse(req.query || {});
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid query", details: parsed.error.flatten() });
    }

    const { page, pageSize, status } = parsed.data;
    const skip = (page - 1) * pageSize;

    const where: any = { assignedAgentId: agent.id };
    if (status) where.status = String(status);

    // Stats (across all statuses for this agent, ignoring `status` filter)
    const grouped = await prisma.planRequest.groupBy({
      by: ["status"],
      where: { assignedAgentId: agent.id },
      _count: { _all: true },
    });

    const total = grouped.reduce((acc, g) => acc + (g._count?._all || 0), 0);
    const completed = grouped
      .filter((g) => String(g.status).toUpperCase() === "COMPLETED")
      .reduce((acc, g) => acc + (g._count?._all || 0), 0);
    const inProgress = grouped
      .filter((g) => String(g.status).toUpperCase() === "IN_PROGRESS")
      .reduce((acc, g) => acc + (g._count?._all || 0), 0);

    const [items, filteredTotal] = await Promise.all([
      prisma.planRequest.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip,
        take: pageSize,
        select: {
          id: true,
          tripType: true,
          role: true,
          status: true,
          fullName: true,
          email: true,
          phone: true,
          destinations: true,
          notes: true,
          createdAt: true,
          respondedAt: true,
        },
      }),
      prisma.planRequest.count({ where }),
    ]);

    return res.json({
      ok: true,
      page,
      pageSize,
      total: status ? filteredTotal : total,
      completed,
      inProgress,
      items: items.map((p) => ({
        id: p.id,
        title: p.destinations
          ? `${p.tripType} • ${p.destinations}`
          : `${p.tripType} • ${p.fullName}`,
        description: p.notes || null,
        status: p.status,
        createdAt: p.createdAt,
        completedAt: p.respondedAt || null,
        // Staff context is not yet modeled; keep null for now.
        assignedBy: null,
        // Useful context for the agent UI (safe to show the agent)
        requester: {
          fullName: p.fullName,
          email: p.email,
          phone: p.phone,
          role: p.role,
        },
      })),
    });
  })
);

// GET /api/agent/assignments/:id
router.get(
  "/assignments/:id",
  requireRole("AGENT") as RequestHandler,
  limitAgentPortalRead as any,
  asyncHandler(async (req: any, res) => {
    const gate = await getActiveAgent(req as AuthedRequest);
    if (!gate.ok) return res.status(gate.status).json({ ok: false, error: gate.error, message: gate.message });
    const agent = gate.agent;

    const paramsParsed = idParamsSchema.safeParse(req.params || {});
    if (!paramsParsed.success) {
      return res.status(400).json({ error: "Invalid id" });
    }

    const idNum = Number(paramsParsed.data.id);
    if (!Number.isFinite(idNum) || idNum <= 0) {
      return res.status(400).json({ error: "Invalid id" });
    }

    const p = await prisma.planRequest.findFirst({
      where: { id: idNum, assignedAgentId: agent.id },
      select: {
        id: true,
        tripType: true,
        role: true,
        status: true,
        fullName: true,
        email: true,
        phone: true,
        destinations: true,
        notes: true,
        createdAt: true,
        respondedAt: true,
        adminResponse: true,
        suggestedItineraries: true,
        requiredPermits: true,
        estimatedTimeline: true,
      },
    });

    if (!p) return res.status(404).json({ error: "Not found" });

    return res.json({
      ok: true,
      item: {
        id: p.id,
        title: p.destinations ? `${p.tripType} • ${p.destinations}` : `${p.tripType} • ${p.fullName}`,
        description: p.notes || null,
        status: p.status,
        createdAt: p.createdAt,
        completedAt: p.respondedAt || null,
        assignedBy: null,
        reviewedBy: null,
        requester: {
          fullName: p.fullName,
          email: p.email,
          phone: p.phone,
          role: p.role,
        },
        outputs: {
          adminResponse: p.adminResponse || null,
          suggestedItineraries: p.suggestedItineraries || null,
          requiredPermits: p.requiredPermits || null,
          estimatedTimeline: p.estimatedTimeline || null,
        },
      },
    });
  })
);

export default router;
