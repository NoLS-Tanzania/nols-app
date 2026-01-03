import { Router } from "express";
import type { RequestHandler } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { prisma } from "@nolsaf/prisma";
import type { Prisma } from "@prisma/client";

export const router = Router();
router.use(requireAuth as unknown as RequestHandler, requireRole("ADMIN") as unknown as RequestHandler);

/** GET /admin/plan-with-us/summary */
router.get("/", async (_req, res) => {
  try {
    // Note: Plan requests might be stored in a different table or as form submissions
    // For now, we'll create a structure that can be extended when the actual data model is available
    // This assumes plan requests might be in a table like PlanRequest or similar
    
    // Total plan requests (placeholder - adjust based on actual schema)
    let totalRequests = 0;
    let pendingRequests = 0;
    let inProgressRequests = 0;
    let completedRequests = 0;
    let canceledRequests = 0;

    // Requests by role
    const roleCounts: Record<string, number> = {
      "Event planner": 0,
      "School / Teacher": 0,
      "University": 0,
      "Community group": 0,
      "Other": 0,
    };

    // Requests by trip type
    const tripTypeCounts: Record<string, number> = {
      "Local tourism": 0,
      "Safari": 0,
      "Cultural": 0,
      "Adventure / Hiking": 0,
      "Other": 0,
    };

    // Recent requests (last 5)
    const recentRequests: any[] = [];
    let urgentRequests = 0;

    // Try to fetch from PlanRequest table if it exists
    try {
      const prismaAny = prisma as any;
      const allRequests = await prismaAny.planRequest.findMany({
        select: {
          id: true,
          role: true,
          tripType: true,
          status: true,
          notes: true,
          createdAt: true,
          fullName: true,
          email: true,
        },
      });

      totalRequests = allRequests.length;
      pendingRequests = allRequests.filter((r: any) => r.status === "NEW" || r.status === "PENDING").length;
      inProgressRequests = allRequests.filter((r: any) => r.status === "IN_PROGRESS").length;
      completedRequests = allRequests.filter((r: any) => r.status === "COMPLETED").length;
      canceledRequests = 0; // Removed canceled status
      
      // Count urgent requests (those with "urgent" in notes)
      urgentRequests = allRequests.filter((r: any) => {
        const notes = (r.notes || "").toLowerCase();
        return notes.includes("urgent") && (r.status === "NEW" || r.status === "PENDING");
      }).length;

      // Get recent requests (last 5)
      const requests = allRequests
        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5);

      // Count by role
      for (const role of Object.keys(roleCounts)) {
        try {
          roleCounts[role] = await (prisma as any).planRequest.count({ where: { role } });
        } catch (e) {
          roleCounts[role] = 0;
        }
      }

      // Count by trip type
      for (const tripType of Object.keys(tripTypeCounts)) {
        try {
          tripTypeCounts[tripType] = await (prisma as any).planRequest.count({ where: { tripType } });
        } catch (e) {
          tripTypeCounts[tripType] = 0;
        }
      }

      recentRequests.push(...requests.map((r: any) => {
        const notes = (r.notes || "").toLowerCase();
        const isUrgent = notes.includes("urgent");
        return {
          id: r.id,
          role: r.role || "Other",
          tripType: r.tripType || "Other",
          status: r.status || "PENDING",
          isUrgent,
          createdAt: r.createdAt,
          customer: {
            name: r.fullName || "Unknown",
            email: r.email || "",
          },
        };
      }));
    } catch (e: any) {
      // If PlanRequest table doesn't exist yet, return empty data
      // Check if it's a Prisma error about missing model or property access error
      const errorMessage = e?.message || String(e);
      const isPrismaError = e instanceof Prisma.PrismaClientKnownRequestError || 
                            e instanceof Prisma.PrismaClientUnknownRequestError ||
                            e instanceof Prisma.PrismaClientInitializationError ||
                            e instanceof Prisma.PrismaClientRustPanicError ||
                            errorMessage.includes("planRequest") ||
                            errorMessage.includes("model") ||
                            errorMessage.includes("does not exist") ||
                            errorMessage.includes("Cannot read property") ||
                            errorMessage.includes("undefined");
      
      if (isPrismaError) {
        console.warn("PlanRequest table/model does not exist yet or Prisma error:", errorMessage);
      } else {
        console.warn("Error fetching plan requests:", errorMessage);
      }
      // Return empty data structure - all values are already initialized to 0/empty
    }

    res.json({
      totalRequests,
      pendingRequests,
      inProgressRequests,
      completedRequests,
      canceledRequests,
      urgentRequests,
      roleCounts,
      tripTypeCounts,
      recentRequests,
    });
  } catch (err) {
    console.error("admin.planWithUs.summary error", err);
    res.status(500).json({ error: "failed" });
  }
});

export default router;

