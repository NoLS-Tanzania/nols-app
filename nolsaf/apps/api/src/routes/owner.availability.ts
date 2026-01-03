// apps/api/src/routes/owner.availability.ts
// Owner endpoints to manage property availability blocks
import { Router, type Request, type Response } from "express";
import type { RequestHandler } from "express";
import { z } from "zod";
import { prisma } from "@nolsaf/prisma";
import { AuthedRequest, requireAuth, requireRole } from "../middleware/auth.js";
import { sanitizeText } from "../lib/sanitize.js";

export const router = Router();

router.use(requireAuth as RequestHandler, requireRole("OWNER") as RequestHandler);

// Validation schemas
const createBlockSchema = z.object({
  propertyId: z.number().int().positive(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  roomCode: z.string().max(60).optional().nullable(),
  source: z.string().max(50).optional().nullable(),
  bedsBlocked: z.number().int().positive().optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

const updateBlockSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  roomCode: z.string().max(60).optional().nullable(),
  source: z.string().max(50).optional().nullable(),
  bedsBlocked: z.number().int().positive().optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

/**
 * GET /api/owner/availability/blocks
 * List all availability blocks for owner's properties
 * Query: propertyId?, startDate?, endDate?
 */
router.get("/blocks", (async (req: AuthedRequest, res: Response) => {
  try {
    const ownerId = req.user!.id;
    const { propertyId, startDate, endDate } = req.query;

    const where: any = {
      ownerId,
    };

    if (propertyId) {
      where.propertyId = Number(propertyId);
    }

    if (startDate || endDate) {
      where.AND = [];
      if (startDate) {
        where.AND.push({ endDate: { gte: new Date(String(startDate)) } });
      }
      if (endDate) {
        where.AND.push({ startDate: { lte: new Date(String(endDate)) } });
      }
    }

    const blocks = await prisma.propertyAvailabilityBlock.findMany({
      where,
      include: {
        property: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: {
        startDate: "asc",
      },
    });

    res.json({
      ok: true,
      blocks: blocks.map((block) => ({
        id: block.id,
        propertyId: block.propertyId,
        propertyTitle: block.property.title,
        startDate: block.startDate,
        endDate: block.endDate,
        roomCode: block.roomCode,
        source: block.source,
        bedsBlocked: block.bedsBlocked,
        notes: block.notes,
        createdAt: block.createdAt,
        updatedAt: block.updatedAt,
      })),
    });
  } catch (error: any) {
    console.error("GET /api/owner/availability/blocks error:", error);
    res.status(500).json({ error: "Failed to fetch availability blocks" });
  }
}) as RequestHandler);

/**
 * POST /api/owner/availability/blocks
 * Create a new availability block
 */
router.post("/blocks", (async (req: AuthedRequest, res: Response) => {
  try {
    const ownerId = req.user!.id;
    const validationResult = createBlockSchema.safeParse(req.body);

    if (!validationResult.success) {
      res.status(400).json({
        error: "Invalid request data",
        details: validationResult.error.errors,
      });
      return;
    }

    const data = validationResult.data;

    // Verify property belongs to owner
    const property = await prisma.property.findFirst({
      where: {
        id: data.propertyId,
        ownerId,
      },
    });

    if (!property) {
      res.status(404).json({ error: "Property not found or access denied" });
      return;
    }

    // Validate dates
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      res.status(400).json({ error: "Invalid date format" });
      return;
    }

    if (endDate <= startDate) {
      res.status(400).json({ error: "End date must be after start date" });
      return;
    }

    // Create block
    const block = await prisma.propertyAvailabilityBlock.create({
      data: {
        propertyId: data.propertyId,
        ownerId,
        startDate,
        endDate,
        roomCode: data.roomCode ? sanitizeText(data.roomCode) : null,
        source: data.source ? sanitizeText(data.source) : null,
        bedsBlocked: data.bedsBlocked || 1,
        notes: data.notes ? sanitizeText(data.notes) : null,
      },
      include: {
        property: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    res.status(201).json({
      ok: true,
      block: {
        id: block.id,
        propertyId: block.propertyId,
        propertyTitle: block.property.title,
        startDate: block.startDate,
        endDate: block.endDate,
        roomCode: block.roomCode,
        source: block.source,
        bedsBlocked: block.bedsBlocked,
        notes: block.notes,
        createdAt: block.createdAt,
        updatedAt: block.updatedAt,
      },
    });
  } catch (error: any) {
    console.error("POST /api/owner/availability/blocks error:", error);
    res.status(500).json({ error: "Failed to create availability block" });
  }
}) as RequestHandler);

/**
 * PUT /api/owner/availability/blocks/:id
 * Update an availability block
 */
router.put("/blocks/:id", (async (req: AuthedRequest, res: Response) => {
  try {
    const ownerId = req.user!.id;
    const blockId = Number(req.params.id);

    if (!blockId || isNaN(blockId)) {
      res.status(400).json({ error: "Invalid block ID" });
      return;
    }

    const validationResult = updateBlockSchema.safeParse(req.body);

    if (!validationResult.success) {
      res.status(400).json({
        error: "Invalid request data",
        details: validationResult.error.errors,
      });
      return;
    }

    const data = validationResult.data;

    // Verify block belongs to owner
    const existingBlock = await prisma.propertyAvailabilityBlock.findFirst({
      where: {
        id: blockId,
        ownerId,
      },
    });

    if (!existingBlock) {
      res.status(404).json({ error: "Availability block not found or access denied" });
      return;
    }

    // Prepare update data
    const updateData: any = {};

    if (data.startDate !== undefined) {
      const startDate = new Date(data.startDate);
      if (isNaN(startDate.getTime())) {
        res.status(400).json({ error: "Invalid start date format" });
        return;
      }
      updateData.startDate = startDate;
    }

    if (data.endDate !== undefined) {
      const endDate = new Date(data.endDate);
      if (isNaN(endDate.getTime())) {
        res.status(400).json({ error: "Invalid end date format" });
        return;
      }
      updateData.endDate = endDate;
    }

    // Validate date range if both are being updated
    if (updateData.startDate && updateData.endDate) {
      if (updateData.endDate <= updateData.startDate) {
        res.status(400).json({ error: "End date must be after start date" });
        return;
      }
    } else if (updateData.startDate && existingBlock.endDate) {
      if (existingBlock.endDate <= updateData.startDate) {
        res.status(400).json({ error: "End date must be after start date" });
        return;
      }
    } else if (updateData.endDate && existingBlock.startDate) {
      if (updateData.endDate <= existingBlock.startDate) {
        res.status(400).json({ error: "End date must be after start date" });
        return;
      }
    }

    if (data.roomCode !== undefined) {
      updateData.roomCode = data.roomCode ? sanitizeText(data.roomCode) : null;
    }
    if (data.source !== undefined) {
      updateData.source = data.source ? sanitizeText(data.source) : null;
    }
    if (data.bedsBlocked !== undefined) {
      updateData.bedsBlocked = data.bedsBlocked;
    }
    if (data.notes !== undefined) {
      updateData.notes = data.notes ? sanitizeText(data.notes) : null;
    }

    // Update block
    const block = await prisma.propertyAvailabilityBlock.update({
      where: { id: blockId },
      data: updateData,
      include: {
        property: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    res.json({
      ok: true,
      block: {
        id: block.id,
        propertyId: block.propertyId,
        propertyTitle: block.property.title,
        startDate: block.startDate,
        endDate: block.endDate,
        roomCode: block.roomCode,
        source: block.source,
        bedsBlocked: block.bedsBlocked,
        notes: block.notes,
        createdAt: block.createdAt,
        updatedAt: block.updatedAt,
      },
    });
  } catch (error: any) {
    console.error("PUT /api/owner/availability/blocks/:id error:", error);
    res.status(500).json({ error: "Failed to update availability block" });
  }
}) as RequestHandler);

/**
 * DELETE /api/owner/availability/blocks/:id
 * Delete an availability block
 */
router.delete("/blocks/:id", (async (req: AuthedRequest, res: Response) => {
  try {
    const ownerId = req.user!.id;
    const blockId = Number(req.params.id);

    if (!blockId || isNaN(blockId)) {
      res.status(400).json({ error: "Invalid block ID" });
      return;
    }

    // Verify block belongs to owner
    const block = await prisma.propertyAvailabilityBlock.findFirst({
      where: {
        id: blockId,
        ownerId,
      },
    });

    if (!block) {
      res.status(404).json({ error: "Availability block not found or access denied" });
      return;
    }

    // Delete block
    await prisma.propertyAvailabilityBlock.delete({
      where: { id: blockId },
    });

    res.json({
      ok: true,
      message: "Availability block deleted successfully",
    });
  } catch (error: any) {
    console.error("DELETE /api/owner/availability/blocks/:id error:", error);
    res.status(500).json({ error: "Failed to delete availability block" });
  }
}) as RequestHandler);

export default router;


