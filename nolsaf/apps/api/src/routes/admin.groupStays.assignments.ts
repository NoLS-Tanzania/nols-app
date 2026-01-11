// apps/api/src/routes/admin.groupStays.assignments.ts
import { Router, type Request, type Response } from "express";
import { prisma } from "@nolsaf/prisma";
import { requireAuth, requireRole, type AuthedRequest } from "../middleware/auth.js";
import type { RequestHandler } from "express";

const router = Router();
router.use(requireAuth as unknown as RequestHandler, requireRole("ADMIN") as unknown as RequestHandler);

/**
 * POST /admin/group-stays/assignments/:id/owner
 * Assign an owner to a group stay
 */
router.post("/:id/owner", async (req: Request, res: Response) => {
  try {
    const r = req as AuthedRequest;
    const adminId = r.user!.id;
    const groupBookingId = Number(req.params.id);
    const { ownerId } = req.body as { ownerId: number };

    if (!ownerId || isNaN(ownerId)) {
      return res.status(400).json({ error: "ownerId is required and must be a valid number" });
    }

    // Verify group booking exists
    const groupBooking = await (prisma as any).groupBooking.findUnique({
      where: { id: groupBookingId },
    });

    if (!groupBooking) {
      return res.status(404).json({ error: "Group booking not found" });
    }

    // Verify owner exists and has OWNER role
    const owner = await prisma.user.findUnique({
      where: { id: ownerId },
      select: { id: true, role: true },
    });

    if (!owner || owner.role !== "OWNER") {
      return res.status(400).json({ error: "Invalid owner ID or user is not an owner" });
    }

    // Update group booking with assigned owner
    const updated = await (prisma as any).groupBooking.update({
      where: { id: groupBookingId },
      data: {
        assignedOwnerId: ownerId,
        ownerAssignedAt: new Date(),
      },
      include: {
        assignedOwner: {
          select: { id: true, name: true, email: true, phone: true },
        },
      },
    });

    // Create audit log
    try {
      const ownerData = await prisma.user.findUnique({
        where: { id: ownerId },
        select: { name: true, email: true },
      });
      await (prisma as any).groupBookingAudit.create({
        data: {
          groupBookingId,
          adminId,
          action: "OWNER_ASSIGNED",
          description: `Owner ${ownerData?.name || ownerData?.email || `#${ownerId}`} assigned to group stay`,
          metadata: { ownerId, ownerName: ownerData?.name || ownerData?.email || null },
        },
      });
    } catch (auditError) {
      console.warn("Failed to create audit log:", auditError);
    }

    res.json({ success: true, groupBooking: updated });
  } catch (err: any) {
    console.error("Error assigning owner to group stay:", err);
    res.status(500).json({ error: "Failed to assign owner" });
  }
});

/**
 * POST /admin/group-stays/assignments/:id/properties
 * Link/recommend properties to a group stay
 */
router.post("/:id/properties", async (req: Request, res: Response) => {
  try {
    const r = req as AuthedRequest;
    const adminId = r.user!.id;
    const groupBookingId = Number(req.params.id);
    const { propertyIds } = req.body as { propertyIds: number[] };

    if (!Array.isArray(propertyIds) || propertyIds.length === 0) {
      return res.status(400).json({ error: "propertyIds must be a non-empty array" });
    }

    // Verify group booking exists
    const groupBooking = await (prisma as any).groupBooking.findUnique({
      where: { id: groupBookingId },
    });

    if (!groupBooking) {
      return res.status(404).json({ error: "Group booking not found" });
    }

    // Verify all properties exist
    const properties = await prisma.property.findMany({
      where: { id: { in: propertyIds } },
      select: { id: true, title: true, status: true },
    });

    if (properties.length !== propertyIds.length) {
      return res.status(400).json({ error: "One or more properties not found" });
    }

    // Update group booking with recommended properties
    const updated = await (prisma as any).groupBooking.update({
      where: { id: groupBookingId },
      data: {
        recommendedPropertyIds: propertyIds,
      },
      include: {
        assignedOwner: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Create audit log
    try {
      await (prisma as any).groupBookingAudit.create({
        data: {
          groupBookingId,
          adminId,
          action: "PROPERTIES_RECOMMENDED",
          description: `Recommended ${propertyIds.length} propert${propertyIds.length === 1 ? 'y' : 'ies'}: ${properties.map((p: { title: string }) => p.title).join(', ')}`,
          metadata: { propertyIds, propertyTitles: properties.map((p: { title: string }) => p.title) },
        },
      });
    } catch (auditError) {
      console.warn("Failed to create audit log:", auditError);
    }

    res.json({ success: true, groupBooking: updated });
  } catch (err: any) {
    console.error("Error linking properties to group stay:", err);
    res.status(500).json({ error: "Failed to link properties" });
  }
});

/**
 * PATCH /admin/group-stays/assignments/:id/open-for-claims
 * Open a group stay for competitive claims (owners can submit offers)
 *
 * Body: { open: true }
 */
router.patch("/:id/open-for-claims", async (req: Request, res: Response) => {
  try {
    const r = req as AuthedRequest;
    const adminId = r.user!.id;
    const bookingId = Number(req.params.id);
    const { open, deadline, notes, minDiscountPercent } = req.body as { 
      open: boolean; 
      deadline?: string; 
      notes?: string | null; 
      minDiscountPercent?: number | null;
    };

    if (!bookingId || isNaN(bookingId)) {
      return res.status(400).json({ error: "Invalid booking ID" });
    }

    if (typeof open !== "boolean") {
      return res.status(400).json({ error: "Invalid 'open' parameter (must be boolean)" });
    }

    const updated = await (prisma as any).groupBooking.update({
      where: { id: bookingId },
      data: {
        isOpenForClaims: open,
        openedForClaimsAt: open ? new Date() : null,
      },
    });

    // Create audit log entry
    if (adminId) {
      let description = open 
        ? `Admin opened group booking for competitive claims` 
        : `Admin closed group booking for competitive claims`;
      
      if (open && deadline) {
        description += ` (Deadline: ${new Date(deadline).toLocaleDateString()})`;
        if (minDiscountPercent) {
          description += `, Min Discount: ${minDiscountPercent}%`;
        }
      }

      await (prisma as any).groupBookingAudit.create({
        data: {
          groupBookingId: bookingId,
          adminId,
          action: open ? "OPENED_FOR_CLAIMS" : "CLOSED_FOR_CLAIMS",
          description,
          metadata: { 
            isOpenForClaims: open,
            deadline: open ? deadline : null,
            notes: open ? notes : null,
            minDiscountPercent: open ? minDiscountPercent : null,
          },
        },
      });
    }

    return res.json({ success: true, booking: updated });
  } catch (err: any) {
    console.error("Error in PATCH /admin/group-stays/assignments/:id/open-for-claims:", err);
    return res.status(500).json({ error: "Failed to update claim status" });
  }
});

/**
 * GET /admin/group-stays/assignments/:id/audits
 * Get audit history for a specific group stay
 */
router.get("/:id/audits", async (req: Request, res: Response) => {
  try {
    const groupBookingId = Number(req.params.id);

    if (!groupBookingId || isNaN(groupBookingId)) {
      return res.status(400).json({ error: "Invalid group booking ID" });
    }

    const audits = await (prisma as any).groupBookingAudit.findMany({
      where: { groupBookingId },
      include: {
        admin: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ items: audits || [] });
  } catch (err: any) {
    console.error("Error fetching audit history:", err);
    res.status(500).json({ error: "Failed to fetch audit history" });
  }
});

/**
 * GET /admin/group-stays/assignments
 * Get all group stays with their assignments
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    const { status, assignedOwnerId, page = "1", pageSize = "50" } = req.query as any;

    const where: any = {};
    if (status) where.status = status;
    if (assignedOwnerId) where.assignedOwnerId = Number(assignedOwnerId);

    const skip = (Number(page) - 1) * Number(pageSize);
    const take = Math.min(Number(pageSize), 100);

    const [items, total] = await Promise.all([
      (prisma as any).groupBooking.findMany({
        where,
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
          isOpenForClaims: true,
          openedForClaimsAt: true,
          user: {
            select: { id: true, name: true, email: true, phone: true },
          },
          assignedOwner: {
            select: { id: true, name: true, email: true, phone: true },
          },
          confirmedProperty: {
            select: { id: true, title: true, type: true, status: true },
          },
          recommendedPropertyIds: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      (prisma as any).groupBooking.count({ where }),
    ]);

    res.json({
      items,
      total,
      page: Number(page),
      pageSize: Number(pageSize),
    });
  } catch (err: any) {
    console.error("Error fetching group stay assignments:", err);
    res.status(500).json({ error: "Failed to fetch assignments" });
  }
});

export default router;

