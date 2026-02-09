/**
 * @fileoverview Admin Group Stays Claims Management API
 * @module routes/admin.groupStays.claims
 * 
 * Premium admin interface for reviewing, comparing, and selecting owner claims/offers
 * for group bookings. Enables admins to receive, evaluate, and recommend the best offers.
 */

import { Router } from "express";
import type { RequestHandler } from "express";
import { requireAuth, requireRole, type AuthedRequest } from "../middleware/auth.js";
import { prisma } from "@nolsaf/prisma";
import { asyncHandler } from "../middleware/errorHandler.js";
import { audit } from "../lib/audit.js";
import { z } from "zod";

export const router = Router();
router.use(requireAuth as unknown as RequestHandler, requireRole("ADMIN") as unknown as RequestHandler);

function parseJsonish(value: unknown): any | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "object") return value as any;
  if (typeof value !== "string") return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

async function getLatestClaimsConfig(groupBookingId: number): Promise<{
  deadline: string | null;
  notes: string | null;
  minDiscountPercent: number | null;
  updatedAt: string | null;
}> {
  const latest = await prisma.groupBookingAudit.findFirst({
    where: {
      groupBookingId,
      action: { in: ["OPENED_FOR_CLAIMS", "UPDATED_CLAIMS_SETTINGS"] },
    },
    orderBy: { createdAt: "desc" },
    select: { metadata: true, createdAt: true },
  });

  if (!latest) {
    return { deadline: null, notes: null, minDiscountPercent: null, updatedAt: null };
  }

  const meta = parseJsonish((latest as any).metadata) || {};
  const rawDeadline = meta.deadline ?? null;
  const rawNotes = meta.notes ?? null;
  const rawMinDiscount = meta.minDiscountPercent ?? null;

  const deadline =
    rawDeadline instanceof Date
      ? rawDeadline.toISOString()
      : typeof rawDeadline === "number"
        ? new Date(rawDeadline).toISOString()
        : typeof rawDeadline === "string" && rawDeadline.trim()
          ? rawDeadline
          : null;

  const notes = typeof rawNotes === "string" && rawNotes.trim() ? rawNotes : null;
  const minDiscountPercent =
    rawMinDiscount === null || rawMinDiscount === undefined
      ? null
      : Number.isFinite(Number(rawMinDiscount))
        ? Number(rawMinDiscount)
        : null;

  return {
    deadline,
    notes,
    minDiscountPercent,
    updatedAt: latest.createdAt ? latest.createdAt.toISOString() : null,
  };
}

function computeThreeWayShortlist(claims: Array<{ id: number; totalAmount: number; createdAt: Date; currency?: string | null; status?: string | null }>) {
  const eligible = claims
    .filter((c) => ["PENDING", "REVIEWING"].includes(String(c.status || "").toUpperCase()))
    .map((c) => ({
      id: c.id,
      totalAmount: Number(c.totalAmount),
      createdAt: c.createdAt,
      currency: c.currency || null,
    }))
    .filter((c) => Number.isFinite(c.totalAmount));

  if (eligible.length === 0) return null;

  const currencies = new Set(eligible.map((c) => c.currency || ""));
  if (currencies.size > 1) {
    return { error: "MIXED_CURRENCY" as const };
  }

  const byMax = [...eligible].sort((a, b) => {
    if (b.totalAmount !== a.totalAmount) return b.totalAmount - a.totalAmount;
    if (a.createdAt.getTime() !== b.createdAt.getTime()) return a.createdAt.getTime() - b.createdAt.getTime();
    return a.id - b.id;
  });
  const byMin = [...eligible].sort((a, b) => {
    if (a.totalAmount !== b.totalAmount) return a.totalAmount - b.totalAmount;
    if (a.createdAt.getTime() !== b.createdAt.getTime()) return a.createdAt.getTime() - b.createdAt.getTime();
    return a.id - b.id;
  });

  const high = byMax[0];
  const low = byMin[0];
  const target = (high.totalAmount + low.totalAmount) / 2;

  const midCandidatePool = eligible.filter((c) => c.id !== high.id && c.id !== low.id);
  const mid = midCandidatePool.length
    ? [...midCandidatePool].sort((a, b) => {
        const da = Math.abs(a.totalAmount - target);
        const db = Math.abs(b.totalAmount - target);
        if (da !== db) return da - db;
        if (a.createdAt.getTime() !== b.createdAt.getTime()) return a.createdAt.getTime() - b.createdAt.getTime();
        return a.id - b.id;
      })[0]
    : null;

  return {
    high: { id: high.id, totalAmount: high.totalAmount },
    mid: mid ? { id: mid.id, totalAmount: mid.totalAmount } : null,
    low: { id: low.id, totalAmount: low.totalAmount },
    targetTotalAmount: target,
    currency: high.currency || null,
  };
}

/**
 * GET /admin/group-stays/claims
 * Get all submitted claims across all group bookings (for admin overview)
 * This endpoint provides a comprehensive view of all claims regardless of booking status
 * 
 * Query params:
 * - status: Filter by claim status (PENDING, ACCEPTED, REJECTED, WITHDRAWN)
 * - page: Page number (default: 1)
 * - pageSize: Results per page (default: 50)
 * - q: Search query (property, owner, customer, region)
 * - bookingId: Filter claims to a specific group booking
 */
router.get("/", asyncHandler(async (req: any, res: any) => {
  try {
    const { status, bookingId, page = "1", pageSize = "50", q = "" } = req.query as any;
    
    const pageNum = Math.max(1, Number(page) || 1);
    const pageSizeNum = Math.min(100, Math.max(1, Number(pageSize) || 50));
    const skip = (pageNum - 1) * pageSizeNum;

    const bookingIdNum = bookingId !== undefined && bookingId !== null && String(bookingId).trim() !== ""
      ? Number(bookingId)
      : null;
    if (bookingIdNum !== null && (!Number.isFinite(bookingIdNum) || bookingIdNum <= 0)) {
      return res.status(400).json({ error: "Invalid bookingId" });
    }

    // Build where clause - fetch ALL claims first (no isOpenForClaims filter)
    // This ensures we get all submitted claims regardless of booking status
    const where: any = {};
    
    if (status && String(status).trim()) {
      where.status = String(status).trim().toUpperCase();
    }

    if (bookingIdNum !== null) {
      where.groupBookingId = bookingIdNum;
    }

    // Get all claims with full details (regardless of booking isOpenForClaims status)
    const [allClaimsFromDb] = await Promise.all([
      prisma.groupBookingClaim.findMany({
        where,
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
          property: {
            select: {
              id: true,
              title: true,
              type: true,
              regionName: true,
              district: true,
              city: true,
              ward: true,
              street: true,
              latitude: true,
              longitude: true,
              basePrice: true,
              currency: true,
              maxGuests: true,
              totalBedrooms: true,
              totalBathrooms: true,
              images: {
                where: {
                  status: { in: ['READY', 'PROCESSING'] },
                  url: { not: null },
                },
                select: { url: true, thumbnailUrl: true },
                orderBy: { createdAt: "asc" },
                take: 5,
              },
              services: true,
            },
          },
          groupBooking: {
            select: {
              id: true,
              groupType: true,
              accommodationType: true,
              headcount: true,
              roomsNeeded: true,
              toRegion: true,
              toDistrict: true,
              toLocation: true,
              checkIn: true,
              checkOut: true,
              status: true,
              currency: true,
              recommendedPropertyIds: true,
              isOpenForClaims: true,
              openedForClaimsAt: true,
              user: {
                select: { id: true, name: true, email: true, phone: true },
              },
            },
          },
          reviewer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: [
          { createdAt: "desc" }, // Newest first
        ],
      }),
    ]);

    // Calculate nights for each claim and format
    let formattedClaims = allClaimsFromDb.map((claim: any) => {
      const groupBooking = claim.groupBooking;
      const recommendedPropertyIds = Array.isArray(groupBooking?.recommendedPropertyIds)
        ? (groupBooking.recommendedPropertyIds as any[])
            .map((v: any) => Number(v))
            .filter((v: any) => Number.isFinite(v))
        : [];
      const isRecommended = recommendedPropertyIds.includes(Number(claim.propertyId));

      const checkIn = groupBooking.checkIn ? new Date(groupBooking.checkIn) : null;
      const checkOut = groupBooking.checkOut ? new Date(groupBooking.checkOut) : null;
      const nights = checkIn && checkOut 
        ? Math.max(1, Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)))
        : 0;

      const propertyImages = claim.property?.images || [];
      const primaryImage = claim.property?.primaryImage || 
                          (propertyImages.length > 0 ? propertyImages[0].thumbnailUrl || propertyImages[0].url : null);

      return {
        id: claim.id,
        groupBookingId: claim.groupBookingId,
        ownerId: claim.ownerId,
        propertyId: claim.propertyId,
        
        // Pricing details
        offeredPricePerNight: Number(claim.offeredPricePerNight),
        discountPercent: claim.discountPercent ? Number(claim.discountPercent) : null,
        totalAmount: Number(claim.totalAmount),
        currency: claim.currency || groupBooking.currency || "TZS",
        
        // Additional offer details
        specialOffers: claim.specialOffers,
        notes: claim.notes,
        
        // Status and review
        status: claim.status,
        reviewedAt: claim.reviewedAt,
        reviewedBy: claim.reviewedBy,
        createdAt: claim.createdAt,

        // Recommendation marker (admin-only)
        isRecommended,
        
        // Owner information
        owner: claim.owner,
        
        // Property information (enriched)
        property: claim.property ? {
          ...claim.property,
          basePrice: claim.property.basePrice ? Number(claim.property.basePrice) : null,
          primaryImage,
          images: propertyImages.map((img: any) => img.thumbnailUrl || img.url),
        } : null,
        
        // Group booking information
        groupBooking: groupBooking,
        
        // Calculated fields for comparison
        pricePerGuest: groupBooking.headcount > 0 
          ? Number(claim.totalAmount) / groupBooking.headcount 
          : null,
        pricePerRoom: groupBooking.roomsNeeded > 0 
          ? Number(claim.totalAmount) / groupBooking.roomsNeeded 
          : null,
        savingsAmount: claim.discountPercent 
          ? (Number(claim.offeredPricePerNight) * nights * groupBooking.roomsNeeded * Number(claim.discountPercent)) / 100
          : null,
        
        // Group booking context
        nights,
      };
    });

    // Apply search filter if provided (after fetching to support nested relations)
    if (q && String(q).trim()) {
      const query = String(q).trim().toLowerCase();
      formattedClaims = formattedClaims.filter(
        (claim: any) =>
          claim.property?.title?.toLowerCase().includes(query) ||
          claim.owner?.name?.toLowerCase().includes(query) ||
          claim.owner?.email?.toLowerCase().includes(query) ||
          claim.groupBooking?.toRegion?.toLowerCase().includes(query) ||
          claim.groupBooking?.toDistrict?.toLowerCase().includes(query) ||
          claim.groupBooking?.user?.name?.toLowerCase().includes(query) ||
          claim.groupBooking?.user?.email?.toLowerCase().includes(query)
      );
    }

    // Pagination (after filtering)
    const totalFiltered = formattedClaims.length;
    const paginated = formattedClaims.slice(skip, skip + pageSizeNum);

    // Calculate summary stats from ALL claims (before any filtering)
    const allClaimsForStats = await prisma.groupBookingClaim.findMany({
      where: bookingIdNum !== null ? { groupBookingId: bookingIdNum } : undefined,
      select: {
        status: true,
        propertyId: true,
        groupBooking: { select: { recommendedPropertyIds: true } },
      },
    });

    const recommendedCount = allClaimsForStats.reduce((acc: number, c: any) => {
      const ids = Array.isArray(c.groupBooking?.recommendedPropertyIds)
        ? (c.groupBooking.recommendedPropertyIds as any[])
            .map((v: any) => Number(v))
            .filter((v: any) => Number.isFinite(v))
        : [];
      return acc + (ids.includes(Number(c.propertyId)) ? 1 : 0);
    }, 0);

    const claimsByStatus = {
      PENDING: allClaimsForStats.filter((c: any) => c.status === "PENDING").length,
      REVIEWING: allClaimsForStats.filter((c: any) => c.status === "REVIEWING").length,
      REJECTED: allClaimsForStats.filter((c: any) => c.status === "REJECTED").length,
      WITHDRAWN: allClaimsForStats.filter((c: any) => c.status === "WITHDRAWN").length,
    };

    return res.json({
      items: paginated,
      total: totalFiltered, // Total after status + search filtering
      totalAll: allClaimsForStats.length, // Total all claims regardless of filters
      page: pageNum,
      pageSize: pageSizeNum,
      summary: {
        total: allClaimsForStats.length,
        pending: claimsByStatus.PENDING + claimsByStatus.REVIEWING,
        accepted: recommendedCount,
        rejected: claimsByStatus.REJECTED,
        withdrawn: claimsByStatus.WITHDRAWN,
      },
    });
  } catch (err: any) {
    console.error("Error fetching all claims:", err);
    return res.status(500).json({ 
      error: "Failed to fetch claims",
    });
  }
}));

/**
 * GET /admin/group-stays/claims/:bookingId
 * Get all submitted claims/offers for a specific group booking
 * Returns detailed information for admin review and comparison
 */
router.get("/:bookingId", asyncHandler(async (req: any, res: any) => {
  const bookingId = Number(req.params.bookingId);
  
  if (!bookingId || isNaN(bookingId) || bookingId <= 0) {
    return res.status(400).json({ error: "Invalid booking ID" });
  }

  try {
    // Get the group booking first to verify it exists
    const groupBooking = await prisma.groupBooking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        groupType: true,
        accommodationType: true,
        headcount: true,
        roomsNeeded: true,
        toRegion: true,
        toDistrict: true,
        toLocation: true,
        checkIn: true,
        checkOut: true,
        status: true,
        currency: true,
        recommendedPropertyIds: true,
        isOpenForClaims: true,
        openedForClaimsAt: true,
        user: {
          select: { id: true, name: true, email: true, phone: true },
        },
      },
    });

    if (!groupBooking) {
      return res.status(404).json({ error: "Group booking not found" });
    }

    const claimsConfig = await getLatestClaimsConfig(bookingId);

    // Get all claims for this booking with full details
    const claims = await prisma.groupBookingClaim.findMany({
      where: { groupBookingId: bookingId },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        property: {
          select: {
            id: true,
            title: true,
            type: true,
            regionName: true,
            district: true,
            city: true,
            ward: true,
            street: true,
            latitude: true,
            longitude: true,
            basePrice: true,
            currency: true,
            maxGuests: true,
            totalBedrooms: true,
            totalBathrooms: true,
            images: {
              where: {
                status: { in: ['READY', 'PROCESSING'] },
                url: { not: null },
              },
              select: { url: true, thumbnailUrl: true },
              orderBy: { createdAt: "asc" },
              take: 5,
            },
            services: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: [
        // Prioritize: PENDING first, then by totalAmount (lowest first), then by createdAt (oldest first)
        { status: "asc" }, // PENDING comes before ACCEPTED/REJECTED alphabetically
        { totalAmount: "asc" },
        { createdAt: "asc" },
      ],
    });

    // Calculate nights for better context
    const checkIn = groupBooking.checkIn ? new Date(groupBooking.checkIn) : null;
    const checkOut = groupBooking.checkOut ? new Date(groupBooking.checkOut) : null;
    const nights = checkIn && checkOut 
      ? Math.max(1, Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)))
      : 0;

    // Format claims with additional calculated fields
    const formattedClaims = claims.map((claim: any) => {
      const propertyImages = claim.property?.images || [];
      const primaryImage = claim.property?.primaryImage || 
                          (propertyImages.length > 0 ? propertyImages[0].thumbnailUrl || propertyImages[0].url : null);

      return {
        id: claim.id,
        groupBookingId: claim.groupBookingId,
        ownerId: claim.ownerId,
        propertyId: claim.propertyId,
        
        // Pricing details
        offeredPricePerNight: Number(claim.offeredPricePerNight),
        discountPercent: claim.discountPercent ? Number(claim.discountPercent) : null,
        totalAmount: Number(claim.totalAmount),
        currency: claim.currency || groupBooking.currency || "TZS",
        
        // Additional offer details
        specialOffers: claim.specialOffers,
        notes: claim.notes,
        
        // Status and review
        status: claim.status,
        reviewedAt: claim.reviewedAt,
        reviewedBy: claim.reviewedBy,
        createdAt: claim.createdAt,
        
        // Owner information
        owner: claim.owner,
        
        // Property information (enriched)
        property: claim.property ? {
          ...claim.property,
          basePrice: claim.property.basePrice ? Number(claim.property.basePrice) : null,
          primaryImage,
          images: propertyImages.map((img: any) => img.thumbnailUrl || img.url),
        } : null,
        
        // Calculated fields for comparison
        pricePerGuest: groupBooking.headcount > 0 
          ? Number(claim.totalAmount) / groupBooking.headcount 
          : null,
        pricePerRoom: groupBooking.roomsNeeded > 0 
          ? Number(claim.totalAmount) / groupBooking.roomsNeeded 
          : null,
        savingsAmount: claim.discountPercent 
          ? (Number(claim.offeredPricePerNight) * nights * groupBooking.roomsNeeded * Number(claim.discountPercent)) / 100
          : null,
        
        // Group booking context
        nights,
      };
    });

    const shortlist = computeThreeWayShortlist(
      claims.map((c: any) => ({
        id: c.id,
        totalAmount: Number(c.totalAmount),
        createdAt: c.createdAt,
        currency: c.currency || groupBooking.currency || "TZS",
        status: c.status,
      }))
    );
    if (shortlist && (shortlist as any).error === "MIXED_CURRENCY") {
      return res.status(400).json({
        error: "Cannot compute shortlist when claims have mixed currencies",
      });
    }

    const recommendedPropertyIds = Array.isArray((groupBooking as any).recommendedPropertyIds)
      ? ((groupBooking as any).recommendedPropertyIds as any[]).map((v) => Number(v)).filter((v) => Number.isFinite(v))
      : [];
    const recommendedClaimIds = formattedClaims
      .filter((c: any) => recommendedPropertyIds.includes(Number(c.propertyId)))
      .map((c: any) => c.id);

    // Group claims by status for better organization
    const claimsByStatus = {
      PENDING: formattedClaims.filter((c: any) => c.status === "PENDING" || c.status === "REVIEWING"),
      REVIEWING: formattedClaims.filter((c: any) => c.status === "REVIEWING"),
      ACCEPTED: formattedClaims.filter((c: any) => c.status === "ACCEPTED"),
      REJECTED: formattedClaims.filter((c: any) => c.status === "REJECTED"),
      WITHDRAWN: formattedClaims.filter((c: any) => c.status === "WITHDRAWN"),
    };

    return res.json({
      groupBooking,
      claimsConfig,
      claims: formattedClaims,
      claimsByStatus,
      shortlist,
      recommendedClaimIds,
      summary: {
        total: claims.length,
        pending: claimsByStatus.PENDING.length,
        accepted: claimsByStatus.ACCEPTED.length,
        rejected: claimsByStatus.REJECTED.length,
        withdrawn: claimsByStatus.WITHDRAWN.length,
        nights,
        headcount: groupBooking.headcount,
        roomsNeeded: groupBooking.roomsNeeded,
      },
    });
  } catch (err: any) {
    console.error("Error fetching group booking claims:", err);
    return res.status(500).json({ 
      error: "Failed to fetch claims",
    });
  }
}));

/**
 * POST /admin/group-stays/claims/:bookingId/start-review
 * Marks all PENDING claims for a booking as REVIEWING and updates booking status to REVIEWING.
 * This is owner-visible (status moves from PENDING -> REVIEWING) but does not disclose recommendations.
 */
router.post("/:bookingId/start-review", asyncHandler(async (req: any, res: any) => {
  const adminId = (req as AuthedRequest).user?.id;
  if (!adminId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const bookingId = Number(req.params.bookingId);
  if (!bookingId || isNaN(bookingId) || bookingId <= 0) {
    return res.status(400).json({ error: "Invalid booking ID" });
  }

  const result = await prisma.$transaction(async (tx: typeof prisma) => {
    const booking = await tx.groupBooking.findUnique({
      where: { id: bookingId },
      select: { id: true, status: true },
    });

    if (!booking) {
      return { notFound: true } as const;
    }

    const updated = await tx.groupBookingClaim.updateMany({
      where: { groupBookingId: bookingId, status: "PENDING" },
      data: { status: "REVIEWING" },
    });

    await tx.groupBooking.update({
      where: { id: bookingId },
      data: { status: booking.status === "PENDING" ? "REVIEWING" : booking.status },
    });

    await audit(
      req as AuthedRequest,
      "GROUP_BOOKING_CLAIMS_REVIEW_STARTED",
      `groupBooking:${bookingId}`,
      null,
      { updatedClaims: updated.count }
    );

    return { notFound: false, updatedClaims: updated.count } as const;
  });

  if (result.notFound) {
    return res.status(404).json({ error: "Group booking not found" });
  }

  return res.json({ success: true, updatedClaims: result.updatedClaims });
}));

/**
 * POST /admin/group-stays/claims/:bookingId/recommendations
 * Admin selects up to 3 claims as recommendations to present to the user
 * 
 * Body: { claimIds: [1, 2, 3] } - Array of 1-3 claim IDs to recommend
 */
const recommendClaimsSchema = z.object({
  claimIds: z
    .array(z.number().int().positive())
    .min(1)
    .max(3)
    .transform((ids) => Array.from(new Set(ids))),
  notes: z.string().optional(),
});

router.post("/:bookingId/recommendations", asyncHandler(async (req: any, res: any) => {
  const adminId = (req as AuthedRequest).user?.id;
  if (!adminId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const bookingId = Number(req.params.bookingId);
  if (!bookingId || isNaN(bookingId) || bookingId <= 0) {
    return res.status(400).json({ error: "Invalid booking ID" });
  }

  // Validate request body
  const validation = recommendClaimsSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({
      error: "Invalid request",
      details: validation.error.issues,
    });
  }

  const { claimIds, notes } = validation.data;

  try {
    // Use transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx: typeof prisma) => {
      // Verify group booking exists and is open for claims
      const groupBooking = await tx.groupBooking.findUnique({
        where: { id: bookingId },
        select: {
          id: true,
          status: true,
          isOpenForClaims: true,
          userId: true,
        },
      });

      if (!groupBooking) {
        throw new Error("Group booking not found");
      }

      // Verify all claims exist and belong to this booking
      const claims = await tx.groupBookingClaim.findMany({
        where: {
          id: { in: claimIds },
          groupBookingId: bookingId,
        },
        include: {
          owner: { select: { id: true, name: true } },
          property: { select: { id: true, title: true } },
        },
      });

      if (claims.length !== claimIds.length) {
        const foundIds = new Set(claims.map((c: any) => Number(c.id)).filter((v: any) => Number.isFinite(v)));
        const missingIds = claimIds.filter((id: number) => !foundIds.has(Number(id)));
        const e: any = new Error("One or more claims not found or don't belong to this booking");
        e.code = "CLAIMS_MISMATCH";
        e.details = { bookingId, claimIds, missingIds };
        throw e;
      }

      // Verify all claims are eligible for recommendation (PENDING or REVIEWING)
      const ineligible = claims.filter((c: any) => !["PENDING", "REVIEWING"].includes(String(c.status || "").toUpperCase()));
      if (ineligible.length > 0) {
        throw new Error(`Cannot recommend ${ineligible.length} claim(s) that are not PENDING/REVIEWING`);
      }

      // Mark the review process owner-visible, but do NOT mark recommendations on the claim itself.
      // This prevents owners from tracking the recommendation step.
      await tx.groupBookingClaim.updateMany({
        where: { groupBookingId: bookingId, status: "PENDING" },
        data: { status: "REVIEWING" },
      });

      const recommendedPropertyIds = Array.from(
        new Set(
          claims
            .map((c: any) => Number(c.propertyId))
            .filter((v: any) => Number.isFinite(v))
        )
      );

      // Update group booking to track recommendations (admin-only)
      await tx.groupBooking.update({
        where: { id: bookingId },
        data: {
          recommendedPropertyIds,
          status: groupBooking.status === "PENDING" ? "REVIEWING" : groupBooking.status,
        },
      });

      // Create audit log for this action
      await audit(
        req as AuthedRequest,
        "GROUP_BOOKING_CLAIMS_RECOMMENDED",
        `groupBooking:${bookingId}`,
        null,
        {
          claimIds,
          claimCount: claimIds.length,
          notes: notes || null,
          recommendedPropertyIds,
          claims: claims.map((c: any) => ({
            id: c.id,
            owner: c.owner.name,
            property: c.property.title,
            totalAmount: Number(c.totalAmount),
          })),
        }
      );

      return {
        success: true,
        recommendedPropertyIds,
        groupBookingId: bookingId,
        recommendedCount: claimIds.length,
      };
    });

    return res.json(result);
  } catch (err: any) {
    console.error("Error recommending claims:", err);
    if (err?.code === "CLAIMS_MISMATCH") {
      return res.status(400).json({
        error: err.message || "One or more claims not found or don't belong to this booking",
        details: err.details || null,
      });
    }

    const statusCode = err.message?.includes("Group booking not found") ? 404
                      : err.message?.includes("not PENDING") ? 400
                      : 500;
    return res.status(statusCode).json({
      error: err.message || "Failed to recommend claims",
    });
  }
}));

/**
 * PATCH /admin/group-stays/claims/:claimId/status
 * Admin can update individual claim status (for rejections, etc.)
 * 
 * Body: { status: "REJECTED", notes?: string }
 */
const updateClaimStatusSchema = z.object({
  status: z.enum(["PENDING", "REVIEWING", "ACCEPTED", "REJECTED", "WITHDRAWN"]),
  notes: z.string().optional(),
});

router.patch("/:claimId/status", asyncHandler(async (req: any, res: any) => {
  const adminId = (req as AuthedRequest).user?.id;
  if (!adminId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const claimId = Number(req.params.claimId);
  if (!claimId || isNaN(claimId) || claimId <= 0) {
    return res.status(400).json({ error: "Invalid claim ID" });
  }

  const validation = updateClaimStatusSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({
      error: "Invalid request",
      details: validation.error.issues,
    });
  }

  const { status, notes } = validation.data;

  try {
    const updatedClaim = await prisma.$transaction(async (tx: typeof prisma) => {
      // Get current claim to verify it exists
      const claim = await tx.groupBookingClaim.findUnique({
        where: { id: claimId },
        include: {
          groupBooking: {
            select: { id: true, userId: true },
          },
          owner: { select: { id: true, name: true } },
          property: { select: { id: true, title: true } },
        },
      });

      if (!claim) {
        throw new Error("Claim not found");
      }

      // Update claim status
      const updated = await tx.groupBookingClaim.update({
        where: { id: claimId },
        data: {
          status,
          reviewedAt: status !== "PENDING" ? new Date() : null,
          reviewedBy: status !== "PENDING" ? adminId : null,
          notes: notes || claim.notes, // Update notes if provided, otherwise keep existing
        },
        include: {
          owner: { select: { id: true, name: true } },
          property: { select: { id: true, title: true } },
        },
      });

      // Audit log
      await audit(
        req as AuthedRequest,
        "GROUP_BOOKING_CLAIM_STATUS_UPDATED",
        `groupBooking:${claim.groupBookingId}`,
        null,
        {
          claimId,
          oldStatus: claim.status,
          newStatus: status,
          owner: claim.owner.name,
          property: claim.property.title,
          notes: notes || null,
        }
      );

      return updated;
    });

    return res.json({
      success: true,
      claim: updatedClaim,
    });
  } catch (err: any) {
    console.error("Error updating claim status:", err);
    const statusCode = err.message?.includes("not found") ? 404 : 500;
    return res.status(statusCode).json({
      error: err.message || "Failed to update claim status",
    });
  }
}));

export default router;
