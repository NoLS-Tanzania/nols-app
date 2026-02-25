"use client";
import React, { useEffect, useState } from "react";
import { Bell, CheckCheck, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

function relativeTime(v: string): string {
  try {
    const diff = Date.now() - new Date(v).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch { return v; }
}

function fullDate(v: string): string {
  try {
    return new Date(v).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch { return v; }
}

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
        const url = base
          ? `${base.replace(/\/$/, '')}/api/owner/notifications?tab=viewed&page=1&pageSize=50`
          : '/api/owner/notifications?tab=viewed&page=1&pageSize=50';
        const r = await fetch(url, { credentials: 'include', signal: controller.signal });
        if (!mounted) return;
        if (!r.ok) throw new Error(`Fetch failed (${r.status})`);
        const j = await r.json();
        setItems((j?.items ?? []).map((it: any) => ({
          id: String(it.id),
          title: it.title ?? '',
          body: it.body ?? '',
          createdAt: it.createdAt ?? new Date().toISOString(),
        })));
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
        setError(String(err?.message ?? err));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; controller.abort(); };
  }, []);

  return (
    <div className="space-y-4 pb-8">

      {/* ── Hero ── */}
      <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-xl shadow-slate-100/60">
        <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-teal-600 via-teal-300 to-transparent rounded-l-2xl" />
        {!loading && items.length > 0 && (
          <div
            className="pointer-events-none select-none absolute right-[8%] top-1/2 -translate-y-1/2 font-black text-teal-50 leading-none"
            style={{ fontSize: "clamp(72px,14vw,120px)" }}
            aria-hidden
          >
            {items.length}
          </div>
        )}
        <div
          className="pointer-events-none absolute right-0 top-0 h-full w-1/2 opacity-[0.03]"
          style={{ backgroundImage: "radial-gradient(circle, #334155 1px, transparent 1px)", backgroundSize: "18px 18px" }}
        />
        <div className="relative px-6 pt-8 pb-9 sm:px-10 sm:pt-10 sm:pb-11 flex flex-col items-center text-center">
          <div className="flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-br from-teal-50 to-teal-100 border border-teal-200 shadow-sm mb-4">
            <CheckCheck className="h-6 w-6 text-teal-600" />
          </div>
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-teal-500 mb-2">Archive</p>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight leading-none">Read</h1>
          <p className="mt-2.5 text-sm text-slate-400 max-w-xs">
            {loading
              ? "Fetching your history…"
              : items.length > 0
                ? `${items.length} notification${items.length === 1 ? "" : "s"} already seen`
                : "Your read history is empty."}
          </p>
          <div className="mt-5">
            <Link
              href="/owner/notifications"
              className="inline-flex items-center gap-1.5 h-8 px-4 rounded-xl border border-slate-200 bg-white text-slate-500 text-xs font-bold shadow-sm hover:border-slate-300 hover:text-slate-700 transition-all no-underline"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </Link>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="flex items-center justify-center h-12 w-12 rounded-2xl bg-teal-50 border border-teal-100">
            <Loader2 className="h-5 w-5 animate-spin text-teal-400" />
          </div>
          <p className="text-sm text-slate-400 font-medium">Loading history…</p>
        </div>
      ) : error ? (
        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm py-14 flex flex-col items-center gap-2 px-6 text-center">
          <div className="flex items-center justify-center h-12 w-12 rounded-2xl bg-rose-50 border border-rose-100 mb-1">
            <Bell className="h-5 w-5 text-rose-400" />
          </div>
          <p className="text-sm font-bold text-rose-600">Could not load notifications</p>
          <p className="text-xs text-slate-400">{error}</p>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm py-16 flex flex-col items-center gap-3 px-6 text-center">
          <div className="flex items-center justify-center h-14 w-14 rounded-2xl bg-slate-50 border border-slate-100">
            <Bell className="h-6 w-6 text-slate-300" />
          </div>
          <p className="text-sm font-black text-slate-600">Nothing here yet</p>
          <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
            Read notifications will appear here after you mark them as read.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((n) => (
            <div
              key={n.id}
              className="relative rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden"
            >
              {/* left accent — muted for read state */}
              <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-teal-400 via-teal-200 to-transparent" />

              <div className="pl-5 pr-6 pt-4 pb-0 sm:pl-6 sm:pr-7">
                <div className="flex items-start gap-3.5">
                  {/* icon tile — desaturated to signal "already read" */}
                  <div className="flex-shrink-0 mt-0.5 flex items-center justify-center h-10 w-10 rounded-xl bg-slate-50 border border-slate-200">
                    <CheckCheck className="h-4 w-4 text-slate-400" aria-hidden />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="text-[13px] font-bold text-slate-600 leading-snug">{n.title}</p>
                      <span
                        className="flex-shrink-0 text-[10px] text-slate-400 font-semibold whitespace-nowrap"
                        title={fullDate(n.createdAt)}
                      >
                        {relativeTime(n.createdAt)}
                      </span>
                    </div>
                    <p className="mt-1 text-[13px] text-slate-400 leading-relaxed line-clamp-3">{n.body}</p>
                  </div>
                </div>
              </div>

              {/* footer bar */}
              <div className="mt-3 px-5 sm:px-6 py-2.5 border-t border-slate-100 flex items-center">
                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.12em]">Read</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
