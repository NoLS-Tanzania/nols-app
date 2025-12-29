"use client";
import { useEffect, useState, useMemo } from "react";
import { ClipboardList, FileText, Clock, CheckCircle, XCircle, Loader2, Calendar, Users, TrendingUp, MapPin, AlertTriangle } from "lucide-react";
import Link from "next/link";
import axios from "axios";
import Chart from "@/components/Chart";
import type { ChartData } from "chart.js";

// Use same-origin for HTTP calls so Next.js rewrites proxy to the API
const api = axios.create({ baseURL: "", withCredentials: true });
function authify() {}

type SummaryData = {
  totalRequests: number;
  pendingRequests: number;
  inProgressRequests: number;
  completedRequests: number;
  canceledRequests: number;
  urgentRequests: number;
  roleCounts: Record<string, number>;
  tripTypeCounts: Record<string, number>;
  recentRequests: Array<{
    id: number;
    role: string;
    tripType: string;
    status: string;
    isUrgent?: boolean;
    createdAt: string;
    customer: { name: string; email: string };
  }>;
};

export default function PlanWithUsDashboardPage() {
  const [summary, setSummary] = useState<SummaryData>({
    totalRequests: 0,
    pendingRequests: 0,
    inProgressRequests: 0,
    completedRequests: 0,
    canceledRequests: 0,
    urgentRequests: 0,
    roleCounts: {},
    tripTypeCounts: {},
    recentRequests: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authify();
    async function load() {
      try {
        const r = await api.get<SummaryData>("/api/admin/plan-with-us/summary");
        if (r?.data) {
          setSummary(r.data);
        }
      } catch (err) {
        console.error("Failed to load summary", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Chart data for Requests by Role
  const roleChartData = useMemo<ChartData<"doughnut">>(() => {
    const labels = Object.keys(summary.roleCounts).filter(key => summary.roleCounts[key] > 0);
    const data = Object.values(summary.roleCounts).filter((v, i) => Object.values(summary.roleCounts)[i] > 0);

    const colors = [
      "rgba(59, 130, 246, 0.8)", // Blue
      "rgba(16, 185, 129, 0.8)", // Green
      "rgba(245, 158, 11, 0.8)", // Amber
      "rgba(139, 92, 246, 0.8)", // Purple
      "rgba(239, 68, 68, 0.8)", // Red
    ];

    return {
      labels,
      datasets: [
        {
          data,
          backgroundColor: colors.slice(0, labels.length),
          borderColor: "#fff",
          borderWidth: 2,
          hoverOffset: 4,
        },
      ],
    };
  }, [summary.roleCounts]);

  // Chart data for Requests by Trip Type
  const tripTypeChartData = useMemo<ChartData<"bar">>(() => {
    const labels = Object.keys(summary.tripTypeCounts).filter(key => summary.tripTypeCounts[key] > 0);
    const data = Object.values(summary.tripTypeCounts).filter((v, i) => Object.values(summary.tripTypeCounts)[i] > 0);

    return {
      labels,
      datasets: [
        {
          label: "Requests",
          data,
          backgroundColor: "rgba(59, 130, 246, 0.8)",
          borderColor: "rgba(59, 130, 246, 1)",
          borderWidth: 1,
        },
      ],
    };
  }, [summary.tripTypeCounts]);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:border-blue-300 group">
          <div className="flex items-center gap-4">
            <ClipboardList className="h-6 w-6 text-blue-600 group-hover:scale-110 transition-transform duration-300" />
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-500 mb-1">Total Requests</div>
              <div className="text-2xl font-bold text-gray-900">
                {loading ? "..." : (summary.totalRequests || 0).toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:border-amber-300 group">
          <div className="flex items-center gap-4">
            <Clock className="h-6 w-6 text-amber-600 group-hover:scale-110 transition-transform duration-300" />
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-500 mb-1">New Requests</div>
              <div className="text-2xl font-bold text-gray-900">
                {loading ? "..." : (summary.pendingRequests || 0).toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:border-blue-300 group">
          <div className="flex items-center gap-4">
            <Loader2 className="h-6 w-6 text-blue-600 group-hover:scale-110 group-hover:animate-spin transition-transform duration-300" />
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-500 mb-1">In Progress</div>
              <div className="text-2xl font-bold text-gray-900">
                {loading ? "..." : (summary.inProgressRequests || 0).toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:border-green-300 group">
          <div className="flex items-center gap-4">
            <CheckCircle className="h-6 w-6 text-green-600 group-hover:scale-110 transition-transform duration-300" />
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-500 mb-1">Completed</div>
              <div className="text-2xl font-bold text-gray-900">
                {loading ? "..." : (summary.completedRequests || 0).toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border-2 border-amber-300 p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:border-amber-400 group bg-gradient-to-br from-amber-50 to-amber-100">
          <div className="flex items-center gap-4">
            <AlertTriangle className="h-6 w-6 text-amber-600 group-hover:scale-110 transition-transform duration-300" />
            <div className="flex-1">
              <div className="text-sm font-medium text-amber-700 mb-1">Urgent (Pending)</div>
              <div className="text-2xl font-bold text-amber-900">
                {loading ? "..." : (summary.urgentRequests || 0).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/admin/plan-with-us/requests"
          className="no-underline bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:border-blue-300 group"
        >
          <div className="flex items-center gap-4">
            <FileText className="h-6 w-6 text-blue-600 group-hover:scale-110 transition-transform duration-300" />
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-500 mb-1">All Requests</div>
              <div className="text-lg font-semibold text-gray-900">View All</div>
            </div>
          </div>
        </Link>

        <Link
          href="/admin/plan-with-us/requests?status=NEW"
          className="no-underline bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:border-amber-300 group"
        >
          <div className="flex items-center gap-4">
            <Clock className="h-6 w-6 text-amber-600 group-hover:scale-110 transition-transform duration-300" />
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-500 mb-1">New Requests</div>
              <div className="text-lg font-semibold text-gray-900">
                {loading ? "..." : (summary.pendingRequests || 0)}
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Requests by Role */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm transition-all duration-300 hover:shadow-lg hover:border-blue-300 hover:-translate-y-1 group">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 group-hover:text-blue-600 transition-colors duration-300">
              <Users className="h-5 w-5 text-blue-600 group-hover:scale-110 transition-transform duration-300" />
              Requests by Role
            </h3>
            <p className="text-sm text-gray-500 mt-1">Distribution of requests by customer role</p>
          </div>
          <div className="h-64 w-full max-h-64 min-h-[300px] overflow-hidden relative">
            {loading ? (
              <div className="h-full w-full flex items-center justify-center">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-blue-600"></div>
              </div>
            ) : Object.keys(summary.roleCounts).some(k => summary.roleCounts[k] > 0) ? (
              <Chart
                type="doughnut"
                data={roleChartData}
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
            ) : (
              <div className="h-full flex items-center justify-center text-center">
                <div>
                  <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No role data available</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Requests by Trip Type */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm transition-all duration-300 hover:shadow-lg hover:border-green-300 hover:-translate-y-1 group">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 group-hover:text-green-600 transition-colors duration-300">
              <MapPin className="h-5 w-5 text-green-600 group-hover:scale-110 transition-transform duration-300" />
              Requests by Trip Type
            </h3>
            <p className="text-sm text-gray-500 mt-1">Distribution of requests by trip type</p>
          </div>
          <div className="h-64 w-full max-h-64 min-h-[300px] overflow-hidden relative">
            {loading ? (
              <div className="h-full w-full flex items-center justify-center">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-green-600"></div>
              </div>
            ) : Object.keys(summary.tripTypeCounts).some(k => summary.tripTypeCounts[k] > 0) ? (
              <Chart
                type="bar"
                data={tripTypeChartData}
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
                          const value = context.parsed.y || 0;
                          return `Requests: ${value}`;
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
            ) : (
              <div className="h-full flex items-center justify-center text-center">
                <div>
                  <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No trip type data available</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Requests */}
      {summary.recentRequests.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            Recent Requests
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trip Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {summary.recentRequests.map((request) => (
                  <tr key={request.id} className={`hover:bg-gray-50 transition-colors duration-150 ${request.isUrgent ? "bg-amber-50" : ""}`}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <div className="flex items-center gap-2">
                        #{request.id}
                        {request.isUrgent && (
                          <div title="Urgent request">
                            <AlertTriangle className="h-4 w-4 text-amber-600" />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{request.role}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{request.tripType}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>{request.customer.name}</div>
                      <div className="text-xs text-gray-400">{request.customer.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        request.status === "COMPLETED" ? "bg-green-100 text-green-800" :
                        request.status === "IN_PROGRESS" ? "bg-blue-100 text-blue-800" :
                        request.status === "CANCELED" ? "bg-red-100 text-red-800" :
                        "bg-amber-100 text-amber-800"
                      }`}>
                        {request.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(request.createdAt).toLocaleDateString()}
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

