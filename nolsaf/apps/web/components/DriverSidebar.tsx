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
  User,
} from "lucide-react";
import React from "react";

const BRAND = "#02665e";

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
        "no-underline group relative flex items-center gap-3 rounded-xl transition-all duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200 focus-visible:ring-offset-0",
        isSubItem ? "pl-10 pr-3 py-1.5" : "px-3 py-2.5",
        active
          ? "text-[#02665e]"
          : "text-slate-600 hover:text-slate-900",
      ].join(" ")}
      style={active ? { background: "rgba(2,102,94,0.07)" } : undefined}
    >
      {/* Left accent bar */}
      <span
        className="absolute left-0 top-1 bottom-1 w-[3px] rounded-full transition-opacity duration-150"
        style={{ background: BRAND, opacity: active ? 1 : 0 }}
        aria-hidden
      />

      {Icon && (
        <span
          className={[
            "flex-shrink-0 flex items-center justify-center rounded-lg transition-all duration-150",
            isSubItem ? "h-6 w-6" : "h-8 w-8",
          ].join(" ")}
          style={
            active
              ? { background: "rgba(2,102,94,0.12)", color: BRAND }
              : undefined
          }
          aria-hidden
        >
          <Icon
            className={[
              "transition-colors duration-150",
              isSubItem ? "h-3.5 w-3.5" : "h-[17px] w-[17px]",
              active
                ? ""
                : "text-slate-400 group-hover:text-slate-600",
            ].join(" ")}
            aria-hidden
          />
        </span>
      )}

      <span
        className={[
          "truncate transition-all duration-150",
          isSubItem ? "text-[12px]" : "text-[13px]",
          active ? "font-semibold" : "font-medium",
        ].join(" ")}
      >
        {label}
      </span>
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
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        {/* Brand top strip */}
        <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${BRAND} 0%, #0b7a71 60%, #35a79c 100%)` }} />

        <div className="p-2.5 space-y-0.5">
          <Item href="/driver" label="Dashboard" Icon={LayoutDashboard} currentPath={path} />
          <Item href="/driver/profile" label="My Profile" Icon={User} currentPath={path} />
          <Item href="/driver/map?live=1" label="Live Map" Icon={Map} currentPath={path} />
          <Item href="/driver/trips" label="My Trips" Icon={ListChecks} currentPath={path} />
          <Item href="/driver/trips/scheduled" label="Claim Trips" Icon={BarChart2} currentPath={path} />
          <Item href="/driver/reminders" label="Reminders" Icon={Bell} currentPath={path} />

          {/* Revenue group */}
          <div className="pt-0.5">
            <button
              onClick={() => setRevenueOpen(v => !v)}
              className={[
                "w-full group relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-150",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200",
                revenueOpen || isRevenueRoute
                  ? "text-[#02665e] font-semibold"
                  : "text-slate-600 hover:text-slate-900 font-medium",
              ].join(" ")}
              style={revenueOpen || isRevenueRoute ? { background: "rgba(2,102,94,0.07)" } : undefined}
            >
              <span
                className="absolute left-0 top-1 bottom-1 w-[3px] rounded-full transition-opacity duration-150"
                style={{ background: BRAND, opacity: revenueOpen || isRevenueRoute ? 1 : 0 }}
                aria-hidden
              />
              <span
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg transition-all duration-150"
                style={revenueOpen || isRevenueRoute ? { background: "rgba(2,102,94,0.12)", color: BRAND } : undefined}
                aria-hidden
              >
                <BadgeDollarSign className={[
                  "h-[17px] w-[17px] transition-colors duration-150",
                  revenueOpen || isRevenueRoute ? "" : "text-slate-400 group-hover:text-slate-600",
                ].join(" ")} aria-hidden />
              </span>
              <span className="flex-1 truncate text-[13px] text-left">My Revenue</span>
              {revenueOpen
                ? <ChevronDown className="h-4 w-4 flex-shrink-0 text-slate-400" aria-hidden />
                : <ChevronRight className="h-4 w-4 flex-shrink-0 text-slate-400" aria-hidden />}
            </button>
            {revenueOpen && (
              <div className="mt-0.5 space-y-0.5">
                <Item href="/driver/invoices" label="Invoices" Icon={FileText} isSubItem currentPath={path} />
                <Item href="/driver/payouts" label="Payouts" Icon={Wallet} isSubItem currentPath={path} />
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="my-1 mx-3 h-px bg-slate-100" aria-hidden />
          <Item href="/driver/management" label="Management" Icon={Settings} currentPath={path} />
        </div>
      </div>
    </div>
  );
}

