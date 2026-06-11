/**
 * Parses a property `services` value into the sections the open card needs.
 * Ported from the web public property detail, where `services` is either an
 * array of tagged strings or an object with `nearbyFacilities` and `houseRules`.
 */

export type HouseRules = {
  checkIn?: string;
  checkOut?: string;
  pets?: boolean;
  petsNote?: string;
  smoking?: boolean;
  safetyMeasures?: string[];
  other?: string;
};

export type NearbyFacility = {
  name?: string;
  type?: string;
  ownership?: string;
  distanceKm?: number;
};

export type ParsedServices = {
  paymentModes: string[];
  amenities: string[];
  nearby: string[];
  nearbyFacilities: NearbyFacility[];
  freeCancellation: boolean;
  groupStay: boolean;
  houseRules: HouseRules | null;
};

const DEFAULT_PAYMENT_METHODS = ["Mobile money", "Cash", "Card", "Bank transfer"];

function parseHouseRulesValue(v: unknown): Record<string, unknown> | null {
  if (!v) return null;
  if (typeof v === "string") {
    try {
      const parsed = JSON.parse(v);
      return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  }
  if (typeof v === "object" && !Array.isArray(v)) return v as Record<string, unknown>;
  return null;
}

function normalizeHouseRules(hr: Record<string, unknown> | null): HouseRules | null {
  if (!hr) return null;
  const out: HouseRules = {};
  const str = (x: unknown) => (typeof x === "string" ? x.trim() : "");

  if (str(hr.checkIn)) out.checkIn = str(hr.checkIn);
  if (str(hr.checkOut)) out.checkOut = str(hr.checkOut);

  const fmtWindow = (from: unknown, to: unknown) => {
    const f = str(from);
    const t = str(to);
    if (f && t) return `${f} to ${t}`;
    if (f) return `From ${f}`;
    if (t) return `Until ${t}`;
    return "";
  };
  if (!out.checkIn) {
    const v = fmtWindow(hr.checkInFrom, hr.checkInTo);
    if (v) out.checkIn = v;
  }
  if (!out.checkOut) {
    const v = fmtWindow(hr.checkOutFrom, hr.checkOutTo);
    if (v) out.checkOut = v;
  }
  if (typeof hr.pets === "boolean") out.pets = hr.pets;
  if (typeof hr.petsAllowed === "boolean") out.pets = hr.petsAllowed as boolean;
  if (str(hr.petsNote)) out.petsNote = str(hr.petsNote);
  if (typeof hr.smoking === "boolean") out.smoking = hr.smoking;
  if (typeof hr.smokingNotAllowed === "boolean") out.smoking = hr.smokingNotAllowed as boolean;
  if (Array.isArray(hr.safetyMeasures)) out.safetyMeasures = hr.safetyMeasures.map((s) => String(s)).filter(Boolean);
  if (str(hr.other)) out.other = str(hr.other);

  return Object.keys(out).length ? out : null;
}

export function parsePropertyServices(servicesRaw: unknown): ParsedServices {
  const servicesArray = Array.isArray(servicesRaw)
    ? servicesRaw.map((s) => String(s).trim()).filter(Boolean)
    : [];
  const servicesObj: Record<string, unknown> =
    typeof servicesRaw === "object" && servicesRaw !== null && !Array.isArray(servicesRaw)
      ? (servicesRaw as Record<string, unknown>)
      : {};

  const paymentModes = servicesArray
    .filter((s) => /^payment:\s*/i.test(s))
    .map((s) => s.replace(/^payment:\s*/i, "").trim())
    .filter(Boolean);

  const amenities = servicesArray
    .filter((s) => !/^payment:\s*/i.test(s))
    .filter((s) => !/^(free cancellation|group stay)$/i.test(s))
    .filter((s) => !/^near\s+/i.test(s));

  const nearby = servicesArray.filter((s) => /^near\s+/i.test(s)).map((s) => s.replace(/^near\s+/i, "").trim());

  let nearbyFacilities: NearbyFacility[] = [];
  if (Array.isArray(servicesObj.nearbyFacilities)) {
    nearbyFacilities = (servicesObj.nearbyFacilities as unknown[])
      .map((f): NearbyFacility => {
        if (f && typeof f === "object") {
          const o = f as Record<string, unknown>;
          const dist = Number(o.distanceKm ?? o.distance);
          return {
            name: o.name != null ? String(o.name).trim() : undefined,
            type: o.type != null ? String(o.type).trim() : undefined,
            ownership: o.ownership != null ? String(o.ownership).trim() : undefined,
            distanceKm: Number.isFinite(dist) ? dist : undefined
          };
        }
        const s = String(f).trim();
        return s ? { name: s } : {};
      })
      .filter((f) => f.name || f.type);
  }

  const houseRules = normalizeHouseRules(parseHouseRulesValue(servicesObj.houseRules));

  return {
    paymentModes: paymentModes.length ? paymentModes : DEFAULT_PAYMENT_METHODS,
    amenities,
    nearby,
    nearbyFacilities,
    freeCancellation: servicesArray.some((s) => s.toLowerCase() === "free cancellation"),
    groupStay: servicesArray.some((s) => s.toLowerCase() === "group stay"),
    houseRules
  };
}
