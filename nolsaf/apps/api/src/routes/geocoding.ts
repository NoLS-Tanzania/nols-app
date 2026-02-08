// apps/api/src/routes/geocoding.ts
import { Router, type Request, type Response } from "express";
import type { RequestHandler } from "express";
import { z } from "zod";
import { AuthedRequest, requireAuth } from "../middleware/auth.js";
import { sanitizeText } from "../lib/sanitize.js";
import rateLimit from "express-rate-limit";

export const router = Router();

// Mapbox API token - should be server-side only
const MAPBOX_TOKEN = process.env.MAPBOX_ACCESS_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

// Rate limiter for geocoding requests (prevents abuse and API cost)
const limitGeocoding = rateLimit({
  windowMs: 60_000, // 1 minute
  limit: 30, // 30 requests per minute per user/IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many geocoding requests. Please wait a moment and try again." },
  keyGenerator: (req) => {
    // Rate limit by authenticated user if available, otherwise by IP
    const user = (req as AuthedRequest).user;
    if (user?.id) {
      return `geocoding:user:${user.id}`;
    }
    return req.ip || req.socket.remoteAddress || "unknown";
  },
});

// Public geocoding is used by anonymous booking flows.
// Keep stricter limits to reduce abuse/cost.
const limitPublicGeocoding = rateLimit({
  windowMs: 60_000, // 1 minute
  limit: 10, // 10 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please wait a moment and try again." },
  keyGenerator: (req) => req.ip || req.socket.remoteAddress || "unknown",
});

// Validation schemas
const forwardGeocodingSchema = z.object({
  query: z.string().min(1).max(200), // Limit query length
  country: z.string().length(2).optional(), // ISO country code (e.g., "TZ")
  proximity: z.object({
    lng: z.number().min(-180).max(180),
    lat: z.number().min(-90).max(90),
  }).optional(),
  types: z.array(z.enum(["country", "region", "postcode", "district", "place", "locality", "neighborhood", "address", "poi"])).optional(),
  limit: z.number().int().min(1).max(10).optional().default(5), // Limit results
});

const publicForwardGeocodingSchema = z.object({
  query: z.string().min(1).max(200),
  // Public booking pickup is expected to be in Tanzania.
  // We allow overriding, but only to TZ.
  country: z.literal("TZ").optional().default("TZ"),
  limit: z.number().int().min(1).max(5).optional().default(3),
});

const publicReverseGeocodingSchema = z.object({
  lng: z.number().min(-180).max(180),
  lat: z.number().min(-90).max(90),
  types: z
    .array(z.enum(["address", "poi", "place", "locality", "neighborhood"] as const))
    .optional()
    .default(["address", "poi", "place"]),
  limit: z.number().int().min(1).max(3).optional().default(1),
});

const reverseGeocodingSchema = z.object({
  lng: z.number().min(-180).max(180),
  lat: z.number().min(-90).max(90),
  types: z.array(z.enum(["country", "region", "postcode", "district", "place", "locality", "neighborhood", "address", "poi"])).optional(),
  limit: z.number().int().min(1).max(10).optional().default(1),
});

/**
 * POST /api/geocoding/forward
 * Forward geocoding: Convert address/place name to coordinates
 * Requires authentication
 * Body: { query: string, country?: string, proximity?: { lng, lat }, types?: string[], limit?: number }
 */
router.post("/forward", requireAuth as RequestHandler, limitGeocoding, (async (req: AuthedRequest, res: Response) => {
  try {
    if (!MAPBOX_TOKEN) {
      res.status(503).json({ error: "Geocoding service not configured" });
      return;
    }

    const body = forwardGeocodingSchema.parse(req.body);
    const sanitizedQuery = sanitizeText(body.query);

    // Build Mapbox Geocoding API URL
    const params = new URLSearchParams();
    params.append("access_token", MAPBOX_TOKEN);
    params.append("limit", String(body.limit || 5));
    
    if (body.country) {
      params.append("country", sanitizeText(body.country).toUpperCase());
    }
    
    if (body.proximity) {
      params.append("proximity", `${body.proximity.lng},${body.proximity.lat}`);
    }
    
    if (body.types && body.types.length > 0) {
      params.append("types", body.types.join(","));
    }

    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(sanitizedQuery)}.json?${params.toString()}`;

    // Fetch from Mapbox API
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "NoLS-API/1.0",
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      console.error("Mapbox geocoding error:", response.status, errorText);
      res.status(response.status === 401 ? 503 : 502).json({
        error: "Geocoding service error",
        message: response.status === 401 ? "Invalid API key" : "Service temporarily unavailable",
      });
      return;
    }

    const data = await response.json();

    // Transform and sanitize response
    const features = (data.features || []).map((feature: any) => ({
      id: feature.id || null,
      type: feature.geometry?.type || null,
      coordinates: feature.geometry?.coordinates || null,
      placeName: sanitizeText(feature.place_name || ""),
      text: sanitizeText(feature.text || ""),
      context: (feature.context || []).map((ctx: any) => ({
        id: ctx.id || null,
        text: sanitizeText(ctx.text || ""),
      })),
      relevance: feature.relevance || 0,
    }));

    res.json({
      query: sanitizedQuery,
      features,
      attribution: "© Mapbox © OpenStreetMap",
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid request", details: error.issues });
      return;
    }
    console.error("POST /geocoding/forward error:", error);
    res.status(500).json({ error: "Failed to geocode address" });
  }
}) as RequestHandler);

/**
 * POST /api/geocoding/public/forward
 * Public forward geocoding for pickup location during booking.
 * Body: { query: string, country?: "TZ", limit?: number }
 *
 * Security:
 * - Strict rate limiting (per IP)
 * - Input validation + sanitization
 * - Country constrained to TZ
 */
router.post("/public/forward", limitPublicGeocoding, (async (req: Request, res: Response) => {
  try {
    if (!MAPBOX_TOKEN) {
      res.status(503).json({ error: "Geocoding service not configured" });
      return;
    }

    const body = publicForwardGeocodingSchema.parse(req.body);
    const sanitizedQuery = sanitizeText(body.query);

    const params = new URLSearchParams();
    params.append("access_token", MAPBOX_TOKEN);
    params.append("limit", String(body.limit));
    params.append("country", "TZ");
    // Keep results relevant for pickup points
    params.append("types", "address,poi,place");

    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(sanitizedQuery)}.json?${params.toString()}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "NoLS-API/1.0",
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      console.error("Mapbox geocoding error (public):", response.status, errorText);
      res.status(response.status === 401 ? 503 : 502).json({
        error: "Geocoding service error",
        message: response.status === 401 ? "Invalid API key" : "Service temporarily unavailable",
      });
      return;
    }

    const data = await response.json();
    const features = (data.features || []).map((feature: any) => ({
      id: feature.id || null,
      type: feature.geometry?.type || null,
      coordinates: feature.geometry?.coordinates || null,
      placeName: sanitizeText(feature.place_name || ""),
      text: sanitizeText(feature.text || ""),
      relevance: feature.relevance || 0,
    }));

    res.json({
      query: sanitizedQuery,
      features,
      attribution: "© Mapbox © OpenStreetMap",
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid request", details: error.issues });
      return;
    }
    console.error("POST /geocoding/public/forward error:", error);
    res.status(500).json({ error: "Failed to geocode address" });
  }
}) as RequestHandler);

/**
 * POST /api/geocoding/public/reverse
 * Public reverse geocoding for pickup location during booking.
 * Body: { lng: number, lat: number, types?: string[], limit?: number }
 *
 * Security:
 * - Strict rate limiting (per IP)
 * - Input validation
 */
router.post("/public/reverse", limitPublicGeocoding, (async (req: Request, res: Response) => {
  try {
    if (!MAPBOX_TOKEN) {
      res.status(503).json({ error: "Geocoding service not configured" });
      return;
    }

    const body = publicReverseGeocodingSchema.parse(req.body);

    const params = new URLSearchParams();
    params.append("access_token", MAPBOX_TOKEN);
    params.append("limit", String(body.limit));
    if (body.types && body.types.length > 0) params.append("types", body.types.join(","));

    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${body.lng},${body.lat}.json?${params.toString()}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "NoLS-API/1.0",
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      console.error("Mapbox reverse geocoding error (public):", response.status, errorText);
      res.status(response.status === 401 ? 503 : 502).json({
        error: "Geocoding service error",
        message: response.status === 401 ? "Invalid API key" : "Service temporarily unavailable",
      });
      return;
    }

    const data = await response.json();
    const features = (data.features || []).map((feature: any) => ({
      id: feature.id || null,
      type: feature.geometry?.type || null,
      coordinates: feature.geometry?.coordinates || null,
      placeName: sanitizeText(feature.place_name || ""),
      text: sanitizeText(feature.text || ""),
      relevance: feature.relevance || 0,
    }));

    res.json({
      coordinates: { lng: body.lng, lat: body.lat },
      features,
      attribution: "© Mapbox © OpenStreetMap",
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid request", details: error.issues });
      return;
    }
    console.error("POST /geocoding/public/reverse error:", error);
    res.status(500).json({ error: "Failed to reverse geocode coordinates" });
  }
}) as RequestHandler);

/**
 * POST /api/geocoding/reverse
 * Reverse geocoding: Convert coordinates to address
 * Requires authentication
 * Body: { lng: number, lat: number, types?: string[], limit?: number }
 */
router.post("/reverse", requireAuth as RequestHandler, limitGeocoding, (async (req: AuthedRequest, res: Response) => {
  try {
    if (!MAPBOX_TOKEN) {
      res.status(503).json({ error: "Geocoding service not configured" });
      return;
    }

    const body = reverseGeocodingSchema.parse(req.body);

    // Build Mapbox Reverse Geocoding API URL
    const params = new URLSearchParams();
    params.append("access_token", MAPBOX_TOKEN);
    params.append("limit", String(body.limit || 1));
    
    if (body.types && body.types.length > 0) {
      params.append("types", body.types.join(","));
    }

    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${body.lng},${body.lat}.json?${params.toString()}`;

    // Fetch from Mapbox API
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "NoLS-API/1.0",
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      console.error("Mapbox reverse geocoding error:", response.status, errorText);
      res.status(response.status === 401 ? 503 : 502).json({
        error: "Geocoding service error",
        message: response.status === 401 ? "Invalid API key" : "Service temporarily unavailable",
      });
      return;
    }

    const data = await response.json();

    // Transform and sanitize response
    const features = (data.features || []).map((feature: any) => ({
      id: feature.id || null,
      type: feature.geometry?.type || null,
      coordinates: feature.geometry?.coordinates || null,
      placeName: sanitizeText(feature.place_name || ""),
      text: sanitizeText(feature.text || ""),
      context: (feature.context || []).map((ctx: any) => ({
        id: ctx.id || null,
        text: sanitizeText(ctx.text || ""),
      })),
    }));

    res.json({
      coordinates: { lng: body.lng, lat: body.lat },
      features,
      attribution: "© Mapbox © OpenStreetMap",
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid request", details: error.issues });
      return;
    }
    console.error("POST /geocoding/reverse error:", error);
    res.status(500).json({ error: "Failed to reverse geocode coordinates" });
  }
}) as RequestHandler);

/**
 * POST /api/geocoding/directions
 * Get directions/route between two points with traffic-aware routing
 * Requires authentication
 * Body: { from: { lng, lat }, to: { lng, lat }, profile?: "driving" | "driving-traffic", departAt?: ISO string }
 */
router.post("/directions", requireAuth as RequestHandler, limitGeocoding, (async (req: AuthedRequest, res: Response) => {
  try {
    if (!MAPBOX_TOKEN) {
      res.status(503).json({ error: "Directions service not configured" });
      return;
    }

    const schema = z.object({
      from: z.object({
        lng: z.number().min(-180).max(180),
        lat: z.number().min(-90).max(90),
      }),
      to: z.object({
        lng: z.number().min(-180).max(180),
        lat: z.number().min(-90).max(90),
      }),
      profile: z.enum(["driving", "driving-traffic", "walking", "cycling"]).optional().default("driving-traffic"),
      departAt: z.string().datetime().optional(), // ISO 8601 datetime for traffic-aware routing
      alternatives: z.boolean().optional().default(true),
      geometries: z.enum(["geojson", "polyline", "polyline6"]).optional().default("geojson"),
      steps: z.boolean().optional().default(true),
      overview: z.enum(["full", "simplified", "false"]).optional().default("full"),
    });

    const body = schema.parse(req.body);

    // Build Mapbox Directions API URL
    const params = new URLSearchParams();
    params.append("access_token", MAPBOX_TOKEN);
    params.append("geometries", body.geometries);
    params.append("overview", body.overview);
    params.append("steps", String(body.steps));
    params.append("alternatives", String(body.alternatives));

    // Add traffic-aware routing parameters
    if (body.profile === "driving-traffic" && body.departAt) {
      params.append("depart_at", body.departAt);
    }

    const coordinates = `${body.from.lng},${body.from.lat};${body.to.lng},${body.to.lat}`;
    const url = `https://api.mapbox.com/directions/v5/mapbox/${body.profile}/${coordinates}?${params.toString()}`;

    // Fetch from Mapbox API
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "NoLS-API/1.0",
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      console.error("Mapbox directions error:", response.status, errorText);
      res.status(response.status === 401 ? 503 : 502).json({
        error: "Directions service error",
        message: response.status === 401 ? "Invalid API key" : "Service temporarily unavailable",
      });
      return;
    }

    const data = await response.json();

    // Transform response (sanitize where needed)
    const routes = (data.routes || []).map((route: any, index: number) => ({
      index,
      distance: route.distance || 0, // meters
      duration: route.duration || 0, // seconds
      durationTypical: route.duration_typical || null, // seconds (traffic-aware)
      geometry: route.geometry || null,
      legs: (route.legs || []).map((leg: any) => ({
        distance: leg.distance || 0,
        duration: leg.duration || 0,
        durationTypical: leg.duration_typical || null,
        steps: (leg.steps || []).map((step: any) => ({
          distance: step.distance || 0,
          duration: step.duration || 0,
          instruction: sanitizeText(step.maneuver?.instruction || ""),
          maneuver: step.maneuver?.type || null,
          location: step.maneuver?.location || null,
        })),
      })),
    }));

    res.json({
      code: data.code || "Ok",
      routes,
      waypoints: (data.waypoints || []).map((wp: any) => ({
        location: wp.location || null,
        name: sanitizeText(wp.name || ""),
      })),
      attribution: "© Mapbox © OpenStreetMap",
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid request", details: error.issues });
      return;
    }
    console.error("POST /geocoding/directions error:", error);
    res.status(500).json({ error: "Failed to get directions" });
  }
}) as RequestHandler);

export default router;

