import type { PropertyImage } from "@prisma/client";

export type PublicPropertyCard = {
  id: number;
  slug: string;
  title: string;
  type: string;
  location: string;
  regionName: string | null;
  district: string | null;
  ward: string | null;
  city: string | null;
  country: string | null;
  parkPlacement: "INSIDE" | "NEARBY" | null;
  primaryImage: string | null;
  services: string[];
  basePrice: number | null;
  currency: string | null;
  maxGuests: number | null;
  totalBedrooms: number | null;
  totalBathrooms: number | null;
};

export type PublicPropertyDetail = {
  id: number;
  slug: string;
  title: string;
  type: string;
  status: string;
  description: string | null;
  buildingType?: string | null;
  totalFloors?: number | null;
  regionName: string | null;
  district: string | null;
  ward: string | null;
  city: string | null;
  street: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  images: string[];
  basePrice: number | null;
  currency: string | null;
  maxGuests: number | null;
  totalBedrooms: number | null;
  totalBathrooms: number | null;
  services: any; // Can be array of strings OR object with commissionPercent and discountRules
  roomsSpec: any[];
  ownerId?: number; // Include ownerId to check ownership on frontend
};

export function slugify(input: string) {
  return String(input || "")
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function buildPropertySlug(title: string, id: number) {
  const base = slugify(title);
  return base ? `${base}-${id}` : String(id);
}

function safeString(v: any): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s ? s : null;
}

function isRenderablePublicImageUrl(url: string) {
  // Never expose browser-only blob URLs on the public site (they won't load for other users)
  // Also exclude file:// style local paths if any.
  const u = url.trim();
  if (!u) return false;
  if (u.startsWith("blob:")) return false;
  if (u.startsWith("file:")) return false;
  return true;
}

function pickRoomImages(roomsSpec: any): string[] {
  if (!Array.isArray(roomsSpec)) return [];
  const out: string[] = [];
  for (const r of roomsSpec) {
    const arr = (r as any)?.roomImages;
    if (!Array.isArray(arr)) continue;
    for (const v of arr) {
      const s = safeString(v);
      if (s && isRenderablePublicImageUrl(s)) out.push(s);
    }
  }
  return out;
}

export function pickImages(opts: {
  images?: Array<Pick<PropertyImage, "url" | "thumbnailUrl" | "status">> | null;
  photos?: any;
  limit?: number | null;
}): string[] {
  const { images, photos, limit = 12 } = opts;

  const out: string[] = [];

  // Prefer moderated/processed images when available; otherwise take whatever exists.
  if (Array.isArray(images) && images.length) {
    const urls = images
      .map((i) => safeString(i.thumbnailUrl) || safeString(i.url))
      .filter((u): u is string => typeof u === "string" && isRenderablePublicImageUrl(u)) as string[];
    out.push(...urls);
  }

  if (Array.isArray(photos) && photos.length) {
    const urls = photos
      .map((p: any) => safeString(p))
      .filter((u): u is string => typeof u === "string" && isRenderablePublicImageUrl(u));
    out.push(...urls);
  }

  // Unique, preserve order
  const uniq = Array.from(new Set(out));
  if (limit === null) return uniq;
  return uniq.slice(0, Math.max(1, limit));
}

export function formatLocation(p: {
  city?: string | null;
  district?: string | null;
  ward?: string | null;
  regionName?: string | null;
  country?: string | null;
}) {
  const parts = [p.city, p.ward, p.district, p.regionName, p.country]
    .map((s) => (typeof s === "string" ? s.trim() : ""))
    .filter(Boolean);
  return parts.join(", ");
}

export function toPublicCard(p: any): PublicPropertyCard {
  const id = Number(p.id);
  const slug = buildPropertySlug(String(p.title || ""), id);
  // If primaryImage is pre-extracted (e.g. from a raw SQL query using JSON_EXTRACT),
  // use it directly to avoid fetching the full photos JSON blob.
  let primaryImage: string | null;
  if (Object.prototype.hasOwnProperty.call(p, 'primaryImage')) {
    primaryImage = typeof p.primaryImage === 'string' && p.primaryImage ? p.primaryImage : null;
  } else {
    const images = pickImages({ images: p.images, photos: p.photos, limit: 1 });
    primaryImage = images[0] ?? null;
  }

  return {
    id,
    slug,
    title: String(p.title || ""),
    type: String(p.type || ""),
    location: formatLocation(p),
    regionName: p.regionName ?? null,
    district: p.district ?? null,
    ward: p.ward ?? null,
    city: p.city ?? null,
    country: p.country ?? null,
    parkPlacement: p.parkPlacement === "INSIDE" || p.parkPlacement === "NEARBY" ? p.parkPlacement : null,
    primaryImage,
    services: p.services ?? null, // Preserve full services object (may contain commissionPercent, discountRules)
    basePrice: p.basePrice !== null && typeof p.basePrice !== "undefined" ? Number(p.basePrice) : null,
    currency: p.currency ?? null,
    maxGuests: typeof p.maxGuests === "number" ? p.maxGuests : (p.maxGuests != null ? Number(p.maxGuests) : null),
    totalBedrooms: typeof p.totalBedrooms === "number" ? p.totalBedrooms : (p.totalBedrooms != null ? Number(p.totalBedrooms) : null),
    totalBathrooms: typeof p.totalBathrooms === "number" ? p.totalBathrooms : (p.totalBathrooms != null ? Number(p.totalBathrooms) : null),
  };
}

export function toPublicDetail(p: any): PublicPropertyDetail {
  const id = Number(p.id);
  const slug = buildPropertySlug(String(p.title || ""), id);
  const propertyImages = pickImages({ images: p.images, photos: p.photos, limit: null });
  const roomImages = pickRoomImages(p.roomsSpec);
  const images = Array.from(new Set<string>([...propertyImages, ...roomImages]));

  return {
    id,
    slug,
    title: String(p.title || ""),
    type: String(p.type || ""),
    status: String(p.status || ""),
    description: typeof p.description === "string" ? p.description : null,
    buildingType: typeof p.buildingType === "string" ? p.buildingType : (p.buildingType ?? null),
    totalFloors: typeof p.totalFloors === "number" ? p.totalFloors : (p.totalFloors != null ? Number(p.totalFloors) : null),
    regionName: p.regionName ?? null,
    district: p.district ?? null,
    ward: p.ward ?? null,
    city: p.city ?? null,
    street: p.street ?? null,
    country: p.country ?? null,
    latitude: p.latitude !== null && typeof p.latitude !== "undefined" ? Number(p.latitude) : null,
    longitude: p.longitude !== null && typeof p.longitude !== "undefined" ? Number(p.longitude) : null,
    images,
    basePrice: p.basePrice !== null && typeof p.basePrice !== "undefined" ? Number(p.basePrice) : null,
    currency: p.currency ?? null,
    maxGuests: typeof p.maxGuests === "number" ? p.maxGuests : (p.maxGuests != null ? Number(p.maxGuests) : null),
    totalBedrooms: typeof p.totalBedrooms === "number" ? p.totalBedrooms : (p.totalBedrooms != null ? Number(p.totalBedrooms) : null),
    totalBathrooms: typeof p.totalBathrooms === "number" ? p.totalBathrooms : (p.totalBathrooms != null ? Number(p.totalBathrooms) : null),
    services: p.services ?? null, // Preserve full services object (may contain commissionPercent, discountRules)
    roomsSpec: Array.isArray(p.roomsSpec) ? p.roomsSpec : [],
    ownerId: p.ownerId ? Number(p.ownerId) : undefined, // Include ownerId to check ownership
  };
}

