"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Bell, BellDot, CheckCheck, Clock3, Loader2, Trash2 } from "lucide-react";

const BRAND = "#02665e";
const BRAND_LIGHT = "#edf7f6";
const BRAND_BORDER = "#b6dbd8";
const RED = "#dc2626";
const RED_LIGHT = "#fff1f1";
const RED_BORDER = "#fecaca";

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
    if (loading) return "Checking notification status…";
    if (unreadCount > 0) return `You have ${unreadCount} unread update${unreadCount === 1 ? "" : "s"}.`;
    if (readCount > 0) return "You're all caught up. Read history is available below.";
    return "No notifications yet.";
  }, [loading, readCount, unreadCount]);

  return (
    <div className="space-y-4 pb-8">

      {/* ── Hero header ── */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ border: `1px solid ${BRAND_BORDER}`, background: "#fff" }}
      >
        <div className="px-5 py-6 sm:px-8 sm:py-7 flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-8">
          {/* Left: icon + title */}
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div
              className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl"
              style={{ background: BRAND_LIGHT, border: `1px solid ${BRAND_BORDER}`, color: BRAND }}
            >
              {unreadCount > 0 ? <BellDot className="h-6 w-6" /> : <Bell className="h-6 w-6" />}
              {unreadCount > 0 && (
                <span
                  className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-black text-white ring-2 ring-white"
                  style={{ background: RED }}
                >
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <div
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.14em]"
                style={{
                  background: caughtUp ? BRAND_LIGHT : RED_LIGHT,
                  color: caughtUp ? BRAND : RED,
                  border: `1px solid ${caughtUp ? BRAND_BORDER : RED_BORDER}`,
                }}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: caughtUp ? BRAND : RED }}
                />
                {caughtUp ? "All clear" : "Action needed"}
              </div>
              <h1 className="mt-2 text-3xl font-black tracking-tight" style={{ color: "#0f2e2b" }}>
                Notifications
              </h1>
              <p className="mt-1 text-sm" style={{ color: "#5a9990" }}>{statusText}</p>
            </div>
          </div>

          {/* Right: metrics */}
          <div
            className="grid grid-cols-3 divide-x divide-slate-200 rounded-xl overflow-hidden shrink-0"
            style={{ border: `1px solid ${BRAND_BORDER}` }}
          >
            <Metric label="Unread" value={unreadCount} loading={loading} accent={RED} />
            <Metric label="Read"   value={readCount}   loading={loading} accent={BRAND} />
            <Metric label="Total"  value={totalCount}  loading={loading} accent="#334155" />
          </div>
        </div>
      </div>

      {/* ── Cards ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <NotificationCard
          href="/owner/notifications/unread"
          title="Unread updates"
          description={unreadCount > 0 ? "New booking, payment, and system alerts." : "Nothing pending right now."}
          count={unreadCount}
          loading={loading}
          accent={RED}
          accentLight={RED_LIGHT}
          accentBorder={RED_BORDER}
          icon={<BellDot className="h-5 w-5" />}
          actionLabel={unreadCount > 0 ? "Review now" : "Open inbox"}
        />

        <NotificationCard
          href="/owner/notifications/read"
          title="Read history"
          description="Review or delete notifications you no longer need."
          count={readCount}
          loading={loading}
          accent={BRAND}
          accentLight={BRAND_LIGHT}
          accentBorder={BRAND_BORDER}
          icon={<CheckCheck className="h-5 w-5" />}
          actionLabel="Manage read"
          footerIcon={<Trash2 className="h-3.5 w-3.5" />}
          footerText="Read notifications can be deleted"
        />
      </div>
    </div>
  );
}

function Metric({
  label, value, loading, accent,
}: {
  label: string; value: number; loading: boolean; accent: string;
}) {
  return (
    <div className="flex flex-col items-center px-5 py-3 bg-white">
      <span className="text-[9px] font-black uppercase tracking-[0.16em]" style={{ color: "#94a3b8" }}>{label}</span>
      {loading ? (
        <Loader2 className="mt-2 h-5 w-5 animate-spin" style={{ color: "#cbd5e1" }} />
      ) : (
        <span className="mt-1.5 text-2xl font-black tabular-nums" style={{ color: accent }}>{value}</span>
      )}
    </div>
  );
}

function NotificationCard({
  href, title, description, count, loading,
  accent, accentLight, accentBorder,
  icon, actionLabel, footerIcon, footerText,
}: {
  href: string;
  title: string;
  description: string;
  count: number;
  loading: boolean;
  accent: string;
  accentLight: string;
  accentBorder: string;
  icon: React.ReactNode;
  actionLabel: string;
  footerIcon?: React.ReactNode;
  footerText?: string;
}) {
  return (
    <Link
      href={href}
      className="group relative overflow-hidden rounded-2xl bg-white no-underline block transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
      style={{ border: `1px solid #e2eae9`, boxShadow: "0 1px 4px rgba(2,102,94,0.06)" }}
    >
      <div className="pl-5 pr-4 pt-5 pb-4">
        <div className="flex items-start justify-between gap-3">
          {/* Icon + text */}
          <div className="flex items-start gap-3">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
              style={{ background: accentLight, border: `1px solid ${accentBorder}`, color: accent }}
            >
              {icon}
            </div>
            <div className="min-w-0 pt-0.5">
              <h2 className="text-[15px] font-black" style={{ color: "#0f2e2b" }}>{title}</h2>
              <p className="mt-0.5 text-[13px] leading-5" style={{ color: "#5a9990" }}>{description}</p>
            </div>
          </div>

          {/* Count */}
          <div className="shrink-0 text-right">
            <div className="text-[9px] font-black uppercase tracking-[0.14em]" style={{ color: "#94a3b8" }}>COUNT</div>
            {loading ? (
              <div className="mt-2 h-8 w-8 rounded-lg animate-pulse" style={{ background: "#f1f5f9" }} />
            ) : (
              <div className="mt-1 text-3xl font-black tabular-nums leading-none" style={{ color: count > 0 ? accent : "#94a3b8" }}>
                {count}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          className="mt-4 flex items-center justify-between gap-3 pt-3"
          style={{ borderTop: "1px solid #edf4f3" }}
        >
          <span className="inline-flex items-center gap-1.5 text-[12px] font-medium" style={{ color: "#94a3b8" }}>
            {footerIcon || <Clock3 className="h-3.5 w-3.5" />}
            {footerText || "Updated automatically"}
          </span>
          <span
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-black transition-all group-hover:translate-x-0.5"
            style={{ background: accentLight, color: accent, border: `1px solid ${accentBorder}` }}
          >
            {actionLabel}
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}
