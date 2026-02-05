"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, ArrowUpRight } from "lucide-react";

export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const tabs = [
    {
      href: "/owner/reports/overview",
      label: "Overview",
      dot: "bg-indigo-500",
      active: "bg-indigo-600 border-indigo-600 text-white",
      focus: "focus-visible:ring-indigo-200",
    },
    {
      href: "/owner/reports/revenue",
      label: "Revenue",
      dot: "bg-emerald-500",
      active: "bg-emerald-600 border-emerald-600 text-white",
      focus: "focus-visible:ring-emerald-200",
    },
    {
      href: "/owner/reports/bookings",
      label: "Bookings",
      dot: "bg-violet-500",
      active: "bg-violet-600 border-violet-600 text-white",
      focus: "focus-visible:ring-violet-200",
    },
    {
      href: "/owner/reports/stays",
      label: "Stays",
      dot: "bg-amber-500",
      active: "bg-amber-600 border-amber-600 text-white",
      focus: "focus-visible:ring-amber-200",
    },
    {
      href: "/owner/reports/occupancy",
      label: "Occupancy",
      dot: "bg-sky-500",
      active: "bg-sky-600 border-sky-600 text-white",
      focus: "focus-visible:ring-sky-200",
    },
    {
      href: "/owner/reports/customers",
      label: "Customers",
      dot: "bg-rose-500",
      active: "bg-rose-600 border-rose-600 text-white",
      focus: "focus-visible:ring-rose-200",
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 sm:p-8">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-4 items-start">
            <div className="hidden sm:block" />

            <div className="min-w-0 flex flex-col items-center text-center">
              <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-xs font-semibold text-blue-700">
                <FileText className="h-4 w-4" aria-hidden />
                Analytics
              </div>
              <h1 className="mt-3 text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Reports</h1>
              <p className="mt-1 text-sm text-gray-600 max-w-2xl">Overview of reports and analytics</p>
            </div>

            <div className="flex items-center justify-start sm:justify-end">
              <Link
                href="/owner/revenue"
                className="no-underline inline-flex items-center justify-center h-10 px-3 rounded-md border border-gray-200 bg-white text-gray-800 shadow-sm hover:bg-gray-50 active:scale-[0.99] transition"
                aria-label="Open revenue pages"
                title="Revenue"
              >
                <span className="text-sm font-semibold">Revenue</span>
                <ArrowUpRight className="ml-2 h-4 w-4" aria-hidden />
              </Link>
            </div>
          </div>

          <div className="mt-6 flex justify-center">
            <div className="inline-flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-gray-50/80 p-2">
            {tabs.map((t) => {
              const active = pathname === t.href || pathname?.startsWith(`${t.href}/`);
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  aria-current={active ? "page" : undefined}
                  className={
                    "no-underline inline-flex items-center gap-2 h-10 px-4 rounded-xl text-sm font-semibold border shadow-sm transition hover:shadow-md active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-0 " +
                    t.focus +
                    " " +
                    (active
                      ? t.active
                      : "bg-white border-gray-200 text-slate-800 hover:bg-white")
                  }
                >
                  <span className={"h-2 w-2 rounded-sm " + t.dot} aria-hidden />
                  {t.label}
                </Link>
              );
            })}
            </div>
          </div>
        </div>
      </div>

      <div className="w-full">{children}</div>
    </div>
  );
}
