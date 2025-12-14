"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";

// Use same-origin for HTTP calls so Next.js rewrites proxy to the API in dev
const api = axios.create({ baseURL: "" });

type LngLat = { lng: number; lat: number };

type MapPayload = {
  driverLocation?: { id?: any; lng?: number; lat?: number } | null;
  assignments?: Array<{ id?: any; pickup?: LngLat | null; dropoff?: LngLat | null }>;
  nearbyDrivers?: Array<{ id?: any; lng?: number | null; lat?: number | null; available?: boolean | null; name?: string | null }>;
};

type MapTheme = "light" | "dark";
type MapLayer = "navigation" | "streets" | "outdoors" | "satellite";

// Mapbox base styles (kept simple so we can reliably re-add our layers after setStyle()).
const MAPBOX_STYLE_LIGHT = "mapbox://styles/mapbox/navigation-day-v1";
const MAPBOX_STYLE_DARK = "mapbox://styles/mapbox/navigation-night-v1";
const MAPBOX_STYLE_STREETS = "mapbox://styles/mapbox/streets-v12";
const MAPBOX_STYLE_OUTDOORS = "mapbox://styles/mapbox/outdoors-v12";
const MAPBOX_STYLE_SATELLITE = "mapbox://styles/mapbox/satellite-streets-v12";

// Route styling: default is pure blue; switches to "heavy" green when ETA <= 5 minutes.
const ROUTE_COLOR_DEFAULT = "#0000FF";
const ROUTE_COLOR_ARRIVING = "#008000";
const ROUTE_WIDTH_DEFAULT = 6; // slightly thicker than before
const ROUTE_WIDTH_ARRIVING = 8; // a bit thicker when close
const ROUTE_GLOW_WIDTH_DEFAULT = 12;
const ROUTE_GLOW_WIDTH_ARRIVING = 16;

function toLngLatMaybe(v: any): LngLat | null {
  const lat = Number(v?.lat);
  const lng = Number(v?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function toLonLat(p: LngLat): [number, number] {
  return [p.lng, p.lat];
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function haversineMeters(a: LngLat, b: LngLat) {
  const R = 6371000;
  const φ1 = (a.lat * Math.PI) / 180;
  const φ2 = (b.lat * Math.PI) / 180;
  const dφ = ((b.lat - a.lat) * Math.PI) / 180;
  const dλ = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dφ / 2) * Math.sin(dφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(dλ / 2) * Math.sin(dλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
  return R * c;
}

function bearingDeg(from: LngLat, to: LngLat): number {
  const φ1 = (from.lat * Math.PI) / 180;
  const φ2 = (to.lat * Math.PI) / 180;
  const Δλ = ((to.lng - from.lng) * Math.PI) / 180;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const θ = Math.atan2(y, x);
  return ((θ * 180) / Math.PI + 360) % 360;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function smoothEma(prev: LngLat, next: LngLat, alpha: number): LngLat {
  return { lat: lerp(prev.lat, next.lat, alpha), lng: lerp(prev.lng, next.lng, alpha) };
}

function nearestPointOnLineStringMeters(
  point: LngLat,
  coords: Array<[number, number]>
): { snapped: LngLat; distanceMeters: number } | null {
  if (!Array.isArray(coords) || coords.length < 2) return null;

  // Equirectangular projection around the point latitude
  const lat0 = (point.lat * Math.PI) / 180;
  const toXY = (c: [number, number]) => {
    const lng = c[0];
    const lat = c[1];
    const x = ((lng * Math.PI) / 180) * Math.cos(lat0) * 6371000;
    const y = ((lat * Math.PI) / 180) * 6371000;
    return { x, y, lng, lat };
  };
  const p = toXY([point.lng, point.lat]);

  let best = { d2: Number.POSITIVE_INFINITY, x: p.x, y: p.y };
  for (let i = 0; i < coords.length - 1; i++) {
    const a = toXY(coords[i]);
    const b = toXY(coords[i + 1]);
    const abx = b.x - a.x;
    const aby = b.y - a.y;
    const apx = p.x - a.x;
    const apy = p.y - a.y;
    const denom = abx * abx + aby * aby;
    const t = denom > 0 ? clamp((apx * abx + apy * aby) / denom, 0, 1) : 0;
    const x = a.x + abx * t;
    const y = a.y + aby * t;
    const dx = p.x - x;
    const dy = p.y - y;
    const d2 = dx * dx + dy * dy;
    if (d2 < best.d2) best = { d2, x, y };
  }

  // Convert back to lat/lng
  const lat = (best.y / 6371000) * (180 / Math.PI);
  const lng = (best.x / (6371000 * Math.cos(lat0))) * (180 / Math.PI);
  return { snapped: { lat, lng }, distanceMeters: Math.sqrt(best.d2) };
}

function svgDataUrl(svg: string) {
  // Keep it simple and CSP-friendly (no external fetch)
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function addSvgImageOnce(map: any, id: string, svg: string, pixelRatio = 2) {
  try {
    if (map?.hasImage?.(id)) return;
    const img = new Image();
    img.onload = () => {
      try {
        if (!map?.hasImage?.(id)) map.addImage(id, img, { pixelRatio });
      } catch {
        // ignore
      }
    };
    img.src = svgDataUrl(svg);
  } catch {
    // ignore
  }
}

export default function DriverLiveMapCanvas({
  liveOnly,
  className,
  tripRequest,
  activeTrip,
  tripStage,
  mapTheme = "light",
  mapLayer = "navigation",
}: {
  liveOnly?: boolean;
  className?: string;
  tripRequest?: any | null;
  activeTrip?: any | null;
  tripStage?: string;
  mapTheme?: MapTheme;
  mapLayer?: MapLayer;
}) {
  const [data, setData] = useState<MapPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [routeKey, setRouteKey] = useState<string | null>(null);
  const [routeFeatures, setRouteFeatures] = useState<any[]>([]);
  const [activeRouteIndex, setActiveRouteIndex] = useState(0);
  const [showAltRoutes, setShowAltRoutes] = useState(false);
  const [routeMetas, setRouteMetas] = useState<
    Array<{
      index: number;
      durationSec: number | null;
      distanceMeters: number | null;
      nav?: { instruction: string; distanceMeters?: number; durationSec?: number } | null;
    }>
  >([]);
  const [smoothedDriverPos, setSmoothedDriverPos] = useState<LngLat | null>(null);
  const [snappedDriverPos, setSnappedDriverPos] = useState<LngLat | null>(null);
  const [navInfo, setNavInfo] = useState<{ instruction: string; distanceMeters?: number; durationSec?: number; type: "pickup" | "destination" } | null>(null);
  const [routeRetryNonce, setRouteRetryNonce] = useState(0);
  const [styleRevision, setStyleRevision] = useState(0);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any | null>(null);
  const mapboxRef = useRef<any | null>(null);
  const mapLoadedRef = useRef(false);
  const userInteractingRef = useRef(false);
  const lastAppliedStyleRef = useRef<string | null>(null);
  const lastDriverPosRef = useRef<LngLat | null>(null);
  const lastPosAtRef = useRef<number | null>(null);
  const lastRouteFetchRef = useRef<{ key: string; at: number } | null>(null);
  const routeAbortRef = useRef<AbortController | null>(null);
  const routeRetryRef = useRef<{ attempts: number; timer?: number | null } | null>(null);
  const lastEmittedOptionsKeyRef = useRef<string | null>(null);

  const mapboxToken =
    (process.env.NEXT_PUBLIC_MAPBOX_TOKEN as string) ||
    (process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN as string) ||
    (typeof window !== "undefined" ? (window as any).__MAPBOX_TOKEN : "") ||
    "";

  const desiredStyleUrl = useMemo(() => {
    if (mapLayer === "streets") return MAPBOX_STYLE_STREETS;
    if (mapLayer === "outdoors") return MAPBOX_STYLE_OUTDOORS;
    if (mapLayer === "satellite") return MAPBOX_STYLE_SATELLITE;
    // navigation
    return mapTheme === "dark" ? MAPBOX_STYLE_DARK : MAPBOX_STYLE_LIGHT;
  }, [mapTheme, mapLayer]);

  const driverPos = useMemo((): LngLat => {
    const p = toLngLatMaybe((data as any)?.driverLocation);
    return p ?? { lat: -6.7924, lng: 39.2083 };
  }, [data]);

  // GPS smoothing + low-speed jitter control
  useEffect(() => {
    const now = Date.now();
    const prev = lastDriverPosRef.current;
    const prevSmooth = smoothedDriverPos ?? prev ?? driverPos;
    const next = driverPos;

    if (!prev) {
      lastDriverPosRef.current = next;
      lastPosAtRef.current = now;
      setSmoothedDriverPos(next);
      return;
    }

    const dtSec = Math.max(0.2, Math.min(5, (now - (lastPosAtRef.current ?? now)) / 1000));
    const distM = haversineMeters(prev, next);
    const speed = distM / dtSec; // m/s

    // Deadband for jitter when basically stopped (< ~1.5m move)
    if (speed < 1.0 && distM < 1.5) {
      lastDriverPosRef.current = next;
      lastPosAtRef.current = now;
      return;
    }

    // Adaptive alpha: smoother at low speed, more responsive at high speed
    const alpha = speed < 1 ? 0.12 : speed < 5 ? 0.22 : speed < 12 ? 0.35 : 0.55;
    const smoothed = smoothEma(prevSmooth, next, alpha);

    lastDriverPosRef.current = next;
    lastPosAtRef.current = now;
    setSmoothedDriverPos(smoothed);

    // Emit live position to the page for geofencing/stage triggers
    try {
      window.dispatchEvent(
        new CustomEvent("nols:driver:pos", {
          detail: { lat: smoothed.lat, lng: smoothed.lng, rawLat: next.lat, rawLng: next.lng, speedMps: speed },
        })
      );
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driverPos]);

  const assignmentFeatures = useMemo(() => {
    const assignments = Array.isArray((data as any)?.assignments) ? (data as any).assignments : [];
    return assignments
      .map((a: any) => {
        const pickup = toLngLatMaybe(a?.pickup);
        const dropoff = toLngLatMaybe(a?.dropoff);
        if (!pickup || !dropoff) return null;
        return {
          type: "Feature",
          geometry: { type: "LineString", coordinates: [toLonLat(pickup), toLonLat(dropoff)] },
          properties: { id: a?.id ?? "" },
        };
      })
      .filter(Boolean);
  }, [data]);

  const pickupPos = useMemo(() => {
    const src = activeTrip ?? tripRequest;
    const lat = Number(src?.pickupLat);
    const lng = Number(src?.pickupLng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng } as LngLat;
  }, [activeTrip, tripRequest]);

  const dropoffPos = useMemo(() => {
    const src = activeTrip ?? tripRequest;
    const lat = Number(src?.dropoffLat);
    const lng = Number(src?.dropoffLng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng } as LngLat;
  }, [activeTrip, tripRequest]);

  const activeRouteFeature = useMemo(() => {
    // Fallback visual route (straight line) when Directions isn't available yet.
    if (!pickupPos) return null;
    const stage = String(tripStage ?? "");
    const isTransit = stage === "picked_up" || stage === "in_transit" || stage === "arrived" || stage === "dropoff";
    const coords: [number, number][] = [];
    if (isTransit && dropoffPos) {
      coords.push(toLonLat(driverPos), toLonLat(dropoffPos));
    } else {
      coords.push(toLonLat(driverPos), toLonLat(pickupPos));
    }
    return {
      type: "Feature",
      geometry: { type: "LineString", coordinates: coords },
      properties: { id: "active-route" },
    };
  }, [driverPos, pickupPos, dropoffPos, tripStage]);

  const selectedRouteFeature = useMemo(() => {
    if (routeFeatures.length === 0) return null;
    const idx = clamp(activeRouteIndex, 0, Math.max(0, routeFeatures.length - 1));
    return routeFeatures[idx] ?? null;
  }, [routeFeatures, activeRouteIndex]);

  const alternativeRouteFeatures = useMemo(() => {
    if (routeFeatures.length <= 1) return [];
    const idx = clamp(activeRouteIndex, 0, Math.max(0, routeFeatures.length - 1));
    return routeFeatures.filter((_, i) => i !== idx);
  }, [routeFeatures, activeRouteIndex]);

  // Emit ETA + nav for the currently selected route (no refetch)
  useEffect(() => {
    if (!routeKey) return;
    if (!Array.isArray(routeMetas) || routeMetas.length === 0) return;
    const stage = String(tripStage ?? "");
    const inTransit = stage === "picked_up" || stage === "in_transit" || stage === "arrived" || stage === "dropoff";
    const type = inTransit ? ("destination" as const) : ("pickup" as const);

    const idx = clamp(activeRouteIndex, 0, Math.max(0, routeMetas.length - 1));
    const meta = routeMetas[idx] ?? routeMetas[0];
    if (!meta) return;

    // Update route line style based on ETA (<= 5 minutes => green + thicker).
    try {
      const durationSec = typeof meta.durationSec === "number" && Number.isFinite(meta.durationSec) ? meta.durationSec : null;
      // Use the same rounding as the ETA banner to avoid edge cases (e.g. 5.1 min still showing as 5 min).
      const minutesRounded = durationSec !== null ? Math.max(1, Math.round(durationSec / 60)) : null;
      const arrivingSoon = minutesRounded !== null && minutesRounded <= 5;
      const map = mapRef.current;
      if (map && mapLoadedRef.current) {
        const color = arrivingSoon ? ROUTE_COLOR_ARRIVING : ROUTE_COLOR_DEFAULT;
        const width = arrivingSoon ? ROUTE_WIDTH_ARRIVING : ROUTE_WIDTH_DEFAULT;
        const glowWidth = arrivingSoon ? ROUTE_GLOW_WIDTH_ARRIVING : ROUTE_GLOW_WIDTH_DEFAULT;
        try {
          map.setPaintProperty("active-route-line", "line-color", color);
          map.setPaintProperty("active-route-line", "line-width", width);
          map.setPaintProperty("active-route-line", "line-opacity", 0.9);
        } catch {
          // ignore
        }
        try {
          map.setPaintProperty("active-route-glow", "line-color", color);
          map.setPaintProperty("active-route-glow", "line-width", glowWidth);
          map.setPaintProperty("active-route-glow", "line-opacity", arrivingSoon ? 0.26 : 0.22);
        } catch {
          // ignore
        }
      }
    } catch {
      // ignore
    }

    const minutes = meta.durationSec ? Math.max(1, Math.round(meta.durationSec / 60)) : null;
    if (minutes) {
      try {
        window.dispatchEvent(new CustomEvent("nols:route:eta", { detail: { type, minutes } }));
      } catch {
        // ignore
      }
    }

    const nav = meta.nav?.instruction ? { ...meta.nav, type } : null;
    if (nav) {
      setNavInfo(nav);
      try {
        window.dispatchEvent(new CustomEvent("nols:route:nav", { detail: nav }));
      } catch {
        // ignore
      }
    }

    // persist selection (so reopening routes keeps last chosen)
    try {
      localStorage.setItem(`nols:route:active:${routeKey}:${type}`, String(idx));
    } catch {
      // ignore
    }
  }, [routeKey, routeMetas, activeRouteIndex, tripStage]);

  // initial map payload
  useEffect(() => {
    const t = localStorage.getItem("token");
    if (t) api.defaults.headers.common["Authorization"] = `Bearer ${t}`;
    let mounted = true;
    (async () => {
      try {
        const r = await api.get("/api/driver/map");
        if (!mounted) return;
        setData(r.data);
      } catch (e: any) {
        setError(e?.message || String(e));
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // allow the page to select a route + toggle alternative routes visibility
  useEffect(() => {
    const onSelect = (ev: Event) => {
      try {
        const d = (ev as CustomEvent).detail || {};
        const idx = Number(d.index);
        if (!Number.isFinite(idx)) return;
        setActiveRouteIndex(clamp(Math.round(idx), 0, Math.max(0, routeFeatures.length - 1)));
      } catch {
        // ignore
      }
    };
    const onShowAlts = (ev: Event) => {
      try {
        const d = (ev as CustomEvent).detail || {};
        setShowAltRoutes(Boolean(d.visible));
      } catch {
        // ignore
      }
    };
    window.addEventListener("nols:route:select", onSelect as EventListener);
    window.addEventListener("nols:route:alts", onShowAlts as EventListener);
    return () => {
      window.removeEventListener("nols:route:select", onSelect as EventListener);
      window.removeEventListener("nols:route:alts", onShowAlts as EventListener);
    };
  }, [routeFeatures.length]);

  // init map
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!containerRef.current) return;
    if (!data) return;
    if (!mapboxToken) return;
    if (mapRef.current) return;

    let map: any = null;
    (async () => {
      try {
        const mod = await import("mapbox-gl");
        const mapboxgl = (mod as any).default ?? mod;
        mapboxRef.current = mapboxgl;
        mapboxgl.accessToken = mapboxToken;

        map = new mapboxgl.Map({
          container: containerRef.current as HTMLElement,
          // Base style (switchable by driver)
          style: desiredStyleUrl,
          center: [driverPos.lng, driverPos.lat],
          zoom: liveOnly ? 15 : 13,
          pitch: liveOnly ? 50 : 0,
          bearing: 0,
        });

        lastAppliedStyleRef.current = desiredStyleUrl;
        mapRef.current = map;
        map.addControl(new mapboxgl.NavigationControl({ showCompass: true }), "top-right");

        // Some Mapbox styles reference optional datasets like "incidents".
        // Those can return 404 tiles in certain regions/plans and spam the console.
        // We remove them best-effort to keep the map clean.
        const stripIncidents = () => {
          try {
            const style = map.getStyle?.();
            const sources = style?.sources || {};
            const incidentSourceIds = Object.keys(sources).filter((id) => {
              const s: any = (sources as any)[id];
              const url = String(s?.url || "");
              return id.toLowerCase().includes("incidents") || url.includes("mapbox-incidents");
            });
            if (incidentSourceIds.length === 0) return;

            const layers = Array.isArray(style?.layers) ? style.layers : [];
            incidentSourceIds.forEach((srcId) => {
              // remove all layers using this source
              layers
                .filter((l: any) => l?.source === srcId)
                .forEach((l: any) => {
                  try {
                    if (map.getLayer?.(l.id)) map.removeLayer(l.id);
                  } catch {
                    // ignore
                  }
                });
              // then remove the source
              try {
                if (map.getSource?.(srcId)) map.removeSource(srcId);
              } catch {
                // ignore
              }
            });
          } catch {
            // ignore
          }
        };

        // Track user interactions so we don't fight the user while panning/zooming
        const markInteracting = () => {
          userInteractingRef.current = true;
          window.setTimeout(() => {
            userInteractingRef.current = false;
          }, 9000);
        };
        map.on("dragstart", markInteracting);
        map.on("zoomstart", markInteracting);
        map.on("rotatestart", markInteracting);
        map.on("pitchstart", markInteracting);

        const ensureOverlays = () => {
          try {
            if (!map.getSource("assignments")) {
              map.addSource("assignments", {
                type: "geojson",
                data: { type: "FeatureCollection", features: assignmentFeatures },
              });
              map.addLayer({
                id: "assignments-line",
                type: "line",
                source: "assignments",
                paint: {
                  "line-color": "#2563eb",
                  "line-width": 4,
                  "line-opacity": 0.85,
                },
              });
            }

            if (!map.getSource("active-route")) {
              map.addSource("active-route", {
                type: "geojson",
                data: { type: "FeatureCollection", features: [] },
              });
              // glow underlay
              map.addLayer({
                id: "active-route-glow",
                type: "line",
                source: "active-route",
                paint: {
                  "line-color": ROUTE_COLOR_DEFAULT,
                  "line-width": ROUTE_GLOW_WIDTH_DEFAULT,
                  "line-opacity": 0.22,
                },
              });
              map.addLayer({
                id: "active-route-line",
                type: "line",
                source: "active-route",
                paint: {
                  "line-color": ROUTE_COLOR_DEFAULT,
                  "line-width": ROUTE_WIDTH_DEFAULT,
                  "line-opacity": 0.9,
                } as any,
              });
            }

            if (!map.getSource("alt-routes")) {
              map.addSource("alt-routes", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
              map.addLayer({
                id: "alt-routes-line",
                type: "line",
                source: "alt-routes",
                paint: {
                  "line-color": "#64748b",
                  "line-width": 4,
                  "line-opacity": 0.28,
                  "line-dasharray": ["literal", [1.4, 1.2]],
                } as any,
              });
            }

            // Points as layers (smoother than DOM markers)
            const ensurePointSource = (id: string) => {
              if (map.getSource(id)) return;
              map.addSource(id, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
            };
            ensurePointSource("driver-point");
            ensurePointSource("pickup-point");
            ensurePointSource("dropoff-point");
            ensurePointSource("nearby-points");

            // --- Icon markers (driver, pickup, destination) ---
            // Driver "location" icon (blue)
            addSvgImageOnce(
              map,
              "driver-location-icon",
              `
<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <circle cx="32" cy="32" r="18" fill="#2563eb" stroke="#ffffff" stroke-width="4"/>
  <path d="M32 18 L40 40 L32 36 L24 40 Z" fill="#ffffff" opacity="0.95"/>
</svg>`.trim()
            );

            // Pickup pin (blue)
            addSvgImageOnce(
              map,
              "pickup-pin-blue",
              `
<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <path d="M32 60 C32 60 14 42 14 28 C14 18.1 22.1 10 32 10 C41.9 10 50 18.1 50 28 C50 42 32 60 32 60 Z"
        fill="#2563eb" stroke="#ffffff" stroke-width="3"/>
  <circle cx="32" cy="28" r="7" fill="#ffffff"/>
</svg>`.trim()
            );

            // Destination pin (green)
            addSvgImageOnce(
              map,
              "destination-pin-green",
              `
<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <path d="M32 60 C32 60 14 42 14 28 C14 18.1 22.1 10 32 10 C41.9 10 50 18.1 50 28 C50 42 32 60 32 60 Z"
        fill="#16a34a" stroke="#ffffff" stroke-width="3"/>
  <circle cx="32" cy="28" r="7" fill="#ffffff"/>
</svg>`.trim()
            );

            // Remove old circle layers if present (hot reload safety)
            ["driver-point-layer", "pickup-point-layer", "dropoff-point-layer"].forEach((id) => {
              try {
                if (map.getLayer(id)) map.removeLayer(id);
              } catch {
                // ignore
              }
            });

            // Driver halo + icon
            if (!map.getLayer("driver-halo-layer")) {
              map.addLayer({
                id: "driver-halo-layer",
                type: "circle",
                source: "driver-point",
                paint: {
                  "circle-radius": ["interpolate", ["linear"], ["zoom"], 12, 10, 15, 16, 18, 20],
                  "circle-color": "#2563eb",
                  "circle-opacity": 0.16,
                } as any,
              });
            }
            if (!map.getLayer("driver-icon-layer")) {
              map.addLayer({
                id: "driver-icon-layer",
                type: "symbol",
                source: "driver-point",
                layout: {
                  "icon-image": "driver-location-icon",
                  "icon-size": 0.82,
                  "icon-anchor": "center",
                  "icon-allow-overlap": true,
                },
              });
            }

            // Pickup halo + icon (blue)
            if (!map.getLayer("pickup-halo-layer")) {
              map.addLayer({
                id: "pickup-halo-layer",
                type: "circle",
                source: "pickup-point",
                paint: {
                  "circle-radius": ["interpolate", ["linear"], ["zoom"], 12, 14, 15, 24, 18, 32],
                  "circle-color": "#2563eb",
                  "circle-opacity": 0.14,
                } as any,
              });
            }
            if (!map.getLayer("pickup-icon-layer")) {
              map.addLayer({
                id: "pickup-icon-layer",
                type: "symbol",
                source: "pickup-point",
                layout: {
                  "icon-image": "pickup-pin-blue",
                  "icon-size": 1.02,
                  "icon-anchor": "bottom",
                  "icon-allow-overlap": true,
                },
              });
            }

            // Destination halo + icon (green)
            if (!map.getLayer("destination-halo-layer")) {
              map.addLayer({
                id: "destination-halo-layer",
                type: "circle",
                source: "dropoff-point",
                paint: {
                  "circle-radius": ["interpolate", ["linear"], ["zoom"], 12, 14, 15, 24, 18, 32],
                  "circle-color": "#16a34a",
                  "circle-opacity": 0.14,
                } as any,
              });
            }
            if (!map.getLayer("destination-icon-layer")) {
              map.addLayer({
                id: "destination-icon-layer",
                type: "symbol",
                source: "dropoff-point",
                layout: {
                  "icon-image": "destination-pin-green",
                  "icon-size": 1.02,
                  "icon-anchor": "bottom",
                  "icon-allow-overlap": true,
                },
              });
            }
            // --- End icon markers ---

            if (!map.getLayer("nearby-points-layer")) {
              map.addLayer({
                id: "nearby-points-layer",
                type: "circle",
                source: "nearby-points",
                paint: {
                  "circle-radius": [
                    "case",
                    ["==", ["get", "available"], true],
                    7,
                    ["==", ["get", "available"], false],
                    6,
                    6,
                  ],
                  "circle-color": [
                    "case",
                    ["==", ["get", "available"], true],
                    "#10b981",
                    ["==", ["get", "available"], false],
                    "#ef4444",
                    "#6b7280",
                  ],
                  "circle-stroke-width": 2,
                  "circle-stroke-color": "#ffffff",
                  "circle-opacity": 0.95,
                } as any,
              });
            }
          } catch {
            // ignore
          }
        };

        map.on("load", () => {
          mapLoadedRef.current = true;
          stripIncidents();
          ensureOverlays();
          setStyleRevision((n) => n + 1);
        });

        // When switching styles (setStyle), Mapbox clears custom layers/sources/images.
        // Re-apply overlays every time the new style finishes loading.
        map.on("style.load", () => {
          stripIncidents();
          ensureOverlays();
          setStyleRevision((n) => n + 1);
        });
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn("Mapbox init failed", e);
      }
    })();

    return () => {
      try {
        if (map) map.remove();
      } catch {
        // ignore
      }
      mapRef.current = null;
      mapboxRef.current = null;
      mapLoadedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, mapboxToken, desiredStyleUrl]);

  // Switch base map style (light/dark) without remounting the whole page.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    try {
      if (lastAppliedStyleRef.current === desiredStyleUrl) return;
      lastAppliedStyleRef.current = desiredStyleUrl;
      map.setStyle(desiredStyleUrl);
    } catch {
      // ignore
    }
  }, [desiredStyleUrl]);

  // follow driver in live mode
  useEffect(() => {
    if (!liveOnly) return;
    const map = mapRef.current;
    if (!map) return;
    if (userInteractingRef.current) return;
    try {
      const followPos = snappedDriverPos ?? smoothedDriverPos ?? driverPos;
      const prev = lastDriverPosRef.current;
      const bearing =
        prev && (smoothedDriverPos ?? driverPos) ? bearingDeg(prev, smoothedDriverPos ?? driverPos) : map.getBearing?.() ?? 0;
      // Keep zoom/pitch stable for a driver-friendly camera
      map.easeTo({
        center: [followPos.lng, followPos.lat],
        zoom: clamp(map.getZoom?.() ?? 15, 13, 17),
        pitch: clamp(map.getPitch?.() ?? 50, 35, 60),
        bearing,
        duration: 520,
      });
      lastDriverPosRef.current = smoothedDriverPos ?? driverPos;
    } catch {
      // ignore
    }
  }, [driverPos, smoothedDriverPos, snappedDriverPos, liveOnly]);

  // Directions-based route & ETA (Mapbox Directions API)
  useEffect(() => {
    if (!mapboxToken) return;
    if (!pickupPos) return;
    const stage = String(tripStage ?? "");
    const inTransit = stage === "picked_up" || stage === "in_transit" || stage === "arrived" || stage === "dropoff";
    const to = inTransit && dropoffPos ? dropoffPos : pickupPos;
    const from = smoothedDriverPos ?? driverPos;

    const key = `${from.lng.toFixed(5)},${from.lat.toFixed(5)}->${to.lng.toFixed(5)},${to.lat.toFixed(5)}`;
    setRouteKey(key);
    const now = Date.now();
    const last = lastRouteFetchRef.current;
    // throttle: avoid hammering the API on rapid updates
    if (last && last.key === key && now - last.at < 15000) return;
    lastRouteFetchRef.current = { key, at: now };

    // cancel in-flight request
    try {
      routeAbortRef.current?.abort();
    } catch {
      // ignore
    }
    const ac = new AbortController();
    routeAbortRef.current = ac;

    (async () => {
      try {
        // offline/weak network: use cached route if we can't fetch
        if (typeof navigator !== "undefined" && navigator.onLine === false) {
          const cached = localStorage.getItem(`nols:route:${key}`);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed?.features)) setRouteFeatures(parsed.features);
            if (Array.isArray(parsed?.metas)) setRouteMetas(parsed.metas);
            if (typeof parsed?.activeIndex === "number") setActiveRouteIndex(clamp(parsed.activeIndex, 0, 10));
            if (parsed?.nav) {
              setNavInfo(parsed.nav);
              try {
                window.dispatchEvent(new CustomEvent("nols:route:nav", { detail: parsed.nav }));
              } catch {
                // ignore
              }
            }
            if (Array.isArray(parsed?.options)) {
              try {
                window.dispatchEvent(new CustomEvent("nols:route:options", { detail: { key, type: parsed?.type, routes: parsed.options } }));
              } catch {
                // ignore
              }
            }
          }
          return;
        }

        const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${from.lng},${from.lat};${to.lng},${to.lat}?geometries=geojson&overview=full&steps=true&alternatives=true&access_token=${encodeURIComponent(
          mapboxToken
        )}`;
        const r = await fetch(url, { signal: ac.signal });
        if (!r.ok) return;
        const json = await r.json();
        const routesArr = Array.isArray(json?.routes) ? json.routes.slice(0, 3) : [];
        if (routesArr.length === 0) return;

        const feats = routesArr
          .map((route: any, idx: number) => {
            const coords = route?.geometry?.coordinates;
            if (!Array.isArray(coords) || coords.length < 2) return null;
            return {
              type: "Feature",
              geometry: { type: "LineString", coordinates: coords },
              properties: { id: `route-${idx}`, index: idx },
            };
          })
          .filter(Boolean);
        if (feats.length === 0) return;
        setRouteFeatures(feats);

        // emit route options for UI selection (avoid spamming)
        const type = inTransit ? ("destination" as const) : ("pickup" as const);
        const metas: Array<{
          index: number;
          durationSec: number | null;
          distanceMeters: number | null;
          nav?: { instruction: string; distanceMeters?: number; durationSec?: number } | null;
        }> = routesArr.map((route: any, idx: number) => {
          const leg0 = route?.legs?.[0];
          const step0 = leg0?.steps?.[0];
          const instruction = String(step0?.maneuver?.instruction || "");
          const nav =
            instruction
              ? {
                  instruction,
                  distanceMeters: Number(step0?.distance) || undefined,
                  durationSec: Number(step0?.duration) || undefined,
                }
              : null;
          return {
            index: idx,
            durationSec: Number(route?.duration) || null,
            distanceMeters: Number(route?.distance) || null,
            nav,
          };
        });
        setRouteMetas(metas);
        const options = metas.map((m) => ({ index: m.index, durationSec: m.durationSec, distanceMeters: m.distanceMeters }));
        if (lastEmittedOptionsKeyRef.current !== `${key}:${type}`) {
          lastEmittedOptionsKeyRef.current = `${key}:${type}`;
          try {
            window.dispatchEvent(new CustomEvent("nols:route:options", { detail: { key, type, routes: options } }));
          } catch {
            // ignore
          }
        }

        // default to last chosen for this leg (pickup/destination), else keep current clamped
        try {
          const saved = localStorage.getItem(`nols:route:active:${key}:${type}`);
          const savedIdx = saved ? Number(saved) : NaN;
          if (Number.isFinite(savedIdx)) setActiveRouteIndex(clamp(Math.round(savedIdx), 0, feats.length - 1));
          else setActiveRouteIndex((prev) => clamp(prev, 0, feats.length - 1));
        } catch {
          setActiveRouteIndex((prev) => clamp(prev, 0, feats.length - 1));
        }

        // cache routes + options (+ metas) for offline reuse
        try {
          localStorage.setItem(`nols:route:${key}`, JSON.stringify({ at: Date.now(), type, features: feats, options, metas, activeIndex: clamp(activeRouteIndex, 0, feats.length - 1) }));
        } catch {
          // ignore
        }
      } catch {
        // retry/backoff on weak network
        const state = routeRetryRef.current ?? { attempts: 0, timer: null };
        state.attempts += 1;
        routeRetryRef.current = state;
        if (state.attempts <= 3) {
          const delay = state.attempts === 1 ? 5000 : state.attempts === 2 ? 15000 : 30000;
          try {
            if (state.timer) window.clearTimeout(state.timer);
            state.timer = window.setTimeout(() => {
              // force re-run by invalidating last fetch timestamp
              lastRouteFetchRef.current = null;
              setRouteRetryNonce((n) => n + 1);
            }, delay);
          } catch {
            // ignore
          }
        }
      }
    })();
  }, [mapboxToken, driverPos, smoothedDriverPos, pickupPos, dropoffPos, tripStage, routeRetryNonce]);

  // Route snapping for the displayed driver dot
  useEffect(() => {
    const pos = smoothedDriverPos ?? driverPos;
    const coords = selectedRouteFeature?.geometry?.coordinates;
    if (!pos || !Array.isArray(coords) || coords.length < 2) {
      setSnappedDriverPos(null);
      return;
    }
    const nearest = nearestPointOnLineStringMeters(pos, coords);
    // only snap if reasonably close to route (avoid snapping onto wrong road)
    if (nearest && nearest.distanceMeters <= 35) setSnappedDriverPos(nearest.snapped);
    else setSnappedDriverPos(null);
  }, [selectedRouteFeature, smoothedDriverPos, driverPos]);

  // update source + markers
  useEffect(() => {
    const map = mapRef.current;
    const mapboxgl = mapboxRef.current;
    if (!map || !mapboxgl || !data) return;
    if (!mapLoadedRef.current) return;

    try {
      const src = map.getSource("assignments");
      if (src && typeof (src as any).setData === "function") {
        (src as any).setData({ type: "FeatureCollection", features: assignmentFeatures });
      }
    } catch {
      // ignore
    }

    // update active route source
    try {
      const src = map.getSource("active-route");
      if (src && typeof (src as any).setData === "function") {
        (src as any).setData(
          selectedRouteFeature
            ? { type: "FeatureCollection", features: [selectedRouteFeature] }
            : activeRouteFeature
              ? { type: "FeatureCollection", features: [activeRouteFeature] }
              : { type: "FeatureCollection", features: [] }
        );
      }
    } catch {
      // ignore
    }

    // update alt routes source (only when UI requests it)
    try {
      const src = map.getSource("alt-routes");
      if (src && typeof (src as any).setData === "function") {
        (src as any).setData(
          showAltRoutes && alternativeRouteFeatures.length > 0
            ? { type: "FeatureCollection", features: alternativeRouteFeatures }
            : { type: "FeatureCollection", features: [] }
        );
      }
    } catch {
      // ignore
    }

    // update point sources (smooth and flicker-free)
    const setPoint = (id: string, p: LngLat | null, props: any = {}) => {
      try {
        const src = map.getSource(id);
        if (!src || typeof (src as any).setData !== "function") return;
        (src as any).setData(
          p
            ? {
                type: "FeatureCollection",
                features: [{ type: "Feature", geometry: { type: "Point", coordinates: toLonLat(p) }, properties: props }],
              }
            : { type: "FeatureCollection", features: [] }
        );
      } catch {
        // ignore
      }
    };

    const displayDriverPos = snappedDriverPos ?? smoothedDriverPos ?? driverPos;
    setPoint("driver-point", (data as any).driverLocation ? displayDriverPos : null);
    setPoint("pickup-point", pickupPos);
    setPoint("dropoff-point", dropoffPos);

    // nearby points
    try {
      const src = map.getSource("nearby-points");
      if (src && typeof (src as any).setData === "function") {
        const nearby = Array.isArray((data as any)?.nearbyDrivers) ? (data as any).nearbyDrivers : [];
        const features = nearby
          .map((d: any) => {
            const p = toLngLatMaybe(d);
            if (!p) return null;
            return {
              type: "Feature",
              geometry: { type: "Point", coordinates: toLonLat(p) },
              properties: { id: d?.id ?? "", available: d?.available ?? null },
            };
          })
          .filter(Boolean);
        (src as any).setData({ type: "FeatureCollection", features });
      }
    } catch {
      // ignore
    }
  }, [
    data,
    driverPos,
    smoothedDriverPos,
    snappedDriverPos,
    assignmentFeatures,
    pickupPos,
    dropoffPos,
    activeRouteFeature,
    selectedRouteFeature,
    alternativeRouteFeatures,
    showAltRoutes,
    styleRevision,
  ]);

  // sockets: live updates
  useEffect(() => {
    if (typeof window === "undefined") return;
    let socket: any = null;
    let mounted = true;

    (async () => {
      try {
        const { io } = await import("socket.io-client");
        const token = localStorage.getItem("token");
        const base = (process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4000").replace(/\/$/, "");
        socket = io(base, {
          transportOptions: { polling: { extraHeaders: { Authorization: token ? `Bearer ${token}` : undefined } } },
          transports: ["websocket"],
        });

        socket.on("driver:location:update", (payload: any) => {
          if (!mounted) return;
          setData((prev: any) => {
            if (!prev) return prev;
            if (prev.driverLocation && prev.driverLocation.id && prev.driverLocation.id === payload.driverId) {
              return { ...prev, driverLocation: { ...prev.driverLocation, lat: payload.lat, lng: payload.lng } };
            }
            const nearby = Array.isArray(prev.nearbyDrivers) ? [...prev.nearbyDrivers] : [];
            const idx = nearby.findIndex((d: any) => d.id === payload.driverId);
            if (idx >= 0) nearby[idx] = { ...nearby[idx], lat: payload.lat, lng: payload.lng };
            else nearby.push({ id: payload.driverId, lat: payload.lat, lng: payload.lng, available: payload.available });
            return { ...prev, nearbyDrivers: nearby };
          });
        });

        socket.on("driver:availability:update", (payload: any) => {
          if (!mounted) return;
          setData((prev: any) => {
            if (!prev) return prev;
            const nearby = Array.isArray(prev.nearbyDrivers) ? [...prev.nearbyDrivers] : [];
            const idx = nearby.findIndex((d: any) => d.id === payload.driverId);
            if (idx >= 0) nearby[idx] = { ...nearby[idx], available: payload.available };
            else nearby.push({ id: payload.driverId, lat: payload.lat ?? null, lng: payload.lng ?? null, available: payload.available });
            return { ...prev, nearbyDrivers: nearby };
          });
        });
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn("Socket.IO client failed to initialize", e);
      }
    })();

    return () => {
      mounted = false;
      try {
        if (socket) socket.disconnect();
      } catch {
        // ignore
      }
    };
  }, []);

  if (!mapboxToken) {
    return (
      <div className={className}>
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-emerald-50">
          <div className="text-center px-4">
            <div className="text-sm font-semibold text-slate-800">Mapbox not configured</div>
            <div className="text-xs text-slate-600 mt-1">
              Set <span className="font-mono">NEXT_PUBLIC_MAPBOX_TOKEN</span> in <span className="font-mono">apps/web/.env.local</span>.
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className={className}>
        <div className="absolute inset-0 flex items-center justify-center bg-rose-50">
          <div className="text-sm text-rose-700">Failed to load map data: {error}</div>
        </div>
      </div>
    );
  }

  return <div ref={containerRef} className={className} />;
}
