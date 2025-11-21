"use client";
import React, { useEffect, useState } from "react";
import axios from "axios";
import { Power } from "lucide-react";
import DriverSwitchOnline from "./DriverSwitchOnline";
import DriverSwitchOffline from "./DriverSwitchOffline";

const api = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_URL });

export default function DriverAvailabilitySwitch({ className = "" }: { className?: string }) {
  const [available, setAvailable] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem("driver_available");
      if (raw === "1" || raw === "true") return true;
      if (raw === "0" || raw === "false") return false;
    } catch (e) {
      /* ignore */
    }
    return false;
  });

  // Keep synced with any user object mounted on window or later prop updates (best-effort)
  useEffect(() => {
    try {
      // If an external script or page sets window.__DRIVER_AVAILABLE, respect it once
      const w = (window as any).__DRIVER_AVAILABLE;
      if (typeof w === "boolean") {
        setAvailable(w);
        try { localStorage.setItem("driver_available", w ? "1" : "0"); } catch (e) {}
      }
    } catch (e) { /* ignore */ }
  }, []);
  // transient status control: idle | pending | success | error
  const [status, setStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const timeoutRef = React.useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);

  const toggle = async () => {
    const next = !available;
  // optimistic UI: flip immediately for a smooth feel
  setAvailable(next);
  try { localStorage.setItem("driver_available", next ? "1" : "0"); } catch (e) {}
  // notify other components immediately so they can animate (optimistic)
  try { window.dispatchEvent(new CustomEvent('nols:availability:changed', { detail: { available: next }, bubbles: true, composed: true } as any)); } catch (e) {}

    // show pending/process message and ensure it lasts between 3s and 5s
    setStatus('pending');
    const start = Date.now();
    const desiredDelay = 3000; // fixed 3000ms as requested
    try {
      const t = localStorage.getItem("token");
      if (t) api.defaults.headers.common["Authorization"] = `Bearer ${t}`;
      await api.post("/driver/availability", { available: next });
      // success: ensure pending lasts at least desiredDelay
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, desiredDelay - elapsed);
      if (remaining > 0) await new Promise((r) => window.setTimeout(r, remaining));
  // success: already applied optimistically
      setStatus('success');
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => {
        setStatus('idle');
        timeoutRef.current = null;
      }, 10000);
      // show a short toast for success
      try {
        window.dispatchEvent(new CustomEvent('nols:toast', { detail: { type: 'success', title: next ? 'You are live' : 'You are offline', message: next ? 'You\'re available to accept rides.' : 'You won\'t receive new assignments.', duration: 5000 } }));
      } catch (e) {}
        // notify other in-page components about the availability change
        try { window.dispatchEvent(new CustomEvent('nols:availability:changed', { detail: { available: next }, bubbles: true, composed: true } as any)); } catch (e) {}
    } catch (err) {
      // error: ensure pending lasts at least desiredDelay
      try { window.clearTimeout(timeoutRef.current as any); } catch (e) {}
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, desiredDelay - elapsed);
      if (remaining > 0) await new Promise((r) => window.setTimeout(r, remaining));

      // Keep the optimistic state in both directions (pinned by user). Notify components and persist.
      try {
        try { localStorage.setItem("driver_available", next ? "1" : "0"); } catch (e) {}
        try { window.dispatchEvent(new CustomEvent('nols:availability:changed', { detail: { available: next } })); } catch (e) {}
      } catch (e) {}
      // eslint-disable-next-line no-console
      console.warn("Failed to update availability (server) — kept local state", err);
      // show success state briefly to indicate the UI change stuck
      setStatus('success');
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => {
        setStatus('idle');
        timeoutRef.current = null;
      }, 10000);
    }
  };

  return (
    <div className={className}>
      <div className="flex flex-col items-center gap-3">
        <button
          onClick={toggle}
          disabled={status === 'pending'}
          aria-label={available ? "Go offline" : "Go online"}
          title={available ? "Go offline" : "Go online"}
          className={`inline-flex items-center justify-center h-10 w-10 rounded-full shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${status === 'pending' ? 'transform scale-95 opacity-80' : ''} ${available ? 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-300' : 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-300'}`}
        >
          <Power className={`h-5 w-5 transition-colors duration-200 ${available ? 'text-green-200' : 'text-red-200'}`} aria-hidden="true" />
        </button>

        <div aria-live="polite" role="status">
          {status === 'pending' ? (
            <div className="flex items-center gap-2 px-3 py-1 rounded-md text-sm font-medium bg-white">
              <span aria-hidden className="dot-spinner dot-sm" aria-live="polite">
                <span className="dot dot-blue" />
                <span className="dot dot-black" />
                <span className="dot dot-yellow" />
                <span className="dot dot-green" />
              </span>
              <span className={available ? 'text-green-600' : 'text-red-600'}>{available ? 'Going live...' : 'Going offline...'}</span>
            </div>
          ) : status === 'success' ? (
            available ? <DriverSwitchOnline /> : <DriverSwitchOffline />
          ) : (
            null
          )}
        </div>
      </div>
    </div>
  );
}
