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
  Bell,
  BadgeDollarSign,
  User,
} from "lucide-react";
import React from "react";

const ACCENT = "#5ecdc4";

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
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:ring-offset-0",
        isSubItem ? "pl-9 pr-3 py-2" : "px-3 py-2.5",
      ].join(" ")}
      style={{
        color: active ? "#ffffff" : "rgba(255,255,255,0.82)",
        ...(active ? { background: "rgba(255,255,255,0.09)" } : {}),
      }}
    >
      <span
        className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full transition-opacity duration-150"
        style={{ background: ACCENT, opacity: active ? 1 : 0 }}
        aria-hidden
      />
      {Icon && (
        <span
          className={[
            "flex-shrink-0 flex items-center justify-center rounded-lg transition-all duration-150",
            isSubItem ? "h-6 w-6" : "h-7 w-7",
          ].join(" ")}
          style={active ? { background: "rgba(255,255,255,0.1)" } : undefined}
          aria-hidden
        >
          <Icon
            className={["transition-colors duration-150", isSubItem ? "h-3.5 w-3.5" : "h-4 w-4"].join(" ")}
            aria-hidden
          />
        </span>
      )}
      <span
        className={[
          "transition-all duration-150",
          isSubItem ? "text-[12px]" : "text-[13px]",
          active ? "font-semibold" : "font-medium",
        ].join(" ")}
      >
        {label}
      </span>
    </Link>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <div className="px-3 pt-4 pb-1">
      <span
        className="text-[9.5px] font-bold tracking-[0.13em] uppercase"
        style={{ color: "rgba(255,255,255,0.3)" }}
      >
        {label}
      </span>
    </div>
  );
}

export default function DriverSidebar() {
  const path = usePathname() || "";
  const [revenueOpen, setRevenueOpen] = useState<boolean>(true);

  const isRevenueRoute =
    path === "/driver/invoices" ||
    path === "/driver/payouts" ||
    path.startsWith("/driver/invoices/") ||
    path.startsWith("/driver/payouts/");

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

  const revenueActive = revenueOpen || isRevenueRoute;

  return (
    <div
      className="overflow-hidden rounded-2xl shadow-lg"
      style={{ background: "linear-gradient(170deg, #031c22 0%, #02423d 55%, #02665e 100%)" }}
    >
      {/* Brand header */}
      <div
        className="flex items-center gap-2.5 px-4 py-3.5"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
      >
        <span className="text-[15px] font-extrabold text-white tracking-wide">NoLSAF</span>
        <span
          className="ml-auto rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider"
          style={{ background: "rgba(94,205,196,0.18)", color: ACCENT }}
        >
          Driver
        </span>
      </div>

      {/* Navigation */}
      <nav className="p-2 space-y-px">
        <Item href="/driver" label="Dashboard" Icon={LayoutDashboard} currentPath={path} />

        <SectionLabel label="Account" />
        <Item href="/driver/profile" label="My Profile" Icon={User} currentPath={path} />

        <SectionLabel label="Operations" />
        <Item href="/driver/map?live=1" label="Live Map" Icon={Map} currentPath={path} />
        <Item href="/driver/trips" label="My Trips" Icon={ListChecks} currentPath={path} />
        <Item href="/driver/trips/scheduled" label="Claim Trips" Icon={BarChart2} currentPath={path} />
        <Item href="/driver/reminders" label="Reminders" Icon={Bell} currentPath={path} />

        <SectionLabel label="Finance" />
        {/* Revenue accordion */}
        <div>
          <button
            onClick={() => setRevenueOpen((v) => !v)}
            className={[
              "w-full group relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20",
            ].join(" ")}
            style={{
              color: revenueActive ? "#ffffff" : "rgba(255,255,255,0.82)",
              ...(revenueActive ? { background: "rgba(255,255,255,0.09)" } : {}),
            }}
          >
            <span
              className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full transition-opacity duration-150"
              style={{ background: ACCENT, opacity: revenueActive ? 1 : 0 }}
              aria-hidden
            />
            <span
              className="h-7 w-7 flex-shrink-0 flex items-center justify-center rounded-lg transition-all duration-150"
              style={revenueActive ? { background: "rgba(255,255,255,0.1)" } : undefined}
              aria-hidden
            >
              <BadgeDollarSign className="h-4 w-4" aria-hidden />
            </span>
            <span className={`flex-1 text-[13px] text-left ${revenueActive ? "font-semibold" : "font-medium"}`}>
              My Revenue
            </span>
            <ChevronDown
              className="h-3.5 w-3.5 flex-shrink-0 transition-transform duration-200"
              style={{
                color: "rgba(255,255,255,0.35)",
                transform: revenueOpen ? "rotate(180deg)" : "rotate(0deg)",
              }}
              aria-hidden
            />
          </button>
          {revenueOpen && (
            <div className="mt-px space-y-px">
              <Item href="/driver/invoices" label="Invoices" Icon={FileText} isSubItem currentPath={path} />
              <Item href="/driver/payouts" label="Payouts" Icon={Wallet} isSubItem currentPath={path} />
            </div>
          )}
        </div>

        <div className="my-1.5 mx-3 h-px" style={{ background: "rgba(255,255,255,0.08)" }} aria-hidden />
        <Item href="/driver/management" label="Management" Icon={Settings} currentPath={path} />
      </nav>
    </div>
  );
}

