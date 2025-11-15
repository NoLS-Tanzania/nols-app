"use client";
import React, { useEffect, useState } from "react";
import axios from "axios";
import RefreshButton from "@/components/RefreshButton";

const api = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_URL });

export default function DriverLiveMapPage() {
  const [data, setData] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

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
        map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
        // driver marker
        if (data.driverLocation) new mapboxgl.Marker({ color: "#2563eb" }).setLngLat([data.driverLocation.lng, data.driverLocation.lat]).addTo(map);
        // assignments markers
        if (Array.isArray(data.assignments)) {
          data.assignments.forEach((a: any) => {
            if (a.pickup) new mapboxgl.Marker({ color: "#16a34a" }).setLngLat([a.pickup.lng, a.pickup.lat]).addTo(map);
            if (a.dropoff) new mapboxgl.Marker({ color: "#f59e0b" }).setLngLat([a.dropoff.lng, a.dropoff.lat]).addTo(map);
          });
        }
        // nearby drivers
        if (Array.isArray(data.nearbyDrivers)) {
          data.nearbyDrivers.forEach((d: any) => {
            new mapboxgl.Marker({ color: "#6b7280" }).setLngLat([d.lng, d.lat]).addTo(map);
          });
        }
      } catch (err) {
        // ignore map errors — keep data visible below
        // eslint-disable-next-line no-console
        console.warn("Driver live map init failed", err);
      }
    })();
    return () => { try { if (map) map.remove(); } catch (e) {} };
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
          // payload: { driverId, lat, lng }
          setData((prev: any) => {
            if (!prev) return prev;
            // if update is for the current driver (match id), update driverLocation
            if (prev.driverLocation && prev.driverLocation.id && prev.driverLocation.id === payload.driverId) {
              return { ...prev, driverLocation: { ...prev.driverLocation, lat: payload.lat, lng: payload.lng, updatedAt: new Date() } };
            }
            // otherwise upsert into nearbyDrivers
            const nearby = Array.isArray(prev.nearbyDrivers) ? [...prev.nearbyDrivers] : [];
            const idx = nearby.findIndex((d: any) => d.id === payload.driverId);
            if (idx >= 0) {
              nearby[idx] = { ...nearby[idx], lat: payload.lat, lng: payload.lng };
            } else {
              nearby.push({ id: payload.driverId, lat: payload.lat, lng: payload.lng });
            }
            return { ...prev, nearbyDrivers: nearby };
          });
        });
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn("Socket.IO client failed to initialize", e);
      }
    })();
    return () => { mounted = false; try { if (socket) socket.disconnect(); } catch (e) {} };
  }, []);

  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-3xl flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Live Map</h1>
        <RefreshButton />
      </div>

      <section className="mx-auto max-w-3xl bg-white rounded-lg p-4 border">
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
            <div className="mt-4">
              <h3 className="text-sm font-medium">Assignments</h3>
              <ul className="mt-2 space-y-2">
                {(data.assignments || []).map((a: any) => (
                  <li key={a.id} className="p-2 border rounded flex justify-between items-center">
                    <div>
                      <div className="font-medium">{a.passengerName ?? 'Passenger'}</div>
                      <div className="text-xs text-gray-500">Status: {a.status}</div>
                    </div>
                    <div className="text-sm text-gray-600">{a.pickup ? `${a.pickup.lat.toFixed(3)},${a.pickup.lng.toFixed(3)}` : '—'}</div>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
