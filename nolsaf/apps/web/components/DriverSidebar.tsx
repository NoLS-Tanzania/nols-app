"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  ListChecks,
  Map,
  FileText,
  Settings,
  Wallet,
  BarChart2,
  ChevronDown,
  ChevronRight,
  Bell,
  BadgeDollarSign,
} from "lucide-react";
import React from "react";

function Item({
  href,
  label,
  Icon,
  currentPath,
  isSubItem = false,
}: {
  href: string;
  label: string;
  Icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  currentPath: string;
  isSubItem?: boolean;
}) {
  const hrefPath = href.split("?")[0];
  const active = currentPath === hrefPath || currentPath?.startsWith(hrefPath + "/");
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={[
        "no-underline group relative flex items-center justify-between",
        "rounded-2xl border transition-all duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 focus-visible:ring-offset-0",
        isSubItem ? "ml-3 px-3 py-2" : "px-3 py-2.5",
        active
          ? "border-brand-200/80 bg-brand-50/80 text-slate-900 shadow-sm"
          : "border-transparent bg-white/0 text-slate-700 hover:bg-white/70 hover:border-slate-200/70 hover:shadow-sm",
      ].join(" ")}
      style={{ backfaceVisibility: 'hidden', transform: 'translateZ(0)' }}
    >
      <div className="flex items-center gap-3 min-w-0">
        {Icon ? (
          <span
            className={[
              "relative inline-flex items-center justify-center flex-shrink-0",
              isSubItem ? "h-8 w-8 rounded-2xl" : "h-9 w-9 rounded-2xl",
              "border bg-white/70 shadow-sm ring-1 ring-slate-900/5",
              active
                ? "border-brand-200/70 bg-brand-50 text-brand-700"
                : "border-slate-200/70 text-slate-500 group-hover:text-slate-600 group-hover:bg-white",
            ].join(" ")}
            aria-hidden
          >
            <span className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-brand/10 via-transparent to-transparent" aria-hidden />
            <Icon className={isSubItem ? "relative h-4 w-4" : "relative h-[18px] w-[18px]"} aria-hidden />
          </span>
        ) : null}

        <span
          className={[
            "truncate",
            isSubItem ? "text-[13px] font-medium" : "text-[13px] font-semibold tracking-tight",
          ].join(" ")}
        >
          {label}
        </span>
      </div>

      <ChevronRight
        className={[
          "h-4 w-4 flex-shrink-0 transition-opacity",
          active ? "text-brand-700/70 opacity-100" : "text-slate-400 opacity-70 group-hover:opacity-100",
        ].join(" ")}
        aria-hidden
      />
    </Link>
  );
}

export default function DriverSidebar() {
  const path = usePathname() || "";
  const [revenueOpen, setRevenueOpen] = useState<boolean>(true);

  const isRevenueRoute = path === "/driver/invoices" || path === "/driver/payouts" || path.startsWith("/driver/invoices/") || path.startsWith("/driver/payouts/");

  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        const raw = localStorage.getItem("driver_revenue_open");
        const persisted = raw === null ? true : raw !== "0";
        setRevenueOpen(isRevenueRoute ? true : persisted);
      }
    } catch (e) {
      // ignore
    }
  }, [isRevenueRoute]);

  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("driver_revenue_open", revenueOpen ? "1" : "0");
      }
    } catch (e) {
      // ignore
    }
  }, [revenueOpen]);

  return (
    <div>
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/70 bg-white/75 backdrop-blur shadow-card ring-1 ring-slate-900/5">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand/10 via-white/80 to-slate-50" aria-hidden />
        <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-brand/10 blur-3xl" aria-hidden />
        <div className="relative p-2.5">
          <div className="space-y-1">
          {/* Dashboard */}
          <Item href="/driver" label="Dashboard" Icon={LayoutDashboard} currentPath={path} />

          {/* Live Map */}
          <Item href="/driver/map?live=1" label="Live Map" Icon={Map} currentPath={path} />

          {/* My Trips */}
          <Item href="/driver/trips" label="My Trips" Icon={ListChecks} currentPath={path} />

          {/* Claim Trips */}
          <Item href="/driver/trips/scheduled" label="Claim Trips" Icon={BarChart2} currentPath={path} />

          {/* Reminders */}
          <Item href="/driver/reminders" label="Reminders" Icon={Bell} currentPath={path} />

          {/* My Revenue */}
          <div>
            <button 
              onClick={() => setRevenueOpen(v => !v)} 
              className={[
                "w-full group relative flex items-center justify-between",
                "rounded-2xl px-3 py-2.5 text-[13px] font-semibold tracking-tight",
                "border transition-all duration-150",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 focus-visible:ring-offset-0",
                revenueOpen || isRevenueRoute
                  ? "border-slate-200/70 bg-white/70 text-slate-900 shadow-sm"
                  : "border-transparent bg-white/0 text-slate-700 hover:bg-white/70 hover:border-slate-200/70 hover:shadow-sm",
              ].join(" ")}
              style={{ backfaceVisibility: 'hidden', transform: 'translateZ(0)' }}
            >
              <span className="flex items-center gap-3 min-w-0">
                <span
                  className={[
                    "relative inline-flex h-9 w-9 items-center justify-center rounded-2xl flex-shrink-0",
                    "border bg-white/70 shadow-sm ring-1 ring-slate-900/5",
                    revenueOpen || isRevenueRoute
                      ? "border-brand-200/70 bg-brand-50 text-brand-700"
                      : "border-slate-200/70 text-slate-500 group-hover:text-slate-600 group-hover:bg-white",
                  ].join(" ")}
                  aria-hidden
                >
                  <span className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-brand/10 via-transparent to-transparent" aria-hidden />
                  <BadgeDollarSign className="relative h-[18px] w-[18px]" aria-hidden />
                </span>
                <span className="truncate">My Revenue</span>
              </span>
              {revenueOpen ? (
                <ChevronDown className="h-4 w-4 text-slate-500 group-hover:text-slate-600" aria-hidden />
              ) : (
                <ChevronRight className="h-4 w-4 text-slate-500 group-hover:text-slate-600" aria-hidden />
              )}
            </button>
            {revenueOpen && (
              <div className="mt-1 space-y-1">
                <Item href="/driver/invoices" label="Invoices" Icon={FileText} isSubItem currentPath={path} />
                <Item href="/driver/payouts" label="Payouts" Icon={Wallet} isSubItem currentPath={path} />
              </div>
            )}
          </div>

          {/* Management */}
          <div className="my-1 h-px bg-slate-200/60" aria-hidden />
          <Item href="/driver/management" label="Management" Icon={Settings} currentPath={path} />
          </div>
        </div>
      </div>
    </div>
  );
}
