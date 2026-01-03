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
} from "lucide-react";
import React from "react";

function Item({ href, label, Icon, isSubItem = false }: { href: string; label: string; Icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>; isSubItem?: boolean }) {
  const path = usePathname();
  const active = path === href || path?.startsWith(href + "/");
  return (
    <Link
      href={href}
      className={`no-underline flex items-center justify-between rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200 bg-white border border-transparent
        ${active ? "text-[#02665e] border-[#02665e]/20" : "text-[#02665e] hover:bg-gray-50"}
        ${isSubItem ? "ml-4" : ""}`}
      style={{ backfaceVisibility: 'hidden', transform: 'translateZ(0)' }}
    >
      <div className="flex items-center gap-3">
        {Icon ? (
          <Icon className="h-4 w-4 text-[#02665e] flex-shrink-0" aria-hidden />
        ) : null}
        <span>{label}</span>
      </div>
      <ChevronRight className="h-4 w-4 text-[#02665e] opacity-60 flex-shrink-0" aria-hidden />
    </Link>
  );
}

export default function DriverSidebar() {
  const [revenueOpen, setRevenueOpen] = useState<boolean>(true);

  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        const raw = localStorage.getItem("driver_revenue_open");
        setRevenueOpen(raw === null ? true : raw !== "0");
      }
    } catch (e) {
      // ignore
    }
  }, []);

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
      <div className="bg-gray-50 rounded-2xl p-3 border border-gray-200">
        <div className="space-y-2">
          {/* Dashboard */}
          <Item href="/driver" label="Dashboard" Icon={LayoutDashboard} />

          {/* Live Map */}
          <Item href="/driver/map?live=1" label="Live Map" Icon={Map} />

          {/* My Trips */}
          <Item href="/driver/trips" label="My Trips" Icon={ListChecks} />

          {/* Claim Trips */}
          <Item href="/driver/trips/scheduled" label="Claim Trips" Icon={BarChart2} />

          {/* Reminders */}
          <Item href="/driver/reminders" label="Reminders" Icon={Bell} />

          {/* My Revenue */}
          <div>
            <button 
              onClick={() => setRevenueOpen(v => !v)} 
              className="w-full flex items-center justify-between rounded-lg px-4 py-3 text-sm font-medium text-[#02665e] bg-white border border-gray-300 hover:bg-gray-50 transition-all duration-200"
              style={{ backfaceVisibility: 'hidden', transform: 'translateZ(0)' }}
            >
              <span>My Revenue</span>
              {revenueOpen ? (
                <ChevronDown className="h-4 w-4 text-[#02665e] opacity-60" aria-hidden />
              ) : (
                <ChevronRight className="h-4 w-4 text-[#02665e] opacity-60" aria-hidden />
              )}
            </button>
            {revenueOpen && (
              <div className="mt-2 space-y-2">
                <Item href="/driver/invoices" label="Invoices" Icon={FileText} isSubItem />
                <Item href="/driver/payouts" label="Payouts" Icon={Wallet} isSubItem />
              </div>
            )}
          </div>

          {/* Management */}
          <Item href="/driver/management" label="Managements" Icon={Settings} />
        </div>
      </div>
    </div>
  );
}
