"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Check, X, Flag, CheckCircle } from "lucide-react";
import axios from "axios";

// Use same-origin for HTTP calls so Next.js rewrites proxy to the API in dev
const api = axios.create({ baseURL: "", withCredentials: true });

type LngLat = { lng: number; lat: number };

type Assignment = {
  id: any;
  pickup?: LngLat | null;
  dropoff?: LngLat | null;
  passengerName?: string | null;
};

type NearbyDriver = { id?: any; name?: string | null; lng?: number | null; lat?: number | null; available?: boolean | null };

type MapPayload = {
  driverLocation?: { id?: any; lng?: number; lat?: number } | null;
  assignments?: Assignment[];
  nearbyDrivers?: NearbyDriver[];
  demandZones?: Array<{ name: string; level: "high" | "medium" | "low" | string }>;
};

function toLngLatMaybe(v: any): LngLat | null {
  const lat = Number(v?.lat);
  const lng = Number(v?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function toLonLatArray(p: LngLat): [number, number] {
  return [p.lng, p.lat];
}

function makeDotEl(fill: string, sizePx: number): HTMLElement {
  const el = document.createElement("div");
  el.style.width = `${sizePx}px`;
  el.style.height = `${sizePx}px`;
  el.style.borderRadius = "9999px";
  el.style.background = fill;
  el.style.border = "2px solid #ffffff";
  el.style.boxShadow = "0 8px 22px rgba(2,6,23,0.10)";
  el.style.boxSizing = "border-box";
  return el;
}

export default function DriverLiveMap({ liveOnly }: { liveOnly?: boolean } = {}) {
  const [data, setData] = useState<MapPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any | null>(null);
  const mapboxRef = useRef<any | null>(null);
  const markersRef = useRef<any[]>([]);

  const mapboxToken =
    (process.env.NEXT_PUBLIC_MAPBOX_TOKEN as string) ||
    (process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN as string) ||
    (typeof window !== "undefined" ? (window as any).__MAPBOX_TOKEN : "") ||
    "";

  const driverPos = useMemo((): LngLat => {
    const p = toLngLatMaybe((data as any)?.driverLocation);
    return p ?? { lat: -6.7924, lng: 39.2083 };
  }, [data]);

  const assignmentLines = useMemo(() => {
    const assignments = Array.isArray((data as any)?.assignments) ? (data as any).assignments : [];
    return assignments
      .map((a: any) => {
        const pickup = toLngLatMaybe(a?.pickup);
        const dropoff = toLngLatMaybe(a?.dropoff);
        if (!pickup || !dropoff) return null;
        return {
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: [toLonLatArray(pickup), toLonLatArray(dropoff)],
          },
          properties: { id: a?.id ?? "" },
        };
      })
      .filter(Boolean);
  }, [data]);

  useEffect(() => {
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

  // Init Mapbox map once when data is ready
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
          style: "mapbox://styles/mapbox/streets-v12",
          center: [driverPos.lng, driverPos.lat],
          zoom: 13,
        });

        mapRef.current = map;
        map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");

        map.on("load", () => {
          try {
            if (!map.getSource("assignments")) {
              map.addSource("assignments", {
                type: "geojson",
                data: {
                  type: "FeatureCollection",
                  features: assignmentLines,
                },
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
          } catch {
            // ignore
          }
        });
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn("Mapbox init failed", e);
      }
    })();

    return () => {
      try {
        markersRef.current.forEach((m) => {
          try {
            m.remove();
          } catch {
            // ignore
          }
        });
        markersRef.current = [];
      } catch {
        // ignore
      }
      try {
        if (map) map.remove();
      } catch {
        // ignore
      }
      mapRef.current = null;
      mapboxRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, mapboxToken]);

  // Keep map centered on driver when liveOnly
  useEffect(() => {
    if (!liveOnly) return;
    const map = mapRef.current;
    if (!map) return;
    try {
      map.easeTo({ center: [driverPos.lng, driverPos.lat], duration: 400 });
    } catch {
      // ignore
    }
  }, [driverPos, liveOnly]);

  // Update markers + assignment lines when data changes
  useEffect(() => {
    const map = mapRef.current;
    const mapboxgl = mapboxRef.current;
    if (!map || !mapboxgl || !data) return;

    // Update assignment lines
    try {
      const src = map.getSource("assignments");
      if (src && typeof src.setData === "function") {
        src.setData({ type: "FeatureCollection", features: assignmentLines });
      }
    } catch {
      // ignore
    }

    // Clear markers
    try {
      markersRef.current.forEach((m) => {
        try {
          m.remove();
        } catch {
          // ignore
        }
      });
      markersRef.current = [];
    } catch {
      // ignore
    }

    // Driver marker
    try {
      if (data.driverLocation) {
        const el = makeDotEl("#2563eb", 18);
        const m = new mapboxgl.Marker(el).setLngLat([driverPos.lng, driverPos.lat]).addTo(map);
        markersRef.current.push(m);
      }
    } catch {
      // ignore
    }

    // Assignment markers
    const assignments = Array.isArray((data as any)?.assignments) ? (data as any).assignments : [];
    assignments.forEach((a: any) => {
      const pickup = toLngLatMaybe(a?.pickup);
      const dropoff = toLngLatMaybe(a?.dropoff);
      try {
        if (pickup) {
          const el = makeDotEl("#16a34a", 16);
          const m = new mapboxgl.Marker(el).setLngLat([pickup.lng, pickup.lat]).addTo(map);
          markersRef.current.push(m);
        }
        if (dropoff) {
          const el = makeDotEl("#f59e0b", 16);
          const m = new mapboxgl.Marker(el).setLngLat([dropoff.lng, dropoff.lat]).addTo(map);
          markersRef.current.push(m);
        }
      } catch {
        // ignore
      }
    });

    // Nearby driver markers
    const nearby = Array.isArray((data as any)?.nearbyDrivers) ? (data as any).nearbyDrivers : [];
    nearby.forEach((d: any) => {
      const pos = toLngLatMaybe(d);
      if (!pos) return;
      const fill = d?.available === true ? "#10b981" : d?.available === false ? "#ef4444" : "#6b7280";
      const size = d?.available === true ? 16 : 14;
      try {
        const el = makeDotEl(fill, size);
        const m = new mapboxgl.Marker(el).setLngLat([pos.lng, pos.lat]).addTo(map);
        markersRef.current.push(m);
      } catch {
        // ignore
      }
    });
  }, [data, driverPos, assignmentLines]);

  // Socket.IO client: listen for driver:location:update events and update map data live
  useEffect(() => {
    if (typeof window === "undefined") return;
    let socket: any = null;
    let mounted = true;
    (async () => {
      try {
        const { io } = await import("socket.io-client");
        // Prefer explicit API host for sockets in dev to avoid Next rewrite issues with WS
        const base = (process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4000").replace(/\/$/, "");
        socket = io(base, {
          transports: ["websocket"],
        });

        socket.on("driver:location:update", (payload: any) => {
          if (!mounted) return;
          setData((prev: any) => {
            if (!prev) return prev;
            if (prev.driverLocation && prev.driverLocation.id && prev.driverLocation.id === payload.driverId) {
              return {
                ...prev,
                driverLocation: { ...prev.driverLocation, lat: payload.lat, lng: payload.lng, updatedAt: new Date() },
              };
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

  return (
    <div>
      {error ? (
        <div className="text-red-500">Failed to load: {error}</div>
      ) : !data ? (
        <div className="text-gray-500">Loading map data…</div>
      ) : (
        <>
          <div
            className={`relative w-full rounded-md overflow-hidden border-2 border-blue-200 bg-gray-50 ${
              liveOnly ? "h-full min-h-[24rem]" : "h-96"
            }`}
          >
            {!mapboxToken ? (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-emerald-50">
                <div className="text-center px-4">
                  <div className="text-sm font-semibold text-slate-800">Mapbox not configured</div>
                  <div className="text-xs text-slate-600 mt-1">
                    Set <span className="font-mono">NEXT_PUBLIC_MAPBOX_TOKEN</span> (in <span className="font-mono">apps/web/.env.local</span>) then restart.
                  </div>
                </div>
              </div>
            ) : (
              <div ref={containerRef} className="absolute inset-0" />
            )}

            {/* Demand zones overlay (live-only) */}
            {liveOnly && (() => {
              const zones = Array.isArray((data as any).demandZones) ? (data as any).demandZones : [];
              return (
                <div className="absolute left-4 bottom-6 z-50 pointer-events-auto">
                  <div className="bg-white/95 backdrop-blur-sm rounded-lg p-3 shadow-md border">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="font-semibold text-sm text-gray-800">HIGH DEMAND ZONES</div>
                    </div>
                    <div className="flex flex-col gap-2">
                      {zones.map((zone: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-2 px-2 py-1 bg-gray-50 rounded-md border">
                          <span
                            className={`inline-block h-3 w-3 ${
                              zone.level === "high" ? "bg-blue-500" : zone.level === "medium" ? "bg-amber-400" : "bg-emerald-500"
                            } rounded-sm transform rotate-45`}
                          />
                          <span className="text-sm font-medium text-gray-700">{zone.name}</span>
                          <span className="text-xs text-gray-500 capitalize">{zone.level === "high" ? "Very High" : zone.level}</span>
                        </div>
                      ))}
                      {zones.length === 0 ? <div className="text-xs text-slate-500">No zones</div> : null}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Live controls overlay */}
            {liveOnly && (
              <div className="absolute right-4 top-6 z-50 pointer-events-auto">
                <div className="bg-white/95 backdrop-blur-sm rounded-lg p-3 shadow-md border w-56">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold text-sm text-gray-800">Live Controls</div>
                    <div className="text-xs text-gray-500">Active</div>
                  </div>
                  <ul className="text-sm text-gray-700 space-y-3">
                    <li className="flex items-center gap-3">
                      <Check className="h-5 w-5 text-emerald-500" />
                      <span>Accept Request now</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <X className="h-7 w-7 text-red-600" />
                      <span className="font-medium">Cancel</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <Flag className="h-5 w-5 text-amber-400" />
                      <span>Report</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-sky-500" />
                      <span>Complete Rides</span>
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Demand zones (non-live layout below map) */}
          {!liveOnly && (() => {
            const zones = Array.isArray((data as any).demandZones) ? (data as any).demandZones : [];
            return (
              <div className="mt-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="font-semibold text-gray-800">HIGH DEMAND ZONES</div>
                </div>
                <div className="mb-4 flex flex-wrap gap-3">
                  {zones.map((zone: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border">
                      <span
                        className={`inline-block h-3 w-3 ${
                          zone.level === "high" ? "bg-blue-500" : zone.level === "medium" ? "bg-amber-400" : "bg-emerald-500"
                        } rounded-sm transform rotate-45`}
                      />
                      <span className="text-sm font-medium text-gray-700">{zone.name}</span>
                      <span className="text-xs text-gray-500 capitalize">{zone.level === "high" ? "Very High" : zone.level}</span>
                    </div>
                  ))}
                  {zones.length === 0 ? <div className="text-sm text-slate-500">No zones</div> : null}
                </div>
              </div>
            );
          })()}

          {!liveOnly && (
            <>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3 bg-white border rounded">
                  <div className="text-sm text-gray-500">Driver location</div>
                  <div className="text-lg font-medium">
                    {(data as any).driverLocation?.lat?.toFixed?.(4) ?? "-"}, {(data as any).driverLocation?.lng?.toFixed?.(4) ?? "-"}
                  </div>
                </div>
                <div className="p-3 bg-white border rounded">
                  <div className="text-sm text-gray-500">Assignments</div>
                  <div className="text-lg font-medium">{((data as any).assignments || []).length}</div>
                </div>
                <div className="p-3 bg-white border rounded">
                  <div className="text-sm text-gray-500">Nearby drivers</div>
                  <div className="text-lg font-medium">{((data as any).nearbyDrivers || []).length}</div>
                </div>
              </div>
              {Array.isArray((data as any).nearbyDrivers) && (data as any).nearbyDrivers.length > 0 ? (
                <div className="mt-4 bg-white border rounded p-3">
                  <div className="text-sm text-gray-500 mb-2">Nearby drivers</div>
                  <ul className="space-y-2">
                    {(data as any).nearbyDrivers.map((d: any, i: number) => (
                      <li key={d.id ?? `driver-${i}`} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className={`${d.available ? "bg-green-500" : "bg-red-500"} w-2.5 h-2.5 rounded-full border border-white inline-block`} />
                          <div className="text-sm">
                            <div className="font-medium">{d.name ?? `Driver ${d.id ?? "unknown"}`}</div>
                            <div className="text-xs text-muted-foreground">
                              {d.lat ? `${d.lat.toFixed?.(4) ?? d.lat}, ${d.lng?.toFixed?.(4) ?? d.lng}` : "location unknown"}
                            </div>
                          </div>
                        </div>
                        <div className={`text-xs font-medium ${d.available ? "text-green-600" : "text-red-600"}`}>{d.available ? "Available" : "Offline"}</div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </>
          )}
        </>
      )}
    </div>
  );
}
