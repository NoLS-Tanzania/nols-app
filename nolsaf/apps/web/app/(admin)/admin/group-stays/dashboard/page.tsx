"use client";

import { useEffect, useState, useMemo } from "react";
import { Users, Calendar, CheckCircle, Clock, TrendingUp, Utensils, Car, UserCheck, Wrench } from "lucide-react";
import Link from "next/link";
import axios from "axios";
import Chart from "@/components/Chart";
import type { ChartData } from "chart.js";

// Use same-origin for HTTP calls so Next.js rewrites proxy to the API
const api = axios.create({ baseURL: "", withCredentials: true });
function authify() {}

type SummaryData = {
  totalBookings?: number;
  pendingBookings?: number;
  confirmedBookings?: number;
  processingBookings?: number;
  completedBookings?: number;
  canceledBookings?: number;
  totalPassengers?: number;
  averageHeadcount?: number;
  groupTypeCounts?: Record<string, number>;
  accommodationTypeCounts?: Record<string, number>;
  arrangements?: {
    pickup: number;
    transport: number;
    meals: number;
    guide: number;
    equipment: number;
  };
  recentBookings?: Array<{
    id: number;
    groupType: string;
    headcount: number;
    toRegion: string;
    status: string;
    createdAt: string;
    user: { id: number; name: string; email: string };
  }>;
};

export default function GroupStaysDashboardPage() {
  const [summary, setSummary] = useState<SummaryData>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authify();
    (async () => {
      try {
        const r = await api.get<SummaryData>("/admin/group-stays/summary");
        if (r?.data) setSummary(r.data);
      } catch (e) {
        console.error("Failed to load group stays summary:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Prepare chart data for Group Types
  const groupTypeChartData = useMemo<ChartData<"bar">>(() => {
    const counts = summary.groupTypeCounts || {};
    const labels = Object.keys(counts).map(key => key.charAt(0).toUpperCase() + key.slice(1));
    const data = Object.values(counts);

    return {
      labels,
      datasets: [
        {
          label: "Bookings by Group Type",
          data,
          backgroundColor: [
            "rgba(139, 92, 246, 0.8)", // Purple
            "rgba(59, 130, 246, 0.8)", // Blue
            "rgba(16, 185, 129, 0.8)", // Green
            "rgba(245, 158, 11, 0.8)", // Amber
            "rgba(239, 68, 68, 0.8)", // Red
            "rgba(107, 114, 128, 0.8)", // Gray
          ],
          borderColor: [
            "rgba(139, 92, 246, 1)",
            "rgba(59, 130, 246, 1)",
            "rgba(16, 185, 129, 1)",
            "rgba(245, 158, 11, 1)",
            "rgba(239, 68, 68, 1)",
            "rgba(107, 114, 128, 1)",
          ],
          borderWidth: 1,
        },
      ],
    };
  }, [summary.groupTypeCounts]);

  // Prepare chart data for Status Distribution
  const statusChartData = useMemo<ChartData<"doughnut">>(() => {
    return {
      labels: ["Pending", "Confirmed", "Processing", "Completed", "Canceled"],
      datasets: [
        {
          label: "Bookings by Status",
          data: [
            summary.pendingBookings || 0,
            summary.confirmedBookings || 0,
            summary.processingBookings || 0,
            summary.completedBookings || 0,
            summary.canceledBookings || 0,
          ],
          backgroundColor: [
            "rgba(156, 163, 175, 0.8)", // Gray - Pending
            "rgba(59, 130, 246, 0.8)", // Blue - Confirmed
            "rgba(245, 158, 11, 0.8)", // Amber - Processing
            "rgba(16, 185, 129, 0.8)", // Green - Completed
            "rgba(239, 68, 68, 0.8)", // Red - Canceled
          ],
          borderColor: "#fff",
          borderWidth: 2,
          hoverOffset: 4,
        },
      ],
    };
  }, [summary]);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-purple-500 to-purple-600" />
          <div className="p-5">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center flex-shrink-0">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Total Bookings</div>
                <div className="text-2xl font-bold text-gray-900 tabular-nums">
                  {loading ? <span className="inline-block h-7 w-12 bg-gray-200 rounded animate-pulse" /> : (summary.totalBookings || 0).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-blue-400 to-blue-600" />
          <div className="p-5">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Pending</div>
                <div className="text-2xl font-bold text-gray-900 tabular-nums">
                  {loading ? <span className="inline-block h-7 w-8 bg-gray-200 rounded animate-pulse" /> : (summary.pendingBookings || 0).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-emerald-400 to-emerald-600" />
          <div className="p-5">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center flex-shrink-0">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Confirmed</div>
                <div className="text-2xl font-bold text-gray-900 tabular-nums">
                  {loading ? <span className="inline-block h-7 w-8 bg-gray-200 rounded animate-pulse" /> : (summary.confirmedBookings || 0).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-amber-400 to-orange-500" />
          <div className="p-5">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Total Passengers</div>
                <div className="text-2xl font-bold text-gray-900 tabular-nums">
                  {loading ? <span className="inline-block h-7 w-16 bg-gray-200 rounded animate-pulse" /> : (summary.totalPassengers || 0).toLocaleString()}
                </div>
                <div className="text-xs text-gray-400 mt-1 font-medium">
                  Avg: {summary.averageHeadcount || 0} per booking
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          href="/admin/group-stays/bookings"
          className="group bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 no-underline overflow-hidden"
        >
          <div className="h-1 bg-gradient-to-r from-purple-500 to-purple-600" />
          <div className="p-5 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center flex-shrink-0 group-hover:bg-purple-100 transition-colors">
              <Calendar className="h-5 w-5 text-purple-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-0.5">All Bookings</div>
              <div className="text-base font-bold text-gray-900 group-hover:text-purple-700 transition-colors">View All</div>
            </div>
            <svg className="h-4 w-4 text-gray-300 group-hover:text-purple-400 group-hover:translate-x-0.5 transition-all flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </div>
        </Link>

        <Link
          href="/admin/group-stays/requests"
          className="group bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 no-underline overflow-hidden"
        >
          <div className="h-1 bg-gradient-to-r from-blue-400 to-blue-600" />
          <div className="p-5 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-100 transition-colors">
              <Clock className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Pending Requests</div>
              <div className="text-base font-bold text-gray-900 group-hover:text-blue-700 transition-colors tabular-nums">
                {loading ? <span className="inline-block h-5 w-6 bg-gray-200 rounded animate-pulse" /> : (summary.pendingBookings || 0)}
              </div>
            </div>
            <svg className="h-4 w-4 text-gray-300 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </div>
        </Link>

        <Link
          href="/admin/group-stays/passengers"
          className="group bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 no-underline overflow-hidden"
        >
          <div className="h-1 bg-gradient-to-r from-emerald-400 to-emerald-600" />
          <div className="p-5 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-100 transition-colors">
              <Users className="h-5 w-5 text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Passengers</div>
              <div className="text-base font-bold text-gray-900 group-hover:text-emerald-700 transition-colors">Manage Roster</div>
            </div>
            <svg className="h-4 w-4 text-gray-300 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </div>
        </Link>

        <Link
          href="/admin/group-stays/arrangements"
          className="group bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 no-underline overflow-hidden"
        >
          <div className="h-1 bg-gradient-to-r from-amber-400 to-orange-500" />
          <div className="p-5 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center flex-shrink-0 group-hover:bg-amber-100 transition-colors">
              <Wrench className="h-5 w-5 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Arrangements</div>
              <div className="text-base font-bold text-gray-900 group-hover:text-amber-700 transition-colors">Services</div>
            </div>
            <svg className="h-4 w-4 text-gray-300 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </div>
        </Link>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Group Types Chart */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-purple-500 to-blue-500" />
          <div className="p-6">
            <div className="mb-4">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <span className="inline-flex items-center justify-center h-7 w-7 rounded-md bg-purple-50 border border-purple-100"><Users className="h-4 w-4 text-purple-600" /></span>
                Bookings by Group Type
              </h3>
              <p className="text-xs text-gray-400 mt-1 ml-9">Distribution of bookings across different group types</p>
            </div>
          <div className="h-64 w-full max-h-64 min-h-[300px] overflow-hidden relative">
            {loading ? (
              <div className="h-full w-full flex items-center justify-center">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-purple-600"></div>
              </div>
            ) : (
              <Chart
                type="bar"
                data={groupTypeChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: false,
                    },
                    tooltip: {
                      callbacks: {
                        label: (context: any) => {
                          const label = context.label || "";
                          const value = context.parsed.y || 0;
                          return `${label}: ${value} bookings`;
                        },
                      },
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        stepSize: 1,
                        font: {
                          size: 11,
                        },
                      },
                      grid: {
                        color: "rgba(0, 0, 0, 0.1)",
                      },
                      title: {
                        display: true,
                        text: "Number of Bookings",
                        font: {
                          size: 12,
                        },
                      },
                    },
                    x: {
                      grid: {
                        display: false,
                      },
                      ticks: {
                        font: {
                          size: 11,
                        },
                      },
                    },
                  },
                }}
              />
            )}
          </div>
          </div>
        </div>

        {/* Status Distribution Chart */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-blue-400 to-emerald-500" />
          <div className="p-6">
            <div className="mb-4">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <span className="inline-flex items-center justify-center h-7 w-7 rounded-md bg-blue-50 border border-blue-100"><CheckCircle className="h-4 w-4 text-blue-600" /></span>
                Status Distribution
              </h3>
              <p className="text-xs text-gray-400 mt-1 ml-9">Current status breakdown of all bookings</p>
            </div>
          <div className="h-64 w-full max-h-64 min-h-[300px] overflow-hidden relative">
            {loading ? (
              <div className="h-full w-full flex items-center justify-center">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-blue-600"></div>
              </div>
            ) : (
              <Chart
                type="doughnut"
                data={statusChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: "right",
                      labels: {
                        usePointStyle: true,
                        padding: 20,
                        font: {
                          size: 12,
                        },
                      },
                    },
                    tooltip: {
                      callbacks: {
                        label: (context: any) => {
                          const label = context.label || "";
                          const value = context.parsed || 0;
                          const total = context.dataset.data.reduce((sum: number, val: number) => sum + val, 0);
                          const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                          return `${label}: ${value} (${percentage}%)`;
                        },
                      },
                    },
                  },
                }}
              />
            )}
          </div>
          </div>
        </div>
      </div>

      {/* Arrangements Summary */}
      {summary.arrangements && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-amber-400 to-orange-500" />
          <div className="p-6">
            <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="inline-flex items-center justify-center h-7 w-7 rounded-md bg-amber-50 border border-amber-100"><Wrench className="h-4 w-4 text-amber-600" /></span>
              Arrangements Summary
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="text-center p-4 bg-blue-50 rounded-xl border border-blue-100">
                <Car className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900">{summary.arrangements.pickup}</div>
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mt-1">Pickup</div>
              </div>
              <div className="text-center p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                <Car className="h-6 w-6 text-emerald-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900">{summary.arrangements.transport}</div>
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mt-1">Transport</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-xl border border-purple-100">
                <Utensils className="h-6 w-6 text-purple-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900">{summary.arrangements.meals}</div>
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mt-1">Meals</div>
              </div>
              <div className="text-center p-4 bg-amber-50 rounded-xl border border-amber-100">
                <UserCheck className="h-6 w-6 text-amber-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900">{summary.arrangements.guide}</div>
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mt-1">Guide</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-xl border border-red-100">
                <Wrench className="h-6 w-6 text-red-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900">{summary.arrangements.equipment}</div>
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mt-1">Equipment</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Bookings */}
      {summary.recentBookings && summary.recentBookings.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-purple-500 to-indigo-500" />
          <div className="p-6">
            <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="inline-flex items-center justify-center h-7 w-7 rounded-md bg-purple-50 border border-purple-100"><Calendar className="h-4 w-4 text-purple-600" /></span>
              Recent Bookings
            </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Group Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Headcount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Destination</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {summary.recentBookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-gray-50 transition-colors duration-150">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">#{booking.id}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 capitalize">{booking.groupType}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{booking.headcount}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{booking.toRegion || "N/A"}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          booking.status === "PENDING"
                            ? "bg-gray-100 text-gray-700"
                            : booking.status === "CONFIRMED"
                            ? "bg-blue-100 text-blue-700"
                            : booking.status === "PROCESSING"
                            ? "bg-yellow-100 text-yellow-700"
                            : booking.status === "COMPLETED"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {booking.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{booking.user?.name || booking.user?.email || "N/A"}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {new Date(booking.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </div>
        </div>
      )}
    </div>
  );
}

