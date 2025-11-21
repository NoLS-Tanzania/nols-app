"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import axios from "axios";
import RefreshButton from "@/components/RefreshButton";
import { Calendar, DollarSign, Star } from 'lucide-react';
import DriverAvailabilitySwitch from "@/components/DriverAvailabilitySwitch";

const api = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_URL });

export default function DriverWelcome({ className }: { className?: string }) {
  // me === undefined -> loading; null -> not authenticated / fallback; object -> user
  const [me, setMe] = useState<any | null | undefined>(undefined);

  useEffect(() => {
    try {
      const t = localStorage.getItem("token");
      if (t) api.defaults.headers.common["Authorization"] = `Bearer ${t}`;
      api
        .get("/account/me")
        .then((r) => setMe(r.data))
        .catch(() => setMe(null));
    } catch (err) {
      setMe(null);
    }
  }, []);

  const name = me && (me.fullName || me.email) ? (me.fullName || me.email) : "Driver";
  const isoDate = (new Date()).toISOString().slice(0,10);
  
  const [available, setAvailable] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem('driver_available');
      return raw === '1' || raw === 'true';
    } catch (e) {
      return false;
    }
  });

  // minimal placeholder state for the welcome card's map area (map is mounted on the Live Map page)
  const [mapVisible, setMapVisible] = useState<boolean>(false);
  const [mapError, setMapError] = useState<string | null>(null);

  useEffect(() => {
    const handler = (ev: Event) => {
      try {
        const detail = (ev as CustomEvent).detail || {};
        if (typeof detail.available === 'boolean') {
          setAvailable(detail.available);
          try { setMapVisible(detail.available); } catch (e) {}
        }
      } catch (e) {
        // ignore
      }
    };
    const storageHandler = (e: StorageEvent) => {
      if (e.key === 'driver_available') {
        const val = e.newValue;
        const avail = val === '1' || val === 'true';
        setAvailable(avail);
        try { setMapVisible(avail); } catch (e) {}
      }
    };
    window.addEventListener('nols:availability:changed', handler as EventListener);
    window.addEventListener('storage', storageHandler as any);
    return () => {
      window.removeEventListener('nols:availability:changed', handler as EventListener);
      window.removeEventListener('storage', storageHandler as any);
    };
  }, []);
  

  // Map is provided by the Live Map page; welcome card shows a placeholder.
  // quick-link stats: default to zeros; we'll attempt to fetch driver stats if an API is available
  const [stats, setStats] = useState<{ todaysRides: number; earnings: number; rating: number }>({
    todaysRides: 0,
    earnings: 0,
    rating: 0,
  });
  // no-op: map initialization moved to DriverLiveMap component

  // try to fetch lightweight driver stats (non-blocking). If API is absent, we silently keep zeros.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const t = localStorage.getItem("token");
        if (t) api.defaults.headers.common["Authorization"] = `Bearer ${t}`;
        // Request stats for today (some APIs accept a date param). Use ISO date (YYYY-MM-DD).
        const today = new Date();
        const isoDate = today.toISOString().slice(0, 10);
        // best-effort endpoint; if it doesn't exist the request will fail and we'll keep defaults
        const res = await api.get(`/driver/stats?date=${isoDate}`);
        if (cancelled) return;
        const data = res.data || {};
        setStats({
          todaysRides: typeof data.todaysRides === "number" ? data.todaysRides : 0,
          earnings: typeof data.earnings === "number" ? data.earnings : 0,
          rating: typeof data.rating === "number" ? data.rating : 0,
        });
      } catch (e) {
        // ignore — keep zeros
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className={`bg-white rounded-lg p-6 border text-center ${className || ""}`}>
      {me === undefined ? (
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mx-auto" />
          <div className="mt-2 h-4 bg-gray-200 rounded w-72 mx-auto" />
        </div>
      ) : (
        <>
          <div className="flex items-center justify-center gap-4">
            <h1 className="text-2xl sm:text-3xl font-semibold">Welcome, {name}</h1>
            {/* availability switch inline with the welcome title */}
            <div className="ml-2">
              <DriverAvailabilitySwitch />
            </div>
          </div>
          <p className="mt-2 text-gray-600 text-center">
            {available ? "Now you're online." : "Now you can manage rides, view your schedule, handle payments, and update your account."}
          </p>
          <div className="mt-4 flex justify-center">
            <RefreshButton />
          </div>
          {/* Quick action links near the welcome area (moved from the sidebar) - show only when offline */}
          {!available ? (
            <div className="mt-4 flex justify-center">
              <div className="flex gap-3 flex-wrap justify-center">

                <Link href={`/driver/trips?date=${isoDate}`} aria-label="Today's Rides" className="no-underline flex items-center gap-3 bg-white border border-blue-50 shadow-sm hover:shadow-md px-3 py-2 rounded-lg min-w-[140px] transition-transform hover:-translate-y-0.5">
                  <div className="h-9 w-9 rounded-full bg-blue-50 flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-sm font-medium text-gray-800">Today&apos;s Rides</div>
                  </div>
                  <div className="text-sm text-gray-600 font-medium">{stats.todaysRides}</div>
                </Link>

                <Link href={`/driver/invoices?date=${isoDate}`} aria-label="Earnings (Invoices & Payouts)" className="no-underline flex items-center gap-3 bg-white border border-green-50 shadow-sm hover:shadow-md px-3 py-2 rounded-lg min-w-[140px] transition-transform hover:-translate-y-0.5">
                  <div className="h-9 w-9 rounded-full bg-green-50 flex items-center justify-center">
                    <DollarSign className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-sm font-medium text-gray-800">Earnings</div>
                  </div>
                  <div className="text-sm text-gray-600 font-medium">{stats.earnings ? stats.earnings.toLocaleString() + ' TZS' : '0 TZS'}</div>
                </Link>

                <div role="img" aria-label={`Rating ${stats.rating}`} className="no-underline flex items-center gap-3 bg-white border border-amber-50 px-3 py-2 rounded-lg min-w-[140px]">
                  <div className="h-9 w-9 rounded-full bg-amber-50 flex items-center justify-center">
                    <Star className="h-5 w-5 text-amber-600" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-sm font-medium text-gray-800">Rating</div>
                  </div>
                  <div className="text-sm text-gray-600 font-medium">{stats.rating}</div>
                </div>
              </div>
            </div>
          ) : null}
          {/* Map placeholder: an element with id="driver-map" where Mapbox or another map lib can mount a responsive map.
              Heights are responsive: mobile ~16rem, small screens ~20rem, medium+ ~24rem. */}
          {/* Map container always in DOM to allow CSS transitions; visibility toggled via mapVisible */}
          <div className="mt-6">
            <div
              id="driver-map"
              className={`w-full rounded-lg overflow-hidden border-2 border-blue-200 bg-gray-50 h-64 sm:h-80 md:h-96 transition-all duration-300 ease-out ${mapVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'}`}
            >
              {!available ? (
                // Offline skeleton for the map area
                <div className="h-full w-full flex items-center justify-center">
                  <div className="w-11/12">
                    <div className="animate-pulse">
                      <div className="h-36 bg-gray-200 rounded-md" />
                      <div className="mt-3 h-3 bg-gray-200 rounded w-3/4" />
                    </div>
                  </div>
                </div>
              ) : mapError ? (
                <div className="flex items-center justify-center h-full text-red-500">Map failed to load: {mapError}</div>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">Map placeholder — mount Mapbox here</div>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
// Initialize Mapbox map client-side inside the component lifecycle to avoid SSR issues.
// The effect runs after the welcome card renders so the #driver-map element exists.
// It reads the token from NEXT_PUBLIC_MAPBOX_TOKEN (inlined at build) or window fallback.
// If an external script sets window.__DRIVER_LOCATION = { lng, lat } it'll be used as the initial center.
// Cleanup removes the map instance on unmount or hot-reload.
// Note: This code intentionally runs only in the browser.
export function initDriverMap() {
  // noop placeholder to allow tests/imports; actual init runs in the effect below.
}

