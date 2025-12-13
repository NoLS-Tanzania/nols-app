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
  services: z.array(z.string()).default([]),

  // pricing
  basePrice: z.number().nonnegative().optional().nullable(),
  currency: z.string().min(1).max(8).default("TZS"),
  
});


function cleanServices(services: unknown): string[] {
  if (!Array.isArray(services)) return [];
  const out = services
    .filter((s): s is string => typeof s === "string")
    .map((s) => s.trim())
    .filter(Boolean);
  // unique + cap list length to avoid oversized payloads
  return Array.from(new Set(out)).slice(0, 200);
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
        regionId: parsed.regionId,
        regionName: parsed.regionName,
        district: parsed.district,
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
        hotelStar: parsed.hotelStar ?? null,
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
        regionId: parsed.regionId,
        regionName: parsed.regionName,
        district: parsed.district,
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
        hotelStar: parsed.hotelStar ?? null,
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

  // Notify owner that property has been submitted
  const { notifyOwner } = await import("../lib/notifications.js");
  await notifyOwner(ownerId, "property_submitted", { 
    propertyId: id, 
    propertyTitle: p.title 
  });

  res.json({ ok: true, id: updated.id, status: updated.status });
}) as RequestHandler);
