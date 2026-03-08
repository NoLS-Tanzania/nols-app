"use client";
import React, { useEffect, useState } from "react";
import axios from "axios";
import { LoaderCircle, Power } from "lucide-react";
import { useSocket } from "@/hooks/useSocket";
import useDriverAvailability from "@/hooks/useDriverAvailability";

// Use same-origin calls + secure httpOnly cookie session.
const api = axios.create({ baseURL: "", withCredentials: true });

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
      // show a short toast for success
      try {
        window.dispatchEvent(new CustomEvent('nols:toast', { detail: { type: 'success', title: next ? 'You are live' : 'You are offline', message: next ? 'You\'re available to accept rides.' : 'You won\'t receive new assignments.', duration: 5000 } }));
      } catch (e) {}
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

  return (
    <div className={className}>
      <div className={isCompact ? "flex items-center" : "flex flex-col items-center gap-3"}>
        <button
          onClick={toggle}
          disabled={status === 'pending'}
          aria-label={available ? "Go offline" : "Go online"}
          title={available ? "Go offline" : "Go online"}
          className={[
            "relative inline-flex items-center justify-center rounded-full shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2",
            isCompact ? "h-11 w-11" : "h-10 w-10",
            status === 'pending' ? 'scale-[0.97]' : '',
            isClient && available ? 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-300' : 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-300',
          ].join(" ")}
        >
          <Power 
            className={[
              isCompact ? "h-5 w-5" : "h-5 w-5",
              "transition-colors duration-200",
              !isClient ? 'text-red-200' : available ? 'text-green-200' : 'text-red-200',
              status === 'pending' ? 'opacity-0' : '',
            ].join(" ")}
            aria-hidden="true"
            suppressHydrationWarning
          />
          {status === 'pending' ? (
            <LoaderCircle className="absolute h-5 w-5 animate-spin text-white" aria-hidden="true" />
          ) : null}
        </button>

        {!isCompact && (
          <div aria-live="polite" role="status">
          {status === 'pending' ? (
            <div className="flex items-center gap-2 px-3 py-1 rounded-md text-sm font-medium bg-white">
              <span aria-hidden className="dot-spinner dot-sm" aria-live="polite">
                <span className="dot dot-blue" />
                <span className="dot dot-black" />
                <span className="dot dot-yellow" />
                <span className="dot dot-green" />
              </span>
              <span className={pendingTarget ? 'text-green-600' : 'text-red-600'}>{pendingTarget ? 'Going live...' : 'Going offline...'}</span>
            </div>
          ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
