// apps/api/src/routes/admin.properties.ts
import { Router, RequestHandler } from "express";
import { prisma } from "@nolsaf/prisma";
import { Prisma } from "@prisma/client";
import { AuthedRequest, requireAuth } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/admin.js";
import {
  ApprovePropertyInput,
  RejectPropertyInput,
  SuspendPropertyInput,
} from "../schemas/adminPropertySchemas.js";
import { toAdminPropertyDTO } from "../lib/adminPropertyDto.js";
import { emitEvent } from "../lib/events.js";
import { notifyOwner } from "../lib/notifications.js";
import {
  invalidateAdminPropertyQueues,
  invalidateOwnerPropertyLists,
} from "../lib/cache.js";
import { auditLog } from "../lib/audit.js";

export const router = Router();
router.use(requireAuth as RequestHandler, requireAdmin as RequestHandler);

/** Helper: socket broadcast to Admin UI */
function broadcastStatus(req: any, payload: any) {
  const io = req.app?.get?.("io");
  if (io) io.emit("admin:property:status", payload);
}

/** GET /admin/properties?status=&q=&regionId=&type=&ownerId=&page=&pageSize= */
router.get("/", (async (req: AuthedRequest, res) => {
  try {
    const { status, q, regionId, type, ownerId, page = "1", pageSize = "20" } =
      req.query as any;

    const where: any = {};
    if (status) where.status = status;
    if (regionId) where.regionId = regionId;
    if (type) where.type = type;
    if (ownerId) where.ownerId = Number(ownerId);
    if (q) {
      // MySQL doesn't support mode: "insensitive", so we use contains which is case-sensitive
      const searchTerm = String(q).trim();
      if (searchTerm) {
        where.OR = [
          { title: { contains: searchTerm } },
          { regionName: { contains: searchTerm } },
          { district: { contains: searchTerm } },
        ];
      }
    }

    const skip = (Number(page) - 1) * Number(pageSize);
    const take = Math.min(Number(pageSize), 200);

    let items: any[] = [];
    let total = 0;

    try {
      [items, total] = await Promise.all([
        prisma.property.findMany({
          where,
          orderBy: { updatedAt: "desc" },
          include: { owner: { select: { id: true, name: true, email: true } } },
          skip,
          take,
        }),
        prisma.property.count({ where }),
      ]);
    } catch (dbError: any) {
      console.error('Database query failed in GET /admin/properties:', dbError);
      console.error('Error details:', {
        code: dbError?.code,
        message: dbError?.message,
        meta: dbError?.meta,
      });
      
      // Check for Prisma errors
      if (dbError instanceof Prisma.PrismaClientKnownRequestError) {
        if (dbError.code === 'P2021' || dbError.code === 'P2022') {
          console.warn('Prisma schema mismatch in GET /admin/properties:', dbError.message);
        }
      }
      
      // Return empty result instead of crashing
      return res.json({
        page: Number(page),
        pageSize: take,
        total: 0,
        items: [],
      });
    }

    interface AdminPropertyOwner {
      id: number;
      name: string | null;
      email: string | null;
    }

    interface AdminPropertyRow {
      id: number;
      title: string;
      status: string;
      type: string | null;
      owner: AdminPropertyOwner | null;
      regionName?: string | null;
      district?: string | null;
      photos?: string[] | null;
      basePrice?: number | null;
      currency?: string | null;
      services?: any;
      updatedAt: Date;
    }

    interface AdminPropertyListItem {
      id: number;
      title: string;
      status: string;
      type: string | null;
      owner: AdminPropertyOwner | null;
      regionName?: string | null;
      district?: string | null;
      photos: string[];
      basePrice?: number | null;
      currency?: string | null;
      services?: any;
      updatedAt: Date;
    }

    interface AdminPropertyListResponse {
      page: number;
      pageSize: number;
      total: number;
      items: AdminPropertyListItem[];
    }

    const response: AdminPropertyListResponse = {
      page: Number(page),
      pageSize: take,
      total,
      items: (items as AdminPropertyRow[]).map((p) => ({
        id: p.id,
        title: p.title,
        status: p.status,
        type: p.type,
        owner: p.owner,
        regionName: p.regionName ?? null,
        district: p.district ?? null,
        photos: Array.isArray(p.photos) ? p.photos.slice(0, 3) : [],
        basePrice: p.basePrice ?? null,
        currency: p.currency ?? null,
        services: p.services ?? null,
        updatedAt: p.updatedAt,
      })),
    };

    res.json(response);
  } catch (err: any) {
    // Ultimate fallback - catch ANY error
    console.error('CRITICAL ERROR in GET /admin/properties:', err);
    console.error('Error type:', typeof err);
    console.error('Error constructor:', err?.constructor?.name);
    console.error('Error message:', err?.message);
    console.error('Error stack:', err?.stack);
    
    // Check for Prisma errors
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      console.warn('Prisma error in GET /admin/properties:', err.code, err.message);
    } else if (err instanceof Prisma.PrismaClientValidationError) {
      console.warn('Prisma validation error in GET /admin/properties:', err.message);
    }
    
    // Always return valid JSON response
    const pageNum = Number((req.query as any)?.page) || 1;
    const pageSizeNum = Math.min(Number((req.query as any)?.pageSize || 20), 200);
    
    return res.json({
      page: pageNum,
      pageSize: pageSizeNum,
      total: 0,
      items: [],
    });
  }
}) as RequestHandler);

/** GET /admin/properties/counts - return counts by status for quick badges */
router.get("/counts", (async (_req: AuthedRequest, res) => {
  try {
    const statuses = ["DRAFT","PENDING","APPROVED","NEEDS_FIXES","REJECTED","SUSPENDED"] as const;
    const results: Record<string, number> = {};
    await Promise.all(statuses.map(async (s) => {
      const c = await prisma.property.count({ where: { status: s as any } });
      results[s] = c;
    }));
    res.json(results);
  } catch (err: any) {
    console.error("/admin/properties/counts failed:", err?.message || err);
    // Fail-open with zeros to avoid breaking UI
    res.json({ DRAFT:0, PENDING:0, APPROVED:0, NEEDS_FIXES:0, REJECTED:0, SUSPENDED:0 });
  }
}) as RequestHandler);

/** GET /admin/properties/:id */
router.get(
  "/:id",
  (async (req: AuthedRequest, res) => {
    const id = Number(req.params.id);
    const p = await prisma.property.findFirst({
      where: { id },
      include: {
        owner: { select: { id: true, name: true, email: true, phone: true } },
      },
    });
    if (!p) return res.status(404).json({ error: "Not found" });
    res.json(toAdminPropertyDTO(p));
  }) as RequestHandler
);

/** PATCH /admin/properties/:id - Admin can edit property details */
router.patch("/:id", (async (req: AuthedRequest, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });

    const property = await prisma.property.findFirst({ 
      where: { id },
      include: { owner: { select: { id: true, name: true, email: true, phone: true } } }
    });
    if (!property) return res.status(404).json({ error: "Property not found" });

    const { title, description, basePrice, currency, commissionPercent, discountRules, roomPrices } = req.body;

    const updateData: any = {};
    if (title !== undefined) updateData.title = String(title);
    if (description !== undefined) updateData.description = String(description);
    if (basePrice !== undefined) updateData.basePrice = Number(basePrice);
    if (currency !== undefined) updateData.currency = String(currency);

    // Store commission and discount rules in services JSON field
    if (commissionPercent !== undefined || discountRules !== undefined) {
      // Get existing services or initialize as object
      const existingServices = property.services && typeof property.services === 'object' 
        ? property.services as any 
        : {};
      
      const updatedServices = { ...existingServices };
      
      // Store commission percent (null means use system default)
      if (commissionPercent !== undefined) {
        if (commissionPercent === null) {
          delete updatedServices.commissionPercent;
        } else {
          updatedServices.commissionPercent = Number(commissionPercent);
        }
      }
      
      // Store discount rules
      if (discountRules !== undefined) {
        if (Array.isArray(discountRules) && discountRules.length > 0) {
          updatedServices.discountRules = discountRules;
        } else {
          delete updatedServices.discountRules;
        }
      }
      
      updateData.services = updatedServices;
    }

    let updated = await prisma.property.update({
      where: { id },
      data: updateData,
      include: { owner: { select: { id: true, name: true, email: true, phone: true } } }
    });

    // Update room prices if provided
    if (roomPrices && typeof roomPrices === 'object') {
      const roomUpdatePromises = Object.entries(roomPrices).map(async ([roomId, price]) => {
        const roomIdNum = Number(roomId);
        if (!Number.isFinite(roomIdNum) || !Number.isFinite(Number(price))) return;
        
        try {
          await prisma.room.updateMany({
            where: { id: roomIdNum, propertyId: id },
            data: { pricePerNight: Number(price) },
          });
        } catch (e) {
          console.warn(`Failed to update room ${roomIdNum}:`, e);
        }
      });
      
      await Promise.all(roomUpdatePromises);
      
      // Also update roomsSpec JSON field to reflect new prices
      // Fetch updated rooms from database to get accurate prices
      const updatedRooms = await prisma.room.findMany({
        where: { propertyId: id },
        select: { id: true, pricePerNight: true },
      });
      
      if (property.roomsSpec && Array.isArray(property.roomsSpec) && updatedRooms.length > 0) {
        const updatedRoomsSpec = property.roomsSpec.map((room: any, index: number) => {
          // Try to match by room ID first, then by index
          const matchingRoom = updatedRooms.find((r: any) => 
            room.id && Number(r.id) === Number(room.id)
          ) || updatedRooms[index];
          
          if (matchingRoom && matchingRoom.pricePerNight !== null) {
            return {
              ...room,
              pricePerNight: Number(matchingRoom.pricePerNight),
              price: Number(matchingRoom.pricePerNight),
            };
          }
          return room;
        });
        
        // Update roomsSpec in the property
        updated = await prisma.property.update({
          where: { id },
          data: { roomsSpec: updatedRoomsSpec },
          include: { owner: { select: { id: true, name: true, email: true, phone: true } } }
        });
      }
    }

    await auditLog({
      actorId: req.user!.id,
      actorRole: req.user!.role,
      action: "PROPERTY_UPDATE",
      entity: "PROPERTY",
      entityId: id,
      before: property,
      after: updated,
      ip: req.ip,
      ua: req.headers["user-agent"] as string,
    });

    res.json(toAdminPropertyDTO(updated));
  } catch (err: any) {
    res.status(400).json({ error: err?.message || "Update failed" });
  }
}) as RequestHandler);

/** GET /admin/properties/:id/images */
router.get("/:id/images", (async (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  const images = await prisma.propertyImage.findMany({ where: { propertyId: id }, orderBy: { createdAt: 'asc' } });
  res.json({ items: images });
}) as RequestHandler);

/** PATCH /admin/properties/images/:imageId { status?: string, moderationNote?: string } */
router.patch("/images/:imageId", (async (req: AuthedRequest, res) => {
  const imageId = Number(req.params.imageId);
  const { status, moderationNote } = req.body as any;
  const before = await prisma.propertyImage.findFirst({ where: { id: imageId } });
  if (!before) return res.status(404).json({ error: 'Not found' });

  const updated = await prisma.propertyImage.update({ where: { id: imageId }, data: { status: status ?? before.status, moderationNote: moderationNote ?? before.moderationNote, moderatedAt: status ? new Date() : before.moderatedAt } });

  // audit
  await auditLog({
    actorId: req.user!.id,
    actorRole: req.user!.role,
    action: `PROPERTY_IMAGE_MODERATE`,
    entity: "PROPERTY",
    entityId: before.propertyId,
    before: before,
    after: updated,
    ip: req.ip,
    ua: req.headers['user-agent'] as string,
  });

  res.json({ ok: true, image: updated });
}) as RequestHandler);

/** POST /admin/properties/images/:imageId/process - mark for processing (thumbnail/webp) */
router.post("/images/:imageId/process", (async (req: AuthedRequest, res) => {
  const imageId = Number(req.params.imageId);
  const img = await prisma.propertyImage.findFirst({ where: { id: imageId } });
  if (!img) return res.status(404).json({ error: 'Not found' });

  // mark as processing; actual background worker will pick this up by polling or queue
  const updated = await prisma.propertyImage.update({ where: { id: imageId }, data: { status: 'PROCESSING' } });

  await auditLog({
    actorId: req.user!.id,
    actorRole: req.user!.role,
    action: `PROPERTY_IMAGE_PROCESS_REQUEST`,
    entity: "PROPERTY",
    entityId: img.propertyId,
    before: img,
    after: updated,
    ip: req.ip,
    ua: req.headers['user-agent'] as string,
  });

  // emit event for real-time UIs
  emitEvent('property.image.processing', { propertyId: img.propertyId, imageId });

  res.json({ ok: true });
}) as RequestHandler);

/** POST /admin/properties/:id/approve */
router.post("/:id/approve", (async (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  const parse = ApprovePropertyInput.safeParse(req.body);
  if (!parse.success) { res.status(400).json({ error: parse.error.flatten() }); return; }

  const before = await prisma.property.findFirst({
    where: { id },
    select: { status: true, ownerId: true, title: true },
  });
  if (!before) { res.status(404).json({ error: "Not found" }); return; }
  if (!["PENDING", "SUSPENDED", "REJECTED"].includes(before.status)) {
    res.status(400).json({ error: `Cannot approve from status ${before.status}` }); return;
  }

  const updated = await prisma.property.update({
    where: { id },
    data: { status: "APPROVED" },
  });

  const payload = { id, from: before.status, to: "APPROVED", by: req.user!.id };

  // Get admin and owner info for notifications
  const [admin, property] = await Promise.all([
    prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, name: true, email: true },
    }),
    prisma.property.findUnique({
      where: { id },
      include: { owner: { select: { id: true, name: true, email: true } } },
    }),
  ]);

  const notificationData = { 
    propertyId: id, 
    propertyTitle: before.title,
    approvedBy: req.user!.id,
    approvedByName: admin?.name || admin?.email || `Admin #${req.user!.id}`,
    ownerId: before.ownerId,
    ownerName: property?.owner?.name || null,
    ownerEmail: property?.owner?.email || null,
  };

  const { notifyOwner, notifyAdmins } = await import("../lib/notifications.js");

  await Promise.all([
    emitEvent("property.status.changed", payload),
    invalidateAdminPropertyQueues(),
    invalidateOwnerPropertyLists(before.ownerId),
    notifyOwner(before.ownerId, "property_approved", notificationData),
    notifyAdmins("property_approved", notificationData),
    auditLog({
      actorId: req.user!.id,
      actorRole: req.user!.role,
      action: "PROPERTY_APPROVE",
      entity: "PROPERTY",
      entityId: id,
      before,
      after: { status: "APPROVED" },
      ip: req.ip,
      ua: req.headers["user-agent"] as string,
    }),
  ]);

  broadcastStatus(req, payload);
  res.json({ ok: true, id: updated.id, status: updated.status });
}) as RequestHandler);

/** POST /admin/properties/:id/reject { reasons: string[], note?: string } */
router.post("/:id/reject", (async (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid property ID" });
  
  const parse = RejectPropertyInput.safeParse(req.body);
  if (!parse.success) {
    const errors = parse.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
    return res.status(400).json({ error: `Validation failed: ${errors}` });
  }

  const before = await prisma.property.findFirst({
    where: { id },
    select: { status: true, ownerId: true, title: true },
  });
  if (!before) return res.status(404).json({ error: "Not found" });
  if (!["PENDING", "APPROVED"].includes(before.status)) {
    return res.status(400).json({ error: `Cannot reject from status ${before.status}` });
  }

  const updated = await prisma.property.update({
    where: { id },
    data: { status: "REJECTED" },
  });

  const payload = {
    id,
    from: before.status,
    to: "REJECTED",
    by: req.user!.id,
    reasons: parse.data.reasons,
  };

  await Promise.all([
    emitEvent("property.status.changed", payload),
    invalidateAdminPropertyQueues(),
    invalidateOwnerPropertyLists(before.ownerId),
    notifyOwner(before.ownerId, "property_rejected", {
      propertyId: id,
      propertyTitle: before.title,
      reasons: parse.data.reasons,
      note: parse.data.note,
    }),
    auditLog({
      actorId: req.user!.id,
      actorRole: req.user!.role,
      action: "PROPERTY_REJECT",
      entity: "PROPERTY",
      entityId: id,
      before,
      after: { status: "REJECTED", reasons: parse.data.reasons },
      ip: req.ip,
      ua: req.headers["user-agent"] as string,
    }),
  ]);

  broadcastStatus(req, payload);
  res.json({ ok: true, id: updated.id, status: updated.status });
}) as RequestHandler);

/** POST /admin/properties/:id/suspend { reason } */
router.post("/:id/suspend", (async (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid property ID" });
  
  const parse = SuspendPropertyInput.safeParse(req.body);
  if (!parse.success) {
    const errors = parse.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
    return res.status(400).json({ error: `Validation failed: ${errors}` });
  }

  const before = await prisma.property.findFirst({
    where: { id },
    select: { status: true, ownerId: true, title: true },
  });
  if (!before) return res.status(404).json({ error: "Not found" });
  if (before.status === "SUSPENDED")
    return res.status(400).json({ error: "Already suspended" });

  const updated = await prisma.property.update({
    where: { id },
    data: { status: "SUSPENDED" },
  });

  const payload = {
    id,
    from: before.status,
    to: "SUSPENDED",
    by: req.user!.id,
    reason: parse.data.reason,
  };

  await Promise.all([
    emitEvent("property.status.changed", payload),
    invalidateAdminPropertyQueues(),
    invalidateOwnerPropertyLists(before.ownerId),
    notifyOwner(before.ownerId, "property_suspended", {
      propertyId: id,
      propertyTitle: before.title,
      reason: parse.data.reason,
    }),
    auditLog({
      actorId: req.user!.id,
      actorRole: req.user!.role,
      action: "PROPERTY_SUSPEND",
      entity: "PROPERTY",
      entityId: id,
      before,
      after: { status: "SUSPENDED" },
      ip: req.ip,
      ua: req.headers["user-agent"] as string,
    }),
  ]);

  broadcastStatus(req, payload);
  res.json({ ok: true, id: updated.id, status: updated.status });
}) as RequestHandler);

/** POST /admin/properties/:id/unsuspend */
router.post("/:id/unsuspend", (async (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid property ID" });
  const before = await prisma.property.findFirst({
    where: { id },
    select: { status: true, ownerId: true, title: true },
  });
  if (!before) return res.status(404).json({ error: "Not found" });
  if (before.status !== "SUSPENDED")
    return res
      .status(400)
      .json({ error: `Cannot unsuspend from ${before.status}` });

  const updated = await prisma.property.update({
    where: { id },
    data: { status: "APPROVED" },
  });

  const payload = { id, from: "SUSPENDED", to: "APPROVED", by: req.user!.id };

  await Promise.all([
    emitEvent("property.status.changed", payload),
    invalidateAdminPropertyQueues(),
    invalidateOwnerPropertyLists(before.ownerId),
    notifyOwner(before.ownerId, "property_unsuspended", { propertyId: id, propertyTitle: before.title }),
    auditLog({
      actorId: req.user!.id,
      actorRole: req.user!.role,
      action: "PROPERTY_UNSUSPEND",
      entity: "PROPERTY",
      entityId: id,
      before,
      after: { status: "APPROVED" },
      ip: req.ip,
      ua: req.headers["user-agent"] as string,
    }),
  ]);

  broadcastStatus(req, payload);
  res.json({ ok: true, id: updated.id, status: updated.status });
}) as RequestHandler);

export default router;
