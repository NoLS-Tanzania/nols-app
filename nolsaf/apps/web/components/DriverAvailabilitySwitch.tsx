"use client";
import React, { useEffect, useState } from "react";
import apiClient from "@/lib/apiClient";
import { LoaderCircle, Power } from "lucide-react";
import { useSocket } from "@/hooks/useSocket";
import useDriverAvailability from "@/hooks/useDriverAvailability";

// Use same-origin calls + secure httpOnly cookie session.
const api = apiClient;

export default function DriverAvailabilitySwitch({
  className = "",
  variant = "default",
}: {
  className?: string;
  variant?: "default" | "compact";
}) {
  const [isClient, setIsClient] = useState(false);
  const { available, meId, refreshAvailability, setConfirmedAvailability } = useDriverAvailability();

  const { socket } = useSocket(meId);

  // Mark as client-side after mount to prevent hydration mismatch
  useEffect(() => {
    setIsClient(true);
  }, []);

  // transient status control: idle | pending | success | error
  const [status, setStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [pendingTarget, setPendingTarget] = useState<boolean | null>(null);
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

    // show pending/process message and ensure it lasts between 3s and 5s
    setPendingTarget(next);
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
      setConfirmedAvailability(next);
      setStatus('success');
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => {
        setStatus('idle');
        setPendingTarget(null);
        timeoutRef.current = null;
      }, 10000);
    } catch (err) {
      // error: ensure pending lasts at least desiredDelay
      try { window.clearTimeout(timeoutRef.current as any); } catch (e) {}
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, desiredDelay - elapsed);
      if (remaining > 0) await new Promise((r) => window.setTimeout(r, remaining));
      // eslint-disable-next-line no-console
      console.warn("Failed to update availability (server)", err);
      await refreshAvailability(true);
      setStatus('error');
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => {
        setStatus('idle');
        setPendingTarget(null);
        timeoutRef.current = null;
      }, 10000);
    }
  };

  const isCompact = variant === "compact";

  // Resolved visual state (what we're moving TO during pending, settled when idle/success)
  const visuallyActive = isClient && (status === 'pending' ? (pendingTarget ?? available) : available);

  return (
    <div className={className}>
      <button
        onClick={toggle}
        disabled={status === 'pending'}
        aria-label={available ? "Go offline" : "Go online"}
        title={available ? "Go offline" : "Go online"}
        className={[
          "relative inline-flex items-center justify-center rounded-full transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 select-none",
          isCompact ? "h-11 w-11" : "h-[3.1rem] w-[3.1rem]",
          status === 'pending' ? "scale-95" : "hover:scale-105 active:scale-95",
          visuallyActive
            ? "focus-visible:ring-emerald-400"
            : "focus-visible:ring-slate-400",
        ].join(" ")}
        style={{
          background: visuallyActive
            ? "linear-gradient(135deg, #02665e 0%, #0b7a71 55%, #35a79c 100%)"
            : "rgba(255,255,255,0.12)",
          boxShadow: visuallyActive
            ? "0 0 0 4px rgba(52,211,153,0.18), 0 8px 20px rgba(2,102,94,0.35)"
            : "0 0 0 1px rgba(255,255,255,0.15), 0 4px 12px rgba(0,0,0,0.25)",
        }}
      >
        {/* Pulse ring — only when live and idle */}
        {visuallyActive && status === 'idle' && (
          <span
            className="absolute inset-0 rounded-full animate-ping"
            style={{ background: "rgba(52,211,153,0.22)", animationDuration: "2.2s" }}
            aria-hidden
          />
        )}

        {/* Icon or spinner */}
        {status === 'pending' ? (
          <LoaderCircle
            className="h-5 w-5 animate-spin"
            style={{ color: visuallyActive ? "#ffffff" : "rgba(255,255,255,0.7)" }}
            aria-hidden
          />
        ) : (
          <Power
            className="h-5 w-5 transition-colors duration-300"
            style={{ color: visuallyActive ? "#ffffff" : "rgba(255,255,255,0.55)" }}
            aria-hidden
            suppressHydrationWarning
          />
        )}

        {/* Screen-reader live region — no visible text */}
        <span className="sr-only" aria-live="polite">
          {status === 'pending'
            ? (pendingTarget ? "Going online" : "Going offline")
            : available
            ? "You are online"
            : "You are offline"}
        </span>
      </button>
    </div>
  );
}
