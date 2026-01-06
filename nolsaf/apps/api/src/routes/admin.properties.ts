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
  UnsuspendPropertyInput,
} from "../schemas/adminPropertySchemas.js";
import { toAdminPropertyDTO } from "../lib/adminPropertyDto.js";
import { emitEvent } from "../lib/events.js";
import { notifyOwner } from "../lib/notifications.js";
import {
  invalidateAdminPropertyQueues,
  invalidateOwnerPropertyLists,
} from "../lib/cache.js";
import { auditLog } from "../lib/audit.js";
import { invalidateCache, cacheKeys, cacheTags } from "../lib/performance.js";

export const router = Router();
router.use(requireAuth as RequestHandler, requireAdmin as RequestHandler);

/** Helper: socket broadcast to Admin UI */
function broadcastStatus(req: any, payload: any) {
  const io = req.app?.get?.("io");
  if (io) io.emit("admin:property:status", payload);
}

/** GET /admin/properties?status=&q=&regionId=&regionName=&type=&ownerId=&page=&pageSize= */
router.get("/", (async (req: AuthedRequest, res) => {
  try {
    console.log('[GET /admin/properties] Request received');
    // Explicitly set Content-Type to JSON
    res.setHeader('Content-Type', 'application/json');
    
    const { status, q, regionId, regionName, type, ownerId, page = "1", pageSize = "20" } =
      req.query as any;

    const where: any = {};
    
    // Build base filters
    if (status && status !== "ALL") {
      where.status = status;
    }
    if (regionId) {
      const regionIdNum = Number(regionId);
      if (!isNaN(regionIdNum)) {
        where.regionId = regionIdNum;
      }
    }
    if (regionName) {
      where.regionName = { contains: String(regionName), mode: "insensitive" };
    }
    if (type) {
      where.type = type;
    }
    if (ownerId) {
      const ownerIdNum = Number(ownerId);
      if (!isNaN(ownerIdNum)) {
        where.ownerId = ownerIdNum;
      }
    }
    
    // If search query is provided, combine with existing filters using AND
    if (q) {
      const searchTerm = String(q).trim();
      if (searchTerm) {
        // Save regionName filter separately if it exists
        const savedRegionName = where.regionName;
        delete where.regionName;
        
        // If we have other filters, combine them with search using AND
        const hasOtherFilters = Object.keys(where).length > 0;
        
        // Clear where to rebuild
        const otherFilters = hasOtherFilters ? { ...where } : null;
        Object.keys(where).forEach(key => delete where[key]);
        
        // Build the search conditions
        const searchConditions = {
          OR: [
            { title: { contains: searchTerm, mode: "insensitive" } },
            { regionName: { contains: searchTerm, mode: "insensitive" } },
            { district: { contains: searchTerm, mode: "insensitive" } },
          ],
        };
        
        if (hasOtherFilters || savedRegionName) {
          // Combine filters with search using AND
          const baseFilters: any = otherFilters || {};
          if (savedRegionName) {
            // If we have a regionName filter, it should match exactly (not via search)
            baseFilters.regionName = savedRegionName;
          }
          where.AND = [
            baseFilters,
            searchConditions,
          ];
        } else {
          // No existing filters, just use OR for search
          where.OR = searchConditions.OR;
        }
      }
      // If searchTerm is empty after trim, where already has the base filters, so we're good
    }

    const skip = (Number(page) - 1) * Number(pageSize);
    const take = Math.min(Number(pageSize), 200);

    let items: any[] = [];
    let total = 0;

    try {
      console.log('[GET /admin/properties] Executing Prisma query with where:', JSON.stringify(where, null, 2));
      console.log('[GET /admin/properties] Skip:', skip, 'Take:', take);
      
      const findManyPromise = prisma.property.findMany({
          where,
          // Avoid MySQL "Out of sort memory" on large tables by ordering on indexed PK
          orderBy: { id: "desc" },
          include: { owner: { select: { id: true, name: true, email: true } } },
          skip,
          take,
        });

      const countPromise = prisma.property.count({ where });

      [items, total] = await Promise.all([findManyPromise, countPromise]);
      
      console.log('[GET /admin/properties] Query succeeded - items:', items.length, 'total:', total);
      
      // Safety check - ensure items is an array
      if (!Array.isArray(items)) {
        console.error('[GET /admin/properties] Items is not an array:', typeof items, items);
        items = [];
      }

    } catch (dbError: any) {
      console.error('Database query failed in GET /admin/properties:', dbError);
      console.error('Error details:', {
        code: dbError?.code,
        message: dbError?.message,
        meta: dbError?.meta,
        stack: dbError?.stack,
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
      updatedAt: string; // ISO string for JSON serialization
    }

    interface AdminPropertyListResponse {
      page: number;
      pageSize: number;
      total: number;
      items: AdminPropertyListItem[];
    }

    // Debug logging
    console.log('[GET /admin/properties] Query params:', { status, q, regionId, type, ownerId, page, pageSize });
    console.log('[GET /admin/properties] Where clause:', JSON.stringify(where, null, 2));
    console.log('[GET /admin/properties] Found items:', items.length, 'Total:', total);
    
    // Also check what the database actually has
    if (status) {
      const directCount = await prisma.property.count({ where: { status: status as any } }).catch(() => 0);
      console.log(`[GET /admin/properties] Direct count for status="${status}":`, directCount);
    }
    
    if (items.length > 0) {
      console.log('[GET /admin/properties] First item sample:', {
        id: items[0]?.id,
        title: items[0]?.title,
        status: items[0]?.status,
        regionName: items[0]?.regionName,
        district: items[0]?.district,
      });
    } else if (total === 0 && status) {
      // If no items found but we're filtering by status, let's see what statuses actually exist
      const allStatuses = await prisma.property.findMany({
        select: { status: true },
        distinct: ['status'],
        take: 10,
      }).catch(() => []);
      console.log('[GET /admin/properties] Available statuses in DB:', allStatuses.map((p: any) => p.status));
    }

    // Helper function to safely serialize Prisma objects
    const serializePrismaObject = (obj: any): any => {
      if (obj === null || obj === undefined) return obj;
      if (typeof obj !== 'object') return obj;
      
      const result: any = {};
      const keys = Object.keys(obj);
      
      for (const key of keys) {
        try {
          const value = obj[key];
          
          // Skip functions and symbols
          if (typeof value === 'function' || typeof value === 'symbol') {
            continue;
          }
          
          // Handle Dates
          if (value instanceof Date) {
            result[key] = value.toISOString();
          }
          // Handle BigInt
          else if (typeof value === 'bigint') {
            result[key] = value.toString();
          }
          // Handle null/undefined
          else if (value === null || value === undefined) {
            result[key] = value;
          }
          // Handle arrays
          else if (Array.isArray(value)) {
            result[key] = value.map(v => serializePrismaObject(v));
          }
          // Handle nested objects (but skip Prisma internal properties)
          else if (typeof value === 'object') {
            // Skip Prisma internal properties
            if (key.startsWith('_') || key === 'toJSON' || key === 'toString') {
              continue;
            }
            try {
              result[key] = serializePrismaObject(value);
            } catch {
              // If nested object can't be serialized, skip it
              continue;
            }
          }
          // Handle primitives
          else {
            result[key] = value;
          }
        } catch (fieldError) {
          // Skip fields that can't be serialized
          continue;
        }
      }
      
      return result;
    };

    // Safety check - ensure items is an array before processing
    if (!Array.isArray(items)) {
      console.error('[GET /admin/properties] Items is not an array before serialization:', typeof items);
      items = [];
    }
    
    // Serialize items safely
    const serializedItems: AdminPropertyListItem[] = [];
    for (const p of items as AdminPropertyRow[]) {
      try {
        // Manually construct the item to ensure proper serialization
        // Handle owner object safely
        let ownerObj: any = null;
        if (p.owner) {
          try {
            ownerObj = {
              id: typeof p.owner.id === 'bigint' ? Number(p.owner.id) : Number(p.owner.id),
              name: p.owner.name ?? null,
              email: p.owner.email ?? null,
            };
            // Test owner serialization
            JSON.stringify(ownerObj);
          } catch (ownerError) {
            console.error(`[GET /admin/properties] Error serializing owner for property ${p.id}:`, ownerError);
            ownerObj = null;
          }
        }
        
        // Handle services safely (might be object or array)
        let servicesValue: any = null;
        try {
          if (p.services !== null && p.services !== undefined) {
            if (typeof p.services === 'string') {
              // Try to parse if it's a JSON string
              try {
                servicesValue = JSON.parse(p.services);
              } catch {
                servicesValue = p.services;
              }
            } else {
              servicesValue = p.services;
            }
            // Test services serialization
            JSON.stringify(servicesValue);
          }
        } catch (servicesError) {
          console.error(`[GET /admin/properties] Error serializing services for property ${p.id}:`, servicesError);
          servicesValue = null;
        }
        
        const item: any = {
          id: typeof p.id === 'bigint' ? Number(p.id) : Number(p.id),
          title: String(p.title || ''),
          status: String(p.status || 'DRAFT'),
          type: p.type ? String(p.type) : null,
          owner: ownerObj,
          regionName: p.regionName ? String(p.regionName) : null,
          district: p.district ? String(p.district) : null,
          photos: Array.isArray(p.photos) ? p.photos.slice(0, 3).map((photo: any) => String(photo)) : [],
          basePrice: p.basePrice !== null && p.basePrice !== undefined ? Number(p.basePrice) : null,
          currency: p.currency ? String(p.currency) : null,
          services: servicesValue,
          updatedAt: p.updatedAt instanceof Date ? p.updatedAt.toISOString() : (typeof p.updatedAt === 'string' ? p.updatedAt : new Date().toISOString()),
        };
        
        // Test full item serialization
        JSON.stringify(item);
        serializedItems.push(item as AdminPropertyListItem);
      } catch (itemError: any) {
        console.error(`[GET /admin/properties] Error serializing property ${p?.id}:`, itemError);
        console.error(`[GET /admin/properties] Property data:`, {
          id: p?.id,
          title: p?.title,
          status: p?.status,
          hasOwner: !!p?.owner,
          ownerType: typeof p?.owner,
        });
        // Add minimal item if serialization fails
        try {
          serializedItems.push({
            id: p?.id || 0,
            title: p?.title || '',
            status: p?.status || 'DRAFT',
            type: p?.type || null,
            owner: p?.owner ? {
              id: p.owner.id,
              name: p.owner.name,
              email: p.owner.email,
            } : null,
            regionName: p?.regionName ?? null,
            district: p?.district ?? null,
            photos: [],
            basePrice: p?.basePrice ?? null,
            currency: p?.currency ?? null,
            services: p?.services ?? null,
            updatedAt: p?.updatedAt instanceof Date ? p.updatedAt.toISOString() : new Date().toISOString(),
          });
        } catch (minimalError) {
          console.error(`[GET /admin/properties] Failed to create minimal item for property ${p?.id}:`, minimalError);
          // Skip this item entirely if even minimal serialization fails
        }
      }
    }

    const response: AdminPropertyListResponse = {
      page: Number(page),
      pageSize: take,
      total,
      items: serializedItems,
    };

    // Test JSON serialization before sending
    try {
      JSON.stringify(response);
      console.log('[GET /admin/properties] Response items count:', response.items.length);
      res.json(response);
    } catch (jsonError: any) {
      console.error('[GET /admin/properties] JSON serialization error:', jsonError);
      // Return minimal safe response
      res.json({
        page: Number(page),
        pageSize: take,
        total: 0,
        items: [],
      });
    }
  } catch (err: any) {
    // Ensure error responses are JSON
    res.setHeader('Content-Type', 'application/json');
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
    
    // Always return valid JSON response - use same structure as success response
    const pageNum = Number((req.query as any)?.page) || 1;
    const pageSizeNum = Math.min(Number((req.query as any)?.pageSize || 20), 200);
    
    // Create safe error response
    const errorResponse = {
      page: pageNum,
      pageSize: pageSizeNum,
      total: 0,
      items: [],
    };
    
    // Test serialization before sending
    try {
      JSON.stringify(errorResponse);
      return res.status(500).json(errorResponse);
    } catch (serializeError) {
      // If even error response can't be serialized, send minimal response
      console.error('Failed to serialize error response:', serializeError);
      return res.status(500).json({ 
        page: 1, 
        pageSize: 20, 
        total: 0, 
        items: [] 
      });
    }
  }
}) as RequestHandler);

/** GET /admin/properties/counts - return counts by status for quick badges */
router.get("/counts", (async (req: AuthedRequest, res) => {
  try {
    console.log('[GET /admin/properties/counts] Request received');
    const statuses = ["DRAFT","PENDING","APPROVED","NEEDS_FIXES","REJECTED","SUSPENDED"] as const;
    const results: Record<string, number> = {};
    
    await Promise.all(statuses.map(async (s) => {
      try {
        const c = await prisma.property.count({ where: { status: s as any } });
        // Ensure count is a number (not BigInt) for JSON serialization
        results[s] = typeof c === 'bigint' ? Number(c) : Number(c);
      } catch (countErr: any) {
        console.error(`[GET /admin/properties/counts] Failed to count status ${s}:`, countErr);
        results[s] = 0;
      }
    }));
    
    console.log('[GET /admin/properties/counts] Results:', results);
    
    // Test JSON serialization before sending
    try {
      JSON.stringify(results);
      res.setHeader('Content-Type', 'application/json');
      res.json(results);
    } catch (jsonError: any) {
      console.error('[GET /admin/properties/counts] JSON serialization error:', jsonError);
      // Return empty results on serialization error
      res.setHeader('Content-Type', 'application/json');
      res.json({ DRAFT:0, PENDING:0, APPROVED:0, NEEDS_FIXES:0, REJECTED:0, SUSPENDED:0 });
    }
  } catch (err: any) {
    console.error("/admin/properties/counts failed:", err?.message || err);
    console.error("/admin/properties/counts error stack:", err?.stack);
    // Fail-open with zeros to avoid breaking UI - always return JSON
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json({ DRAFT:0, PENDING:0, APPROVED:0, NEEDS_FIXES:0, REJECTED:0, SUSPENDED:0 });
  }
}) as RequestHandler);

/** GET /admin/properties/:id/audit-history - Get audit history for a property */
router.get("/:id/audit-history", (async (req: AuthedRequest, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid property ID" });

    console.log(`[audit-history] Fetching audit history for property ID: ${id}`);
    
    const audits = await prisma.auditLog.findMany({
      where: {
        entity: "PROPERTY",
        entityId: id,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        actor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    console.log(`[audit-history] Found ${audits.length} audit logs for property ${id}`);

    // Transform to ensure consistent response format
    const formattedAudits = audits.map((audit: any) => ({
      id: audit.id.toString(),
      actorId: audit.actorId,
      actorRole: audit.actorRole,
      action: audit.action,
      entity: audit.entity,
      entityId: audit.entityId,
      beforeJson: audit.beforeJson,
      afterJson: audit.afterJson,
      ip: audit.ip,
      ua: audit.ua,
      createdAt: audit.createdAt.toISOString(),
      actor: audit.actor ? {
        id: audit.actor.id,
        name: audit.actor.name,
        email: audit.actor.email,
      } : null,
    }));

    console.log(`[audit-history] Returning ${formattedAudits.length} formatted audit logs`);
    res.json(formattedAudits);
  } catch (err: any) {
    console.error("Failed to fetch audit history:", {
      error: err?.message || String(err),
      stack: err?.stack,
      propertyId: req.params.id,
    });
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).json({ error: "Failed to fetch audit history", message: err?.message || 'Unknown error' });
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
    const dto = toAdminPropertyDTO(p);
    res.json(dto);
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

    // Invalidate cache for this property and property lists
    await Promise.all([
      invalidateCache(cacheKeys.property(id)),
      invalidateCache('properties:list:*'),
      invalidateCache(cacheKeys.adminSummary()),
    ]).catch(() => {}); // Don't fail the request if cache invalidation fails

    // Update room prices if provided
    // Rooms are stored in the roomsSpec JSON field, not a separate Room table
    if (roomPrices && typeof roomPrices === 'object') {
      if (property.roomsSpec && Array.isArray(property.roomsSpec)) {
        const roomsArray = property.roomsSpec as any[];
        const updatedRoomsSpec = roomsArray.map((room: any, index: number) => {
          // Try to match by room ID or index
          const roomId = room.id ? String(room.id) : null;
          
          // Check if this room's price should be updated
          const priceUpdate = roomId && roomPrices[roomId] !== undefined
            ? roomPrices[roomId]
            : roomPrices[index] !== undefined
            ? roomPrices[index]
            : null;
          
          if (priceUpdate !== null && Number.isFinite(Number(priceUpdate))) {
            return {
              ...room,
              pricePerNight: Number(priceUpdate),
              price: Number(priceUpdate),
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
        
        // Invalidate cache for this property
        await invalidateCache(cacheKeys.property(id)).catch(() => {});
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
  // Approve can only be used for initial approval (PENDING) or re-approval after rejection (REJECTED)
  // Once approved, properties can only be suspended/unsuspended, not re-approved
  // To restore a suspended property, use unsuspend instead
  if (!["PENDING", "REJECTED"].includes(before.status)) {
    res.status(400).json({ 
      error: `Cannot approve from status ${before.status}. Approval is only available for PENDING or REJECTED properties. To restore a SUSPENDED property, use unsuspend instead.` 
    }); 
    return;
  }

  const updated = await prisma.property.update({
    where: { id },
    data: { status: "APPROVED" },
  });

  // Invalidate cache for this property and property lists
  await Promise.all([
    invalidateCache(cacheKeys.property(id)),
    invalidateCache('properties:list:*'),
    invalidateCache(cacheKeys.adminSummary()),
  ]).catch(() => {}); // Don't fail the request if cache invalidation fails

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
  // Reject can only be used for properties awaiting initial approval (PENDING)
  // Once approved, properties can only be suspended/unsuspended, not rejected
  if (before.status !== "PENDING") {
    return res.status(400).json({ 
      error: `Cannot reject from status ${before.status}. Rejection is only available for PENDING properties awaiting initial approval.` 
    });
  }

  const updated = await prisma.property.update({
    where: { id },
    data: { status: "REJECTED" },
  });

  // Invalidate cache for this property and property lists
  await Promise.all([
    invalidateCache(cacheKeys.property(id)),
    invalidateCache('properties:list:*'),
    invalidateCache(cacheKeys.adminSummary()),
  ]).catch(() => {}); // Don't fail the request if cache invalidation fails

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
  
  // If already suspended, return error
  if (before.status === "SUSPENDED")
    return res.status(400).json({ error: "Property is already suspended" });
  
  // Only APPROVED properties can be suspended
  // Once approved, properties can only be suspended/unsuspended, not rejected
  if (before.status !== "APPROVED") {
    return res.status(400).json({ 
      error: `Cannot suspend property with status ${before.status}. Only APPROVED properties can be suspended.` 
    });
  }
  
  // Change status from APPROVED to SUSPENDED
  const newStatus = "SUSPENDED";
  
  const updated = await prisma.property.update({
    where: { id },
    data: { status: newStatus },
  });

  // Invalidate cache for this property and property lists
  await Promise.all([
    invalidateCache(cacheKeys.property(id)),
    invalidateCache('properties:list:*'),
    invalidateCache(cacheKeys.adminSummary()),
  ]).catch(() => {}); // Don't fail the request if cache invalidation fails

  const payload = {
    id,
    from: before.status,
    to: newStatus,
    by: req.user!.id,
    reason: parse.data.reason,
  };

  const promises: Promise<any>[] = [
    emitEvent("property.status.changed", payload),
    invalidateAdminPropertyQueues(),
    invalidateOwnerPropertyLists(before.ownerId),
    // Always notify owner immediately when property is suspended
    notifyOwner(before.ownerId, "property_suspended", {
      propertyId: id,
      propertyTitle: before.title,
      reason: parse.data.reason,
    }),
    (async () => {
      const auditResult = await auditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: "PROPERTY_SUSPEND",
        entity: "PROPERTY",
        entityId: id,
        before,
        after: { status: newStatus, reason: parse.data.reason },
        ip: (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket?.remoteAddress || req.ip || undefined,
        ua: (req.headers["user-agent"] as string) || undefined,
      });
      if (!auditResult) {
        console.error(`[suspend] Failed to create audit log for property ${id}`);
      } else {
        console.log(`[suspend] Successfully created audit log for property ${id}, audit ID: ${auditResult.id}`);
      }
      return auditResult;
    })(),
  ];

  await Promise.all(promises);

  broadcastStatus(req, payload);
  res.json({ ok: true, id: updated.id, status: updated.status });
}) as RequestHandler);

/** POST /admin/properties/:id/unsuspend { reason } */
router.post("/:id/unsuspend", (async (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid property ID" });
  
  const parse = UnsuspendPropertyInput.safeParse(req.body);
  if (!parse.success) {
    const errors = parse.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
    return res.status(400).json({ error: `Validation failed: ${errors}` });
  }

  const before = await prisma.property.findFirst({
    where: { id },
    select: { status: true, ownerId: true, title: true },
  });
  if (!before) return res.status(404).json({ error: "Not found" });
  
  // Can only unsuspend from SUSPENDED status
  // Once approved, properties can only be suspended/unsuspended, not rejected
  if (before.status !== "SUSPENDED") {
    return res.status(400).json({ 
      error: `Cannot unsuspend from ${before.status}. Property must be SUSPENDED to be unsuspended.` 
    });
  }

  const updated = await prisma.property.update({
    where: { id },
    data: { status: "APPROVED" },
  });

  // Invalidate cache for this property and property lists
  await Promise.all([
    invalidateCache(cacheKeys.property(id)),
    invalidateCache('properties:list:*'),
    invalidateCache(cacheKeys.adminSummary()),
  ]).catch(() => {}); // Don't fail the request if cache invalidation fails

  const payload = { 
    id, 
    from: before.status, 
    to: "APPROVED", 
    by: req.user!.id,
    reason: parse.data.reason,
  };

  await Promise.all([
    emitEvent("property.status.changed", payload),
    invalidateAdminPropertyQueues(),
    invalidateOwnerPropertyLists(before.ownerId),
    notifyOwner(before.ownerId, "property_unsuspended", { 
      propertyId: id, 
      propertyTitle: before.title,
      reason: parse.data.reason,
    }),
    auditLog({
      actorId: req.user!.id,
      actorRole: req.user!.role,
      action: "PROPERTY_UNSUSPEND",
      entity: "PROPERTY",
      entityId: id,
      before,
      after: { status: "APPROVED", reason: parse.data.reason },
      ip: req.ip,
      ua: req.headers["user-agent"] as string,
    }),
  ]);

  broadcastStatus(req, payload);
  res.json({ ok: true, id: updated.id, status: updated.status });
}) as RequestHandler);

export default router;
