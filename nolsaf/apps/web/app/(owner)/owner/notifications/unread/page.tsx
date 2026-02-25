"use client";
import React, { useEffect, useState } from "react";
import { Bell, BellDot, CheckCheck, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

type Note = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
};

export default function UnreadNotificationsPage() {
  const [items, setItems] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const base = process.env.NEXT_PUBLIC_API_URL || '';
        const url = base ? `${base.replace(/\/$/, '')}/api/owner/notifications?tab=unread&page=1&pageSize=50` : '/api/owner/notifications?tab=unread&page=1&pageSize=50';
        const r = await fetch(url, { credentials: 'include', signal: controller.signal });
        if (!mounted) return;
        if (!r.ok) throw new Error(`Fetch failed (${r.status})`);
        const j = await r.json();
        setItems((j?.items ?? []).map((it: any) => ({ id: String(it.id), title: it.title ?? '', body: it.body ?? '', createdAt: it.createdAt ?? new Date().toISOString() })));
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
        setError(String(err?.message ?? err));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; controller.abort(); };
  }, []);

  async function markRead(id: string) {
    const before = items;
    setItems((prev) => prev.filter((n) => n.id !== id));
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || '';
      const endpoint = base ? `${base.replace(/\/$/, '')}/api/owner/notifications/${encodeURIComponent(id)}/mark-read` : `/api/owner/notifications/${encodeURIComponent(id)}/mark-read`;
      const r = await fetch(endpoint, { method: 'POST', credentials: 'include' });
      if (!r.ok) throw new Error(`Server returned ${r.status}`);
    } catch (err) {
      console.error('markRead failed', err);
      setItems(before);
    }
  }

  async function markAllRead() {
    const ids = items.map((n) => n.id);
    setItems([]);
    for (const id of ids) {
      try {
        const base = process.env.NEXT_PUBLIC_API_URL || '';
        const endpoint = base ? `${base.replace(/\/$/, '')}/api/owner/notifications/${encodeURIComponent(id)}/mark-read` : `/api/owner/notifications/${encodeURIComponent(id)}/mark-read`;
        await fetch(endpoint, { method: 'POST', credentials: 'include' });
      } catch { /* ignore */ }
    }
  }

  const formatDate = (v: string) => {
    try {
      return new Date(v).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch { return v; }
  };

  return (
    <div className="space-y-5 pb-6">

      {/* ── Hero card ── */}
      <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-xl shadow-slate-100/70">
        <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-rose-500 via-rose-300 to-transparent rounded-l-2xl" />
        <div className="pointer-events-none select-none absolute right-0 bottom-0 text-[64px] font-black text-slate-100/70 leading-none tracking-tighter pr-5 pb-2" aria-hidden>UNREAD</div>
        <div className="pointer-events-none absolute right-0 top-0 h-full w-1/2 opacity-[0.035]" style={{ backgroundImage: "radial-gradient(circle, #334155 1px, transparent 1px)", backgroundSize: "18px 18px" }} />

        <div className="relative px-6 pt-8 pb-9 sm:px-10 sm:pt-10 sm:pb-11 flex flex-col items-center text-center">
          <div className="flex items-center gap-3 mb-5">
            <div className="flex items-center justify-center h-11 w-11 rounded-xl bg-rose-50 border border-rose-100">
              <BellDot className="h-5 w-5 text-rose-600" aria-hidden />
            </div>
            {!loading && items.length > 0 && (
              <div className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500 flex-shrink-0 animate-pulse" />
                {items.length} pending
              </div>
            )}
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight leading-none">Unread</h1>
          <p className="mt-2.5 text-sm text-slate-500 max-w-sm">Notifications you haven't opened yet.</p>
          <div className="mt-5 flex items-center gap-3">
            <Link href="/owner/notifications" className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-200 bg-white text-slate-500 text-xs font-bold shadow-sm hover:border-slate-300 transition no-underline">
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </Link>
            {!loading && items.length > 0 && (
              <button onClick={markAllRead} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-teal-200 bg-teal-50 text-teal-700 text-xs font-bold shadow-sm hover:bg-teal-100 transition">
                <CheckCheck className="h-3.5 w-3.5" /> Mark all read
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── List card ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-rose-400" />
            <p className="text-sm text-slate-500">Loading notifications…</p>
          </div>
        ) : error ? (
          <div className="py-12 text-center px-6">
            <Bell className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-rose-600 font-medium">Could not load notifications</p>
            <p className="text-xs text-slate-400 mt-1">{error}</p>
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3 px-6 text-center">
            <div className="flex items-center justify-center h-12 w-12 rounded-2xl bg-slate-50 border border-slate-100">
              <Bell className="h-5 w-5 text-slate-400" />
            </div>
            <p className="text-sm font-semibold text-slate-700">All caught up!</p>
            <p className="text-xs text-slate-400 max-w-xs">No unread notifications right now. Check back later or view your read notifications.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((n) => (
              <li key={n.id} className="group flex items-start gap-4 px-5 sm:px-6 py-4 hover:bg-slate-50/70 transition-colors">
                <div className="flex-shrink-0 mt-0.5 flex items-center justify-center h-9 w-9 rounded-xl bg-rose-50 border border-rose-100">
                  <BellDot className="h-4 w-4 text-rose-500" aria-hidden />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-bold text-slate-900 leading-snug">{n.title}</p>
                    <span className="flex-shrink-0 text-[10px] text-slate-400 font-medium whitespace-nowrap mt-0.5">{formatDate(n.createdAt)}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600 leading-relaxed">{n.body}</p>
                </div>
                <button
                  onClick={() => markRead(n.id)}
                  className="flex-shrink-0 self-start mt-0.5 inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg border border-teal-200 bg-teal-50 text-teal-700 text-[11px] font-bold hover:bg-teal-100 transition opacity-0 group-hover:opacity-100"
                  aria-label="Mark as read"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Done
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

    </div>
  );
}
