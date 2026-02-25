"use client";
import React, { useEffect, useState } from "react";
import { Bell, CheckCheck, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

type Note = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
};

export default function ReadNotificationsPage() {
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
        const url = base ? `${base.replace(/\/$/, '')}/api/owner/notifications?tab=viewed&page=1&pageSize=50` : '/api/owner/notifications?tab=viewed&page=1&pageSize=50';
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

  const formatDate = (v: string) => {
    try {
      return new Date(v).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch { return v; }
  };

  return (
    <div className="space-y-5 pb-6">

      {/* ── Hero card ── */}
      <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-xl shadow-slate-100/70">
        <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-teal-600 via-teal-300 to-transparent rounded-l-2xl" />
        <div className="pointer-events-none select-none absolute right-0 bottom-0 text-[64px] font-black text-slate-100/70 leading-none tracking-tighter pr-5 pb-2" aria-hidden>READ</div>
        <div className="pointer-events-none absolute right-0 top-0 h-full w-1/2 opacity-[0.035]" style={{ backgroundImage: "radial-gradient(circle, #334155 1px, transparent 1px)", backgroundSize: "18px 18px" }} />

        <div className="relative px-6 pt-8 pb-9 sm:px-10 sm:pt-10 sm:pb-11 flex flex-col items-center text-center">
          <div className="flex items-center gap-3 mb-5">
            <div className="flex items-center justify-center h-11 w-11 rounded-xl bg-teal-50 border border-teal-100">
              <CheckCheck className="h-5 w-5 text-teal-600" aria-hidden />
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight leading-none">Read</h1>
          <p className="mt-2.5 text-sm text-slate-500 max-w-sm">Notifications you have already seen.</p>
          <div className="mt-5">
            <Link href="/owner/notifications" className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-200 bg-white text-slate-500 text-xs font-bold shadow-sm hover:border-slate-300 transition no-underline">
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </Link>
          </div>
        </div>
      </div>

      {/* ── List card ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-teal-400" />
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
            <p className="text-sm font-semibold text-slate-700">Nothing here yet</p>
            <p className="text-xs text-slate-400 max-w-xs">Read notifications will appear here after you open them.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((n) => (
              <li key={n.id} className="flex items-start gap-4 px-5 sm:px-6 py-4 hover:bg-slate-50/50 transition-colors">
                <div className="flex-shrink-0 mt-0.5 flex items-center justify-center h-9 w-9 rounded-xl bg-slate-50 border border-slate-100">
                  <CheckCheck className="h-4 w-4 text-slate-400" aria-hidden />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-600 leading-snug">{n.title}</p>
                    <span className="flex-shrink-0 text-[10px] text-slate-400 font-medium whitespace-nowrap mt-0.5">{formatDate(n.createdAt)}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500 leading-relaxed">{n.body}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

    </div>
  );
}
