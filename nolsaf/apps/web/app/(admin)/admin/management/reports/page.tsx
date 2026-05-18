import Link from "next/link";
import { ArrowRight, BarChart3, Calendar, FileText, Wallet } from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import LivePerformancePulse from "./LivePerformancePulse";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function Card({
  href,
  title,
  description,
  eyebrow,
  meta,
  Icon,
}: {
  href: string;
  title: string;
  description: string;
  eyebrow: string;
  meta: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-5 rounded-[24px] border border-slate-200 bg-white p-6 no-underline shadow-[0_2px_16px_-6px_rgba(15,23,42,0.10)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#02665e]/25 hover:shadow-[0_8px_32px_-8px_rgba(2,102,94,0.16)]"
    >
      <div className="flex items-center justify-between">
        <span className="grid h-12 w-12 place-items-center rounded-[18px] border border-slate-100 bg-slate-50">
          <Icon className="h-5 w-5 text-[#02665e]" aria-hidden />
        </span>
        <span className="text-[10px] font-bold uppercase tracking-[0.26em] text-slate-400">{eyebrow}</span>
      </div>

      <div>
        <div className="text-[15px] font-bold text-slate-900">{title}</div>
        <div className="mt-1.5 text-sm leading-6 text-slate-500">{description}</div>
      </div>

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <div className="text-[11px] text-slate-400">{meta}</div>
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#02665e] transition-transform duration-200 group-hover:translate-x-0.5">
          Open
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </span>
      </div>
    </Link>
  );
}

export default function ManagementReportsHubPage() {
  return (
    <div className="page-content bg-[#f4f5f6]">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="space-y-6 py-8 sm:py-10">
          <div className="flex items-center gap-4">
            <div className="grid h-11 w-11 place-items-center rounded-[16px] border border-slate-200 bg-white shadow-sm">
              <FileText className="h-5 w-5 text-[#02665e]" aria-hidden />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.28em] text-slate-400">Admin - Management</div>
              <h1 className="mt-0.5 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">Management Reports</h1>
            </div>
            <p className="ml-auto hidden max-w-xs text-sm leading-6 text-slate-500 lg:block">
              Live performance first, then the right report lane for the detail.
            </p>
          </div>

          <LivePerformancePulse />

          <div className="grid gap-4 sm:grid-cols-3">
            <Card
              href="/admin/management/reports/overview"
              title="Overview"
              eyebrow="Start Here"
              meta="Scope - Entry points - Quick links"
              description="Open this first when you want the reporting map before drilling into any specific export or management question."
              Icon={BarChart3}
            />
            <Card
              href="/admin/management/reports/revenue"
              title="Revenue"
              eyebrow="Finance"
              meta="Commission - Subscriptions - Platform revenue"
              description="Follow money movement across the platform with a dedicated finance lane for summaries and exports."
              Icon={Wallet}
            />
            <Card
              href="/admin/management/reports/bookings"
              title="Bookings"
              eyebrow="Operations"
              meta="Single bookings - Group stays - Legacy planning"
              description="Investigate booking flow, activity volume, and management follow-up without mixing in finance noise."
              Icon={Calendar}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
