import { Router } from "express";
import type { RequestHandler } from "express";
import { prisma } from "@nolsaf/prisma";
import { toPublicCard, toPublicDetail } from "../lib/publicPropertyDto.js";
import { Prisma } from "@prisma/client";

const router = Router();

function parseIntOrUndefined(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function parseFloatOrUndefined(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function parseCsv(v: any): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v.map(String).map((s) => s.trim()).filter(Boolean);
  return String(v)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseAmenities(v: any): string[] {
  const out = parseCsv(v);
  // cap to avoid abuse
  return out.slice(0, 50);
}

function extractIdFromSlug(idOrSlug: string): number | null {
  const raw = String(idOrSlug || "").trim();
  if (!raw) return null;
  if (/^\d+$/.test(raw)) return Number(raw);
  const m = raw.match(/(\d+)\s*$/);
  if (!m) return null;
  return Number(m[1]);
}

function bboxFromKm(lat: number, lng: number, radiusKm: number) {
  // Very good approximation for small radii.
  const kmPerDegLat = 111.32;
  const dLat = radiusKm / kmPerDegLat;
  const cos = Math.cos((lat * Math.PI) / 180);
  const kmPerDegLng = kmPerDegLat * Math.max(0.15, cos);
  const dLng = radiusKm / kmPerDegLng;
  return {
    minLat: lat - dLat,
    maxLat: lat + dLat,
    minLng: lng - dLng,
    maxLng: lng + dLng,
  };
}

/**
 * GET /api/public/properties
 * Public browse/search endpoint for APPROVED properties only.
 */
const listPublicProperties: RequestHandler = async (req, res) => {
  const q = String((req.query as any)?.q ?? "").trim();
  const region = String((req.query as any)?.region ?? "").trim();
  const district = String((req.query as any)?.district ?? "").trim();
  const ward = String((req.query as any)?.ward ?? "").trim();
  const street = String((req.query as any)?.street ?? "").trim();
  const city = String((req.query as any)?.city ?? "").trim();
  const types = parseCsv((req.query as any)?.types ?? (req.query as any)?.type);
  const amenities = parseAmenities((req.query as any)?.amenities ?? (req.query as any)?.services);
  const nearbyServices = parseCsv((req.query as any)?.nearbyServices);
  const paymentModes = parseCsv((req.query as any)?.paymentModes);
  const freeCancellation = String((req.query as any)?.freeCancellation ?? "").trim();
  const groupStay = String((req.query as any)?.groupStay ?? "").trim();

  const minPrice = parseIntOrUndefined((req.query as any)?.minPrice);
  const maxPrice = parseIntOrUndefined((req.query as any)?.maxPrice);
  const guests = parseIntOrUndefined((req.query as any)?.guests);
  const nearLat = parseFloatOrUndefined((req.query as any)?.nearLat);
  const nearLng = parseFloatOrUndefined((req.query as any)?.nearLng);
  const radiusKm = Math.min(100, Math.max(1, parseFloatOrUndefined((req.query as any)?.radiusKm) ?? 15));

  const page = Math.max(1, parseIntOrUndefined((req.query as any)?.page) ?? 1);
  const pageSize = Math.min(50, Math.max(1, parseIntOrUndefined((req.query as any)?.pageSize) ?? 20));
  const skip = (page - 1) * pageSize;

  const sort = String((req.query as any)?.sort ?? "newest");

  const where: any = { status: "APPROVED" };

  if (q) {
    where.OR = [
      { title: { contains: q } },
      { regionName: { contains: q } },
      { district: { contains: q } },
      { ward: { contains: q } },
      { city: { contains: q } },
      { street: { contains: q } },
    ];
  }

  if (region) {
    // Support both regionId (e.g. "11") and regionName (e.g. "Dar es Salaam")
    // Some UIs pass `region` as a numeric id from tzRegions.
    where.AND = Array.isArray(where.AND) ? where.AND : [];
    where.AND.push({
      OR: [{ regionId: region }, { regionName: { contains: region } }],
    });
  }
  if (district) where.district = { contains: district };
  if (ward) where.ward = { contains: ward };
  if (street) where.street = { contains: street };
  if (city) where.city = { contains: city };
  if (types.length > 0) where.type = { in: types };

  // Services filter: Property.services is Json (array of strings)
  // We implement "must include all selected tags" via JSON_CONTAINS (MySQL).
  // This avoids incorrect pagination that would happen with in-memory filtering.
  const serviceTags = [
    ...amenities,
    ...nearbyServices,
    ...paymentModes.map((m) => `Payment: ${m}`),
    ...(freeCancellation ? ["Free cancellation"] : []),
    ...(groupStay ? ["Group stay"] : []),
  ];
  if (serviceTags.length > 0) {
    try {
      const clauses: Prisma.Sql[] = [Prisma.sql`status = 'APPROVED'`];
      for (const tag of serviceTags) {
        const needle = JSON.stringify(tag); // e.g. "\"Pool\""
        // Guard against legacy rows or non-JSON column types.
        clauses.push(
          Prisma.sql`(services IS NOT NULL AND JSON_VALID(services) AND JSON_CONTAINS(CAST(services AS JSON), ${needle}))`
        );
      }

      const servicesWhere = Prisma.join(clauses, " AND ");
      const idsRows = (await prisma.$queryRaw(
        Prisma.sql`SELECT id FROM \`Property\` WHERE ${servicesWhere}`
      )) as Array<{ id: number }>;
      const ids = (idsRows || []).map((r: { id: number }) => Number(r.id)).filter((n: number) => Number.isFinite(n));
      // If no ids match, we can return early.
      if (ids.length === 0) return res.json({ items: [], total: 0, page, pageSize });
      where.id = { in: ids };
    } catch (e) {
      // If JSON filtering fails (e.g. DB not migrated yet), fail soft by returning no results
      console.error("[public.properties] services filter failed", e);
      return res.json({ items: [], total: 0, page, pageSize, warning: "services_filter_unavailable" });
    }
  }

  if (minPrice !== undefined || maxPrice !== undefined) {
    where.basePrice = {
      ...(minPrice !== undefined ? { gte: minPrice } : {}),
      ...(maxPrice !== undefined ? { lte: maxPrice } : {}),
    };
  }

  if (guests !== undefined) {
    where.maxGuests = { gte: guests };
  }

  // Nearby filter (lat/lng required)
  if (typeof nearLat === "number" && typeof nearLng === "number") {
    const box = bboxFromKm(nearLat, nearLng, radiusKm);
    where.AND = Array.isArray(where.AND) ? where.AND : [];
    where.AND.push(
      { latitude: { not: null } },
      { longitude: { not: null } },
      { latitude: { gte: box.minLat, lte: box.maxLat } },
      { longitude: { gte: box.minLng, lte: box.maxLng } }
    );
  }

  const orderBy: any[] = [];
  // NOTE: Avoid MySQL "Out of sort memory" errors on large tables by sorting on indexed PK.
  // "newest" is approximated by highest id (monotonic in our schema).
  if (sort === "price_asc") orderBy.push({ basePrice: "asc" }, { id: "desc" });
  else if (sort === "price_desc") orderBy.push({ basePrice: "desc" }, { id: "desc" });
  else orderBy.push({ id: "desc" });

  try {
    const [items, total] = await Promise.all([
      prisma.property.findMany({
        where,
        skip,
        take: pageSize,
        orderBy,
        select: {
          id: true,
          title: true,
          type: true,
          regionName: true,
          district: true,
          ward: true,
          street: true,
          city: true,
          country: true,
          services: true,
          basePrice: true,
          currency: true,
          maxGuests: true,
          totalBedrooms: true,
          totalBathrooms: true,
          photos: true,
          images: {
            select: { url: true, thumbnailUrl: true, status: true },
            orderBy: { createdAt: "asc" },
            take: 6,
          },
        },
      }),
      prisma.property.count({ where }),
    ]);

    const dto = (items || []).map(toPublicCard);

    return res.json({ items: dto, total, page, pageSize });
  } catch (err: any) {
    console.error("public.properties.list failed", err);
    return res.status(500).json({ error: "failed", message: err?.message || String(err) });
  }
};

/**
 * GET /api/public/properties/:idOrSlug
 * Public details endpoint for an APPROVED property.
 */
const getPublicProperty: RequestHandler = async (req, res) => {
  const idOrSlug = String((req.params as any)?.idOrSlug ?? "");
  const id = extractIdFromSlug(idOrSlug);
  if (!id) return res.status(400).json({ error: "invalid_id" });

  try {
    const p = await prisma.property.findFirst({
      where: { id, status: "APPROVED" },
      select: {
        id: true,
        title: true,
        type: true,
        status: true,
        description: true,
        buildingType: true,
        totalFloors: true,
        regionName: true,
        district: true,
        ward: true,
        city: true,
        street: true,
        country: true,
        latitude: true,
        longitude: true,
        basePrice: true,
        currency: true,
        maxGuests: true,
        totalBedrooms: true,
        totalBathrooms: true,
        services: true,
        roomsSpec: true,
        photos: true,
        ownerId: true, // Include ownerId to check ownership on frontend
        images: {
          select: { url: true, thumbnailUrl: true, status: true },
          orderBy: { createdAt: "asc" },
          take: 48,
        },
      },
    });

    if (!p) return res.status(404).json({ error: "not_found" });

    const dto = toPublicDetail(p);

    return res.json({ property: dto });
  } catch (err: any) {
    console.error("public.properties.get failed", err);
    return res.status(500).json({ error: "failed", message: err?.message || String(err) });
  }
};

router.get("/", listPublicProperties);
/**
 * GET /api/public/properties/top-cities?take=8
 * Returns the top cities by number of APPROVED listings, plus a representative listing card.
 */
const topCities: RequestHandler = async (req, res) => {
  const take = Math.min(12, Math.max(1, parseIntOrUndefined((req.query as any)?.take) ?? 8));
  try {
    const grouped = await prisma.property.groupBy({
      by: ["city"],
      where: {
        status: "APPROVED",
        city: { not: null },
      },
      _count: { city: true },
      orderBy: { _count: { city: "desc" } },
      take: take * 2, // overfetch then clean empty strings
    });

    const cleaned = grouped
      .map((g: any) => ({ city: String(g.city || "").trim(), count: Number(g._count?.city ?? 0) }))
      .filter((g: { city: string; count: number }) => Boolean(g.city) && Number.isFinite(g.count) && g.count > 0)
      .slice(0, take);

    const items = await Promise.all(
      cleaned.map(async (g: { city: string; count: number }) => {
        const sample = await prisma.property.findFirst({
          where: { status: "APPROVED", city: g.city },
          // Avoid MySQL sort memory on updatedAt; id is indexed and stable for "newest".
          orderBy: { id: "desc" },
          select: {
            id: true,
            title: true,
            type: true,
            regionName: true,
            district: true,
            ward: true,
            street: true,
            city: true,
            country: true,
            basePrice: true,
            currency: true,
            maxGuests: true,
            totalBedrooms: true,
            totalBathrooms: true,
            photos: true,
            images: {
              select: { url: true, thumbnailUrl: true, status: true },
              orderBy: { createdAt: "asc" },
              take: 6,
            },
          },
        });
        return {
          city: g.city,
          count: g.count,
          sample: sample ? toPublicCard(sample) : null,
        };
      })
    );

    return res.json({ items });
  } catch (err: any) {
    console.error("public.properties.topCities failed", err);
    return res.status(500).json({ error: "failed", message: err?.message || String(err) });
  }
};

router.get("/top-cities", topCities);
router.get("/:idOrSlug", getPublicProperty);

export default router;

