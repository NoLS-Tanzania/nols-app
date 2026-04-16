export const MIN_TRANSPORT_LEAD_MS = 1 * 60 * 1000; // allow 1–10 minute immediate rides

// During this window, the system attempts automatic driver allocation.
// If no driver is assigned by the end of the grace window, the trip becomes claimable.
export const AUTO_DISPATCH_GRACE_MS = 10 * 60 * 1000;

// Only try auto-dispatch for rides that are happening soon.
export const AUTO_DISPATCH_LOOKAHEAD_MS = 20 * 60 * 1000;

export function clampDateMin(date: Date, minDate: Date): Date {
  return date.getTime() >= minDate.getTime() ? date : minDate;
}

// ── Server-side fare computation ──────────────────────────────────────────────
// Rates are in TZS. Distances below are per kilometre.
// These are the authoritative values — client-supplied amounts are ignored.

export const FARE_RATES: Record<string, { baseFare: number; perKm: number }> = {
  BODA:    { baseFare: 2_000, perKm:   800 },
  BAJAJI:  { baseFare: 3_000, perKm: 1_200 },
  CAR:     { baseFare: 5_000, perKm: 1_800 },
  XL:      { baseFare: 7_000, perKm: 2_200 },
  PREMIUM: { baseFare: 10_000, perKm: 3_000 },
};

// Absolute minimum any booking can cost, regardless of distance.
export const MIN_FARE_TZS = 1_500;

// How many km to add as a road-network multiplier when only straight-line distance is known.
// Roads are typically 30-40% longer than airline distance.
export const DIRECT_TO_ROAD_FACTOR = 1.35;

/**
 * Haversine straight-line distance in kilometres between two lat/lng points.
 */
export function haversineKm(
  lat1: number, lon1: number,
  lat2: number, lon2: number,
): number {
  const R = 6_371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) *
    Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Compute the authoritative server-side fare.
 *
 * @param vehicleType  One of BODA | BAJAJI | CAR | XL | PREMIUM
 * @param distanceM    Road distance in **metres** (from Mapbox). Pass null to fall back
 *                     to straight-line coordinates.
 * @param fallbackCoords  Used only when distanceM is null.
 */
export function computeTransportFare(
  vehicleType: string,
  distanceM: number | null,
  fallbackCoords?: { fromLat: number; fromLon: number; toLat: number; toLon: number },
): number {
  const rates = FARE_RATES[vehicleType] ?? FARE_RATES["CAR"];

  let distanceKm: number;
  if (distanceM != null && Number.isFinite(distanceM) && distanceM > 0) {
    distanceKm = distanceM / 1_000;
  } else if (fallbackCoords) {
    const straight = haversineKm(
      fallbackCoords.fromLat, fallbackCoords.fromLon,
      fallbackCoords.toLat,   fallbackCoords.toLon,
    );
    distanceKm = straight * DIRECT_TO_ROAD_FACTOR;
  } else {
    // No distance info at all — use minimum fare
    return MIN_FARE_TZS;
  }

  const raw = rates.baseFare + rates.perKm * distanceKm;
  return Math.max(MIN_FARE_TZS, Math.round(raw));
}
