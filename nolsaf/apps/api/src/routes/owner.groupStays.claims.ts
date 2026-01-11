// apps/api/src/routes/owner.groupStays.claims.ts
import { Router, type Request, type Response } from "express";
import { prisma } from "@nolsaf/prisma";
import { requireAuth, requireRole, type AuthedRequest } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import type { RequestHandler } from "express";

const router = Router();
router.use(requireAuth as unknown as RequestHandler, requireRole("OWNER") as unknown as RequestHandler);

/**
 * GET /owner/group-stays/claims/available
 * Get group stays available for owners to claim (open for competitive bidding)
 */
router.get("/available", asyncHandler(async (req: Request, res: Response) => {
  res.setHeader("Content-Type", "application/json");
  
  const r = req as AuthedRequest;
  const ownerId = r.user?.id;
  
  if (!ownerId || typeof ownerId !== "number") {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Validate and sanitize query parameters
  const { region, accommodationType, page = "1", pageSize = "50" } = req.query as any;
  const pageNum = Math.max(1, Number(page) || 1);
  const pageSizeNum = Math.min(100, Math.max(1, Number(pageSize) || 50));

    // Note: We don't exclude owner's claims here - frontend will filter by "all-active" vs "claimed"
    // This allows owners to see their own claims too
    const where: any = {
      isOpenForClaims: true,
      // Allow all statuses except final states (COMPLETED, CANCELED)
      // If admin opened it for claims, it should be visible regardless of intermediate status
      status: {
        notIn: ["COMPLETED", "CANCELED"],
      },
    };

  if (region) {
    where.toRegion = String(region).trim();
  }

  if (accommodationType) {
    where.accommodationType = String(accommodationType).trim();
  }

  const skip = (pageNum - 1) * pageSizeNum;
  const take = pageSizeNum;

  try {
    const [items, total] = await Promise.all([
      prisma.groupBooking.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, email: true, phone: true },
          },
          claims: {
            select: {
              id: true,
              ownerId: true,
              offeredPricePerNight: true,
              discountPercent: true,
              status: true,
            },
            orderBy: { totalAmount: "asc" }, // Show cheapest offers first
            take: 10, // Show more offers including owner's claims
          },
          auditLogs: {
            where: { action: "OPENED_FOR_CLAIMS" },
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { metadata: true, createdAt: true },
          },
        },
        orderBy: { openedForClaimsAt: "desc" },
        skip,
        take,
      }),
      prisma.groupBooking.count({ where }),
    ]);

    // Extract deadline from audit metadata if available
    const itemsWithDeadline = items.map((gb: any) => {
      const latestAudit = gb.auditLogs?.[0];
      
      // Parse metadata if it's a string (Prisma might store JSON as string)
      let metadata = latestAudit?.metadata;
      if (metadata && typeof metadata === 'string') {
        try {
          metadata = JSON.parse(metadata);
        } catch (e) {
          console.error('[API] Failed to parse metadata for group booking', gb.id, e);
          metadata = null;
        }
      }
      
      // Extract deadline from metadata, or use default (7 days from when it was opened)
      let deadline = metadata?.deadline ? new Date(metadata.deadline) : null;
      
      // Fallback: If no deadline was set but group stay is open for claims,
      // use 7 days from when it was opened as default deadline
      if (!deadline && gb.isOpenForClaims && gb.openedForClaimsAt) {
        const defaultDeadline = new Date(gb.openedForClaimsAt);
        defaultDeadline.setDate(defaultDeadline.getDate() + 7); // 7 days from opening
        deadline = defaultDeadline;
      }
      
      const minDiscountPercent = metadata?.minDiscountPercent || null;
      
      // Separate claims into owner's claims and other claims
      const ownerClaims = gb.claims.filter((c: any) => c.ownerId === ownerId);
      const otherClaims = gb.claims.filter((c: any) => c.ownerId !== ownerId);
      const hasOwnerClaim = ownerClaims.length > 0 && 
        ownerClaims.some((c: any) => c.status === "PENDING" || c.status === "ACCEPTED");
      
      return {
        id: gb.id,
        groupType: gb.groupType,
        accommodationType: gb.accommodationType,
        headcount: gb.headcount,
        roomsNeeded: gb.roomsNeeded,
        toRegion: gb.toRegion,
        toDistrict: gb.toDistrict,
        toLocation: gb.toLocation,
        checkIn: gb.checkIn,
        checkOut: gb.checkOut,
        status: gb.status,
        totalAmount: gb.totalAmount,
        currency: gb.currency,
        user: gb.user,
        ownerClaims: ownerClaims,
        otherClaims: otherClaims,
        hasOwnerClaim: hasOwnerClaim,
        existingClaimsCount: gb.claims.length,
        existingClaims: gb.claims, // Keep for backward compatibility
        openedForClaimsAt: gb.openedForClaimsAt,
        submissionDeadline: deadline?.toISOString() || null,
        minDiscountPercent: minDiscountPercent,
        createdAt: gb.createdAt,
      };
    });

    return res.json({
      items: itemsWithDeadline,
      total,
      page: pageNum,
      pageSize: pageSizeNum,
    });
  } catch (err: any) {
    console.error("Error fetching available group stays for claims:", err);
    return res.status(500).json({ error: "Failed to fetch available group stays" });
  }
}));

/**
 * POST /owner/group-stays/claims
 * Owner submits a claim/offer for a group stay
 */
router.post("/", asyncHandler(async (req: Request, res: Response) => {
  res.setHeader("Content-Type", "application/json");
  
  const r = req as AuthedRequest;
  const ownerId = r.user?.id;
  
  if (!ownerId || typeof ownerId !== "number") {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { groupBookingId, propertyId, offeredPricePerNight, discountPercent, specialOffers, notes } = req.body as any;

  // Validate required fields
  if (!groupBookingId || !propertyId || !offeredPricePerNight) {
    return res.status(400).json({ error: "Missing required fields: groupBookingId, propertyId, offeredPricePerNight" });
  }

  const groupBookingIdNum = Number(groupBookingId);
  const propertyIdNum = Number(propertyId);
  const offeredPrice = Number(offeredPricePerNight);
  const discount = discountPercent ? Number(discountPercent) : null;

  if (!Number.isFinite(groupBookingIdNum) || groupBookingIdNum <= 0) {
    return res.status(400).json({ error: "Invalid group booking ID" });
  }

  if (!Number.isFinite(propertyIdNum) || propertyIdNum <= 0) {
    return res.status(400).json({ error: "Invalid property ID" });
  }

  if (!Number.isFinite(offeredPrice) || offeredPrice <= 0) {
    return res.status(400).json({ error: "Invalid offered price" });
  }

  if (discount !== null && (!Number.isFinite(discount) || discount < 0 || discount > 100)) {
    return res.status(400).json({ error: "Invalid discount percentage (must be 0-100)" });
  }

  try {
    // Use transaction to prevent race conditions
    const result = await prisma.$transaction(async (tx: typeof prisma) => {
      // Check if group booking exists and is open for claims
      const groupBooking = await tx.groupBooking.findUnique({
        where: { id: groupBookingIdNum },
        include: {
          user: { select: { id: true, name: true } },
        },
      });

      if (!groupBooking) {
        throw new Error("Group stay not found");
      }

      if (!groupBooking.isOpenForClaims) {
        throw new Error("This group stay is not open for claims");
      }

      // Allow all statuses except final states
      if (groupBooking.status === "COMPLETED" || groupBooking.status === "CANCELED") {
        throw new Error("Group stay is not available for claiming");
      }

      // Check if owner already has a claim for this group booking
      const existingClaim = await tx.groupBookingClaim.findUnique({
        where: {
          groupBookingId_ownerId: {
            groupBookingId: groupBookingIdNum,
            ownerId: ownerId,
          },
        },
      });

      if (existingClaim) {
        throw new Error("You have already submitted a claim for this group stay");
      }

      // Verify property belongs to owner
      const property = await tx.property.findFirst({
        where: {
          id: propertyIdNum,
          ownerId: ownerId,
          status: "APPROVED",
        },
      });

      if (!property) {
        throw new Error("Property not found or not approved, or you don't own it");
      }

      // Calculate total amount (simplified: price per night * number of nights)
      const checkIn = groupBooking.checkIn ? new Date(groupBooking.checkIn) : null;
      const checkOut = groupBooking.checkOut ? new Date(groupBooking.checkOut) : null;
      const nights = checkIn && checkOut ? Math.max(1, Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))) : 1;
      const totalAmount = offeredPrice * nights * groupBooking.roomsNeeded;

      // Create the claim
      const claim = await tx.groupBookingClaim.create({
        data: {
          groupBookingId: groupBookingIdNum,
          ownerId: ownerId,
          propertyId: propertyIdNum,
          offeredPricePerNight: offeredPrice,
          discountPercent: discount,
          specialOffers: specialOffers ? String(specialOffers).trim() : null,
          notes: notes ? String(notes).trim() : null,
          totalAmount: totalAmount,
          currency: groupBooking.currency || "TZS",
          status: "PENDING",
        },
        include: {
          property: {
            select: { id: true, title: true, type: true, regionName: true },
          },
          groupBooking: {
            select: { id: true, headcount: true, roomsNeeded: true, toRegion: true },
          },
        },
      });

      return claim;
    });

    return res.json({
      success: true,
      claim: {
        id: result.id,
        groupBookingId: result.groupBookingId,
        propertyId: result.propertyId,
        offeredPricePerNight: result.offeredPricePerNight,
        discountPercent: result.discountPercent,
        specialOffers: result.specialOffers,
        totalAmount: result.totalAmount,
        currency: result.currency,
        status: result.status,
        property: result.property,
        groupBooking: result.groupBooking,
        createdAt: result.createdAt,
      },
    });
  } catch (err: any) {
    console.error("Error creating group stay claim:", err);
    const statusCode = err.message.includes("not found") ? 404 : err.message.includes("already") || err.message.includes("not open") ? 409 : 500;
    return res.status(statusCode).json({ error: err.message || "Failed to submit claim" });
  }
}));

/**
 * GET /owner/group-stays/claims/my-claims
 * Get owner's submitted claims
 */
router.get("/my-claims", asyncHandler(async (req: Request, res: Response) => {
  res.setHeader("Content-Type", "application/json");
  
  const r = req as AuthedRequest;
  const ownerId = r.user?.id;
  
  if (!ownerId || typeof ownerId !== "number") {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { status, page = "1", pageSize = "50" } = req.query as any;
  const pageNum = Math.max(1, Number(page) || 1);
  const pageSizeNum = Math.min(100, Math.max(1, Number(pageSize) || 50));

  const where: any = {
    ownerId: ownerId,
  };

  if (status) {
    where.status = String(status).trim().toUpperCase();
  }

  const skip = (pageNum - 1) * pageSizeNum;
  const take = pageSizeNum;

  try {
    const [items, total] = await Promise.all([
      prisma.groupBookingClaim.findMany({
        where,
        include: {
          groupBooking: {
            select: {
              id: true,
              headcount: true,
              roomsNeeded: true,
              toRegion: true,
              checkIn: true,
              checkOut: true,
              user: {
                select: { id: true, name: true, email: true, phone: true },
              },
            },
          },
          property: {
            select: { 
              id: true, 
              title: true, 
              type: true, 
              regionName: true,
              owner: {
                select: { id: true, name: true },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      prisma.groupBookingClaim.count({ where }),
    ]);

    return res.json({
      items,
      total,
      page: pageNum,
      pageSize: pageSizeNum,
    });
  } catch (err: any) {
    console.error("Error fetching owner claims:", err);
    return res.status(500).json({
      error: "Failed to fetch claims",
    });
  }
}));

export default router;

