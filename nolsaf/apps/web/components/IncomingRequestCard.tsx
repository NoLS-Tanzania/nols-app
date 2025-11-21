"use client";
import React, { useState, useEffect, useRef } from "react";
import { ArrowLeft, ArrowRight } from 'lucide-react';
import IncomingRequestsButton from "./IncomingRequestsButton";

export default function IncomingRequestCard({ request }: { request?: any }) {
  const [actioning, setActioning] = useState<string | null>(null);
  const [localRequest, setLocalRequest] = useState<any | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number>(() => typeof request?.ttl === 'number' ? request.ttl : 20);
  const timerRef = useRef<number | null>(null);
  

  const readQueue = () => {
    try {
      const raw = localStorage.getItem('driver_incoming_queue');
      if (!raw) return [];
      return JSON.parse(raw);
    } catch (e) { return []; }
  };
  // writeQueue not required here; manipulation is done inline where needed

  // If a `request` prop isn't provided, read the first queued incoming request from localStorage
  useEffect(() => {
    if (request) {
      setLocalRequest(request);
      setSecondsLeft(typeof request.ttl === 'number' ? request.ttl : 20);
      return;
    }
    const q = readQueue();
    const first = q && q.length > 0 ? q[0] : null;
    setLocalRequest(first);
    setSecondsLeft(first && typeof first.ttl === 'number' ? first.ttl : 20);

    const storageHandler = (e: StorageEvent) => {
      if (e.key === 'driver_incoming_queue') {
        const q2 = readQueue();
        const f2 = q2 && q2.length > 0 ? q2[0] : null;
        setLocalRequest(f2);
        setSecondsLeft(f2 && typeof f2.ttl === 'number' ? f2.ttl : 20);
      }
    };
    window.addEventListener('storage', storageHandler as any);
    return () => window.removeEventListener('storage', storageHandler as any);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request]);

  const cur = request ?? localRequest;
  const id = cur?.id ?? 'req-1';
  const pickup = cur?.pickup ?? 'Kariakoo';
  const dropoff = cur?.dropoff ?? 'Mbezi';
  const fare = cur?.fare ?? '3,500 TZS';

  useEffect(() => {
    // start countdown
    if (timerRef.current) {
      window.clearInterval(timerRef.current as any);
      timerRef.current = null;
    }
    setSecondsLeft(typeof request?.ttl === 'number' ? request.ttl : 20);
    timerRef.current = window.setInterval(() => {
      setSecondsLeft((s) => s - 1);
    }, 1000);
    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current as any);
        timerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (secondsLeft <= 0) {
      // auto-decline
      try {
        window.dispatchEvent(new CustomEvent('nols:driver:decline', { detail: { id, pickup, dropoff, fare } }));
        window.dispatchEvent(new CustomEvent('nols:toast', { detail: { type: 'info', title: 'Auto-declined', message: 'The request expired and was declined automatically.', duration: 4000 } }));
      } catch (e) {}
      if (timerRef.current) {
        window.clearInterval(timerRef.current as any);
        timerRef.current = null;
      }
      setActioning(null);
      // remove from local queue and add to recent
      try {
        const raw = localStorage.getItem('driver_incoming_queue');
        if (raw) {
          const q = JSON.parse(raw).filter((r: any) => r.id !== id);
          localStorage.setItem('driver_incoming_queue', JSON.stringify(q));
        }
        const recRaw = localStorage.getItem('driver_recent_requests');
        const rec = recRaw ? JSON.parse(recRaw) : [];
        rec.unshift({ id, pickup, dropoff, fare, action: 'auto-declined', at: Date.now() });
        localStorage.setItem('driver_recent_requests', JSON.stringify(rec.slice(0,50)));
      } catch (e) {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft]);

  const accept = async () => {
    if (actioning) return;
    setActioning('accept');
    try {
      // notify other parts of the app (server integration can listen for this)
      window.dispatchEvent(new CustomEvent('nols:driver:accept', { detail: { id, pickup, dropoff, fare } }));
      window.dispatchEvent(new CustomEvent('nols:toast', { detail: { type: 'success', title: 'Accepted', message: 'You accepted the incoming request.', duration: 4000 } }));
      // brief delay to simulate network
      await new Promise((r) => setTimeout(r, 800));
    } catch (e) {
      window.dispatchEvent(new CustomEvent('nols:toast', { detail: { type: 'error', title: 'Error', message: 'Failed to accept. Try again.', duration: 5000 } }));
    } finally {
      setActioning(null);
      if (timerRef.current) {
        window.clearInterval(timerRef.current as any);
        timerRef.current = null;
      }
      // remove from local queue if present
      try {
        const raw = localStorage.getItem('driver_incoming_queue');
        if (raw) {
          const q = JSON.parse(raw).filter((r: any) => r.id !== id);
          localStorage.setItem('driver_incoming_queue', JSON.stringify(q));
        }
      } catch (e) {}
    }
  };

  const decline = async () => {
    if (actioning) return;
    setActioning('decline');
    try {
      window.dispatchEvent(new CustomEvent('nols:driver:decline', { detail: { id, pickup, dropoff, fare } }));
      window.dispatchEvent(new CustomEvent('nols:toast', { detail: { type: 'info', title: 'Declined', message: 'You declined the incoming request.', duration: 4000 } }));
      await new Promise((r) => setTimeout(r, 600));
    } catch (e) {
      window.dispatchEvent(new CustomEvent('nols:toast', { detail: { type: 'error', title: 'Error', message: 'Failed to decline. Try again.', duration: 5000 } }));
    } finally {
      setActioning(null);
      if (timerRef.current) {
        window.clearInterval(timerRef.current as any);
        timerRef.current = null;
      }
      // remove from local queue if present and add to recent
      try {
        const raw = localStorage.getItem('driver_incoming_queue');
        if (raw) {
          const q = JSON.parse(raw).filter((r: any) => r.id !== id);
          localStorage.setItem('driver_incoming_queue', JSON.stringify(q));
          // add to recent
          const recRaw = localStorage.getItem('driver_recent_requests');
          const rec = recRaw ? JSON.parse(recRaw) : [];
          rec.unshift({ id, pickup, dropoff, fare, action: 'declined', at: Date.now() });
          localStorage.setItem('driver_recent_requests', JSON.stringify(rec.slice(0,50)));
        }
      } catch (e) {}
    }
  };

  return (
    <div className="mx-auto max-w-3xl bg-white rounded-lg p-4 border shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* Left: incoming button (moved from details area) */}
        <div className="flex-shrink-0 md:w-28 flex items-center justify-center">
          <IncomingRequestsButton />
        </div>

        {/* Right: controls and countdown */}
        <div className="flex-1 flex items-center justify-end gap-3">
          {secondsLeft > 0 && (
            <div className="text-xs text-gray-600 mr-2">{`${secondsLeft}s to accept`}</div>
          )}

          {/* Slide-to-act control: drag knob right to accept (green), left to decline (red) */}
          <div className="relative w-72 h-12">
            {/* Left decline area */}
            <div className="absolute left-0 top-0 bottom-0 w-1/4 flex items-center justify-start pl-3">
              <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                  <ArrowLeft className="w-4 h-4 text-red-600 animate-pulse" />
                </div>
              </div>
            </div>

            {/* Right accept area */}
            <div className="absolute right-0 top-0 bottom-0 w-1/4 flex items-center justify-end pr-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                  <ArrowRight className="w-4 h-4 text-green-600 animate-pulse" />
                </div>
              </div>
            </div>

            {/* Track with three visual zones: decline (left/red), neutral (center/blue), accept (right/green) */}
            <div className="absolute left-0 right-0 top-0 bottom-0 rounded-full border overflow-hidden">
              {/* Left (decline) */}
              <div className="absolute left-0 top-0 bottom-0 w-1/4 bg-red-100 pointer-events-none" />
              {/* Center (neutral) */}
              <div className="absolute left-1/4 top-0 bottom-0 right-1/4 bg-blue-100 pointer-events-none" />
              {/* Right (accept) */}
              <div className="absolute right-0 top-0 bottom-0 w-1/4 bg-green-100 pointer-events-none" />

              {/* Draggable knob (arrow inside). Knob color changes based on drag direction: center=blue, right=green, left=red */}
              <div
                aria-label="Slide to accept or decline"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowRight') accept();
                  if (e.key === 'ArrowLeft') decline();
                }}
                onPointerDown={(e) => {
                  const knob = e.currentTarget as HTMLElement;
                  try { (knob as Element).setPointerCapture(e.pointerId); } catch (err) {}
                  (knob as any)._dragStartX = e.clientX;
                  (knob as any)._dragging = true;
                  // reset vibrate flag: 0 = none, 1 = accept vibrated, -1 = decline vibrated
                  (knob as any)._vibrated = 0;
                  // ensure center color when starting
                  knob.classList.remove('bg-white','bg-red-500','bg-green-500');
                  knob.classList.add('bg-sky-600','text-white');
                }}
                onPointerMove={(e) => {
                  const knob = e.currentTarget as HTMLElement;
                  if (!(knob as any)._dragging) return;
                  const startX = (knob as any)._dragStartX as number;
                  const dx = e.clientX - startX;
                  const max = 96; // px threshold cap for movement
                  const limited = Math.max(Math.min(dx, max), -max);
                  // move knob by manipulating style.transform directly
                  knob.style.transform = `translateX(${limited}px)`;
                  // update knob color depending on distance
                  if (limited >= 30) {
                    knob.classList.remove('bg-sky-600','bg-red-500');
                    knob.classList.add('bg-green-500','text-white');
                  } else if (limited <= -30) {
                    knob.classList.remove('bg-sky-600','bg-green-500');
                    knob.classList.add('bg-red-500','text-white');
                  } else {
                    knob.classList.remove('bg-red-500','bg-green-500');
                    knob.classList.add('bg-sky-600','text-white');
                  }
                  // haptic: vibrate once when crossing trigger threshold (72px)
                  const vibThreshold = 72;
                  try {
                    if (limited >= vibThreshold && (knob as any)._vibrated !== 1) {
                      (navigator as any).vibrate && (navigator as any).vibrate(40);
                      (knob as any)._vibrated = 1;
                    } else if (limited <= -vibThreshold && (knob as any)._vibrated !== -1) {
                      (navigator as any).vibrate && (navigator as any).vibrate(40);
                      (knob as any)._vibrated = -1;
                    } else if (limited > -vibThreshold && limited < vibThreshold) {
                      // reset vibrate flag when back to center
                      (knob as any)._vibrated = 0;
                    }
                  } catch (err) {}
                }}
                onPointerUp={(e) => {
                  const knob = e.currentTarget as HTMLElement;
                  try { (knob as Element).releasePointerCapture(e.pointerId); } catch (err) {}
                  const startX = (knob as any)._dragStartX as number;
                  const dx = e.clientX - startX;
                  const threshold = 72; // px
                  if (dx >= threshold) {
                    accept();
                  } else if (dx <= -threshold) {
                    decline();
                  }
                  // reset visual position and color to center
                  knob.style.transition = 'transform 180ms ease';
                  knob.style.transform = 'translateX(0px)';
                  knob.classList.remove('bg-red-500','bg-green-500');
                  knob.classList.add('bg-sky-600','text-white');
                  setTimeout(() => { knob.style.transition = ''; }, 200);
                  (knob as any)._dragging = false;
                  (knob as any)._vibrated = 0;
                }}
                className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-10 bg-sky-600 rounded-full shadow flex items-center justify-center cursor-grab select-none touch-action-none`}
              >
                {/* constant arrow icon inside knob */}
                <ArrowRight className="w-4 h-4 text-white" />
              </div>
            </div>
          </div>

          {/* Hidden fallback buttons for accessibility (screen readers/keyboard) */}
          <div className="sr-only">
            <button onClick={accept}>Accept</button>
            <button onClick={decline}>Decline</button>
          </div>
        </div>
      </div>
    </div>
  );
}


