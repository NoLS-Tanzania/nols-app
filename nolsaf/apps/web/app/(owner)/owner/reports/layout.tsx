"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart2, ArrowUpRight } from "lucide-react";

export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const tabs = [
    { href: "/owner/reports/overview",  label: "Overview",   dot: "bg-indigo-500",  pill: "bg-indigo-600",  ring: "focus-visible:ring-indigo-300" },
    { href: "/owner/reports/revenue",   label: "Revenue",    dot: "bg-emerald-500", pill: "bg-emerald-600", ring: "focus-visible:ring-emerald-300" },
    { href: "/owner/reports/bookings",  label: "Bookings",   dot: "bg-violet-500",  pill: "bg-violet-600",  ring: "focus-visible:ring-violet-300" },
    { href: "/owner/reports/stays",     label: "Stays",      dot: "bg-amber-500",   pill: "bg-amber-500",   ring: "focus-visible:ring-amber-300" },
    { href: "/owner/reports/occupancy", label: "Occupancy",  dot: "bg-sky-500",     pill: "bg-sky-600",     ring: "focus-visible:ring-sky-300" },
    { href: "/owner/reports/customers", label: "Customers",  dot: "bg-rose-500",    pill: "bg-rose-600",    ring: "focus-visible:ring-rose-300" },
  ];

  return (
    <div className="space-y-5 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">

      {/* ── Hero ── */}
      <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-xl shadow-slate-100/70">
        <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-slate-800 via-slate-400 to-transparent rounded-l-2xl" />
        <div className="pointer-events-none select-none absolute right-0 bottom-0 text-[80px] font-black text-slate-100/80 leading-none tracking-tighter pr-4 pb-1" aria-hidden>REPORTS</div>
        <div className="pointer-events-none absolute right-0 top-0 h-full w-1/2 opacity-[0.035]" style={{ backgroundImage: "radial-gradient(circle, #334155 1px, transparent 1px)", backgroundSize: "18px 18px" }} />

        <div className="relative pl-8 pr-6 pt-6 pb-6 sm:pt-7 sm:pb-7 sm:pr-8 lg:pt-8 lg:pb-8 lg:pr-10 lg:pl-10">
          {/* Top row: badge left / Revenue link right */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-slate-100 border border-slate-200">
                <BarChart2 className="h-5 w-5 text-slate-700" aria-hidden />
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 flex-shrink-0" />
                Analytics
              </div>
            </div>
            <Link
              href="/owner/revenue"
              className="no-underline inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 active:scale-[0.97] transition-all duration-150 shadow-sm text-xs font-bold"
              aria-label="Open revenue pages"
              title="Revenue"
            >
              Revenue
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>

          {/* Title */}
          <div className="mt-5">
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight leading-none">Reports</h1>
            <p className="mt-2 text-sm text-slate-500 max-w-md">Overview of reports and analytics</p>
          </div>

          <div className="mt-6 h-px bg-gradient-to-r from-slate-200 via-slate-100 to-transparent" />

          {/* Tabs */}
          <div className="mt-5 flex flex-wrap gap-2">
            {tabs.map((t) => {
              const active = pathname === t.href || pathname?.startsWith(`${t.href}/`);
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  aria-current={active ? "page" : undefined}
                  className={
                    `no-underline inline-flex items-center gap-2 h-9 px-4 rounded-xl text-xs font-bold border transition-all duration-150 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 ${t.ring} ` +
                    (active
                      ? `${t.pill} border-transparent text-white shadow-sm`
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 shadow-sm")
                  }
                >
                  <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${active ? "bg-white/70" : t.dot}`} aria-hidden />
                  {t.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      <div className="w-full">{children}</div>
    </div>
  );
}
