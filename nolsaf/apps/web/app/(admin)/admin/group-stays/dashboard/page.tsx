"use client";

import { useEffect, useState, useMemo } from "react";
import { Users, Calendar, CheckCircle, Clock, XCircle, TrendingUp, MapPin, Home, Utensils, Car, UserCheck, Wrench } from "lucide-react";
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
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:border-purple-300 group">
          <div className="flex items-center gap-4">
            <Users className="h-6 w-6 text-purple-600" />
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-500 mb-1">Total Bookings</div>
              <div className="text-2xl font-bold text-gray-900">
                {loading ? "..." : (summary.totalBookings || 0).toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:border-blue-300 group">
          <div className="flex items-center gap-4">
            <Clock className="h-6 w-6 text-blue-600" />
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-500 mb-1">Pending</div>
              <div className="text-2xl font-bold text-gray-900">
                {loading ? "..." : (summary.pendingBookings || 0).toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:border-green-300 group">
          <div className="flex items-center gap-4">
            <CheckCircle className="h-6 w-6 text-green-600" />
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-500 mb-1">Confirmed</div>
              <div className="text-2xl font-bold text-gray-900">
                {loading ? "..." : (summary.confirmedBookings || 0).toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:border-amber-300 group">
          <div className="flex items-center gap-4">
            <TrendingUp className="h-6 w-6 text-amber-600" />
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-500 mb-1">Total Passengers</div>
              <div className="text-2xl font-bold text-gray-900">
                {loading ? "..." : (summary.totalPassengers || 0).toLocaleString()}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Avg: {summary.averageHeadcount || 0} per booking
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          href="/admin/group-stays/bookings"
          className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:border-purple-300 group no-underline"
        >
          <div className="flex items-center gap-4">
            <Calendar className="h-6 w-6 text-purple-600 group-hover:scale-110 transition-transform duration-300" />
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-500 mb-1">All Bookings</div>
              <div className="text-lg font-semibold text-gray-900">View All</div>
            </div>
          </div>
        </Link>

        <Link
          href="/admin/group-stays/requests"
          className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:border-blue-300 group no-underline"
        >
          <div className="flex items-center gap-4">
            <Clock className="h-6 w-6 text-blue-600 group-hover:scale-110 transition-transform duration-300" />
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-500 mb-1">Pending Requests</div>
              <div className="text-lg font-semibold text-gray-900">
                {loading ? "..." : (summary.pendingBookings || 0)}
              </div>
            </div>
          </div>
        </Link>

        <Link
          href="/admin/group-stays/passengers"
          className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:border-green-300 group no-underline"
        >
          <div className="flex items-center gap-4">
            <Users className="h-6 w-6 text-green-600 group-hover:scale-110 transition-transform duration-300" />
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-500 mb-1">Passengers</div>
              <div className="text-lg font-semibold text-gray-900">Manage Roster</div>
            </div>
          </div>
        </Link>

        <Link
          href="/admin/group-stays/arrangements"
          className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:border-amber-300 group no-underline"
        >
          <div className="flex items-center gap-4">
            <Wrench className="h-6 w-6 text-amber-600 group-hover:scale-110 transition-transform duration-300" />
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-500 mb-1">Arrangements</div>
              <div className="text-lg font-semibold text-gray-900">Services</div>
            </div>
          </div>
        </Link>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Group Types Chart */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm transition-all duration-300 hover:shadow-lg hover:border-purple-300 hover:-translate-y-1 group">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 group-hover:text-purple-600 transition-colors duration-300">
              <Users className="h-5 w-5 text-purple-600 group-hover:scale-110 transition-transform duration-300" />
              Bookings by Group Type
            </h3>
            <p className="text-sm text-gray-500 mt-1">Distribution of bookings across different group types</p>
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

        {/* Status Distribution Chart */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm transition-all duration-300 hover:shadow-lg hover:border-blue-300 hover:-translate-y-1 group">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 group-hover:text-blue-600 transition-colors duration-300">
              <CheckCircle className="h-5 w-5 text-blue-600 group-hover:scale-110 transition-transform duration-300" />
              Status Distribution
            </h3>
            <p className="text-sm text-gray-500 mt-1">Current status breakdown of all bookings</p>
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

      {/* Arrangements Summary */}
      {summary.arrangements && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Wrench className="h-5 w-5 text-amber-600" />
            Arrangements Summary
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <Car className="h-6 w-6 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">{summary.arrangements.pickup}</div>
              <div className="text-xs text-gray-500 mt-1">Pickup</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <Car className="h-6 w-6 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">{summary.arrangements.transport}</div>
              <div className="text-xs text-gray-500 mt-1">Transport</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <Utensils className="h-6 w-6 text-purple-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">{summary.arrangements.meals}</div>
              <div className="text-xs text-gray-500 mt-1">Meals</div>
            </div>
            <div className="text-center p-4 bg-amber-50 rounded-lg">
              <UserCheck className="h-6 w-6 text-amber-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">{summary.arrangements.guide}</div>
              <div className="text-xs text-gray-500 mt-1">Guide</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <Wrench className="h-6 w-6 text-red-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">{summary.arrangements.equipment}</div>
              <div className="text-xs text-gray-500 mt-1">Equipment</div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Bookings */}
      {summary.recentBookings && summary.recentBookings.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-purple-600" />
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
      )}
    </div>
  );
}

