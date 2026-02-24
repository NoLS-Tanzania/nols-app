import { Router } from "express";
import type { RequestHandler } from "express";
import { prisma } from "@nolsaf/prisma";
import { toPublicCard, toPublicDetail } from "../lib/publicPropertyDto.js";
import { Prisma } from "@prisma/client";
import { withCache, cacheKeys, cacheTags, measureTime } from "../lib/performance.js";

const router = Router();

function isMysqlSortMemoryError(err: any) {
  const code = err?.cause?.originalCode ?? err?.cause?.code ?? err?.code;
  const msg = err?.cause?.originalMessage ?? err?.message;
  return String(code) === "1038" || /Out of sort memory/i.test(String(msg || ""));
}

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

  const tourismSiteSlug = String((req.query as any)?.tourismSiteSlug ?? (req.query as any)?.tourismSite ?? "").trim();
  const parkPlacementRaw = String((req.query as any)?.parkPlacement ?? "").trim();
  const parkPlacement = parkPlacementRaw === "INSIDE" || parkPlacementRaw === "NEARBY" ? parkPlacementRaw : "";

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

  // IMPORTANT: Do not filter via relation `tourismSite.slug` here.
  // Prisma will generate a JOIN which can trigger MariaDB/MySQL "Out of sort memory" errors
  // for otherwise simple list queries. Resolve the slug to an id first, then filter on the
  // indexed Property.tourismSiteId column.
  if (tourismSiteSlug) {
    try {
      const site = await prisma.tourismSite.findUnique({
        where: { slug: tourismSiteSlug },
        select: { id: true },
      });
      if (!site) return res.json({ items: [], total: 0, page, pageSize });
      where.tourismSiteId = site.id;
    } catch (e: any) {
      // If DB migrations haven't been applied yet (missing TourismSite table), fail soft.
      if (e instanceof Prisma.PrismaClientKnownRequestError && (e.code === "P2021" || e.code === "P2022")) {
        return res.json({ items: [], total: 0, page, pageSize, warning: "db_not_migrated" });
      }
      throw e;
    }

    // When browsing a specific tourism site, only show properties that the owner explicitly
    // linked to that site AND marked as INSIDE/NEARBY.
    // If a specific parkPlacement is requested, honor it.
    where.parkPlacement = parkPlacement ? parkPlacement : { in: ["INSIDE", "NEARBY"] };
  }
  // Allow explicit placement filtering for general browse (no tourismSiteSlug)
  if (!tourismSiteSlug && parkPlacement) {
    where.parkPlacement = parkPlacement;
  }

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
        Prisma.sql`SELECT id FROM \`property\` WHERE ${servicesWhere}`
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
    // Generate cache key from query parameters
    const cacheKey = cacheKeys.propertyList({
      q, region, district, ward, city, street,
      types, amenities, nearbyServices, paymentModes,
      freeCancellation, groupStay,
      tourismSiteSlug, parkPlacement,
      minPrice, maxPrice, guests,
      nearLat, nearLng, radiusKm,
      page, pageSize, sort,
    });

    const { result, duration } = await measureTime('public.properties.list', async () => {
      return await withCache(
        cacheKey,
        async () => {
          let items: any[] = [];
          let total = 0;

          try {
            const isParkBrowse =
              !!tourismSiteSlug &&
              !q &&
              !region &&
              !district &&
              !ward &&
              !street &&
              !city &&
              !parkPlacement &&
              serviceTags.length === 0 &&
              minPrice === undefined &&
              maxPrice === undefined &&
              guests === undefined &&
              !(typeof nearLat === "number" && typeof nearLng === "number") &&
              sort !== "price_asc" &&
              sort !== "price_desc";

            const isSimpleBrowse =
              !q &&
              !region &&
              !district &&
              !ward &&
              !street &&
              !city &&
              !tourismSiteSlug &&
              !parkPlacement &&
              serviceTags.length === 0 &&
              minPrice === undefined &&
              maxPrice === undefined &&
              guests === undefined &&
              !(typeof nearLat === "number" && typeof nearLng === "number") &&
              sort !== "price_asc" &&
              sort !== "price_desc";

            if (isParkBrowse) {
              // Park/tourism-site browsing can still trigger MariaDB "Out of sort memory" even
              // with ORDER BY id when the optimizer chooses a non-PK index and then filesorts.
              // Use a PK-desc scan for ids and then hydrate rows.
              const tourismSiteId = Number(where.tourismSiteId);
              if (!Number.isFinite(tourismSiteId)) return { items: [], total: 0, page, pageSize };

              const typeClause = types.length
                ? Prisma.sql` AND type IN (${Prisma.join(types.map((t) => Prisma.sql`${t}`))})`
                : Prisma.empty;

              const placementClause = parkPlacement
                ? Prisma.sql` AND parkPlacement = ${parkPlacement}`
                : Prisma.sql` AND parkPlacement IN ('INSIDE','NEARBY')`;

              const idsRows = (await prisma.$queryRaw(
                Prisma.sql`
                  SELECT id
                  FROM \`property\`
                  FORCE INDEX (PRIMARY)
                  WHERE status = 'APPROVED'
                    AND tourismSiteId = ${tourismSiteId}
                    ${placementClause}
                    ${typeClause}
                  ORDER BY id DESC
                  LIMIT ${pageSize} OFFSET ${skip}
                `
              )) as Array<{ id: number }>;
              const ids = (idsRows || []).map((r) => Number(r.id)).filter((n) => Number.isFinite(n));

              // Use a single raw query instead of findMany to avoid fetching the
              // large photos JSON blob. JSON_EXTRACT pulls only the first photo URL.
              // We only return a non-base64 fallback to keep card responses lightweight.
              const [rows, cnt] = await Promise.all([
                ids.length
                  ? (prisma.$queryRaw(
                      Prisma.sql`
                        SELECT
                          p.id, p.title, p.type, p.parkPlacement, p.regionName,
                          p.district, p.ward, p.street, p.city, p.country,
                          p.services, p.basePrice, p.currency,
                          p.maxGuests, p.totalBedrooms, p.totalBathrooms,
                          COALESCE(
                            (SELECT pi.thumbnailUrl FROM \`property_images\` pi
                              WHERE pi.propertyId = p.id
                                AND pi.status IN ('READY','PROCESSING')
                                AND pi.url IS NOT NULL
                              ORDER BY pi.id ASC LIMIT 1),
                            (SELECT pi2.url FROM \`property_images\` pi2
                              WHERE pi2.propertyId = p.id
                              ORDER BY pi2.id ASC LIMIT 1),
                            -- Only use photos[0] if it looks like a URL (not base64)
                            NULLIF(
                              CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(p.photos, '$[0]')) LIKE 'http%'
                                     OR JSON_UNQUOTE(JSON_EXTRACT(p.photos, '$[0]')) LIKE '/%'
                                   THEN JSON_UNQUOTE(JSON_EXTRACT(p.photos, '$[0]'))
                                   ELSE NULL
                              END,
                              ''
                            )
                          ) AS primaryImage
                        FROM \`property\` p
                        WHERE p.id IN (${Prisma.join(ids)})
                      `
                    ) as Promise<any[]>)
                  : Promise.resolve([] as any[]),
                prisma.property.count({ where }),
              ]);

              const byId = new Map<number, any>((rows as any[]).map((r) => [Number(r.id), r]));
              items = ids.map((id) => byId.get(id)).filter(Boolean);
              total = cnt as number;
            } else if (isSimpleBrowse) {
              // MariaDB can throw "Out of sort memory" when it picks a non-PK index for filters
              // and then needs a filesort for ORDER BY. Force a PK scan (descending) and apply
              // filters as it scans until it collects enough ids.
              const typeClause = types.length
                ? Prisma.sql` AND type IN (${Prisma.join(types.map((t) => Prisma.sql`${t}`))})`
                : Prisma.empty;

              const idsRows = (await prisma.$queryRaw(
                Prisma.sql`
                  SELECT id
                  FROM \`property\`
                  FORCE INDEX (PRIMARY)
                  WHERE status = 'APPROVED'
                  ${typeClause}
                  ORDER BY id DESC
                  LIMIT ${pageSize} OFFSET ${skip}
                `
              )) as Array<{ id: number }>;
              const ids = (idsRows || []).map((r) => Number(r.id)).filter((n) => Number.isFinite(n));

              // Use raw SQL to avoid fetching the large photos blob — JSON_EXTRACT(photos, '$[0]')
              // returns only the first photo URL without transferring all base64 image data.
              // Only non-base64 fallbacks are used so card responses stay lightweight.
              const [rows, cnt] = await Promise.all([
                ids.length
                  ? (prisma.$queryRaw(
                      Prisma.sql`
                        SELECT
                          p.id, p.title, p.type, p.parkPlacement, p.regionName,
                          p.district, p.ward, p.street, p.city, p.country,
                          p.services, p.basePrice, p.currency,
                          p.maxGuests, p.totalBedrooms, p.totalBathrooms,
                          COALESCE(
                            (SELECT pi.thumbnailUrl FROM \`property_images\` pi
                              WHERE pi.propertyId = p.id
                                AND pi.status IN ('READY','PROCESSING')
                                AND pi.url IS NOT NULL
                              ORDER BY pi.id ASC LIMIT 1),
                            (SELECT pi2.url FROM \`property_images\` pi2
                              WHERE pi2.propertyId = p.id
                              ORDER BY pi2.id ASC LIMIT 1),
                            -- Only use photos[0] if it looks like a real URL (not base64)
                            NULLIF(
                              CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(p.photos, '$[0]')) LIKE 'http%'
                                     OR JSON_UNQUOTE(JSON_EXTRACT(p.photos, '$[0]')) LIKE '/%'
                                   THEN JSON_UNQUOTE(JSON_EXTRACT(p.photos, '$[0]'))
                                   ELSE NULL
                              END,
                              ''
                            )
                          ) AS primaryImage
                        FROM \`property\` p
                        WHERE p.id IN (${Prisma.join(ids)})
                      `
                    ) as Promise<any[]>)
                  : Promise.resolve([] as any[]),
                prisma.property.count({ where }),
              ]);

              const byId = new Map<number, any>((rows as any[]).map((r) => [Number(r.id), r]));
              items = ids.map((id) => byId.get(id)).filter(Boolean);
              total = cnt as number;
            } else {
              const res = await Promise.all([
                prisma.property.findMany({
                  where,
                  skip,
                  take: pageSize,
                  orderBy,
                  select: {
                    id: true,
                    title: true,
                    type: true,
                    parkPlacement: true,
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
                    // photos omitted — contains large base64 blobs (12MB+) that would
                    // make each request take 20-37s. Use images relation instead.
                    images: {
                      where: {
                        status: { in: ["READY", "PROCESSING"] },
                        url: { not: null },
                      },
                      select: { url: true, thumbnailUrl: true, status: true },
                      // Avoid MariaDB/MySQL sort buffer blowups on large image sets.
                      // We only need a primary image for cards; order by PK which is indexed.
                      orderBy: { id: "asc" },
                      take: 1,
                    },
                  },
                }),
                prisma.property.count({ where }),
              ]);
              items = res[0] as any[];
              total = res[1] as number;
            }
          } catch (e) {
            if ((sort === "price_asc" || sort === "price_desc") && isMysqlSortMemoryError(e)) {
              console.warn("public.properties.list price sort exceeded DB sort memory; falling back to newest", e);
              const fallbackOrderBy = [{ id: "desc" }];
              const res = await Promise.all([
                prisma.property.findMany({
                  where,
                  skip,
                  take: pageSize,
                  orderBy: fallbackOrderBy,
                  select: {
                    id: true,
                    title: true,
                    type: true,
                    parkPlacement: true,
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
                    // photos omitted — large base64 blobs, use images relation instead
                    images: {
                      where: {
                        status: { in: ["READY", "PROCESSING"] },
                        url: { not: null },
                      },
                      select: { url: true, thumbnailUrl: true, status: true },
                      orderBy: { id: "asc" },
                      take: 1,
                    },
                  },
                }),
                prisma.property.count({ where }),
              ]);
              items = res[0] as any[];
              total = res[1] as number;
              const dto = (items || []).map(toPublicCard);
              return {
                items: dto,
                total,
                page,
                pageSize,
                warning: "price_sort_fallback_newest",
              };
            }

            // Fail-soft for environments where DB migrations aren't fully applied yet
            // (missing columns like ward/street or missing relations like images).
            console.warn("public.properties.list falling back to minimal select", e);

            const res = await Promise.all([
              prisma.property.findMany({
                where,
                skip,
                take: pageSize,
                orderBy,
                select: {
                  id: true,
                  title: true,
                  type: true,
                  parkPlacement: true,
                  regionName: true,
                  district: true,
                  city: true,
                  country: true,
                  services: true,
                  basePrice: true,
                  currency: true,
                  maxGuests: true,
                  totalBedrooms: true,
                  totalBathrooms: true,
                  // photos omitted — large base64 blobs, primaryImage will be null for legacy properties
                },
              }),
              prisma.property.count({ where }),
            ]);
            items = res[0] as any[];
            total = res[1] as number;
          }

          const dto = (items || []).map(toPublicCard);
          return { items: dto, total, page, pageSize };
        },
        {
          ttl: 300, // Cache for 5 minutes (property listings don't change frequently)
          tags: [cacheTags.propertyList],
        }
      );
    });

    // Add performance headers
    res.set('X-Response-Time', `${duration.toFixed(2)}ms`);
    // Avoid HTTP-level caching so newly approved/linked properties appear immediately.
    // Redis caching (withCache) still provides performance benefits.
    res.set('Cache-Control', 'no-store');
    
    return res.json(result);
  } catch (err: any) {
    console.error("public.properties.list failed", err);
    if (err instanceof Prisma.PrismaClientKnownRequestError && (err.code === "P2021" || err.code === "P2022")) {
      return res.json({ items: [], total: 0, page, pageSize, warning: "db_not_migrated" });
    }
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
    const { result, duration } = await measureTime(`public.properties.get:${id}`, async () => {
      return await withCache(
        cacheKeys.property(id),
        async () => {
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
                where: {
                  // Show all uploaded images on public details as long as they're not rejected.
                  // Some uploads can remain PENDING/PROCESSING for a while, but should still count/display.
                  status: { in: ["READY", "PROCESSING", "PENDING"] },
                  url: { not: null }, // Ensure URL exists
                },
                select: { url: true, thumbnailUrl: true, status: true },
                orderBy: { createdAt: "asc" },
              },
            },
          });

          if (!p) return null;

          const dto = toPublicDetail(p);
          return { property: dto };
        },
        {
          ttl: 600, // Cache for 10 minutes (property details change less frequently)
          tags: [cacheTags.property(id), cacheTags.propertyList],
        }
      );
    });

    if (!result || !result.property) {
      return res.status(404).json({ error: "not_found" });
    }

    // Add performance headers
    res.set('X-Response-Time', `${duration.toFixed(2)}ms`);
    // Avoid HTTP-level caching so updated property details appear immediately.
    // Redis caching (withCache) still provides performance benefits.
    res.set('Cache-Control', 'no-store');
    
    return res.json(result);
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
            // photos omitted — large base64 blobs; use images relation instead
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

