import Link from "next/link";
import { BarChart3, Calendar, Wallet, FileText } from "lucide-react";
import type { ComponentType, SVGProps } from "react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function Card({
  href,
  title,
  description,
  Icon,
}: {
  href: string;
  title: string;
  description: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
}) {
  return (
    <Link
      href={href}
      className="group no-underline rounded-2xl border border-[#02665e]/10 bg-white/90 shadow-sm px-5 py-5 hover:border-[#02665e]/20 hover:bg-[#02665e]/[0.03] transition-colors"
    >
      <div className="flex items-start gap-4">
        <span className="grid place-items-center rounded-2xl h-12 w-12 border border-[#02665e]/15 bg-[#02665e]/5">
          <Icon className="h-5 w-5 text-[#02665e]" aria-hidden />
        </span>
        <div className="flex-1">
          <div className="text-sm font-semibold text-[#02665e]">{title}</div>
          <div className="mt-1 text-sm text-gray-600">{description}</div>
        </div>
      </div>
    </Link>
  );
}

export default function ManagementReportsHubPage() {
  return (
    <div className="page-content">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="py-6">
          <div className="text-center">
            <div className="mx-auto grid place-items-center rounded-2xl h-14 w-14 border border-[#02665e]/15 bg-[#02665e]/5">
              <FileText className="h-6 w-6 text-[#02665e]" aria-hidden />
            </div>
            <h1 className="mt-3 text-2xl font-bold text-gray-900">Management Reports</h1>
            <p className="mt-1 text-sm text-gray-600">
              Overview, revenue exports, and booking-related reporting.
            </p>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card
              href="/admin/management/reports/overview"
              title="Overview"
              description="Entry point for what’s included and quick links."
              Icon={BarChart3}
            />
            <Card
              href="/admin/management/reports/revenue"
              title="Revenue"
              description="Print/export NoLSAF revenue generated from all sources (commissions, subscriptions, etc.)."
              Icon={Wallet}
            />
            <Card
              href="/admin/management/reports/bookings"
              title="Bookings"
              description="Generate booking-only reports (single bookings, group stays, Plan With Us)."
              Icon={Calendar}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
