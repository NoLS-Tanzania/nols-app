"use client";
import React, { useEffect, useState } from "react";
import axios from "axios";
import { Power } from "lucide-react";
import { useSocket } from "@/hooks/useSocket";

// Use same-origin calls + secure httpOnly cookie session.
const api = axios.create({ baseURL: "", withCredentials: true });

export default function DriverAvailabilitySwitch({ className = "" }: { className?: string }) {
  // Start with false to match server-side render (prevents hydration mismatch)
  const [available, setAvailable] = useState<boolean>(false);
  const [isClient, setIsClient] = useState(false);
  const [meId, setMeId] = useState<string | number | undefined>(undefined);

  const { socket } = useSocket(meId);

  // Mark as client-side after mount to prevent hydration mismatch
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Resolve current user id for socket room scoping.
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const r = await fetch("/api/account/me", { credentials: "include" });
        if (!r.ok) return;
        const me = await r.json();
        if (!mounted) return;
        if (me?.id) setMeId(me.id);
      } catch {
        // ignore
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Load availability from the server (source of truth) once we know who the driver is.
  // We keep a per-driver localStorage cache only for fast UI, but we do NOT push it to the server on mount.
  useEffect(() => {
    if (!isClient) return;
    if (!meId) return;

    const storageKey = `driver_available:${String(meId)}`;

    // Fast path: hydrate from per-driver cache (or migrate legacy key)
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw === '1' || raw === 'true') setAvailable(true);
      else if (raw === '0' || raw === 'false') setAvailable(false);
      else {
        const legacy = localStorage.getItem('driver_available');
        if (legacy === '1' || legacy === 'true' || legacy === '0' || legacy === 'false') {
          const val = legacy === '1' || legacy === 'true';
          setAvailable(val);
          try { localStorage.setItem(storageKey, val ? '1' : '0'); } catch {}
        }
      }
    } catch {
      // ignore
    }

    // Source of truth: server
    let cancelled = false;
    (async () => {
      try {
        const r = await api.get('/api/driver/availability');
        const serverAvailable = Boolean(r?.data?.available);
        if (cancelled) return;
        setAvailable(serverAvailable);
        try { localStorage.setItem(storageKey, serverAvailable ? '1' : '0'); } catch {}
      } catch {
        // ignore: keep cached UI state
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isClient, meId]);
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
  try {
    if (meId) localStorage.setItem(`driver_available:${String(meId)}`, next ? '1' : '0');
  } catch (e) {}
  // notify other components immediately so they can animate (optimistic)
  try { window.dispatchEvent(new CustomEvent('nols:availability:changed', { detail: { available: next }, bubbles: true, composed: true } as any)); } catch (e) {}

    // show pending/process message and ensure it lasts between 3s and 5s
    setStatus('pending');
    const start = Date.now();
    const desiredDelay = 3000; // fixed 3000ms as requested
    try {
      // Prefer socket path (also manages offer-room membership); fallback to REST.
      let socketOk = false;
      try {
        if (socket && socket.connected) {
          socketOk = await new Promise<boolean>((resolve) => {
            try {
              socket.emit('driver:availability:set', { available: next }, (resp: any) => {
                resolve(Boolean(resp && resp.status === 'ok'));
              });
            } catch {
              resolve(false);
            }
          });
        }
      } catch {
        socketOk = false;
      }
      if (!socketOk) {
        await api.post("/api/driver/availability", { available: next });
      }
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
        try {
          if (meId) localStorage.setItem(`driver_available:${String(meId)}`, next ? '1' : '0');
        } catch (e) {}
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
          className={`inline-flex items-center justify-center h-10 w-10 rounded-full shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${status === 'pending' ? 'transform scale-95 opacity-80' : ''} ${isClient && available ? 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-300' : 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-300'}`}
        >
          <Power 
            className={`h-5 w-5 transition-colors duration-200 ${!isClient ? 'text-red-200' : available ? 'text-green-200' : 'text-red-200'}`} 
            aria-hidden="true"
            suppressHydrationWarning
          />
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
              <span className={isClient && available ? 'text-green-600' : 'text-red-600'}>{isClient && available ? 'Going live...' : 'Going offline...'}</span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
