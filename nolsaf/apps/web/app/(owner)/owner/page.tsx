"use client";
import { useEffect, useState } from "react";
import OwnerPageHeader from "@/components/OwnerPageHeader";
import Link from "next/link";
import { Building2, LineChart, FileText, MessageCircle, User, CalendarCheck, Eye } from "lucide-react";
import Chart from "@/components/Chart";
import axios from "axios";

function readOwnerName(): string | null {
  if (typeof window === "undefined") return null;
  // Try several common localStorage keys that might store the owner's name
  const tryKeys = ["ownerName", "name", "fullName", "displayName", "userName", "user"];
  for (const k of tryKeys) {
    try {
      const v = localStorage.getItem(k);
      if (!v) continue;
      // if value looks like JSON, attempt to parse and extract a name field
      if (v.trim().startsWith("{") || v.trim().startsWith("[")) {
        try {
          const obj = JSON.parse(v);
          if (obj?.name) return String(obj.name);
          if (obj?.fullName) return String(obj.fullName);
          if (obj?.displayName) return String(obj.displayName);
          if (obj?.firstName || obj?.lastName) return `${obj.firstName ?? ""} ${obj.lastName ?? ""}`.trim();
        } catch (e) {
          // ignore parse error
        }
      } else {
        return v;
      }
    } catch (e) {
      // ignore
    }
  }
  return null;
}

export default function OwnerPage() {
  const [ownerName, setOwnerName] = useState<string | null>(null);
  const monthlyLabels: string[] = [];
  const monthlyProps: number[] = [];
  const monthlyRevenue: number[] = [];
  const weeklyLabels: string[] = [];
  const weeklyProps: number[] = [];
  const weeklyBookings: number[] = [];

  useEffect(() => {
    const n = readOwnerName();
    if (n) setOwnerName(n);
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const api = axios.create({ baseURL: "" });
    if (token) api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

    // Intentionally keep charts empty until real data is provided by API.
  }, []);

  return (
    <div className="">
      {/* use full width inside the layout's centered frame so content reaches the right marker */}
      <div className="w-full space-y-6">
      <OwnerPageHeader
        icon={<User className="h-10 w-10 text-[#02665e]" />}
        title={(
          <>
            {ownerName && (
              <span className="block text-sm font-medium text-[#02665e]">Welcome {ownerName}</span>
            )}
            <span className="block text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-[#02665e] to-teal-400 bg-clip-text text-transparent">
              Owner Dashboard
            </span>
          </>
        )}
        subtitle={"Now you can overview your properties and performance"}
      />

  {/* Decorative quick-stats row under the header */}
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-white p-4 rounded-lg shadow-sm flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center">
            <LineChart className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <div className="text-xs text-gray-500">Occupancy</div>
            <div className="text-lg font-semibold">—</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center">
            <FileText className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <div className="text-xs text-gray-500">Revenue</div>
            <div className="text-lg font-semibold">—</div>
          </div>
        </div>
      </div>

  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
  <Link href="/owner/properties/approved" className="qlink relative overflow-hidden flex items-center gap-3 bg-white text-gray-900 border rounded-md pl-4 pr-3 py-2">
          <div className="absolute left-0 top-0 h-full w-3 md:w-4 bg-blue-600 rounded-l-md" aria-hidden />
          <Building2 className="h-4 w-4 text-blue-600" aria-hidden />
          <span className="ml-1">My Properties</span>
        </Link>

        <Link href="/owner/reports/overview" className="qlink relative overflow-hidden flex items-center gap-3 bg-white text-gray-900 border rounded-md pl-4 pr-3 py-2">
          <div className="absolute left-0 top-0 h-full w-3 md:w-4 bg-emerald-600 rounded-l-md" aria-hidden />
          <LineChart className="h-4 w-4 text-emerald-600" aria-hidden />
          <span className="ml-1">Reports</span>
        </Link>

  <Link href="/owner/revenue/paid" className="qlink relative overflow-hidden flex items-center gap-3 bg-white text-gray-900 border rounded-md pl-4 pr-3 py-2">
          <div className="absolute left-0 top-0 h-full w-3 md:w-4 bg-yellow-400 rounded-l-md" aria-hidden />
          <FileText className="h-4 w-4 text-yellow-400" aria-hidden />
          <span className="ml-1">Invoices</span>
        </Link>

        <Link href="/owner/messages" className="qlink relative overflow-hidden flex items-center gap-3 bg-white text-gray-900 border rounded-md pl-4 pr-3 py-2">
          <div className="absolute left-0 top-0 h-full w-3 md:w-4 bg-violet-600 rounded-l-md" aria-hidden />
          <MessageCircle className="h-4 w-4 text-violet-600" aria-hidden />
          <span className="ml-1">Messages</span>
        </Link>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        {/* Properties Listed vs Revenue */}
        <div className="bg-white rounded-lg border shadow-sm p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-600" />
              <span className="font-semibold text-gray-900">Properties Listed vs Revenue</span>
            </div>
            <Link href="/owner/reports/overview" aria-label="View details" className="text-[#02665e] hover:opacity-80">
              <Eye className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-2">
            <Chart
              type="line"
              data={{
                labels: monthlyLabels,
                datasets: [
                  { label: "Properties Listed", data: monthlyProps, borderColor: "#2563eb", backgroundColor: "rgba(37,99,235,0.2)", tension: 0.3 },
                  { label: "Revenue (TZS)", data: monthlyRevenue, borderColor: "#059669", backgroundColor: "rgba(5,150,105,0.2)", tension: 0.3, yAxisID: "y1" },
                ],
              }}
              options={{
                responsive: true,
                interaction: { mode: "index", intersect: false },
                plugins: { legend: { position: "bottom" } },
                scales: {
                  x: { title: { display: true, text: "Month" } },
                  y: { title: { display: true, text: "Properties" }, beginAtZero: true },
                  y1: { title: { display: true, text: "Revenue (TZS)" }, beginAtZero: true, position: "right", grid: { drawOnChartArea: false } },
                },
              }}
            />
          </div>
        </div>

        {/* Properties vs Bookings */}
        <div className="bg-white rounded-lg border shadow-sm p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <CalendarCheck className="h-5 w-5 text-violet-600" />
              <span className="font-semibold text-gray-900">Properties vs Bookings</span>
            </div>
            <Link href="/owner/reports/overview" aria-label="View details" className="text-[#02665e] hover:opacity-80">
              <Eye className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-2">
            <Chart
              type="bar"
              data={{
                labels: weeklyLabels,
                datasets: [
                  { label: "Active Properties", data: weeklyProps, backgroundColor: "#2563eb" },
                  { label: "Bookings", data: weeklyBookings, backgroundColor: "#7c3aed" },
                ],
              }}
              options={{
                responsive: true,
                plugins: { legend: { position: "bottom" } },
                scales: { x: { title: { display: true, text: "Day" } }, y: { title: { display: true, text: "Count" }, beginAtZero: true } },
              }}
            />
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
