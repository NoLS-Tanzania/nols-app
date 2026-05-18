import { Router } from "express";
import type { RequestHandler } from "express";
import { z } from "zod";
import { prisma } from "@nolsaf/prisma";
import { AuthedRequest, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import {
  limitAgentNotifyAdmin,
  limitAgentPortalRead,
  limitAgentProfileWrite,
  limitAgentRevenueClaim,
} from "../middleware/rateLimit.js";

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

const vehicleAssetSchema = z
  .object({
    id: z.string().max(80).optional().default(""),
    type: z.string().max(120).optional().default(""),
    quantity: z.string().max(40).optional().default(""),
    seatsPerVehicle: z.string().max(40).optional().default(""),
    registrationNumber: z.string().max(80).optional().default(""),
    ownedBy: z.string().max(80).optional().default(""),
    serviceMode: z.string().max(80).optional().default(""),
    notes: z.string().max(1000).optional().default(""),
  });

const itineraryDaySchema = z
  .object({
    id: z.string().max(80).optional().default(""),
    day: z.number().int().min(1).max(365).optional().default(1),
    title: z.string().max(160).optional().default(""),
    description: z.string().max(1500).optional().default(""),
  });

const packageItemSchema = z
  .object({
    id: z.string().max(80).optional().default(""),
    name: z.string().max(180).optional().default(""),
    description: z.string().max(2000).optional().default(""),
    destination: z.string().max(180).optional().default(""),
    category: z.string().max(120).optional().default(""),
    duration: z.string().max(80).optional().default(""),
    minPax: z.string().max(40).optional().default(""),
    maxPax: z.string().max(40).optional().default(""),
    pricePerPerson: z.string().max(80).optional().default(""),
    currency: z.string().max(10).optional().default(""),
    mode: z.string().max(80).optional().default(""),
    accommodation: z.string().max(160).optional().default(""),
    mealPlan: z.string().max(160).optional().default(""),
    difficulty: z.string().max(80).optional().default(""),
    meetingPoint: z.string().max(240).optional().default(""),
    included: z.array(z.string().max(240)).max(80).optional().default([]),
    excluded: z.array(z.string().max(240)).max(80).optional().default([]),
    itinerary: z.array(itineraryDaySchema).max(60).optional().default([]),
    notes: z.string().max(1500).optional().default(""),
  });

const seasonalPriceSchema = z
  .object({
    id: z.string().max(80).optional().default(""),
    seasonName: z.string().max(120).optional().default(""),
    startMonth: z.string().max(40).optional().default(""),
    endMonth: z.string().max(40).optional().default(""),
    pricePerPerson: z.string().max(80).optional().default(""),
    currency: z.string().max(10).optional().default(""),
    notes: z.string().max(1000).optional().default(""),
  });

const operatorProfileSchema = z
  .object({
    companyName: z.string().max(160).optional().default(""),
    companyLogoUrl: z.string().max(1000).optional().default(""),
    businessAddress: z.string().max(500).optional().default(""),
    physicalLocation: z.string().max(500).optional().default(""),
    operatingRegions: z.array(z.string().max(160)).max(80).optional().default([]),
    contactPhone: z.string().max(80).optional().default(""),
    contactEmail: z.string().max(160).optional().default(""),
    whatsapp: z.string().max(80).optional().default(""),
    description: z.string().max(1200).optional().default(""),
    tourismTypes: z.array(z.string().max(120)).max(40).optional().default([]),
    tools: z.array(z.string().max(120)).max(100).optional().default([]),
    vehicles: z.array(vehicleAssetSchema).max(80).optional().default([]),
    services: z.array(z.string().max(160)).max(100).optional().default([]),
    addOns: z.array(z.string().max(160)).max(100).optional().default([]),
    seasonalPricing: z.string().max(2000).optional().default(""),
    packages: z.string().max(2000).optional().default(""),
    packageItems: z.array(packageItemSchema).max(80).optional().default([]),
    seasonalPrices: z.array(seasonalPriceSchema).max(60).optional().default([]),
    capacityNotes: z.string().max(1200).optional().default(""),
    maxTripsPerDay: z.string().max(40).optional().default(""),
    minimumBookingNotice: z.string().max(120).optional().default(""),
    guidesAvailable: z.string().max(40).optional().default(""),
    peakSeasonAvailability: z.string().max(240).optional().default(""),
    blockedPeriods: z.string().max(800).optional().default(""),
    gallery: z.array(z.string().max(1000)).max(160).optional().default([]),
    classifiedPhotos: z.record(z.string(), z.array(z.string().max(1000)).max(60)).optional().default({}),
  });

const SERVER_OWNED_OPERATOR_PROFILE_KEYS = [
  "review",
  "reviewStatus",
  "reviewReason",
  "reviewedAt",
  "reviewedByAdminId",
  "submittedAt",
  "approvedAt",
  "approvedSnapshot",
];

function preserveServerOwnedProfileFields(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const source = value as Record<string, unknown>;
  return SERVER_OWNED_OPERATOR_PROFILE_KEYS.reduce<Record<string, unknown>>((acc, key) => {
    if (Object.prototype.hasOwnProperty.call(source, key)) acc[key] = source[key];
    return acc;
  }, {});
}

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
      operatorProfile: true,
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
  if (status === "SUSPENDED") {
    return {
      ok: false,
      status: 403,
      error: "AGENT_SUSPENDED",
      message: "Account suspended pending investigation",
    };
  }
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
        operatorProfile: (agent as any).operatorProfile ?? null,
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

// PATCH /api/agent/operator-profile
router.patch(
  "/operator-profile",
  requireRole("AGENT") as RequestHandler,
  limitAgentProfileWrite as any,
  asyncHandler(async (req: any, res) => {
    const gate = await getActiveAgent(req as AuthedRequest);
    if (!gate.ok) return res.status(gate.status).json({ ok: false, error: gate.error, message: gate.message });

    const parsed = operatorProfileSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({
        ok: false,
        error: "invalid_operator_profile",
        details: parsed.error.flatten(),
      });
    }

    const serverOwnedFields = preserveServerOwnedProfileFields(gate.agent.operatorProfile);
    const updated = await prisma.agent.update({
      where: { id: gate.agent.id },
      data: { operatorProfile: { ...parsed.data, ...serverOwnedFields } as any },
      select: { id: true, operatorProfile: true, updatedAt: true },
    });

    return res.json({ ok: true, agent: updated });
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
          dateFrom: true,
          dateTo: true,
          budget: true,
          notes: true,
          createdAt: true,
          respondedAt: true,
          user: {
            select: {
              nationality: true,
            },
          },
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
        tripDate: p.dateFrom,
        amountPaid: p.budget != null ? Number(p.budget) : null,
        tripType: p.tripType,
        completedAt: p.respondedAt || null,
        // Staff context is not yet modeled; keep null for now.
        assignedBy: null,
        // Useful context for the agent UI (safe to show the agent)
        requester: {
          fullName: p.fullName,
          email: p.email,
          phone: p.phone,
          role: p.role,
          nationality: p.user?.nationality ?? null,
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

// GET /api/agent/revenues
// Returns per-trip revenue breakdown + summary totals for the authenticated agent.
router.get(
  "/revenues",
  requireRole("AGENT") as RequestHandler,
  limitAgentPortalRead as any,
  asyncHandler(async (req: any, res) => {
    const gate = await getActiveAgent(req as AuthedRequest);
    if (!gate.ok) return res.status(gate.status).json({ ok: false, error: gate.error, message: gate.message });
    const agent = gate.agent;

    // Fetch commission percentage from SystemSettings (fallback to 15%).
    const settings = await prisma.systemSetting.findFirst({ select: { agentCommissionPercent: true } });
    const commissionPct = Number(settings?.agentCommissionPercent ?? 15);

    // Fetch all plan requests assigned to this agent.
    const trips = await prisma.planRequest.findMany({
      where: { assignedAgentId: agent.id },
      select: {
        id: true,
        tripType: true,
        destinations: true,
        fullName: true,
        status: true,
        budget: true,
        dateFrom: true,
        dateTo: true,
        createdAt: true,
        respondedAt: true,
        user: { select: { nationality: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Build per-trip revenue items.
    const items = trips.map((t) => {
      const budgetNum = t.budget ? Number(t.budget) : 0;
      const commissionAmount = budgetNum > 0 ? Math.round((budgetNum * commissionPct) / 100) : 0;
      const agentEarning = budgetNum > 0 ? Math.round(budgetNum - commissionAmount) : 0;
      const isCompleted = ["COMPLETED", "DONE", "CLOSED"].includes(String(t.status).toUpperCase());
      return {
        id: t.id,
        tripType: t.tripType,
        title: t.destinations ? `${t.tripType} • ${t.destinations}` : `${t.tripType} • ${t.fullName}`,
        status: t.status,
        isCompleted,
        budget: budgetNum,
        commissionPercent: commissionPct,
        commissionAmount,
        agentEarning,
        currency: "TZS",
        dateFrom: t.dateFrom,
        dateTo: t.dateTo,
        createdAt: t.createdAt,
        completedAt: t.respondedAt ?? null,
        client: t.fullName,
        nationality: t.user?.nationality ?? null,
      };
    });

    // Summary totals.
    const completedItems = items.filter((i) => i.isCompleted);
    const totalTrips = items.length;
    const completedTrips = completedItems.length;
    const totalRevenue = completedItems.reduce((s, i) => s + i.agentEarning, 0);
    const pendingRevenue = items
      .filter((i) => !i.isCompleted)
      .reduce((s, i) => s + i.agentEarning, 0);
    const totalCommissionPaid = completedItems.reduce((s, i) => s + i.commissionAmount, 0);
    const lifetimeRevenue = Number(agent.totalRevenueGenerated ?? 0);

    return res.json({
      ok: true,
      summary: {
        totalTrips,
        completedTrips,
        totalRevenue,
        pendingRevenue,
        totalCommissionPaid,
        commissionPercent: commissionPct,
        currency: "TZS",
        lifetimeRevenue,
      },
      items,
    });
  })
);

const claimPayoutSchema = z
  .object({
    planRequestId: z.number().int().positive(),
  })
  .strict();

// POST /api/agent/revenues/claim
// Allows an agent to request a payout for a completed trip
router.post(
  "/revenues/claim",
  requireRole("AGENT") as RequestHandler,
  limitAgentRevenueClaim as any,
  asyncHandler(async (req: any, res) => {
    const authed = req?.user;
    const authedId = authed?.id;
    const authedRole = String(authed?.role ?? "").toUpperCase();
    if (typeof authedId !== "number" || !Number.isFinite(authedId) || authedId <= 0 || authedRole !== "AGENT") {
      return res.status(401).json({ ok: false, error: "unauthorized" });
    }

    const parsed = claimPayoutSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: "invalid_body", issues: parsed.error.issues });
    }

    const gate = await getActiveAgent(req as AuthedRequest);
    if (!gate.ok) return res.status(gate.status).json({ ok: false, error: gate.error, message: gate.message });
    const agent = gate.agent;

    // Verify the trip belongs to this agent
    const trip = await prisma.planRequest.findUnique({
      where: { id: parsed.data.planRequestId },
      select: { id: true, assignedAgentId: true, userId: true, budget: true, status: true },
    });

    if (!trip) {
      return res.status(404).json({ ok: false, error: "trip_not_found" });
    }

    if (trip.assignedAgentId !== agent.id) {
      return res.status(403).json({ ok: false, error: "forbidden", message: "Trip does not belong to this agent" });
    }

    // Check if trip is completed
    if (trip.status !== "COMPLETED") {
      return res.status(400).json({ ok: false, error: "invalid_status", message: "Only completed trips can be claimed" });
    }

    // Check if an invoice already exists for this trip
    const existingInvoice = await prisma.invoice.findFirst({
      where: {
        bookingId: trip.id,
        invoiceNumber: { startsWith: "AINV-" }, // Agent invoice prefix
      },
    });

    if (existingInvoice) {
      return res.status(409).json({ ok: false, error: "already_claimed", message: "Payout already requested for this trip" });
    }

    // Get agent user for invoice owner reference
    const agentUser = agent.user;
    if (!agentUser) {
      return res.status(500).json({ ok: false, error: "agent_user_not_found" });
    }

    // Create invoice record (status DRAFT, then agent can submit)
    const invoiceNumber = `AINV-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
    const invoice = await prisma.invoice.create({
      data: {
        ownerId: agentUser.id, // Use agent user ID as owner for invoice record
        bookingId: trip.id,
        invoiceNumber,
        status: "DRAFT",
      },
    });

    return res.json({
      ok: true,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      message: "Payout request created. You can now submit it for review.",
    });
  })
);

export default router;

