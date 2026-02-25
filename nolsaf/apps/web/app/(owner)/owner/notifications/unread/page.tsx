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
        const url = base
          ? `${base.replace(/\/$/, '')}/api/owner/notifications?tab=unread&page=1&pageSize=50`
          : '/api/owner/notifications?tab=unread&page=1&pageSize=50';
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

  async function markRead(id: string) {
    const before = items;
    setItems((prev) => prev.filter((n) => n.id !== id));
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || '';
      const ep = base
        ? `${base.replace(/\/$/, '')}/api/owner/notifications/${encodeURIComponent(id)}/mark-read`
        : `/api/owner/notifications/${encodeURIComponent(id)}/mark-read`;
      const r = await fetch(ep, { method: 'POST', credentials: 'include' });
      if (!r.ok) throw new Error(`${r.status}`);
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
        const ep = base
          ? `${base.replace(/\/$/, '')}/api/owner/notifications/${encodeURIComponent(id)}/mark-read`
          : `/api/owner/notifications/${encodeURIComponent(id)}/mark-read`;
        await fetch(ep, { method: 'POST', credentials: 'include' });
      } catch { /* ignore */ }
    }
  }

  return (
    <div className="space-y-4 pb-8">

      {/* ── Hero ── */}
      <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-xl shadow-slate-100/60">
        <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-rose-500 via-rose-300 to-transparent rounded-l-2xl" />
        {/* big count watermark */}
        {!loading && items.length > 0 && (
          <div
            className="pointer-events-none select-none absolute right-[8%] top-1/2 -translate-y-1/2 font-black text-rose-50 leading-none"
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
          {/* icon with live badge */}
          <div className="relative mb-4">
            <div className="flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-br from-rose-50 to-rose-100 border border-rose-200 shadow-sm">
              <BellDot className="h-6 w-6 text-rose-600" />
            </div>
            {!loading && items.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 h-5 min-w-5 px-1.5 rounded-full bg-rose-500 text-[10px] font-black text-white flex items-center justify-center ring-2 ring-white animate-pulse">
                {items.length > 99 ? "99+" : items.length}
              </span>
            )}
          </div>
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-rose-400 mb-2">Inbox</p>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight leading-none">Unread</h1>
          <p className="mt-2.5 text-sm text-slate-400 max-w-xs">
            {loading
              ? "Fetching your notifications…"
              : items.length > 0
                ? `${items.length} notification${items.length === 1 ? "" : "s"} waiting for your attention`
                : "You're all caught up — nothing pending!"}
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
            <Link
              href="/owner/notifications"
              className="inline-flex items-center gap-1.5 h-8 px-4 rounded-xl border border-slate-200 bg-white text-slate-500 text-xs font-bold shadow-sm hover:border-slate-300 hover:text-slate-700 transition-all no-underline"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </Link>
            {!loading && items.length > 0 && (
              <button
                onClick={markAllRead}
                className="inline-flex items-center gap-1.5 h-8 px-4 rounded-xl border border-teal-200 bg-teal-50 text-teal-700 text-xs font-bold shadow-sm hover:bg-teal-100 hover:border-teal-300 transition-all"
              >
                <CheckCheck className="h-3.5 w-3.5" /> Mark all as read
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="flex items-center justify-center h-12 w-12 rounded-2xl bg-rose-50 border border-rose-100">
            <Loader2 className="h-5 w-5 animate-spin text-rose-400" />
          </div>
          <p className="text-sm text-slate-400 font-medium">Loading notifications…</p>
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
          <div className="flex items-center justify-center h-14 w-14 rounded-2xl bg-emerald-50 border border-emerald-100">
            <CheckCheck className="h-6 w-6 text-emerald-500" />
          </div>
          <p className="text-sm font-black text-slate-800">All caught up!</p>
          <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
            No unread notifications right now. Check back later or browse your read history.
          </p>
          <Link
            href="/owner/notifications/read"
            className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-teal-600 hover:text-teal-700 no-underline"
          >
            View read history →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((n) => (
            <div
              key={n.id}
              className="group relative rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 overflow-hidden"
            >
              {/* left accent */}
              <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-rose-500 via-rose-300 to-transparent" />
              {/* unread dot top-right */}
              <div className="absolute top-3.5 right-3.5 h-2 w-2 rounded-full bg-rose-400 animate-pulse" />

              <div className="pl-5 pr-8 pt-4 pb-0 sm:pl-6 sm:pr-10">
                <div className="flex items-start gap-3.5">
                  {/* icon tile */}
                  <div className="flex-shrink-0 mt-0.5 flex items-center justify-center h-10 w-10 rounded-xl bg-gradient-to-br from-rose-50 to-rose-100 border border-rose-200 shadow-sm">
                    <BellDot className="h-4.5 w-4.5 text-rose-500" aria-hidden />
                  </div>
                  <div className="flex-1 min-w-0">
                    {/* title + time */}
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="text-[13px] font-black text-slate-900 leading-snug">{n.title}</p>
                      <span
                        className="flex-shrink-0 text-[10px] text-slate-400 font-semibold whitespace-nowrap"
                        title={fullDate(n.createdAt)}
                      >
                        {relativeTime(n.createdAt)}
                      </span>
                    </div>
                    {/* body */}
                    <p className="mt-1 text-[13px] text-slate-500 leading-relaxed line-clamp-3">{n.body}</p>
                  </div>
                </div>
              </div>

              {/* action bar */}
              <div className="mt-3 px-5 sm:px-6 py-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.12em]">New</span>
                <button
                  onClick={() => markRead(n.id)}
                  className="inline-flex items-center gap-1.5 h-7 px-3 rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 text-white text-[11px] font-bold shadow-sm shadow-teal-200/60 hover:from-teal-600 hover:to-teal-700 transition-all"
                  aria-label="Mark as read"
                >
                  <CheckCheck className="h-3.5 w-3.5" /> Mark as read
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
