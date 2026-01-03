// apps/api/src/lib/mapbox.ts
// Mapbox API utilities with caching and security

import { prisma } from "@nolsaf/prisma";

const MAPBOX_TOKEN = process.env.MAPBOX_ACCESS_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

export interface RouteRequest {
  from: { lng: number; lat: number };
  to: { lng: number; lat: number };
  profile?: "driving" | "driving-traffic" | "walking" | "cycling";
  departAt?: string; // ISO 8601 datetime
  alternatives?: boolean;
}

export interface RouteResponse {
  routes: Array<{
    index: number;
    distance: number;
    duration: number;
    durationTypical?: number | null;
    geometry: any;
    legs: Array<{
      distance: number;
      duration: number;
      durationTypical?: number | null;
      steps: Array<{
        distance: number;
        duration: number;
        instruction: string;
        maneuver: string | null;
        location: number[] | null;
      }>;
    }>;
  }>;
  waypoints: Array<{
    location: number[];
    name: string;
  }>;
}

/**
 * Get route with traffic-aware routing
 * Uses caching to reduce API costs
 */
export async function getRouteWithTraffic(
  request: RouteRequest,
  useCache: boolean = true
): Promise<RouteResponse | null> {
  if (!MAPBOX_TOKEN) {
    console.warn("Mapbox token not configured");
    return null;
  }

  // Generate cache key
  const cacheKey = `route:${request.from.lng.toFixed(5)},${request.from.lat.toFixed(5)}:${request.to.lng.toFixed(5)},${request.to.lat.toFixed(5)}:${request.profile || "driving-traffic"}:${request.departAt || "now"}`;

  // Check cache if enabled
  if (useCache) {
    try {
      // Try Redis cache first
      const redis = await import("./redis.js").then((m) => m.getRedis()).catch(() => null);
      if (redis) {
        const cached = await redis.get(cacheKey).catch(() => null);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            // Cache valid for 5 minutes for traffic-aware, 1 hour for regular
            const cacheAge = Date.now() - (parsed.cachedAt || 0);
            const maxAge = request.profile === "driving-traffic" ? 5 * 60 * 1000 : 60 * 60 * 1000;
            if (cacheAge < maxAge) {
              return parsed.data;
            }
          } catch {
            // Invalid cache, continue to API
          }
        }
      }
    } catch {
      // Cache unavailable, continue to API
    }
  }

  // Build Mapbox Directions API URL
  const params = new URLSearchParams();
  params.append("access_token", MAPBOX_TOKEN);
  params.append("geometries", "geojson");
  params.append("overview", "full");
  params.append("steps", "true");
  params.append("alternatives", String(request.alternatives !== false));

  // Add traffic-aware routing parameters
  const profile = request.profile || "driving-traffic";
  if (profile === "driving-traffic" && request.departAt) {
    params.append("depart_at", request.departAt);
  }

  const coordinates = `${request.from.lng},${request.from.lat};${request.to.lng},${request.to.lat}`;
  const url = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${coordinates}?${params.toString()}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "NoLS-API/1.0",
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      console.error("Mapbox directions API error:", response.status, errorText);
      return null;
    }

    const data = await response.json();

    // Transform response
    const routeResponse: RouteResponse = {
      routes: (data.routes || []).map((route: any, index: number) => ({
        index,
        distance: route.distance || 0,
        duration: route.duration || 0,
        durationTypical: route.duration_typical || null,
        geometry: route.geometry || null,
        legs: (route.legs || []).map((leg: any) => ({
          distance: leg.distance || 0,
          duration: leg.duration || 0,
          durationTypical: leg.duration_typical || null,
          steps: (leg.steps || []).map((step: any) => ({
            distance: step.distance || 0,
            duration: step.duration || 0,
            instruction: step.maneuver?.instruction || "",
            maneuver: step.maneuver?.type || null,
            location: step.maneuver?.location || null,
          })),
        })),
      })),
      waypoints: (data.waypoints || []).map((wp: any) => ({
        location: wp.location || [],
        name: wp.name || "",
      })),
    };

    // Cache the response
    if (useCache) {
      try {
        const redis = await import("./redis.js").then((m) => m.getRedis()).catch(() => null);
        if (redis) {
          await redis.setex(
            cacheKey,
            300, // 5 minutes TTL
            JSON.stringify({ cachedAt: Date.now(), data: routeResponse })
          ).catch(() => {
            // Cache write failed, continue
          });
        }
      } catch {
        // Cache unavailable, continue
      }
    }

    return routeResponse;
  } catch (error) {
    console.error("Failed to fetch route from Mapbox:", error);
    return null;
  }
}

/**
 * Calculate ETA with traffic awareness for scheduled trips
 */
export async function calculateETA(
  from: { lng: number; lat: number },
  to: { lng: number; lat: number },
  scheduledTime?: Date
): Promise<{ distance: number; duration: number; durationTypical: number | null } | null> {
  const departAt = scheduledTime ? scheduledTime.toISOString() : undefined;
  
  const route = await getRouteWithTraffic({
    from,
    to,
    profile: scheduledTime ? "driving-traffic" : "driving",
    departAt,
    alternatives: false,
  });

  if (!route || route.routes.length === 0) {
    return null;
  }

  const bestRoute = route.routes[0];
  return {
    distance: bestRoute.distance,
    duration: bestRoute.duration,
    durationTypical: bestRoute.durationTypical ?? null,
  };
}

/**
 * Validate coordinates
 */
export function validateCoordinates(lng: number, lat: number): boolean {
  return (
    Number.isFinite(lng) &&
    Number.isFinite(lat) &&
    lng >= -180 &&
    lng <= 180 &&
    lat >= -90 &&
    lat <= 90
  );
}

