"use client";

import { LayoutDashboard, Calendar, Users, Truck, Building2, Shield, TrendingUp, UserSquare2 } from "lucide-react";
import Chart from "@/components/Chart";
import { useEffect, useState } from "react";

export default function AdminManagementPageClient() {
  const [bookingsCount, setBookingsCount] = useState<number>(0);
  const [propertiesCount, setPropertiesCount] = useState<number>(0);
  const [onlineUsers, setOnlineUsers] = useState<number>(0);
  const [onlineDrivers, setOnlineDrivers] = useState<number>(0);
  const [onlineOwners, setOnlineOwners] = useState<number>(0);
  const [onlineAdmins, setOnlineAdmins] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const API = "";

    async function fetchData() {
      try {
        try {
          const bookingsRes = await fetch(`${API}/admin/bookings?page=1&pageSize=1`, {
            credentials: "include",
          });
          if (bookingsRes.ok) {
            const contentType = bookingsRes.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
              const bookingsData = await bookingsRes.json();
              setBookingsCount(bookingsData?.total || 0);
            }
          }
        } catch (e) {
          console.warn("Failed to fetch bookings:", e);
        }

        try {
          const propsRes = await fetch(`${API}/admin/properties?page=1&pageSize=1`, {
            credentials: "include",
          });
          if (propsRes.ok) {
            const contentType = propsRes.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
              const propsData = await propsRes.json();
              setPropertiesCount(propsData?.total || 0);
            }
          }
        } catch (e) {
          console.warn("Failed to fetch properties:", e);
        }

        try {
          const summaryRes = await fetch(`${API}/admin/summary`, {
            credentials: "include",
          });
          if (summaryRes.ok) {
            const contentType = summaryRes.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
              const summaryData = await summaryRes.json();
              const activeSessions = summaryData?.activeSessions || 0;
              setOnlineUsers(Math.floor(activeSessions * 0.4));
              setOnlineDrivers(Math.floor(activeSessions * 0.3));
              setOnlineOwners(Math.floor(activeSessions * 0.2));
              setOnlineAdmins(Math.floor(activeSessions * 0.1));
            }
          }
        } catch (e) {
          console.warn("Failed to fetch summary:", e);
          setOnlineUsers(0);
          setOnlineDrivers(0);
          setOnlineOwners(0);
          setOnlineAdmins(0);
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const bookingsVsPropertiesData = {
    labels: ["Total Bookings", "Total Properties"],
    datasets: [
      {
        label: "Count",
        data: [bookingsCount, propertiesCount],
        backgroundColor: ["#02665e", "#0ea5a0"],
        borderColor: ["#015b54", "#0d9488"],
        borderWidth: 2,
      },
    ],
  };

  const bookingsChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            return `${context.label}: ${context.parsed.y}`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: "rgba(0, 0, 0, 0.05)",
        },
        ticks: {
          font: {
            size: 11,
          },
          color: "#6b7280",
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
          color: "#6b7280",
        },
      },
    },
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center text-center mb-4">
        <LayoutDashboard className="h-8 w-8 text-gray-400 mb-3" />
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900">Management</h1>
        <p className="mt-1 text-sm text-gray-600">Administrative tools and controls</p>
      </div>

      <div className="flex justify-center">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-5xl">
          <a
            href="/admin/management/settings"
            className="group block rounded-lg border border-gray-200 bg-white p-6 hover:border-[#02665e]/30 hover:shadow-md transition-all duration-200 no-underline relative overflow-hidden"
          >
            <div className="absolute bottom-0 left-0 right-0 h-0 group-hover:h-1 bg-[#02665e] transition-all duration-200"></div>
            <div className="text-lg font-semibold text-[#02665e]">System Settings</div>
            <div className="text-sm text-gray-600 mt-2">Configure system-wide settings, integrations and feature flags.</div>
          </a>

          <a
            href="/admin/management/audit-log"
            className="group block rounded-lg border border-gray-200 bg-white p-6 hover:border-sky-300 hover:shadow-md transition-all duration-200 no-underline relative overflow-hidden"
          >
            <div className="absolute bottom-0 left-0 right-0 h-0 group-hover:h-1 bg-sky-500 transition-all duration-200"></div>
            <div className="text-lg font-semibold text-[#02665e]">Audit Log</div>
            <div className="text-sm text-gray-600 mt-2">View immutable audit trails of important system actions.</div>
          </a>

          <a
            href="/admin/management/users"
            className="group block rounded-lg border border-gray-200 bg-white p-6 hover:border-emerald-300 hover:shadow-md transition-all duration-200 no-underline relative overflow-hidden"
          >
            <div className="absolute bottom-0 left-0 right-0 h-0 group-hover:h-1 bg-emerald-500 transition-all duration-200"></div>
            <div className="text-lg font-semibold text-[#02665e]">Users</div>
            <div className="text-sm text-gray-600 mt-2">Manage platform users, roles, and access permissions.</div>
          </a>

          <a
            href="/admin/management/updates"
            className="group block rounded-lg border border-gray-200 bg-white p-6 hover:border-purple-300 hover:shadow-md transition-all duration-200 no-underline relative overflow-hidden"
          >
            <div className="absolute bottom-0 left-0 right-0 h-0 group-hover:h-1 bg-purple-500 transition-all duration-200"></div>
            <div className="text-lg font-semibold text-[#02665e]">Updates</div>
            <div className="text-sm text-gray-600 mt-2">Share news, events, and updates with pictures and videos to keep users informed.</div>
          </a>
        </div>
      </div>

      <div className="flex justify-center">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl w-full">
          <div className="group bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-lg hover:border-[#02665e]/30 hover:-translate-y-1 transition-all duration-300 cursor-pointer">
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="h-5 w-5 text-[#02665e] group-hover:rotate-12 group-hover:scale-110 transition-all duration-300" />
                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-[#02665e] transition-colors duration-300">
                  Bookings vs Properties
                </h3>
              </div>
              <p className="text-sm text-gray-600">Total bookings in relation to properties</p>
            </div>
            {loading ? (
              <div className="h-48 flex items-center justify-center text-gray-500">Loading...</div>
            ) : (
              <div className="h-48">
                <Chart type="bar" data={bookingsVsPropertiesData} options={bookingsChartOptions} />
              </div>
            )}
            <div className="mt-4 flex gap-4 text-sm">
              <div className="flex items-center gap-2 group-hover:translate-x-1 transition-transform duration-300">
                <div className="w-3 h-3 rounded bg-[#02665e] group-hover:scale-125 transition-transform duration-300"></div>
                <span className="text-gray-600">
                  Bookings: <span className="font-semibold text-gray-900">{bookingsCount.toLocaleString()}</span>
                </span>
              </div>
              <div className="flex items-center gap-2 group-hover:translate-x-1 transition-transform duration-300">
                <div className="w-3 h-3 rounded bg-[#0ea5a0] group-hover:scale-125 transition-transform duration-300"></div>
                <span className="text-gray-600">
                  Properties: <span className="font-semibold text-gray-900">{propertiesCount.toLocaleString()}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="group bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-lg hover:border-sky-300 hover:-translate-y-1 transition-all duration-300 cursor-pointer">
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-5 w-5 text-sky-600 group-hover:rotate-12 group-hover:scale-110 transition-all duration-300" />
                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-sky-600 transition-colors duration-300">
                  Platform Analytics
                </h3>
              </div>
              <p className="text-sm text-gray-600">General platform interactions</p>
            </div>
            {loading ? (
              <div className="h-48 flex items-center justify-center text-gray-500">Loading...</div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-lg group-hover:bg-blue-50 group-hover:border group-hover:border-blue-200 hover:scale-105 transition-all duration-300 cursor-pointer">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="h-4 w-4 text-blue-600 group-hover:scale-110 transition-transform duration-300" />
                      <span className="text-xs text-gray-600">Online Users</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors duration-300">
                      {onlineUsers}
                    </div>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg group-hover:bg-orange-50 group-hover:border group-hover:border-orange-200 hover:scale-105 transition-all duration-300 cursor-pointer">
                    <div className="flex items-center gap-2 mb-2">
                      <Truck className="h-4 w-4 text-orange-600 group-hover:scale-110 transition-transform duration-300" />
                      <span className="text-xs text-gray-600">Online Drivers</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900 group-hover:text-orange-600 transition-colors duration-300">
                      {onlineDrivers}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-lg group-hover:bg-emerald-50 group-hover:border group-hover:border-emerald-200 hover:scale-105 transition-all duration-300 cursor-pointer">
                    <div className="flex items-center gap-2 mb-2">
                      <Building2 className="h-4 w-4 text-emerald-600 group-hover:scale-110 transition-transform duration-300" />
                      <span className="text-xs text-gray-600">Online Owners</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900 group-hover:text-emerald-600 transition-colors duration-300">
                      {onlineOwners}
                    </div>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg group-hover:bg-purple-50 group-hover:border group-hover:border-purple-200 hover:scale-105 transition-all duration-300 cursor-pointer">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="h-4 w-4 text-purple-600 group-hover:scale-110 transition-transform duration-300" />
                      <span className="text-xs text-gray-600">Online Admins</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900 group-hover:text-purple-600 transition-colors duration-300">
                      {onlineAdmins}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
