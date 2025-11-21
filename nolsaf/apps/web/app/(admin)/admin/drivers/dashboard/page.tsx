import { Truck, LineChart, FileText, MessageCircle } from "lucide-react";
import Link from "next/link";

export default function DriversDashboardPage() {
  return (
    <div>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-white p-4 rounded-lg shadow-sm flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center">
              <LineChart className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <div className="text-xs text-gray-500">Active drivers</div>
              <div className="text-lg font-semibold">—</div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <div className="text-xs text-gray-500">Bookings</div>
              <div className="text-lg font-semibold">—</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <Link href="/admin/drivers" className="qlink relative overflow-hidden flex items-center gap-3 bg-white text-gray-900 border rounded-md pl-4 pr-3 py-2">
            <div className="absolute left-0 top-0 h-full w-3 md:w-4 bg-blue-600 rounded-l-md" aria-hidden />
            <Truck className="h-4 w-4 text-blue-600" aria-hidden />
            <span className="ml-1">All Drivers</span>
          </Link>

          <Link href="/admin/bookings" className="qlink relative overflow-hidden flex items-center gap-3 bg-white text-gray-900 border rounded-md pl-4 pr-3 py-2">
            <div className="absolute left-0 top-0 h-full w-3 md:w-4 bg-emerald-600 rounded-l-md" aria-hidden />
            <LineChart className="h-4 w-4 text-emerald-600" aria-hidden />
            <span className="ml-1">Bookings</span>
          </Link>

          <Link href="/admin/reports" className="qlink relative overflow-hidden flex items-center gap-3 bg-white text-gray-900 border rounded-md pl-4 pr-3 py-2">
            <div className="absolute left-0 top-0 h-full w-3 md:w-4 bg-yellow-400 rounded-l-md" aria-hidden />
            <FileText className="h-4 w-4 text-yellow-400" aria-hidden />
            <span className="ml-1">Reports</span>
          </Link>

          <Link href="/admin/messages" className="qlink relative overflow-hidden flex items-center gap-3 bg-white text-gray-900 border rounded-md pl-4 pr-3 py-2">
            <div className="absolute left-0 top-0 h-full w-3 md:w-4 bg-violet-600 rounded-l-md" aria-hidden />
            <MessageCircle className="h-4 w-4 text-violet-600" aria-hidden />
            <span className="ml-1">Messages</span>
          </Link>
        </div>

        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          <div className="card h-32" />
          <div className="card h-32" />
        </div>
      </div>
    </div>
  );
}
