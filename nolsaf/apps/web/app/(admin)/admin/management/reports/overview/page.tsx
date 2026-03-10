import Link from "next/link";
import { ArrowRight, BarChart3, Calendar, ChevronLeft, FileText, Wallet } from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function ManagementReportsOverviewPage() {
  return (
    <div className="page-content bg-[#f4f5f6]">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="py-8 sm:py-10 space-y-6">

          {/* Breadcrumb + header */}
          <div>
            <Link
              href="/admin/management/reports"
              className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400 no-underline hover:text-[#02665e]"
            >
              <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
              Reports hub
            </Link>
            <div className="mt-3 flex items-center gap-4">
              <div className="grid h-11 w-11 place-items-center rounded-[16px] border border-slate-200 bg-white shadow-sm">
                <FileText className="h-5 w-5 text-[#02665e]" aria-hidden />
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.28em] text-slate-400">Admin · Management · Reports</div>
                <h1 className="mt-0.5 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">Overview</h1>
              </div>
            </div>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-500">
              Two focused report lanes — pick the one that matches what you need to investigate.
            </p>
          </div>

          {/* Lane cards */}
          <div className="grid gap-4 sm:grid-cols-2">

            <Link
              href="/admin/management/reports/revenue"
              className="group flex flex-col gap-5 rounded-[24px] border border-slate-200 bg-white p-6 no-underline shadow-[0_2px_16px_-6px_rgba(15,23,42,0.10)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#02665e]/25 hover:shadow-[0_8px_32px_-8px_rgba(2,102,94,0.16)]"
            >
              <div className="flex items-center justify-between">
                <span className="grid h-12 w-12 place-items-center rounded-[18px] border border-slate-100 bg-slate-50">
                  <Wallet className="h-5 w-5 text-[#02665e]" aria-hidden />
                </span>
                <span className="text-[10px] font-bold uppercase tracking-[0.26em] text-slate-400">Finance</span>
              </div>
              <div>
                <div className="text-[15px] font-bold text-slate-900">Revenue</div>
                <div className="mt-1.5 text-sm leading-6 text-slate-500">
                  Commission from owners and drivers, subscription income by property type, and platform-level revenue summaries.
                </div>
              </div>
              <div className="mt-auto flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
                <div className="text-[11px] text-slate-400">Commission · Subscriptions · Platform revenue</div>
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#02665e] transition-transform duration-200 group-hover:translate-x-0.5">
                  Open <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </span>
              </div>
            </Link>

            <Link
              href="/admin/management/reports/bookings"
              className="group flex flex-col gap-5 rounded-[24px] border border-slate-200 bg-white p-6 no-underline shadow-[0_2px_16px_-6px_rgba(15,23,42,0.10)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#02665e]/25 hover:shadow-[0_8px_32px_-8px_rgba(2,102,94,0.16)]"
            >
              <div className="flex items-center justify-between">
                <span className="grid h-12 w-12 place-items-center rounded-[18px] border border-slate-100 bg-slate-50">
                  <Calendar className="h-5 w-5 text-[#02665e]" aria-hidden />
                </span>
                <span className="text-[10px] font-bold uppercase tracking-[0.26em] text-slate-400">Operations</span>
              </div>
              <div>
                <div className="text-[15px] font-bold text-slate-900">Bookings</div>
                <div className="mt-1.5 text-sm leading-6 text-slate-500">
                  Single bookings, group stays, and Plan With Us requests — booking flow, activity volume, and management follow-up.
                </div>
              </div>
              <div className="mt-auto flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
                <div className="text-[11px] text-slate-400">Single bookings · Group stays · Plan With Us</div>
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#02665e] transition-transform duration-200 group-hover:translate-x-0.5">
                  Open <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </span>
              </div>
            </Link>

          </div>

          {/* Info strip */}
          <div className="flex flex-wrap items-center gap-6 rounded-[20px] border border-slate-200 bg-white px-6 py-4 shadow-[0_1px_8px_-2px_rgba(15,23,42,0.06)]">
            {[
              { Icon: BarChart3, label: "2 report lanes", sub: "revenue · bookings" },
              { Icon: Wallet,    label: "TZS 25,000 target subscription", sub: "minimum TZS 7,000 per property" },
              { Icon: Calendar,  label: "3 booking types covered", sub: "single · group · plan with us" },
            ].map(({ Icon, label, sub }) => (
              <div key={label} className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-[14px] border border-slate-100 bg-slate-50">
                  <Icon className="h-4 w-4 text-[#02665e]" aria-hidden />
                </span>
                <div>
                  <div className="text-[13px] font-bold text-slate-800">{label}</div>
                  <div className="text-[11px] text-slate-400">{sub}</div>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}
