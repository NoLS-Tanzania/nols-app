"use client";

import { useEffect, useState, useMemo } from "react";
import { Users, UserCheck, Mail, Phone, Lock, TrendingUp, Calendar, DollarSign, ShoppingCart, Car, CheckCircle, Clock, Eye } from "lucide-react";
import Link from "next/link";
import axios from "axios";
import Chart from "@/components/Chart";
import type { ChartData } from "chart.js";

const api = axios.create({ baseURL: "", withCredentials: true });
function authify() {}

type SummaryData = {
  totalCustomers?: number;
  verifiedEmailCount?: number;
  verifiedPhoneCount?: number;
  twoFactorEnabledCount?: number;
  newCustomersLast7Days?: number;
  newCustomersLast30Days?: number;
  recentCustomers?: Array<{
    id: number;
    name: string | null;
    email: string;
    phone: string | null;
    createdAt: string;
    emailVerifiedAt: string | null;
    phoneVerifiedAt: string | null;
    twoFactorEnabled: boolean;
  }>;
  totalBookings?: number;
  confirmedBookings?: number;
  checkedInBookings?: number;
  completedBookings?: number;
  totalRevenue?: number;
  customersWithBookings?: number;
  activeCustomers?: number;
  totalGroupBookings?: number;
  transportationRequests?: number;
  avgBookingsPerCustomer?: number;
};

export default function UsersDashboardPage() {
  const [summary, setSummary] = useState<SummaryData>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authify();
    (async () => {
      try {
        const r = await api.get<SummaryData>("/admin/users/summary");
        if (r?.data) setSummary(r.data);
      } catch (e) {
        console.error("Failed to load users summary:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Prepare chart data for Booking Status Distribution
  const bookingStatusChartData = useMemo<ChartData<"doughnut">>(() => {
    return {
      labels: ["Confirmed", "Checked In", "Completed", "Other"],
      datasets: [
        {
          label: "Bookings by Status",
          data: [
            summary.confirmedBookings || 0,
            summary.checkedInBookings || 0,
            summary.completedBookings || 0,
            (summary.totalBookings || 0) - (summary.confirmedBookings || 0) - (summary.checkedInBookings || 0) - (summary.completedBookings || 0),
          ],
          backgroundColor: [
            "rgba(59, 130, 246, 0.8)", // Blue - Confirmed
            "rgba(16, 185, 129, 0.8)", // Green - Checked In
            "rgba(139, 92, 246, 0.8)", // Purple - Completed
            "rgba(156, 163, 175, 0.8)", // Gray - Other
          ],
          borderColor: "#fff",
          borderWidth: 2,
          hoverOffset: 4,
        },
      ],
    };
  }, [summary]);

  // Prepare chart data for Verification Status
  const verificationChartData = useMemo<ChartData<"bar">>(() => {
    const total = summary.totalCustomers || 0;
    const emailVerified = summary.verifiedEmailCount || 0;
    const phoneVerified = summary.verifiedPhoneCount || 0;
    const twoFactorEnabled = summary.twoFactorEnabledCount || 0;

    return {
      labels: ["Email Verified", "Phone Verified", "2FA Enabled"],
      datasets: [
        {
          label: "Customer Verification Status",
          data: [emailVerified, phoneVerified, twoFactorEnabled],
          backgroundColor: [
            "rgba(59, 130, 246, 0.8)", // Blue
            "rgba(16, 185, 129, 0.8)", // Green
            "rgba(139, 92, 246, 0.8)", // Purple
          ],
          borderColor: [
            "rgba(59, 130, 246, 1)",
            "rgba(16, 185, 129, 1)",
            "rgba(139, 92, 246, 1)",
          ],
          borderWidth: 1,
        },
      ],
    };
  }, [summary]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="flex flex-col items-center text-center">
          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center mb-4">
            <Users className="h-8 w-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Customers Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Overview of customers who book, review, pay, and add transportation</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:border-blue-300 group">
          <div className="flex items-center gap-4">
            <Users className="h-6 w-6 text-blue-600" />
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-500 mb-1">Total Customers</div>
              <div className="text-2xl font-bold text-gray-900">
                {loading ? "..." : (summary.totalCustomers || 0).toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:border-emerald-300 group">
          <div className="flex items-center gap-4">
            <ShoppingCart className="h-6 w-6 text-emerald-600" />
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-500 mb-1">Total Bookings</div>
              <div className="text-2xl font-bold text-gray-900">
                {loading ? "..." : ((summary.totalBookings || 0) + (summary.totalGroupBookings || 0)).toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:border-purple-300 group">
          <div className="flex items-center gap-4">
            <DollarSign className="h-6 w-6 text-purple-600" />
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-500 mb-1">Total Revenue</div>
              <div className="text-2xl font-bold text-gray-900">
                {loading ? "..." : `TZS ${(summary.totalRevenue || 0).toLocaleString()}`}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:border-amber-300 group">
          <div className="flex items-center gap-4">
            <UserCheck className="h-6 w-6 text-amber-600" />
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-500 mb-1">Active Customers</div>
              <div className="text-2xl font-bold text-gray-900">
                {loading ? "..." : (summary.activeCustomers || 0).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Booking & Activity Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:border-blue-300 group">
          <div className="flex items-center gap-4">
            <CheckCircle className="h-6 w-6 text-blue-600" />
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-500 mb-1">Confirmed</div>
              <div className="text-2xl font-bold text-gray-900">
                {loading ? "..." : (summary.confirmedBookings || 0).toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:border-emerald-300 group">
          <div className="flex items-center gap-4">
            <Clock className="h-6 w-6 text-emerald-600" />
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-500 mb-1">Checked In</div>
              <div className="text-2xl font-bold text-gray-900">
                {loading ? "..." : (summary.checkedInBookings || 0).toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:border-purple-300 group">
          <div className="flex items-center gap-4">
            <Car className="h-6 w-6 text-purple-600" />
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-500 mb-1">Transport Requests</div>
              <div className="text-2xl font-bold text-gray-900">
                {loading ? "..." : (summary.transportationRequests || 0).toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:border-amber-300 group">
          <div className="flex items-center gap-4">
            <TrendingUp className="h-6 w-6 text-amber-600" />
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-500 mb-1">Avg Bookings/Customer</div>
              <div className="text-2xl font-bold text-gray-900">
                {loading ? "..." : (summary.avgBookingsPerCustomer || 0).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Booking Status Distribution</h2>
          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-blue-600"></div>
            </div>
          ) : (
            <Chart type="doughnut" data={bookingStatusChartData} />
          )}
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Customer Verification Status</h2>
          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-blue-600"></div>
            </div>
          ) : (
            <Chart type="bar" data={verificationChartData} />
          )}
        </div>
      </div>

      {/* Recent Customers */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Recent Customers</h2>
          <Link
            href="/admin/users/list"
            className="text-emerald-600 hover:text-emerald-700 transition-colors relative group inline-flex items-center"
            title="View All"
          >
            <Eye className="h-5 w-5" />
            <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
              View All
              <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></span>
            </span>
          </Link>
        </div>
        {loading ? (
          <div className="px-6 py-12 text-center">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-emerald-600"></div>
            <p className="mt-3 text-sm text-gray-500">Loading customers...</p>
          </div>
        ) : summary.recentCustomers && summary.recentCustomers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Verification</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {summary.recentCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50 transition-colors duration-150">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{customer.name || "N/A"}</div>
                      <div className="text-sm text-gray-500">{customer.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {customer.phone || "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {customer.emailVerifiedAt && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                            <Mail className="h-3 w-3 mr-1" />
                            Email
                          </span>
                        )}
                        {customer.phoneVerifiedAt && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                            <Phone className="h-3 w-3 mr-1" />
                            Phone
                          </span>
                        )}
                        {customer.twoFactorEnabled && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                            <Lock className="h-3 w-3 mr-1" />
                            2FA
                          </span>
                        )}
                        {!customer.emailVerifiedAt && !customer.phoneVerifiedAt && !customer.twoFactorEnabled && (
                          <span className="text-xs text-gray-400">None</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>{new Date(customer.createdAt).toLocaleDateString()}</div>
                      <div className="text-xs text-gray-400">
                        {new Date(customer.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        href={`/admin/users/${customer.id}`}
                        className="text-emerald-600 hover:text-emerald-900 transition-colors underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-12 text-center">
            <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No recent customers found.</p>
          </div>
        )}
      </div>
    </div>
  );
}

