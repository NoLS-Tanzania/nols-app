"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Bell, BellDot, CheckCheck, Clock3, Loader2, Trash2 } from "lucide-react";

export default function NotificationsPageClient() {
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [readCount, setReadCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();

    (async () => {
      try {
        const unreadUrl = "/api/owner/notifications?tab=unread&page=1&pageSize=1";
        const ru = await fetch(unreadUrl, { credentials: "include", signal: controller.signal });
        if (ru.ok) {
          const ju = await ru.json();
          if (mounted) setUnreadCount(Number(ju.totalUnread ?? ju.total ?? 0));
        }

        const readUrl = "/api/owner/notifications?tab=viewed&page=1&pageSize=1";
        const rr = await fetch(readUrl, { credentials: "include", signal: controller.signal });
        if (rr.ok) {
          const jr = await rr.json();
          if (mounted) setReadCount(Number(jr.total ?? 0));
        }
      } catch {
        // Keep the page usable if the count request fails.
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
      controller.abort();
    };
  }, []);

  const totalCount = unreadCount + readCount;
  const caughtUp = !loading && unreadCount === 0;
  const statusText = useMemo(() => {
    if (loading) return "Checking notification status...";
    if (unreadCount > 0) return `${unreadCount} unread update${unreadCount === 1 ? "" : "s"} need attention.`;
    if (readCount > 0) return "No unread alerts. Read history is available below.";
    return "No notifications yet.";
  }, [loading, readCount, unreadCount]);

  return (
    <div className="space-y-5 pb-8">
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/70">
        <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-teal-50 blur-3xl" />
        <div className="pointer-events-none absolute right-8 top-8 h-24 w-24 rounded-full border border-teal-100/70" />

        <div className="relative grid gap-6 px-5 py-7 sm:px-8 sm:py-9 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="flex items-start gap-4">
            <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-teal-100 bg-teal-50 text-[#02665e] shadow-sm">
              {unreadCount > 0 ? <BellDot className="h-6 w-6" /> : <Bell className="h-6 w-6" />}
              {unreadCount > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-6 min-w-6 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-black text-white ring-2 ring-white">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </div>

            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-500">
                <span className={`h-2 w-2 rounded-full ${caughtUp ? "bg-emerald-500" : "bg-rose-500"}`} />
                {caughtUp ? "All clear" : "Action needed"}
              </div>
              <h1 className="mt-4 text-3xl font-black leading-tight tracking-tight text-slate-950 sm:text-4xl">Notifications</h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">{statusText}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 rounded-2xl border border-slate-200 bg-white/75 p-2 shadow-sm">
            <Metric label="Unread" value={unreadCount} loading={loading} tone="rose" />
            <Metric label="Read" value={readCount} loading={loading} tone="teal" />
            <Metric label="Total" value={totalCount} loading={loading} tone="slate" />
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <NotificationCard
          href="/owner/notifications/unread"
          title="Unread updates"
          description={unreadCount > 0 ? "Review new booking, system, and guest activity." : "Nothing pending right now."}
          count={unreadCount}
          loading={loading}
          tone="rose"
          icon={<BellDot className="h-5 w-5" />}
          actionLabel={unreadCount > 0 ? "Review now" : "Open inbox"}
        />

        <NotificationCard
          href="/owner/notifications/read"
          title="Read history"
          description="Review or delete notifications you no longer need."
          count={readCount}
          loading={loading}
          tone="teal"
          icon={<CheckCheck className="h-5 w-5" />}
          actionLabel="Manage read"
          footerIcon={<Trash2 className="h-3.5 w-3.5" />}
          footerText="Read notifications can be deleted"
        />
      </div>
    </div>
  );
}

function Metric({ label, value, loading, tone }: { label: string; value: number; loading: boolean; tone: "rose" | "teal" | "slate" }) {
  const toneClass = tone === "rose" ? "text-rose-600 bg-rose-50" : tone === "teal" ? "text-[#02665e] bg-teal-50" : "text-slate-700 bg-slate-50";

  return (
    <div className="rounded-xl px-3 py-3 text-center">
      <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">{label}</div>
      {loading ? (
        <div className="mx-auto mt-2 h-7 w-10 rounded-lg bg-slate-100">
          <Loader2 className="mx-auto h-5 w-5 animate-spin text-slate-300" />
        </div>
      ) : (
        <div className={`mx-auto mt-2 inline-flex min-w-12 items-center justify-center rounded-xl px-3 py-1 text-2xl font-black ${toneClass}`}>
          {value}
        </div>
      )}
    </div>
  );
}

function NotificationCard({
  href,
  title,
  description,
  count,
  loading,
  tone,
  icon,
  actionLabel,
  footerIcon,
  footerText,
}: {
  href: string;
  title: string;
  description: string;
  count: number;
  loading: boolean;
  tone: "rose" | "teal";
  icon: React.ReactNode;
  actionLabel: string;
  footerIcon?: React.ReactNode;
  footerText?: string;
}) {
  const isRose = tone === "rose";
  const soft = isRose ? "bg-rose-50 text-rose-600 border-rose-100" : "bg-teal-50 text-[#02665e] border-teal-100";
  const hover = isRose ? "hover:border-rose-200" : "hover:border-teal-200";
  const halo = isRose ? "bg-rose-50" : "bg-teal-50";

  return (
    <Link
      href={href}
      className={`group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${hover} no-underline`}
    >
      <div className={`pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full ${halo} blur-2xl`} />

      <div className="relative flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${soft}`}>{icon}</div>
          <div className="min-w-0">
            <h2 className="text-base font-black text-slate-950">{title}</h2>
            <p className="mt-1 text-sm leading-5 text-slate-500">{description}</p>
          </div>
        </div>

        <div className="shrink-0 text-right">
          <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Count</div>
          {loading ? (
            <div className="mt-2 h-8 w-10 rounded-lg bg-slate-100" />
          ) : (
            <div className={`mt-1 text-3xl font-black leading-none ${isRose && count > 0 ? "text-rose-600" : "text-slate-500"}`}>{count}</div>
          )}
        </div>
      </div>

      <div className="relative mt-5 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <span className="inline-flex items-center gap-2 text-xs font-bold text-slate-500">
          {footerIcon || <Clock3 className="h-3.5 w-3.5" />}
          {footerText || "Updated automatically"}
        </span>
        <span className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-black ${soft} transition group-hover:translate-x-0.5`}>
          {actionLabel}
          <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </Link>
  );
}
