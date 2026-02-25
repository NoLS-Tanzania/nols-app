"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, BellDot, CheckCheck } from "lucide-react";

export default function NotificationsPageClient() {
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [readCount, setReadCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();

    (async () => {
      try {
        const base = process.env.NEXT_PUBLIC_API_URL || "";
        const baseUrl = base ? base.replace(/\/$/, "") : "";

        const unreadUrl = baseUrl
          ? `${baseUrl}/api/owner/notifications?tab=unread&page=1&pageSize=1`
          : "/api/owner/notifications?tab=unread&page=1&pageSize=1";
        const ru = await fetch(unreadUrl, { credentials: "include", signal: controller.signal });
        if (ru.ok) {
          const ju = await ru.json();
          if (mounted) setUnreadCount(Number(ju.totalUnread ?? ju.total ?? 0));
        }

        const readUrl = baseUrl
          ? `${baseUrl}/api/owner/notifications?tab=viewed&page=1&pageSize=1`
          : "/api/owner/notifications?tab=viewed&page=1&pageSize=1";
        const rr = await fetch(readUrl, { credentials: "include", signal: controller.signal });
        if (rr.ok) {
          const jr = await rr.json();
          if (mounted) setReadCount(Number(jr.total ?? 0));
        }
      } catch {
        // ignore
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
      controller.abort();
    };
  }, []);

  return (
    <div className="space-y-5 pb-6">

      {/* ── Hero card ── */}
      <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-xl shadow-slate-100/70">
        <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-teal-600 via-teal-300 to-transparent rounded-l-2xl" />
        <div className="pointer-events-none select-none absolute right-0 bottom-0 text-[64px] font-black text-slate-100/70 leading-none tracking-tighter pr-5 pb-2" aria-hidden>NOTIFICATIONS</div>
        <div className="pointer-events-none absolute right-0 top-0 h-full w-1/2 opacity-[0.035]" style={{ backgroundImage: "radial-gradient(circle, #334155 1px, transparent 1px)", backgroundSize: "18px 18px" }} />

        <div className="relative px-6 pt-8 pb-9 sm:px-10 sm:pt-10 sm:pb-11 flex flex-col items-center text-center">
          <div className="flex items-center gap-3 mb-5">
            <div className="flex items-center justify-center h-11 w-11 rounded-xl bg-teal-50 border border-teal-100">
              <Bell className="h-5 w-5 text-teal-600" aria-hidden />
            </div>
            {unreadCount > 0 && (
              <div className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500 flex-shrink-0 animate-pulse" />
                {unreadCount} unread
              </div>
            )}
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight leading-none">Notifications</h1>
          <p className="mt-2.5 text-sm text-slate-500 max-w-sm">System alerts, booking updates, and guest activity — all in one place.</p>
        </div>
      </div>

      {/* ── Tab cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* Unread */}
        <Link
          href="/owner/notifications/unread"
          className="group relative overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-rose-200 transition-all duration-200 no-underline"
        >
          <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-rose-500 via-rose-300 to-transparent rounded-l-2xl" />
          <div className="pointer-events-none absolute right-0 top-0 h-full w-1/3 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle, #334155 1px, transparent 1px)", backgroundSize: "16px 16px" }} />
          <div className="pl-6 pr-5 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-rose-50 border border-rose-100 group-hover:bg-rose-100 transition-colors">
                  <BellDot className="h-5 w-5 text-rose-600" aria-hidden />
                </div>
                <div>
                  <div className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400 mb-0.5">Status</div>
                  <div className="text-sm font-bold text-slate-700">Unread</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400 mb-0.5">Count</div>
                {loading ? (
                  <div className="h-7 w-8 rounded-lg bg-slate-100 animate-pulse" />
                ) : (
                  <div className={`text-2xl font-black leading-none ${unreadCount > 0 ? "text-rose-600" : "text-slate-400"}`}>
                    {unreadCount}
                  </div>
                )}
              </div>
            </div>
            {unreadCount > 0 && (
              <div className="mt-4 text-xs font-medium text-rose-600">
                {unreadCount} notification{unreadCount !== 1 ? "s" : ""} waiting → tap to review
              </div>
            )}
          </div>
        </Link>

        {/* Read */}
        <Link
          href="/owner/notifications/read"
          className="group relative overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-teal-200 transition-all duration-200 no-underline"
        >
          <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-teal-500 via-teal-300 to-transparent rounded-l-2xl" />
          <div className="pointer-events-none absolute right-0 top-0 h-full w-1/3 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle, #334155 1px, transparent 1px)", backgroundSize: "16px 16px" }} />
          <div className="pl-6 pr-5 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-teal-50 border border-teal-100 group-hover:bg-teal-100 transition-colors">
                  <CheckCheck className="h-5 w-5 text-teal-600" aria-hidden />
                </div>
                <div>
                  <div className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400 mb-0.5">Status</div>
                  <div className="text-sm font-bold text-slate-700">Read</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400 mb-0.5">Count</div>
                {loading ? (
                  <div className="h-7 w-8 rounded-lg bg-slate-100 animate-pulse" />
                ) : (
                  <div className="text-2xl font-black text-slate-400 leading-none">{readCount}</div>
                )}
              </div>
            </div>
          </div>
        </Link>

      </div>
    </div>
  );
}
