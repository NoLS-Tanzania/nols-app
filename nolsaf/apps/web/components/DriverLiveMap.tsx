"use client";
import React, { useEffect, useState, useRef } from "react";
import axios from "axios";

const api = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_URL });

export default function DriverLiveMap() {
  const [data, setData] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mapRef = useRef<any | null>(null);
  const markersRef = useRef<Record<string, { marker: any; el: HTMLElement }>>({});
  const mapboxglRef = useRef<any | null>(null);

  // ensure pulse CSS for available markers is injected once
  const ensurePulseStyle = () => {
    try {
      if (typeof document === 'undefined') return;
      if (document.getElementById('nols-marker-pulse')) return;
      const s = document.createElement('style');
      s.id = 'nols-marker-pulse';
      s.innerHTML = `@keyframes nols-pulse { 0% { box-shadow: 0 0 0 0 rgba(16,185,129,0.45);} 70% { box-shadow: 0 0 0 10px rgba(16,185,129,0);} 100% { box-shadow: 0 0 0 0 rgba(16,185,129,0);} } .nols-pulse { animation: nols-pulse 2s infinite; }`;
      document.head.appendChild(s);
    } catch (e) {
      // ignore
    }
  };

  const createMarkerEl = (available: boolean | undefined) => {
    const el = document.createElement('div');
    el.className = 'nols-marker rounded-full';
    // size and color
    const size = available ? 18 : 12;
    el.style.width = `${size}px`;
    el.style.height = `${size}px`;
    el.style.boxSizing = 'border-box';
    el.style.border = '2px solid white';
    el.style.backgroundColor = available ? '#10b981' : '#6b7280';
    if (available) {
      ensurePulseStyle();
      el.classList.add('nols-pulse');
    }
    return el;
  };

  useEffect(() => {
    const t = localStorage.getItem("token");
    if (t) api.defaults.headers.common["Authorization"] = `Bearer ${t}`;
    let mounted = true;
    (async () => {
      try {
        const r = await api.get("/driver/map");
        if (!mounted) return;
        setData(r.data);
      } catch (e: any) {
        setError(e?.message || String(e));
      }
    })();
    return () => { mounted = false; };
  }, []);

  // mapbox init — attempt client-only dynamic import when we have data
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!data) return;
    let map: any = null;
    (async () => {
      try {
        const mapboxglModule = await import("mapbox-gl");
        const mapboxgl = (mapboxglModule as any).default ?? mapboxglModule;
        const token = (process.env.NEXT_PUBLIC_MAPBOX_TOKEN as string) || (window as any).__MAPBOX_TOKEN;
        if (!token) return;
        mapboxgl.accessToken = token;
        const el = document.getElementById("driver-live-map");
        if (!el) return;
        map = new mapboxgl.Map({ container: el as HTMLElement, style: "mapbox://styles/mapbox/streets-v11", center: [data.driverLocation.lng, data.driverLocation.lat], zoom: 13 });
  mapRef.current = map;
  mapboxglRef.current = mapboxgl;
        map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
        // driver marker
        if (data.driverLocation) {
          const elDriver = createMarkerEl(undefined);
          // make driver's own marker blue
          elDriver.style.backgroundColor = '#2563eb';
          elDriver.style.width = '18px';
          elDriver.style.height = '18px';
          new mapboxgl.Marker(elDriver).setLngLat([data.driverLocation.lng, data.driverLocation.lat]).addTo(map);
        }
        // assignments markers
        if (Array.isArray(data.assignments)) {
          data.assignments.forEach((a: any) => {
            if (a.pickup) new mapboxgl.Marker({ color: "#16a34a" }).setLngLat([a.pickup.lng, a.pickup.lat]).addTo(map);
            if (a.dropoff) new mapboxgl.Marker({ color: "#f59e0b" }).setLngLat([a.dropoff.lng, a.dropoff.lat]).addTo(map);
          });
        }
        // nearby drivers
        if (Array.isArray(data.nearbyDrivers)) {
          // create markers and keep refs so we can update color/position later
          data.nearbyDrivers.forEach((d: any) => {
            try {
              const elD = createMarkerEl(d.available);
              if (d.id) elD.setAttribute('data-driver-id', String(d.id));
              const m = new mapboxgl.Marker(elD).setLngLat([d.lng, d.lat]).addTo(map);
              if (d.id) markersRef.current[d.id] = { marker: m, el: elD };
            } catch (e) {
              // ignore marker creation errors
            }
          });
        }
      } catch (err) {
        // ignore map errors — keep data visible below
        // eslint-disable-next-line no-console
        console.warn("Driver live map init failed", err);
      }
    })();
    return () => { try { if (map) map.remove(); } catch (e) {} finally { mapRef.current = null; markersRef.current = {}; } };
  }, [data]);

  // Socket.IO client: listen for driver:location:update events and update map data live
  useEffect(() => {
    if (typeof window === "undefined") return;
    let socket: any = null;
    let mounted = true;
    (async () => {
      try {
        const { io } = await import("socket.io-client");
        const token = localStorage.getItem("token");
        const base = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
        socket = io(base, { transportOptions: { polling: { extraHeaders: { Authorization: token ? `Bearer ${token}` : undefined } } }, transports: ["websocket"] });

        socket.on("connect", () => {
          // eslint-disable-next-line no-console
          console.debug("socket connected", socket.id);
        });

        socket.on("driver:location:update", (payload: any) => {
          if (!mounted) return;
          setData((prev: any) => {
            if (!prev) return prev;
            if (prev.driverLocation && prev.driverLocation.id && prev.driverLocation.id === payload.driverId) {
              // update own driver location display
              return { ...prev, driverLocation: { ...prev.driverLocation, lat: payload.lat, lng: payload.lng, updatedAt: new Date() } };
            }
            const nearby = Array.isArray(prev.nearbyDrivers) ? [...prev.nearbyDrivers] : [];
            const idx = nearby.findIndex((d: any) => d.id === payload.driverId);
            if (idx >= 0) {
              nearby[idx] = { ...nearby[idx], lat: payload.lat, lng: payload.lng };
            } else {
              nearby.push({ id: payload.driverId, lat: payload.lat, lng: payload.lng, available: payload.available });
            }
            return { ...prev, nearbyDrivers: nearby };
          });

          // also update marker position if we have a marker
          try {
            const mRef = markersRef.current[payload.driverId];
            if (mRef && mRef.marker && typeof mRef.marker.setLngLat === 'function') {
              mRef.marker.setLngLat([payload.lng, payload.lat]);
            } else if (mapRef.current) {
              // create a new marker for previously unknown driver
              const elD = createMarkerEl(payload.available);
              if (payload.driverId) elD.setAttribute('data-driver-id', String(payload.driverId));
              const mapboxgl = mapboxglRef.current;
              if (mapboxgl) {
                const m = new mapboxgl.Marker(elD).setLngLat([payload.lng, payload.lat]).addTo(mapRef.current);
                if (payload.driverId) markersRef.current[payload.driverId] = { marker: m, el: elD };
              }
            }
          } catch (e) {
            // ignore marker update errors
          }
        });
        // availability updates: update nearbyDrivers availability flag
        socket.on("driver:availability:update", (payload: any) => {
          if (!mounted) return;
          try {
            setData((prev: any) => {
              if (!prev) return prev;
              const nearby = Array.isArray(prev.nearbyDrivers) ? [...prev.nearbyDrivers] : [];
              const idx = nearby.findIndex((d: any) => d.id === payload.driverId);
              if (idx >= 0) {
                nearby[idx] = { ...nearby[idx], available: payload.available };
              } else {
                // if we didn't previously know about this driver, add a minimal record
                nearby.push({ id: payload.driverId, lat: payload.lat ?? null, lng: payload.lng ?? null, available: payload.available });
              }
              return { ...prev, nearbyDrivers: nearby };
            });

            // update marker color if present
            const mRef = markersRef.current[payload.driverId];
            if (mRef && mRef.el) {
              mRef.el.style.backgroundColor = payload.available ? '#10b981' : '#6b7280';
              // adjust size & pulse
              const size = payload.available ? 18 : 12;
              mRef.el.style.width = `${size}px`;
              mRef.el.style.height = `${size}px`;
              if (payload.available) {
                ensurePulseStyle();
                mRef.el.classList.add('nols-pulse');
              } else {
                mRef.el.classList.remove('nols-pulse');
              }
            }
          } catch (e) {
            // ignore
          }
        });
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn("Socket.IO client failed to initialize", e);
      }
    })();
    return () => { mounted = false; try { if (socket) socket.disconnect(); } catch (e) {} };
  }, []);

  return (
    <div>
      {error ? (
        <div className="text-red-500">Failed to load: {error}</div>
      ) : !data ? (
        <div className="text-gray-500">Loading map data…</div>
      ) : (
        <>
          <div id="driver-live-map" className="w-full h-96 rounded-md overflow-hidden border-2 border-blue-200 bg-gray-50" />
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 bg-white border rounded">
              <div className="text-sm text-gray-500">Driver location</div>
              <div className="text-lg font-medium">{data.driverLocation?.lat?.toFixed?.(4) ?? "-"}, {data.driverLocation?.lng?.toFixed?.(4) ?? "-"}</div>
            </div>
            <div className="p-3 bg-white border rounded">
              <div className="text-sm text-gray-500">Assignments</div>
              <div className="text-lg font-medium">{(data.assignments || []).length}</div>
            </div>
            <div className="p-3 bg-white border rounded">
              <div className="text-sm text-gray-500">Nearby drivers</div>
              <div className="text-lg font-medium">{(data.nearbyDrivers || []).length}</div>
            </div>
          </div>
          {/* Nearby drivers list (live) */}
          {Array.isArray(data.nearbyDrivers) && data.nearbyDrivers.length > 0 ? (
            <div className="mt-4 bg-white border rounded p-3">
              <div className="text-sm text-gray-500 mb-2">Nearby drivers (live)</div>
              <ul className="space-y-2">
                {data.nearbyDrivers.map((d: any, i: number) => (
                  <li key={d.id ?? `driver-${i}`} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`${d.available ? 'bg-green-500' : 'bg-red-500'} w-2.5 h-2.5 rounded-full border border-white inline-block`} />
                      <div className="text-sm">
                        <div className="font-medium">{d.name ?? `Driver ${d.id ?? 'unknown'}`}</div>
                        <div className="text-xs text-muted-foreground">{d.lat ? `${d.lat.toFixed?.(4) ?? d.lat}, ${d.lng?.toFixed?.(4) ?? d.lng}` : 'location unknown'}</div>
                      </div>
                    </div>
                    <div className={`text-xs font-medium ${d.available ? 'text-green-600' : 'text-red-600'}`}>{d.available ? 'Available' : 'Offline'}</div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
