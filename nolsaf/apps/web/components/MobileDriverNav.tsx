"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Bell, Home, ListChecks, Map, TicketPlus } from "lucide-react";
import { usePathname } from "next/navigation";

type Slot = "home" | "trips" | "claim" | "map" | "notifications";

export default function MobileDriverNav() {
  const pathname = usePathname();
  const [pressed, setPressed] = useState<Slot | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const press = useCallback((slot: Slot) => setPressed(slot), []);
  const release = useCallback(() => setPressed(null), []);

  const isHidden = !(pathname || "").startsWith("/driver");

  const active = useMemo(() => {
    const path = pathname || "";
    return {
      home: path === "/driver" || path === "/driver/",
      trips: path.startsWith("/driver/trips") && !path.startsWith("/driver/trips/scheduled"),
      claim: path.startsWith("/driver/trips/scheduled"),
      map: path.startsWith("/driver/map"),
      notifications: path.startsWith("/driver/notifications"),
    };
  }, [pathname]);

  useEffect(() => {
    if (isHidden) return;

    let mounted = true;
    const fetchUnread = async () => {
      const ac = new AbortController();
      const timeout = window.setTimeout(() => ac.abort(), 8000);
      try {
        const response = await fetch("/api/driver/notifications?tab=unread&page=1&pageSize=1", {
          credentials: "include",
          signal: ac.signal,
        });
        if (!response.ok || !mounted) return;
        const data = await response.json();
        setUnreadCount(Number(data?.totalUnread ?? data?.total ?? 0));
      } catch {
        // ignore badge failures
      } finally {
        window.clearTimeout(timeout);
      }
    };

    fetchUnread();
    const handleFocus = () => fetchUnread();
    window.addEventListener("focus", handleFocus);
    return () => {
      mounted = false;
      window.removeEventListener("focus", handleFocus);
    };
  }, [isHidden, pathname]);

  const touch = (slot: Slot) => ({
    onTouchStart: () => press(slot),
    onTouchEnd: release,
    onTouchCancel: release,
    onMouseDown: () => press(slot),
    onMouseUp: release,
    onMouseLeave: release,
  });

  const iconScale = (slot: Slot): React.CSSProperties => ({
    transform: pressed === slot ? "scale(0.84)" : "scale(1)",
    opacity: pressed === slot ? 0.82 : 1,
    transition:
      pressed === slot
        ? "transform 0.10s cubic-bezier(0.25,0.46,0.45,0.94), opacity 0.10s ease"
        : "transform 0.34s cubic-bezier(0.34,1.56,0.64,1), opacity 0.18s ease",
  });

  const fabScale = (slot: Slot): React.CSSProperties => ({
    transform: pressed === slot ? "scale(0.9)" : "scale(1)",
    filter: pressed === slot ? "brightness(0.95)" : "brightness(1)",
    transition:
      pressed === slot
        ? "transform 0.10s cubic-bezier(0.25,0.46,0.45,0.94), filter 0.10s ease"
        : "transform 0.34s cubic-bezier(0.34,1.56,0.64,1), filter 0.18s ease",
  });

  if (isHidden) return null;

  const BRAND = "#02665e";
  const BRAND_SOFT = "rgba(2,102,94,0.74)";
  const ICON_SIZE = 22;
  const iconColor = (isActive: boolean) => (isActive ? BRAND : BRAND_SOFT);
  const strokeWidth = (isActive: boolean) => (isActive ? 2.6 : 2.15);

  const renderNavItem = ({
    href,
    slot,
    label,
    activeState,
    icon,
    badge,
  }: {
    href: string;
    slot: Slot;
    label: string;
    activeState: boolean;
    icon: React.ReactNode;
    badge?: React.ReactNode;
  }) => (
    <Link
      href={href}
      aria-label={label}
      className="relative flex h-full min-w-0 select-none items-center justify-center no-underline outline-none"
      {...touch(slot)}
    >
      <span
        className={[
          "relative flex w-full max-w-[4.1rem] flex-col items-center justify-center px-1 py-1.5 transition-all duration-200",
        ].join(" ")}
        style={iconScale(slot)}
      >
        <span
          className={[
            "relative inline-flex h-10 w-10 items-center justify-center rounded-[1.15rem] transition-all duration-200",
            activeState
              ? "bg-[#02665e]/12 text-[#02665e] shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] ring-1 ring-[#02665e]/8"
              : "text-slate-400",
          ].join(" ")}
        >
          {icon}
          {badge}
        </span>
        <span className={`mt-1.5 text-[9px] font-medium uppercase leading-none tracking-[0.14em] ${activeState ? "text-slate-700" : "text-slate-300"}`}>
          {label}
        </span>
        <span
          className={`mt-2 h-[3px] rounded-full transition-all duration-200 ${activeState ? "w-8 bg-[#02665e] opacity-100" : "w-6 bg-slate-200 opacity-45"}`}
          aria-hidden
        />
      </span>
    </Link>
  );

  return (
    <nav aria-label="Driver mobile navigation" className="md:hidden fixed inset-x-0 bottom-0 z-50">
      <div className="relative" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>

        {/* Notched SVG background — curves down at center for Claim FAB */}
        <svg
          viewBox="0 0 390 65"
          preserveAspectRatio="none"
          className="absolute inset-x-0 bottom-0 w-full pointer-events-none"
          style={{ height: "65px", filter: "drop-shadow(0 -4px 14px rgba(15,23,42,0.09))" }}
          aria-hidden
        >
          <path
            d="M0,0 L148,0 C162,0 164,28 195,28 C226,28 228,0 242,0 L390,0 L390,65 L0,65 Z"
            fill="white"
          />
          <path
            d="M0,0.5 L148,0.5 C162,0.5 164,28.5 195,28.5 C226,28.5 228,0.5 242,0.5 L390,0.5"
            fill="none"
            stroke="rgba(203,213,225,0.8)"
            strokeWidth="1"
          />
        </svg>

        {/* Tab items */}
        <div className="relative grid h-16 grid-cols-5 items-end px-2">
          {renderNavItem({
            href: "/driver",
            slot: "home",
            label: "Home",
            activeState: active.home,
            icon: <Home width={ICON_SIZE} height={ICON_SIZE} strokeWidth={strokeWidth(active.home)} color={iconColor(active.home)} />,
          })}

          {renderNavItem({
            href: "/driver/trips",
            slot: "trips",
            label: "Trips",
            activeState: active.trips,
            icon: <ListChecks width={ICON_SIZE} height={ICON_SIZE} strokeWidth={strokeWidth(active.trips)} color={iconColor(active.trips)} />,
          })}

          <div className="relative flex h-full items-end justify-center" aria-hidden />

          {renderNavItem({
            href: "/driver/map?live=1",
            slot: "map",
            label: "Map",
            activeState: active.map,
            icon: <Map width={ICON_SIZE} height={ICON_SIZE} strokeWidth={strokeWidth(active.map)} color={iconColor(active.map)} />,
          })}

          {renderNavItem({
            href: "/driver/notifications",
            slot: "notifications",
            label: "Alerts",
            activeState: active.notifications,
            icon: <Bell width={ICON_SIZE} height={ICON_SIZE} strokeWidth={strokeWidth(active.notifications)} color={iconColor(active.notifications)} />,
            badge: unreadCount > 0 ? (
              <span className="absolute -right-2 -top-2 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-4 text-white ring-2 ring-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            ) : undefined,
          })}
        </div>

        {/* Claim FAB — straddles the notch */}
        <Link
          href="/driver/trips/scheduled"
          aria-label="Claim trips"
          className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 no-underline"
          {...touch("claim")}
        >
          <span className="flex flex-col items-center" style={fabScale("claim")}>
            <span
              className="relative flex h-[3.35rem] w-[3.35rem] items-center justify-center rounded-full border border-white/25 shadow-[0_12px_28px_rgba(2,102,94,0.28)] ring-[5px] ring-white"
              style={{ background: "linear-gradient(135deg, #02665e 0%, #0b7a71 52%, #35a79c 100%)" }}
            >
              <span className="pointer-events-none absolute inset-[2px] rounded-full border border-white/15" aria-hidden />
              <TicketPlus width={22} height={22} strokeWidth={2.5} color="#ffffff" />
            </span>
            <span className={`mt-1.5 text-[9px] font-medium uppercase leading-none tracking-[0.14em] ${active.claim ? "text-slate-700" : "text-slate-400"}`}>
              Claim
            </span>
            <span
              className={`mt-1.5 h-[3px] rounded-full transition-all duration-200 ${active.claim ? "w-8 bg-[#02665e] opacity-100" : "w-6 bg-slate-200 opacity-45"}`}
              aria-hidden
            />
          </span>
        </Link>
      </div>
    </nav>
  );
}