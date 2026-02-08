import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function ManagementReportsOverviewPage() {
  return (
    <div className="page-content">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="py-6">
          <h1 className="text-2xl font-bold text-gray-900">Reports Overview</h1>
          <p className="mt-1 text-sm text-gray-600">
            Use these sections to generate focused exports.
          </p>

          <div className="mt-6 grid grid-cols-1 gap-4">
            <div className="rounded-2xl border border-[#02665e]/10 bg-white/90 shadow-sm p-5">
              <div className="text-sm font-semibold text-[#02665e]">Revenue sources (planned)</div>
              <ul className="mt-2 text-sm text-gray-700 list-disc pl-5">
                <li>Owner commission from accommodation bookings</li>
                <li>Driver commission from completed trips</li>
                <li>Subscriptions (annual), fee by property type (target: TZS 25,000; minimum: TZS 7,000)</li>
              </ul>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link href="/admin/management/reports/revenue" className="no-underline text-sm font-semibold text-[#02665e] hover:underline">
                  Go to Revenue report
                </Link>
                <Link href="/admin/management/reports/bookings" className="no-underline text-sm font-semibold text-[#02665e] hover:underline">
                  Go to Booking reports
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-[#02665e]/10 bg-white/90 shadow-sm p-5">
              <div className="text-sm font-semibold text-[#02665e]">Booking report types</div>
              <ul className="mt-2 text-sm text-gray-700 list-disc pl-5">
                <li>Single booking</li>
                <li>Group stay</li>
                <li>Plan With Us</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
