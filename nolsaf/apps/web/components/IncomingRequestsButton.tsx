"use client";
import React, { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';

type Req = { id: string; pickup?: string; dropoff?: string; fare?: string };

const INCOMING_KEY = 'driver_incoming_queue';
const RECENT_KEY = 'driver_recent_requests';

function readJson<T>(key: string, fallback: T) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch (e) { return fallback; }
}

function writeJson(key: string, v: any) {
  try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) {}
}

export default function IncomingRequestsButton({ className = '' }: { className?: string }) {
  const [count, setCount] = useState<number>(() => readJson<Array<any>>(INCOMING_KEY, []).length);
  const [pulse, setPulse] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [recent, setRecent] = useState<Array<any>>(() => readJson<Array<any>>(RECENT_KEY, []));

  // Ensure zoom keyframes present
  useEffect(() => {
    if ((window as any).__NOLS_INCOMING_ANIM) return;
    const style = document.createElement('style');
    style.textContent = `@keyframes nols-zoom { 0% { transform: scale(1); } 50% { transform: scale(1.12); } 100% { transform: scale(1); } } .nols-zoom { animation: nols-zoom 900ms ease-in-out infinite; }`;
    document.head.appendChild(style);
    (window as any).__NOLS_INCOMING_ANIM = true;
  }, []);

  useEffect(() => {
    // sync initial
    setCount(readJson<Array<any>>(INCOMING_KEY, []).length);
    setRecent(readJson<Array<any>>(RECENT_KEY, []));

    const onIncoming = (ev: Event) => {
      try {
        const detail = (ev as CustomEvent).detail || {};
        const rq: Req = { id: detail.id || `req-${Date.now()}`, pickup: detail.pickup, dropoff: detail.dropoff, fare: detail.fare };
        const q = readJson<Array<any>>(INCOMING_KEY, []);
        q.push(rq);
        writeJson(INCOMING_KEY, q);
        setCount(q.length);
        // briefly pulse/zoom
        setPulse(true);
        window.setTimeout(() => setPulse(false), 1600);
      } catch (e) {}
    };

    const onAccept = (ev: Event) => {
      try {
        const detail = (ev as CustomEvent).detail || {};
        const id = detail.id;
        const q = readJson<Array<any>>(INCOMING_KEY, []).filter((r: any) => r.id !== id);
        writeJson(INCOMING_KEY, q);
        setCount(q.length);
        const rec = readJson<Array<any>>(RECENT_KEY, []);
        rec.unshift({ ...(detail || {}), action: 'accepted', at: Date.now() });
        writeJson(RECENT_KEY, rec.slice(0, 50));
        setRecent(rec.slice(0,50));
      } catch (e) {}
    };

    const onDecline = (ev: Event) => {
      try {
        const detail = (ev as CustomEvent).detail || {};
        const id = detail.id;
        const q = readJson<Array<any>>(INCOMING_KEY, []).filter((r: any) => r.id !== id);
        writeJson(INCOMING_KEY, q);
        setCount(q.length);
        const rec = readJson<Array<any>>(RECENT_KEY, []);
        rec.unshift({ ...(detail || {}), action: 'declined', at: Date.now() });
        writeJson(RECENT_KEY, rec.slice(0,50));
        setRecent(rec.slice(0,50));
      } catch (e) {}
    };

    window.addEventListener('nols:driver:incoming', onIncoming as EventListener);
    window.addEventListener('nols:driver:accept', onAccept as EventListener);
    window.addEventListener('nols:driver:decline', onDecline as EventListener);

    return () => {
      window.removeEventListener('nols:driver:incoming', onIncoming as EventListener);
      window.removeEventListener('nols:driver:accept', onAccept as EventListener);
      window.removeEventListener('nols:driver:decline', onDecline as EventListener);
    };
  }, []);

  const onClick = () => {
    if (count > 0) {
      // center/zoom action for live incoming: dispatch event for map or page to handle
      try { window.dispatchEvent(new CustomEvent('nols:driver:open-incoming', { detail: {} })); } catch (e) {}
      // also briefly pulse
      setPulse(true);
      window.setTimeout(() => setPulse(false), 1200);
    } else {
      // show recent history modal/list
      setShowHistory(true);
    }
  };

  return (
    <div className={className}>
      <button
        onClick={onClick}
        title={count > 0 ? `${count} incoming` : 'No incoming requests — view recent'}
        className={`inline-flex items-center gap-2 px-3 py-2 rounded-full border shadow-sm bg-white text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 ${pulse && count > 0 ? 'nols-zoom' : ''}`}
      >
        <Bell className="h-5 w-5 text-gray-700" />
        <span className="font-medium text-gray-800">Incoming</span>
        <span className={`ml-1 inline-flex items-center justify-center h-6 w-6 rounded-full text-xs font-semibold ${count > 0 ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-800'}`}>{count}</span>
      </button>

      {showHistory ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-2xl bg-white rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Recent incoming requests</h3>
              <button onClick={() => setShowHistory(false)} className="text-sm text-gray-600">Close</button>
            </div>
            {recent.length === 0 ? (
              <div className="text-sm text-gray-600">No recent requests.</div>
            ) : (
              <ul className="space-y-2">
                {recent.map((r, idx) => (
                  <li key={idx} className="p-2 border rounded-md">
                    <div className="text-sm font-medium">{r.pickup ?? 'Unknown'} → {r.dropoff ?? 'Unknown'}</div>
                    <div className="text-xs text-gray-600">{r.action ?? 'unknown'} • {new Date(r.at).toLocaleString()}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
