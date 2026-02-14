// apps/api/src/routes/owner.properties.ts
import { Router, RequestHandler } from "express";
import { prisma } from "@nolsaf/prisma";
import { AuthedRequest, requireAuth, requireRole } from "../middleware/auth.js";
import { cleanHtml } from "../lib/sanitize";
import { Prisma } from "@prisma/client";
import { z } from "zod";

// ✅ ADD THIS IMPORT NEAR THE TOP
import { regenerateAndSaveLayout } from "../lib/autoLayout.js";
import { invalidateCache, cacheKeys } from "../lib/performance.js";

// ---------- Schemas & Helpers ----------
// Minimal Zod schema for property body used by create/update
const baseBodySchema = z.object({
  // basics
  title: z.string().trim().min(3, "title must be at least 3 characters").max(200, "title must be at most 200 characters"),
  type: z.string().trim().min(1).max(50), // e.g. VILLA | APARTMENT | HOTEL | ...
  description: z.string().max(10_000).optional().nullable(),

  // building / structure
  buildingType: z.string().optional().nullable(),
  totalFloors: z.number().int().nonnegative().optional().nullable(),

  // location
  // regionId: Accept string (slug like "dar-es-salaam") or number (code like 11)
  // Database stores as VARCHAR(50), so both formats work
  regionId: z.union([z.string().trim().min(1).max(50), z.number().int().positive()]).optional(),
  regionName: z.string().trim().max(120).optional(),
  district: z.string().trim().max(120).optional(),
  ward: z.string().trim().max(120).optional().nullable(),
  street: z.string().trim().max(200).optional().nullable(),
  apartment: z.string().trim().max(120).optional().nullable(),
  city: z.string().trim().max(120).optional(),
  zip: z.string().trim().max(30).optional(),
  country: z.string().trim().max(120).optional(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),

  // counts
  totalBedrooms: z.number().int().nonnegative().default(0),
  totalBathrooms: z.number().int().nonnegative().default(0),
  maxGuests: z.number().int().positive().default(1),

  // media
  photos: z.array(z.string()).default([]),

  // hotel-specific
  hotelStar: z.number().int().min(1).max(5).optional().nullable(),

  // room & services
  roomsSpec: z.array(z.any()).default([]),
  // services can be array of strings (legacy) or object with tags and nearbyFacilities
  services: z.union([
    z.array(z.string()),
    z.object({
      tags: z.array(z.string()).optional(),
      nearbyFacilities: z.array(z.any()).optional(),
    }).passthrough(),
  ]).default([]),
  // house rules captured in the creation flow (stored into `services.houseRules` for now)
  houseRules: z.any().optional().nullable(),

  // pricing
  basePrice: z.number().nonnegative().optional().nullable(),
  currency: z.string().min(1).max(8).default("TZS"),

  // tourism / park placement
  tourismSiteId: z.number().int().positive().optional().nullable(),
  parkPlacement: z.enum(["INSIDE", "NEARBY"]).optional().nullable(),
  
});

function normalizeHotelStar(v: unknown): string | null {
  // DB schema stores hotelStar as string label (basic/simple/moderate/high/luxury)
  if (v === null || typeof v === "undefined") return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  const map: Record<number, string> = {
    1: "basic",
    2: "simple",
    3: "moderate",
    4: "high",
    5: "luxury",
  };
  return map[Math.trunc(n)] ?? String(v);
}


function cleanServices(services: unknown): any {
  // Handle legacy array format
  if (Array.isArray(services)) {
    const out = services
      .filter((s): s is string => typeof s === "string")
      .map((s) => s.trim())
      .filter(Boolean);
    return Array.from(new Set(out)).slice(0, 200);
  }
  
  // Handle object format with tags, nearbyFacilities, and service properties
  if (services && typeof services === 'object' && !Array.isArray(services)) {
    const obj = services as any;
    const result: any = {};
    
    // Preserve all service properties (parking, restaurant, bar, pool, etc.)
    const serviceProperties = [
      'parking', 'parkingPrice', 'breakfastIncluded', 'breakfastAvailable',
      'restaurant', 'bar', 'pool', 'sauna', 'laundry', 'roomService',
      'security24', 'firstAid', 'fireExtinguisher', 'onSiteShop', 'nearbyMall',
      'socialHall', 'sportsGames', 'gym', 'wifi', 'ac',
      // Persist house rules inside services JSON for admin/owner previews
      'houseRules'
    ];
    
    for (const prop of serviceProperties) {
      if (obj[prop] !== undefined && obj[prop] !== null && obj[prop] !== '') {
        result[prop] = obj[prop];
      }
    }
    
    // Clean and add tags if present
    if (Array.isArray(obj.tags)) {
      const cleanTags = obj.tags
        .filter((s: any): s is string => typeof s === "string")
        .map((s: string) => s.trim())
        .filter(Boolean);
      result.tags = Array.from(new Set(cleanTags)).slice(0, 200);
    }
    
    // Preserve nearbyFacilities array if present
    if (Array.isArray(obj.nearbyFacilities)) {
      result.nearbyFacilities = obj.nearbyFacilities;
    }
    
    return result;
  }
  
  return [];
}

// Extra business validation hook used during submit; keep permissive for now
function submitGuard(_p: any): boolean {
  return true;
}

export const router = Router();

// Note: Body parser middleware with 10mb limit is applied at app level in index.ts
// before the global 100kb limit, so property routes can handle large payloads

// Cast middlewares so Router.use picks the correct overload
router.use(
  requireAuth as unknown as import("express").RequestHandler,
  requireRole("OWNER") as unknown as import("express").RequestHandler
);

function isSchemaMismatchError(err: any) {
  return err instanceof Prisma.PrismaClientKnownRequestError && (err.code === "P2021" || err.code === "P2022");
}

async function findOwnerPropertyById(ownerId: number, id: number) {
  const baseSelect: any = {
    id: true,
    ownerId: true,
    status: true,
    title: true,
    type: true,
    description: true,
    buildingType: true,
    totalFloors: true,
    regionId: true,
    regionName: true,
    district: true,
    ward: true,
    street: true,
    apartment: true,
    city: true,
    zip: true,
    country: true,
    latitude: true,
    longitude: true,
    totalBedrooms: true,
    totalBathrooms: true,
    maxGuests: true,
    photos: true,
    hotelStar: true,
    roomsSpec: true,
    services: true,
    basePrice: true,
    currency: true,
    rejectionReasons: true,
    lastSubmittedAt: true,
    createdAt: true,
    updatedAt: true,
    owner: {
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
      },
    },
  };

  // First try: include tourism fields (works once DB migration is applied)
  try {
    return await prisma.property.findFirst({
      where: { id, ownerId },
      select: {
        ...baseSelect,
        tourismSiteId: true,
        parkPlacement: true,
      },
    });
  } catch (err: any) {
    // Fallback for older DBs without the new columns
    if (isSchemaMismatchError(err)) {
      return await prisma.property.findFirst({
        where: { id, ownerId },
        select: baseSelect,
      });
    }
    throw err;
  }
}

/* … your Zod schemas and helpers stay the same … */

// ---------- LIST MINE ----------
router.get("/mine", (async (req: AuthedRequest, res) => {
  try {
    const ownerId = req.user!.id;
    if (!ownerId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { status, page = "1", pageSize = "20" } = req.query as any;

    const where: any = { ownerId };
    if (status) {
      where.status = status;
    }

    const skip = Math.max(0, (Number(page) - 1) * Number(pageSize));
    const take = Math.max(1, Math.min(100, Number(pageSize))); // Limit pageSize to prevent abuse

    let items: any[] = [];
    let total = 0;

    const listSelectBase: any = {
      id: true,
      ownerId: true,
      status: true,
      title: true,
      type: true,
      photos: true,
      regionName: true,
      district: true,
      ward: true,
      city: true,
      basePrice: true,
      currency: true,
      services: true,
      rejectionReasons: true,
      lastSubmittedAt: true,
      createdAt: true,
      updatedAt: true,
    };

    // Availability UI needs these fields to render real counts (otherwise it shows 0 rooms/floors).
    // Keep drift-safe: if the DB is behind on these columns, fall back to the minimal select.
    const listSelectWithStructure: any = {
      ...listSelectBase,
      roomsSpec: true,
      buildingType: true,
      totalFloors: true,
    };

    // Tourism UI needs these fields to show the selected park in owner tables/cards.
    // Keep drift-safe: if the DB is behind on these columns/tables, fall back.
    const listSelectWithStructureAndTourism: any = {
      ...listSelectWithStructure,
      tourismSiteId: true,
      parkPlacement: true,
      tourismSite: {
        select: {
          id: true,
          slug: true,
          name: true,
          country: true,
        },
      },
    };

    try {
      [items, total] = await Promise.all([
        prisma.property.findMany({
          where,
          // Avoid MySQL "Out of sort memory" on large tables by ordering on indexed PK
          orderBy: { id: "desc" },
          skip,
          take,
          select: listSelectWithStructureAndTourism,
        }),
        prisma.property.count({ where }),
      ]);
      console.log(`GET /mine: Found ${items.length} items (total: ${total}) with status=${status || 'all'} for ownerId=${ownerId}`);
    } catch (dbError: any) {
      // If the DB is behind and doesn't have some columns, retry with minimal fields.
      if (isSchemaMismatchError(dbError)) {
        try {
          [items, total] = await Promise.all([
            prisma.property.findMany({
              where,
              orderBy: { id: "desc" },
              skip,
              take,
              select: listSelectWithStructure,
            }),
            prisma.property.count({ where }),
          ]);
          console.log(`GET /mine: Drift fallback used. Found ${items.length} items (total: ${total}) with status=${status || 'all'} for ownerId=${ownerId}`);
        } catch (retryError: any) {
          if (isSchemaMismatchError(retryError)) {
            try {
              [items, total] = await Promise.all([
                prisma.property.findMany({
                  where,
                  orderBy: { id: "desc" },
                  skip,
                  take,
                  select: listSelectBase,
                }),
                prisma.property.count({ where }),
              ]);
              console.log(`GET /mine: Drift fallback (minimal) used. Found ${items.length} items (total: ${total}) with status=${status || 'all'} for ownerId=${ownerId}`);
            } catch (finalRetryError: any) {
              console.error("Database error in GET /mine (final retry):", finalRetryError);
              return res.json({
                page: Number(page),
                pageSize: take,
                total: 0,
                items: [],
              });
            }
          } else {
            console.error("Database error in GET /mine (retry):", retryError);
            return res.json({
              page: Number(page),
              pageSize: take,
              total: 0,
              items: [],
            });
          }
        }
      } else {
      console.error("Database error in GET /mine:", dbError);
      console.error("Error details:", {
        code: dbError?.code,
        message: dbError?.message,
        meta: dbError?.meta,
      });
      // Return empty result instead of crashing (following admin.properties pattern)
      return res.json({
        page: Number(page),
        pageSize: take,
        total: 0,
        items: [],
      });
      }
    }

    // Safety check - ensure items is an array
    if (!Array.isArray(items)) {
      console.error("Items is not an array:", typeof items, items);
      items = [];
    }

    // For suspended properties, fetch the suspension reason from audit logs
    // Process items sequentially to avoid overwhelming the database and handle errors gracefully
    const processedItems: any[] = [];
    
    // Helper function to safely serialize a Prisma object
    const serializePrismaObject = (obj: any): any => {
      if (obj === null || obj === undefined) return obj;
      if (!obj || typeof obj !== 'object') return obj;
      
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
    
    for (const item of items) {
      try {
        // Serialize the Prisma object to a plain JavaScript object
        let processedItem: any;
        try {
          processedItem = serializePrismaObject(item);
          
          // Ensure essential fields are present
          if (!processedItem.id) processedItem.id = item?.id;
          if (!processedItem.status) processedItem.status = item?.status;
          if (!processedItem.title) processedItem.title = item?.title;
        } catch (serializeError: any) {
          console.error("Error serializing property item", item?.id, serializeError);
          // Fallback to minimal object
          processedItem = {
            id: item?.id || null,
            title: item?.title || null,
            status: item?.status || null,
            createdAt: item?.createdAt instanceof Date ? item.createdAt.toISOString() : null,
            updatedAt: item?.updatedAt instanceof Date ? item.updatedAt.toISOString() : null,
          };
        }

        // Only check for suspension reason if status is SUSPENDED
        if (item.status === "SUSPENDED" && item.id) {
          try {
            const lastSuspendAudit = await prisma.auditLog.findFirst({
              where: {
                entity: "PROPERTY",
                entityId: item.id,
                action: "PROPERTY_SUSPEND",
              },
              // Use PK ordering to avoid sort-buffer issues; id is monotonic.
              orderBy: { id: "desc" },
              select: { afterJson: true },
            });

            if (lastSuspendAudit) {
              // Parse the afterJson to get the reason
              let suspensionReason = null;
              try {
                const afterJson = typeof lastSuspendAudit.afterJson === 'string' 
                  ? JSON.parse(lastSuspendAudit.afterJson) 
                  : lastSuspendAudit.afterJson;
                suspensionReason = afterJson?.reason || null;
              } catch {
                // If parsing fails, try to get reason from afterJson directly
                suspensionReason = (lastSuspendAudit.afterJson as any)?.reason || null;
              }
              processedItem.suspensionReason = suspensionReason;
            }
          } catch (err) {
            // If there's an error fetching suspension reason, just continue without it
            console.error("Error fetching suspension reason for property", item.id, err);
          }
        }

        processedItems.push(processedItem);
      } catch (itemError: any) {
        // If processing an individual item fails, log it but continue with other items
        console.error("Error processing property", item?.id, itemError);
        // Still add the item but with minimal data
        try {
          processedItems.push({
            id: item?.id || null,
            title: item?.title || null,
            status: item?.status || null,
            createdAt: item?.createdAt instanceof Date ? item.createdAt.toISOString() : null,
            updatedAt: item?.updatedAt instanceof Date ? item.updatedAt.toISOString() : null,
          });
        } catch (minimalError) {
          // If even minimal serialization fails, skip this item
          console.error("Failed to create minimal item object", item?.id, minimalError);
        }
      }
    }

    // Final safety check - ensure response is serializable
    try {
      const response = {
        page: Number(page),
        pageSize: take,
        total,
        items: processedItems,
      };
      
      // Test serialization before sending
      JSON.stringify(response);
      
      res.json(response);
    } catch (jsonError: any) {
      console.error("JSON serialization error in GET /mine response:", jsonError);
      // Return minimal safe response
      res.json({
        page: Number(page),
        pageSize: take,
        total: 0,
        items: [],
      });
    }
  } catch (error: any) {
    console.error("Error in GET /mine:", error);
    console.error("Error stack:", error?.stack);
    console.error("Error details:", {
      code: (error as any)?.code,
      message: error?.message,
      meta: (error as any)?.meta,
    });
    // Return empty result instead of error to prevent breaking the UI
    try {
      res.json({
        page: Number(req.query?.page) || 1,
        pageSize: Number(req.query?.pageSize) || 20,
        total: 0,
        items: [],
      });
    } catch (responseError: any) {
      // If even sending empty response fails, send minimal error
      console.error("Failed to send error response:", responseError);
      res.status(500).json({ 
        error: "Internal Server Error",
        message: "Failed to fetch properties"
      });
    }
  }
}) as RequestHandler);

// ---------- GET BY ID ----------
router.get("/:id", (async (req: AuthedRequest, res) => {
  try {
    const ownerId = req.user!.id;
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });

    const property = await findOwnerPropertyById(ownerId, id);
    if (!property) return res.status(404).json({ error: "Property not found" });

  // Safely serialize the property object
  const serializePrismaObject = (obj: any): any => {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj !== 'object') return obj;
    
    const result: any = {};
    const keys = Object.keys(obj);
    
    for (const key of keys) {
      try {
        const value = obj[key];
        
        if (typeof value === 'function' || typeof value === 'symbol') continue;
        
        if (value instanceof Date) {
          result[key] = value.toISOString();
        } else if (typeof value === 'bigint') {
          result[key] = value.toString();
        } else if (value === null || value === undefined) {
          result[key] = value;
        } else if (Array.isArray(value)) {
          result[key] = value.map(v => serializePrismaObject(v));
        } else if (typeof value === 'object') {
          if (key.startsWith('_') || key === 'toJSON' || key === 'toString') continue;
          try {
            result[key] = serializePrismaObject(value);
          } catch {
            continue;
          }
        } else {
          result[key] = value;
        }
      } catch {
        continue;
      }
    }
    
    return result;
  };

    try {
      const serialized = serializePrismaObject(property);
      JSON.stringify(serialized); // Test serialization
      return res.json(serialized);
    } catch (err: any) {
      console.error(`Error serializing property ${id}:`, err);
      return res.status(500).json({ error: "Failed to serialize property data" });
    }
  } catch (err: any) {
    console.error("Error in GET /api/owner/properties/:id:", err);
    return res.status(500).json({ error: "Internal Server Error", message: err?.message || "Failed to fetch property" });
  }
}) as RequestHandler);

// ---------- CREATE ----------
router.post("/", (async (req: AuthedRequest, res) => {
  try {
    const ownerId = req.user!.id;
    const parsed = baseBodySchema.parse(req.body);

    // Normalize tourism / park placement fields
    const normalizedTourismSiteId = parsed.tourismSiteId ?? null;
    const normalizedParkPlacementRaw = typeof parsed.parkPlacement === "undefined" ? null : parsed.parkPlacement;
    if (!normalizedTourismSiteId && (normalizedParkPlacementRaw === "INSIDE" || normalizedParkPlacementRaw === "NEARBY")) {
      return res.status(400).json({ error: "tourismSiteId_required_when_parkPlacement_set" });
    }
    const normalizedParkPlacement = normalizedTourismSiteId
      ? (normalizedParkPlacementRaw === "INSIDE" || normalizedParkPlacementRaw === "NEARBY" ? normalizedParkPlacementRaw : "NEARBY")
      : null;

    // Merge house rules into services so they are available in admin/owner previews
    let servicesForSave: any = cleanServices(parsed.services);
    if (parsed.houseRules) {
      if (Array.isArray(servicesForSave)) {
        servicesForSave = { tags: servicesForSave };
      }
      if (servicesForSave && typeof servicesForSave === "object" && !Array.isArray(servicesForSave)) {
        servicesForSave.houseRules = parsed.houseRules;
      }
    }

    const createData: any = {
        ownerId,
        title: parsed.title,
        type: parsed.type,
  description: cleanHtml(parsed.description ?? null),
        status: "DRAFT",
        buildingType: parsed.buildingType ?? null,
        totalFloors: parsed.totalFloors ?? null,
        // location …
        // Prisma schema expects String? for regionId, but UI may send numeric codes (e.g. 11)
        regionId: parsed.regionId == null ? null : String(parsed.regionId),
        regionName: parsed.regionName,
        district: parsed.district,
        ward: parsed.ward ?? null,
        street: parsed.street,
        apartment: parsed.apartment,
        city: parsed.city,
        zip: parsed.zip,
        country: parsed.country,
        latitude: parsed.latitude ?? null,
        longitude: parsed.longitude ?? null,
        // counts …
        totalBedrooms: parsed.totalBedrooms,
        totalBathrooms: parsed.totalBathrooms,
        maxGuests: parsed.maxGuests,
        // media …
        photos: parsed.photos,
        // hotel …
        hotelStar: normalizeHotelStar(parsed.hotelStar),
        // room & services …
        roomsSpec: parsed.roomsSpec,
        services: servicesForSave,
        // pricing …
        basePrice: parsed.basePrice ?? null,
        currency: parsed.currency,

        // tourism / park placement …
        tourismSiteId: normalizedTourismSiteId,
        parkPlacement: normalizedParkPlacement,
      };

    let created: any;
    try {
      created = await prisma.property.create({ data: createData });
    } catch (err: any) {
      // If DB isn't migrated yet, retry without the new tourism columns.
      if (isSchemaMismatchError(err)) {
        delete createData.tourismSiteId;
        delete createData.parkPlacement;
        created = await prisma.property.create({ data: createData });
      } else {
        throw err;
      }
    }

    // Persist PropertyImage records for any photos provided
    try {
      const photos: string[] = Array.isArray(parsed.photos) ? parsed.photos : [];
      await Promise.all(
        photos.map(async (p) => {
          if (typeof p !== "string") return;
          // Never persist local preview/base64 strings into DB
          if (p.startsWith("blob:") || p.startsWith("data:")) return;
          // Keep URLs within reasonable size to avoid DB driver length mismatches
          if (p.length > 2048) return;
          const storageKey = p.split("/").pop() || p;
          if (storageKey.length > 190) return;
          await prisma.propertyImage.upsert({
            where: { storageKey },
            create: { propertyId: created.id, storageKey, url: p, status: "PENDING" },
            update: { url: p },
          });
        })
      );
    } catch (e) {
      // don't fail the request on image persistence issues
      console.log("property image persist failed", e);
    }
    // ✅ AFTER CREATE — AUTO GENERATE LAYOUT IF WE HAVE ROOMS
    if (Array.isArray(created.roomsSpec) && created.roomsSpec.length > 0) {
      try { await regenerateAndSaveLayout(created.id); } catch {}
    }

    // Invalidate cache for property lists (new property created)
    await invalidateCache('properties:list:*').catch(() => {});

    res.status(201).json({ id: created.id });
  } catch (e: any) {
    console.error("Error in POST /api/owner/properties:", e);
    console.error("Error details:", {
      message: e?.message,
      code: e?.code,
      meta: e?.meta,
      stack: e?.stack,
    });
    res.status(400).json({ error: e?.errors ?? e?.message ?? "Invalid payload" });
  }
}) as RequestHandler);

// ---------- UPDATE ----------
router.put("/:id", (async (req: AuthedRequest, res) => {
  try {
    const ownerId = req.user!.id;
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });

    const exists = await prisma.property.findFirst({
      where: { id, ownerId },
      select: { id: true, tourismSiteId: true, parkPlacement: true },
    });
    if (!exists) return res.status(404).json({ error: "Property not found" });

    const parsed = baseBodySchema.parse(req.body);

    // Normalize tourism / park placement fields
    const incomingTourismSiteId = typeof parsed.tourismSiteId === "undefined" ? undefined : (parsed.tourismSiteId ?? null);
    const incomingParkPlacementRaw = typeof parsed.parkPlacement === "undefined" ? undefined : (parsed.parkPlacement ?? null);

    const nextTourismSiteId = incomingTourismSiteId !== undefined ? incomingTourismSiteId : (exists as any).tourismSiteId ?? null;

    // If parkPlacement is being set, ensure we have a tourism site.
    if ((incomingParkPlacementRaw === "INSIDE" || incomingParkPlacementRaw === "NEARBY") && !nextTourismSiteId) {
      return res.status(400).json({ error: "tourismSiteId_required_when_parkPlacement_set" });
    }

    // If tourism site is set (or remains set), ensure parkPlacement is valid.
    const nextParkPlacement = nextTourismSiteId
      ? (incomingParkPlacementRaw === "INSIDE" || incomingParkPlacementRaw === "NEARBY"
          ? incomingParkPlacementRaw
          : ((exists as any).parkPlacement === "INSIDE" || (exists as any).parkPlacement === "NEARBY")
            ? (exists as any).parkPlacement
            : "NEARBY")
      : null;

    // Merge house rules into services so they are available in admin/owner previews
    let servicesForSave: any = cleanServices(parsed.services);
    if (parsed.houseRules) {
      if (Array.isArray(servicesForSave)) {
        servicesForSave = { tags: servicesForSave };
      }
      if (servicesForSave && typeof servicesForSave === "object" && !Array.isArray(servicesForSave)) {
        servicesForSave.houseRules = parsed.houseRules;
      }
    }

    const updateData: any = {
        title: parsed.title,
        type: parsed.type,
  description: cleanHtml(parsed.description ?? null),
        buildingType: parsed.buildingType ?? null,
        totalFloors: parsed.totalFloors ?? null,
        // location …
        // Keep existing value if field omitted; coerce number -> string when provided
        regionId: typeof parsed.regionId === "undefined" ? undefined : (parsed.regionId == null ? null : String(parsed.regionId)),
        regionName: parsed.regionName,
        district: parsed.district,
        ward: parsed.ward ?? null,
        street: parsed.street,
        apartment: parsed.apartment,
        city: parsed.city,
        zip: parsed.zip,
        country: parsed.country,
        latitude: parsed.latitude ?? null,
        longitude: parsed.longitude ?? null,
        // counts …
        totalBedrooms: parsed.totalBedrooms,
        totalBathrooms: parsed.totalBathrooms,
        maxGuests: parsed.maxGuests,
        // media …
        photos: parsed.photos,
        // hotel …
        hotelStar: typeof parsed.hotelStar === "undefined" ? undefined : normalizeHotelStar(parsed.hotelStar),
        // room & services …
        roomsSpec: parsed.roomsSpec,
        services: servicesForSave,
        // pricing …
        basePrice: parsed.basePrice ?? null,
        currency: parsed.currency,

        // tourism / park placement …
        tourismSiteId: incomingTourismSiteId === undefined ? undefined : nextTourismSiteId,
        // If tourism site is being changed/cleared, reflect placement accordingly.
        // If tourism site exists (even unchanged), keep placement valid (default NEARBY).
        parkPlacement:
          incomingTourismSiteId !== undefined || incomingParkPlacementRaw !== undefined || nextTourismSiteId
            ? nextParkPlacement
            : undefined,
      };

    let updated: any;
    try {
      updated = await prisma.property.update({ where: { id }, data: updateData });
    } catch (err: any) {
      if (isSchemaMismatchError(err)) {
        delete updateData.tourismSiteId;
        delete updateData.parkPlacement;
        updated = await prisma.property.update({ where: { id }, data: updateData });
      } else {
        throw err;
      }
    }

    // Persist PropertyImage records for any photos provided
    try {
      const photos: string[] = Array.isArray(parsed.photos) ? parsed.photos : [];
      await Promise.all(
        photos.map(async (p) => {
          if (typeof p !== "string") return;
          if (p.startsWith("blob:") || p.startsWith("data:")) return;
          if (p.length > 2048) return;
          const storageKey = p.split("/").pop() || p;
          if (storageKey.length > 190) return;
          await prisma.propertyImage.upsert({
            where: { storageKey },
            create: { propertyId: updated.id, storageKey, url: p, status: "PENDING" },
            update: { url: p },
          });
        })
      );
    } catch (e) {
      console.log("property image persist failed", e);
    }
    // ✅ AFTER UPDATE — OPTIONAL ?regen=1 OR WHEN ROOMS EXIST
    const regen = String(req.query.regen ?? "") === "1";
    if (regen || (Array.isArray(parsed.roomsSpec) && parsed.roomsSpec.length > 0)) {
      try { await regenerateAndSaveLayout(id); } catch {}
    }

    // Invalidate cache for this property and property lists
    await Promise.all([
      invalidateCache(cacheKeys.property(id)),
      invalidateCache('properties:list:*'),
    ]).catch(() => {}); // Don't fail the request if cache invalidation fails

    res.json({ id: updated.id });
  } catch (e: any) {
    console.error("Error in PUT /api/owner/properties/:id:", e);
    console.error("Error details:", {
      message: e?.message,
      code: e?.code,
      meta: e?.meta,
      stack: e?.stack,
    });
    res.status(400).json({ error: e?.errors ?? e?.message ?? "Update failed" });
  }
}) as RequestHandler);

// ---------- SUBMIT ----------
router.post("/:id/submit", (async (req: AuthedRequest, res) => {
  try {
    const ownerId = req.user!.id;
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });

    const p = await prisma.property.findFirst({
      where: { id, ownerId },
      select: {
        id: true,
        ownerId: true,
        title: true,
        regionId: true,
        district: true,
        photos: true,
        roomsSpec: true,
      },
    });
    if (!p) {
      console.error(`Property ${id} not found for owner ${ownerId}`);
      return res.status(404).json({ error: "Property not found" });
    }

    const complete =
      (p.title?.trim()?.length ?? 0) >= 3 &&
      !!p.regionId &&
      !!p.district &&
      (Array.isArray(p.photos) ? p.photos.length : 0) >= 3 &&
      Array.isArray(p.roomsSpec) && p.roomsSpec.length >= 1 &&
      submitGuard(p);

    if (!complete) {
      console.error(`Property ${id} incomplete. Title: ${p.title?.length}, regionId: ${!!p.regionId}, district: ${!!p.district}, photos: ${Array.isArray(p.photos) ? p.photos.length : 0}, rooms: ${Array.isArray(p.roomsSpec) ? p.roomsSpec.length : 0}`);
      return res.status(400).json({ error: "Incomplete property. Please complete required fields (name, location, ≥3 photos, ≥1 room type)." });
    }

    const updated = await prisma.property.update({
      where: { id },
      data: { status: "PENDING" },
    });

    // Invalidate cache for this property and property lists
    await Promise.all([
      invalidateCache(cacheKeys.property(id)),
      invalidateCache('properties:list:*'),
      invalidateCache(cacheKeys.adminSummary()),
    ]).catch(() => {}); // Don't fail the request if cache invalidation fails

    // Verify the update worked
    const verified = await prisma.property.findFirst({
      where: { id, ownerId },
      select: { id: true, status: true, title: true },
    });

    console.log(`Property ${id} submitted successfully. Status: ${updated.status}, Verified status: ${verified?.status}, Owner: ${ownerId}`);
    
    if (verified?.status !== "PENDING") {
      console.error(`WARNING: Property ${id} status update may have failed. Expected PENDING, got ${verified?.status}`);
    }

    // ✅ BEFORE RETURN — ENSURE LAYOUT IS FRESH
    try { await regenerateAndSaveLayout(id); } catch (err) {
      console.error(`Failed to regenerate layout for property ${id}:`, err);
    }

    // Notify owner and admins that property has been submitted
    try {
      const { notifyOwner, notifyAdmins } = await import("../lib/notifications.js");
      const propertyData = { 
        propertyId: id, 
        propertyTitle: p.title,
        ownerId: ownerId,
      };
      await Promise.all([
        notifyOwner(ownerId, "property_submitted", propertyData),
        notifyAdmins("property_submitted", propertyData),
      ]);
    } catch (notifyError) {
      // Don't fail the request if notifications fail
      console.error(`Failed to send notifications for property ${id}:`, notifyError);
    }

    res.json({ ok: true, id: updated.id, status: updated.status });
  } catch (error: any) {
    console.error("Error in POST /:id/submit:", error);
    console.error("Error details:", {
      message: error?.message,
      stack: error?.stack,
      code: error?.code,
    });
    res.status(500).json({ 
      error: "Internal Server Error",
      message: error?.message || "Failed to submit property"
    });
  }
}) as RequestHandler);
