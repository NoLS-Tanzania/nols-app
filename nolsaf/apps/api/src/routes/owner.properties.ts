// apps/api/src/routes/owner.properties.ts
import { Router, RequestHandler } from "express";
import { prisma } from "@nolsaf/prisma";
import { AuthedRequest, requireAuth, requireRole } from "../middleware/auth.js";
import { cleanHtml } from "../lib/sanitize";
import { z } from "zod";

// ✅ ADD THIS IMPORT NEAR THE TOP
import { regenerateAndSaveLayout } from "../lib/autoLayout.js";

// ---------- Schemas & Helpers ----------
// Minimal Zod schema for property body used by create/update
const baseBodySchema = z.object({
  // basics
  title: z.string().min(3, "title must be at least 3 characters"),
  type: z.string(), // e.g. VILLA | APARTMENT | HOTEL | ...
  description: z.string().max(10_000).optional().nullable(),

  // location
  // regionId: Accept string (slug like "dar-es-salaam") or number (code like 11)
  // Database stores as VARCHAR(50), so both formats work
  regionId: z.union([z.string().min(1), z.number().int().positive()]).optional(),
  regionName: z.string().optional(),
  district: z.string().optional(),
  ward: z.string().optional().nullable(),
  street: z.string().optional().nullable(),
  apartment: z.string().optional().nullable(),
  city: z.string().optional(),
  zip: z.string().optional(),
  country: z.string().optional(),
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
    }),
  ]).default([]),

  // pricing
  basePrice: z.number().nonnegative().optional().nullable(),
  currency: z.string().min(1).max(8).default("TZS"),
  
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
      'socialHall', 'sportsGames', 'gym', 'wifi', 'ac'
    ];
    
    for (const prop of serviceProperties) {
      if (obj[prop] !== undefined && obj[prop] !== null && obj[prop] !== '') {
        result[prop] = obj[prop];
      }
    }
    
    // Clean and add tags if present
    if (Array.isArray(obj.tags)) {
      const cleanTags = obj.tags
        .filter((s): s is string => typeof s === "string")
        .map((s) => s.trim())
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
// Cast middlewares so Router.use picks the correct overload
router.use(
  requireAuth as unknown as import("express").RequestHandler,
  requireRole("OWNER") as unknown as import("express").RequestHandler
);

/* … your Zod schemas and helpers stay the same … */

// ---------- LIST MINE ----------
router.get("/mine", (async (req: AuthedRequest, res) => {
  const ownerId = req.user!.id;
  const { status, page = "1", pageSize = "20" } = req.query as any;

  const where: any = { ownerId };
  if (status) where.status = status;

  const skip = (Number(page) - 1) * Number(pageSize);
  const [items, total] = await Promise.all([
    prisma.property.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip,
      take: Number(pageSize),
    }),
    prisma.property.count({ where }),
  ]);

  res.json({
    page: Number(page),
    pageSize: Number(pageSize),
    total,
    items,
  });
}) as RequestHandler);

// ---------- GET BY ID ----------
router.get("/:id", (async (req: AuthedRequest, res) => {
  const ownerId = req.user!.id;
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });

  const property = await prisma.property.findFirst({
    where: { id, ownerId },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      },
    },
  });

  if (!property) return res.status(404).json({ error: "Property not found" });

  res.json(property);
}) as RequestHandler);

// ---------- CREATE ----------
router.post("/", (async (req: AuthedRequest, res) => {
  try {
    const ownerId = req.user!.id;
    const parsed = baseBodySchema.parse(req.body);

    const created = await prisma.property.create({
      data: {
        ownerId,
        title: parsed.title,
        type: parsed.type,
  description: cleanHtml(parsed.description ?? null),
        status: "DRAFT",
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
        services: cleanServices(parsed.services),
        // pricing …
        basePrice: parsed.basePrice ?? null,
        currency: parsed.currency,
      },
    });

    // Persist PropertyImage records for any photos provided
    try {
      const photos: string[] = Array.isArray(parsed.photos) ? parsed.photos : [];
      await Promise.all(
        photos.map(async (p) => {
          const storageKey = p.split("/").pop() || p;
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

    res.status(201).json({ id: created.id });
  } catch (e: any) {
    res.status(400).json({ error: e?.errors ?? e?.message ?? "Invalid payload" });
  }
}) as RequestHandler);

// ---------- UPDATE ----------
router.put("/:id", (async (req: AuthedRequest, res) => {
  try {
    const ownerId = req.user!.id;
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });

    const exists = await prisma.property.findFirst({ where: { id, ownerId }, select: { id: true } });
    if (!exists) return res.status(404).json({ error: "Property not found" });

    const parsed = baseBodySchema.parse(req.body);

    const updated = await prisma.property.update({
      where: { id },
      data: {
        title: parsed.title,
        type: parsed.type,
  description: cleanHtml(parsed.description ?? null),
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
        services: cleanServices(parsed.services),
        // pricing …
        basePrice: parsed.basePrice ?? null,
        currency: parsed.currency,
      },
    });

    // Persist PropertyImage records for any photos provided
    try {
      const photos: string[] = Array.isArray(parsed.photos) ? parsed.photos : [];
      await Promise.all(
        photos.map(async (p) => {
          const storageKey = p.split("/").pop() || p;
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

    res.json({ id: updated.id });
  } catch (e: any) {
    res.status(400).json({ error: e?.errors ?? e?.message ?? "Update failed" });
  }
}) as RequestHandler);

// ---------- SUBMIT ----------
router.post("/:id/submit", (async (req: AuthedRequest, res) => {
  const ownerId = req.user!.id;
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });

  const p = await prisma.property.findFirst({ where: { id, ownerId } });
  if (!p) return res.status(404).json({ error: "Property not found" });

  const complete =
    (p.title?.trim()?.length ?? 0) >= 3 &&
    !!p.regionId &&
    !!p.district &&
    (Array.isArray(p.photos) ? p.photos.length : 0) >= 3 &&
    Array.isArray(p.roomsSpec) && p.roomsSpec.length >= 1 &&
    submitGuard(p);

  if (!complete) {
    return res.status(400).json({ error: "Incomplete property. Please complete required fields (name, location, ≥3 photos, ≥1 room type)." });
  }

  const updated = await prisma.property.update({
    where: { id },
    data: { status: "PENDING" },
  });

  // ✅ BEFORE RETURN — ENSURE LAYOUT IS FRESH
  try { await regenerateAndSaveLayout(id); } catch {}

  // Notify owner and admins that property has been submitted
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

  res.json({ ok: true, id: updated.id, status: updated.status });
}) as RequestHandler);
