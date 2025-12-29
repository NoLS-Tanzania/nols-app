"use client";

import { useEffect, useState, useMemo } from "react";
import { Truck, LineChart, FileText, MessageCircle, Users, TrendingUp } from "lucide-react";
import Link from "next/link";
import axios from "axios";
import Chart from "@/components/Chart";
import type { ChartData } from "chart.js";

// Use same-origin for HTTP calls so Next.js rewrites proxy to the API
const api = axios.create({ baseURL: "", withCredentials: true });

type SummaryData = {
  totalDrivers?: number;
  activeDrivers?: number;
  suspendedDrivers?: number;
  topBookings?: number;
  recentDrivers?: Array<{ id: number; name: string; email: string; phone: string | null; createdAt: string }>;
  bookingPerformance?: {
    high: number;
    medium: number;
    low: number;
    none: number;
  };
};

export default function DriversDashboardPage() {
  const [summary, setSummary] = useState<SummaryData>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const r = await api.get<SummaryData>("/api/admin/drivers/summary");
        if (r?.data) setSummary(r.data);
      } catch (e) {
        console.error("Failed to load drivers summary:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const activeDrivers = summary.activeDrivers ?? 0;
  const totalBookings = summary.topBookings ?? 0;

  // Prepare chart data for Line Chart
  const chartData = useMemo<ChartData<"line">>(() => {
    const perf = summary.bookingPerformance || { high: 0, medium: 0, low: 0, none: 0 };
    const suspended = summary.suspendedDrivers || 0;
    const active = summary.activeDrivers || 0;

    return {
      labels: [
        "Active Drivers",
        "Suspended Drivers",
        "High Performers",
        "Medium Performers",
        "Low Performers",
        "No Bookings",
      ],
      datasets: [
        {
          label: "Driver Count",
          data: [
            active,
            suspended,
            perf.high,
            perf.medium,
            perf.low,
            perf.none,
          ],
          borderColor: "rgba(59, 130, 246, 1)",
          backgroundColor: "rgba(59, 130, 246, 0.1)",
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: "rgba(59, 130, 246, 1)",
          pointBorderColor: "#fff",
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7,
        },
      ],
    };
  }, [summary]);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:border-blue-300 group">
          <div className="flex items-center gap-4">
            <Users className="h-6 w-6 text-blue-600" />
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-500 mb-1">Active drivers</div>
              <div className="text-2xl font-bold text-gray-900">
                {loading ? (
                  <span className="inline-block w-8 h-6 bg-gray-200 animate-pulse rounded" />
                ) : (
                  activeDrivers.toLocaleString()
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:border-emerald-300 group">
          <div className="flex items-center gap-4">
            <TrendingUp className="h-6 w-6 text-emerald-600" />
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-500 mb-1">Top Bookings</div>
              <div className="text-2xl font-bold text-gray-900">
                {loading ? (
                  <span className="inline-block w-8 h-6 bg-gray-200 animate-pulse rounded" />
                ) : (
                  totalBookings.toLocaleString()
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          href="/admin/drivers"
          className="group relative overflow-hidden bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-all duration-300 hover:border-blue-300 hover:-translate-y-0.5 no-underline"
        >
          <div className="absolute left-0 top-0 h-full w-1 bg-blue-600 rounded-l-lg group-hover:w-1.5 transition-all duration-300" aria-hidden />
          <div className="flex items-center gap-3 pl-2">
            <Truck className="h-5 w-5 text-blue-600" />
            <span className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors duration-300">All Drivers</span>
          </div>
        </Link>

        <Link
          href="/admin/bookings"
          className="group relative overflow-hidden bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-all duration-300 hover:border-emerald-300 hover:-translate-y-0.5 no-underline"
        >
          <div className="absolute left-0 top-0 h-full w-1 bg-emerald-600 rounded-l-lg group-hover:w-1.5 transition-all duration-300" aria-hidden />
          <div className="flex items-center gap-3 pl-2">
            <LineChart className="h-5 w-5 text-emerald-600" />
            <span className="font-medium text-gray-900 group-hover:text-emerald-600 transition-colors duration-300">Bookings</span>
          </div>
        </Link>

        <Link
          href="/admin/reports"
          className="group relative overflow-hidden bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-all duration-300 hover:border-amber-300 hover:-translate-y-0.5 no-underline"
        >
          <div className="absolute left-0 top-0 h-full w-1 bg-amber-500 rounded-l-lg group-hover:w-1.5 transition-all duration-300" aria-hidden />
          <div className="flex items-center gap-3 pl-2">
            <FileText className="h-5 w-5 text-amber-600" />
            <span className="font-medium text-gray-900 group-hover:text-amber-600 transition-colors duration-300">Reports</span>
          </div>
        </Link>

        <Link
          href="/admin/messages"
          className="group relative overflow-hidden bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-all duration-300 hover:border-violet-300 hover:-translate-y-0.5 no-underline"
        >
          <div className="absolute left-0 top-0 h-full w-1 bg-violet-600 rounded-l-lg group-hover:w-1.5 transition-all duration-300" aria-hidden />
          <div className="flex items-center gap-3 pl-2">
            <MessageCircle className="h-5 w-5 text-violet-600" />
            <span className="font-medium text-gray-900 group-hover:text-violet-600 transition-colors duration-300">Messages</span>
          </div>
        </Link>
      </div>

      {/* Line Chart */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm overflow-hidden">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Driver Performance Overview</h3>
          <p className="text-sm text-gray-500 mt-1">Distribution of drivers by status and booking performance</p>
        </div>
        <div className="w-full relative overflow-hidden h-[384px] max-h-[384px] min-h-[300px]">
          {loading ? (
            <div className="h-full w-full flex flex-col justify-end p-4">
              {/* Skeleton Chart */}
              <div className="relative h-full w-full">
                {/* Y-axis skeleton */}
                <div className="absolute left-0 top-0 bottom-8 w-8 flex flex-col justify-between">
                  <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                </div>
                
                {/* Chart area skeleton */}
                <div className="ml-10 h-full relative">
                  {/* Grid lines */}
                  <div className="absolute inset-0 flex flex-col justify-between">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="h-px bg-gray-200"></div>
                    ))}
                  </div>
                  
                  {/* Skeleton line chart */}
                  <div className="absolute bottom-0 left-0 right-0 h-full">
                    <svg className="w-full h-full" viewBox="0 0 400 300" preserveAspectRatio="none">
                      {/* Skeleton line path */}
                      <path
                        d="M 0 250 Q 80 200, 160 180 T 320 150 T 400 100"
                        fill="none"
                        stroke="#e5e7eb"
                        strokeWidth="3"
                        strokeDasharray="5,5"
                        className="animate-pulse"
                      />
                      {/* Skeleton points */}
                      {[0, 80, 160, 240, 320, 400].map((x, i) => {
                        const y = 250 - (i * 25);
                        return (
                          <circle
                            key={i}
                            cx={x}
                            cy={y}
                            r="6"
                            fill="#d1d5db"
                            className="animate-pulse"
                          />
                        );
                      })}
                    </svg>
                  </div>
                  
                  {/* X-axis labels skeleton */}
                  <div className="absolute bottom-0 left-0 right-0 flex justify-between px-2">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="h-3 w-12 bg-gray-200 rounded animate-pulse"></div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <Chart
              type="line"
              data={chartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                  padding: {
                    top: 10,
                    bottom: 10,
                    left: 10,
                    right: 10,
                  },
                },
                plugins: {
                  legend: {
                    display: true,
                    position: "top",
                    labels: {
                      padding: 15,
                      font: {
                        size: 12,
                      },
                      usePointStyle: true,
                    },
                  },
                  tooltip: {
                    callbacks: {
                      label: (context: any) => {
                        const label = context.dataset.label || "";
                        const value = context.parsed.y || 0;
                        return `${label}: ${value} drivers`;
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
                      text: "Number of Drivers",
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

      {/* Recent Drivers Section */}
      {summary.recentDrivers && summary.recentDrivers.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Recent Drivers</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {summary.recentDrivers.slice(0, 5).map((driver) => (
              <div
                key={driver.id}
                className="p-4 hover:bg-gray-50 transition-colors duration-200"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">{driver.name || "Unnamed Driver"}</div>
                    <div className="text-sm text-gray-500">{driver.email}</div>
                    {driver.phone && <div className="text-sm text-gray-500">{driver.phone}</div>}
                  </div>
                  <div className="text-xs text-gray-400">
                    {new Date(driver.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
