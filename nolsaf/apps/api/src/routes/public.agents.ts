/**
 * Public Agents API
 * ─────────────────────────────────────────────────────────────────────────────
 * Routes:
 *   GET  /api/public/agents            list active operator profiles (paginated)
 *   GET  /api/public/agents/:id        get a single operator profile by agent id
 *
 * No authentication required — public-facing tour operator marketplace.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Router } from "express";
import { prisma } from "@nolsaf/prisma";
import { asyncHandler } from "../middleware/errorHandler.js";

const router = Router();

function approvedProfile(value: unknown): any | null {
  if (!value || typeof value !== "object") return null;
  const profile = value as Record<string, any>;
  const status = String(profile.reviewStatus || profile.review?.status || "").toUpperCase();
  if (status !== "APPROVED") return null;
  return profile.approvedSnapshot && typeof profile.approvedSnapshot === "object" ? profile.approvedSnapshot : profile;
}

// ─── GET /api/public/agents ──────────────────────────────────────────────────
// Returns a paginated list of agents who have an operator profile and are active.
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize) || 20));
    const skip = (page - 1) * pageSize;

    const [agents, total] = await Promise.all([
      prisma.agent.findMany({
        where: {
          status: "ACTIVE",
          operatorProfile: { not: null },
        },
        select: {
          id: true,
          operatorProfile: true,
          level: true,
          totalCompletedTrips: true,
        },
        orderBy: { totalCompletedTrips: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.agent.count({
        where: {
          status: "ACTIVE",
          operatorProfile: { not: null },
        },
      }),
    ]);

    const visibleAgents = agents
      .map((a) => ({
        id: a.id,
        level: a.level,
        totalCompletedTrips: a.totalCompletedTrips,
        profile: approvedProfile(a.operatorProfile),
      }))
      .filter((a) => Boolean(a.profile));

    res.json({ items: visibleAgents, total: visibleAgents.length, page, pageSize });
  })
);

// ─── GET /api/public/agents/:id ──────────────────────────────────────────────
// Returns a single operator profile by agent id.
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: "Invalid agent id" });
    }

    const agent = await prisma.agent.findFirst({
      where: { id, status: "ACTIVE" },
      select: {
        id: true,
        operatorProfile: true,
        level: true,
        totalCompletedTrips: true,
      },
    });

    const profile = approvedProfile(agent?.operatorProfile);
    if (!agent || !profile) {
      return res.status(404).json({ error: "Operator profile not found" });
    }

    res.json({
      id: agent.id,
      level: agent.level,
      totalCompletedTrips: agent.totalCompletedTrips,
      profile,
    });
  })
);

export default router;
