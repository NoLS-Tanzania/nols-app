"use client";
import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { Users, Search, X, Calendar, MapPin, Clock, User, BarChart3, Home, UsersRound, CheckCircle, AlertCircle, Loader2, XCircle, Circle } from "lucide-react";
import DatePicker from "@/components/ui/DatePicker";
import axios from "axios";
import Chart from "@/components/Chart";
import type { ChartData } from "chart.js";

// Use same-origin for HTTP calls so Next.js rewrites proxy to the API
const api = axios.create({ baseURL: "" });
function authify() {
  const t = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  if (t) api.defaults.headers.common["Authorization"] = `Bearer ${t}`;
}

type GroupBookingRow = {
  id: number;
  groupType: string;
  accommodationType: string;
  headcount: number;
  roomsNeeded: number;
  toRegion: string;
  toDistrict: string | null;
  toLocation: string | null;
  checkIn: string | null;
  checkOut: string | null;
  status: string;
  user: { id: number; name: string; email: string; phone: string | null } | null;
  createdAt: string;
  arrPickup: boolean;
  arrTransport: boolean;
  arrMeals: boolean;
  arrGuide: boolean;
  arrEquipment: boolean;
};

function badgeClasses(v: string) {
  switch (v) {
    case "PENDING":
      return "bg-gray-100 text-gray-700";
    case "CONFIRMED":
      return "bg-blue-100 text-blue-700";
    case "PROCESSING":
      return "bg-yellow-100 text-yellow-700";
    case "COMPLETED":
      return "bg-green-100 text-green-700";
    case "CANCELED":
      return "bg-red-100 text-red-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

type BookingStats = {
  date: string;
  count: number;
  confirmed: number;
  totalHeadcount: number;
};

type BookingStatsResponse = {
  stats: BookingStats[];
  period: string;
  startDate: string;
  endDate: string;
};

type SummaryData = {
  totalBookings?: number;
  pendingBookings?: number;
  confirmedBookings?: number;
  processingBookings?: number;
  completedBookings?: number;
  canceledBookings?: number;
};

export default function AdminGroupStaysBookingsPage() {
  const [status, setStatus] = useState<string>("");
  const [groupType, setGroupType] = useState<string>("");
  const [date, setDate] = useState<string | string[]>("");
  const [q, setQ] = useState("");
  const [list, setList] = useState<GroupBookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 30;
  const searchRef = useRef<HTMLInputElement | null>(null);
  const [pickerAnim, setPickerAnim] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Histogram state
  const [histogramPeriod, setHistogramPeriod] = useState<string>("30d");
  const [histogramData, setHistogramData] = useState<BookingStatsResponse | null>(null);
  const [histogramLoading, setHistogramLoading] = useState(false);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});

  async function load() {
    setLoading(true);
    try {
      const params: any = {
        page,
        pageSize,
      };
      if (status) params.status = status;
      if (groupType) params.groupType = groupType;
      if (date) {
        if (Array.isArray(date)) {
          params.start = date[0];
          params.end = date[1];
        } else {
          params.date = date;
        }
      }
      if (q) params.q = q;

      const r = await api.get<{ items: GroupBookingRow[]; total: number }>("/admin/group-stays/bookings", { params });
      setList(r.data?.items ?? []);
      setTotal(r.data?.total ?? 0);
    } catch (err) {
      console.error("Failed to load group bookings", err);
      setList([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  async function loadStatusCounts() {
    try {
      const r = await api.get<SummaryData>("/admin/group-stays/summary");
      if (r?.data) {
        setStatusCounts({
          "": r.data.totalBookings || 0,
          "PENDING": r.data.pendingBookings || 0,
          "CONFIRMED": r.data.confirmedBookings || 0,
          "PROCESSING": r.data.processingBookings || 0,
          "COMPLETED": r.data.completedBookings || 0,
          "CANCELED": r.data.canceledBookings || 0,
        });
      }
    } catch (err) {
      console.error("Failed to load status counts", err);
    }
  }

  const loadHistogram = useCallback(async () => {
    setHistogramLoading(true);
    try {
      const r = await api.get<BookingStatsResponse>("/admin/group-stays/bookings/stats", {
        params: { period: histogramPeriod },
      });
      setHistogramData(r.data);
    } catch (err) {
      console.error("Failed to load booking statistics", err);
      setHistogramData(null);
    } finally {
      setHistogramLoading(false);
    }
  }, [histogramPeriod]);

  useEffect(() => {
    authify();
    load();
    loadStatusCounts();
  }, [page, status, groupType, date]);

  useEffect(() => {
    authify();
    loadHistogram();
  }, [loadHistogram]);

  const pages = Math.max(1, Math.ceil(total / pageSize));

  // Prepare histogram chart data
  const histogramChartData = useMemo<ChartData<"bar">>(() => {
    if (!histogramData || histogramData.stats.length === 0) {
      return {
        labels: [],
        datasets: [],
      };
    }

    const labels = histogramData.stats.map((s) => {
      const d = new Date(s.date);
      return histogramPeriod === "year"
        ? d.toLocaleDateString("en-US", { month: "short" })
        : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    });

    return {
      labels,
      datasets: [
        {
          label: "Total Bookings",
          data: histogramData.stats.map((s) => s.count),
          backgroundColor: "rgba(139, 92, 246, 0.8)", // Purple
          borderColor: "rgba(139, 92, 246, 1)",
          borderWidth: 1,
        },
        {
          label: "Confirmed",
          data: histogramData.stats.map((s) => s.confirmed),
          backgroundColor: "rgba(59, 130, 246, 0.8)", // Blue
          borderColor: "rgba(59, 130, 246, 1)",
          borderWidth: 1,
        },
      ],
    };
  }, [histogramData, histogramPeriod]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="flex flex-col items-center text-center">
          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-purple-50 to-purple-100 flex items-center justify-center mb-4">
            <UsersRound className="h-8 w-8 text-purple-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Group Stay Bookings</h1>
          <p className="text-sm text-gray-500 mt-1">View and manage all group accommodation bookings</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm overflow-hidden box-border">
        <div className="flex flex-col gap-4 w-full">
          {/* Top Row: Search and Date Picker */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full">
            {/* Search Box */}
            <div className="relative w-full sm:flex-1 min-w-0">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  ref={searchRef}
                  type="text"
                  className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-sm box-border"
                  placeholder="Search bookings..."
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      setPage(1);
                      load();
                    }
                  }}
                  style={{ width: '100%', maxWidth: '100%' }}
                />
                {q && (
                  <button
                    type="button"
                    onClick={() => {
                      setQ("");
                      setPage(1);
                      load();
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Date Picker */}
            <div className="relative w-full sm:w-auto sm:flex-shrink-0">
              <button
                type="button"
                onClick={() => {
                  setPickerAnim(true);
                  setTimeout(() => setPickerAnim(false), 350);
                  setPickerOpen((v) => !v);
                }}
                className={`w-full px-3 py-2 rounded-lg border border-gray-300 text-sm flex items-center justify-center gap-2 text-gray-700 bg-white transition-all ${
                  pickerAnim ? "ring-2 ring-purple-100" : "hover:bg-gray-50"
                } box-border`}
                style={{ width: '100%', maxWidth: '100%' }}
              >
                <Calendar className="h-4 w-4" />
                <span>Date</span>
              </button>
              {pickerOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setPickerOpen(false)} />
                  <div className="fixed z-50 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    <DatePicker
                      selected={date || undefined}
                      onSelect={(s) => {
                        setDate(s as string | string[]);
                        setPage(1);
                      }}
                      onClose={() => setPickerOpen(false)}
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Status Cards - Clean Modern Design */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { 
                label: "All Bookings", 
                value: "", 
                icon: UsersRound, 
                iconBg: "bg-purple-100",
                iconColor: "text-purple-600",
                activeBg: "bg-purple-50",
                activeBorder: "border-purple-500",
                activeText: "text-purple-700",
                hoverBg: "hover:bg-purple-50",
                hoverBorder: "hover:border-purple-300"
              },
              { 
                label: "Pending", 
                value: "PENDING", 
                icon: Clock, 
                iconBg: "bg-gray-100",
                iconColor: "text-gray-600",
                activeBg: "bg-gray-50",
                activeBorder: "border-gray-500",
                activeText: "text-gray-700",
                hoverBg: "hover:bg-gray-50",
                hoverBorder: "hover:border-gray-300"
              },
              { 
                label: "Confirmed", 
                value: "CONFIRMED", 
                icon: CheckCircle, 
                iconBg: "bg-blue-100",
                iconColor: "text-blue-600",
                activeBg: "bg-blue-50",
                activeBorder: "border-blue-500",
                activeText: "text-blue-700",
                hoverBg: "hover:bg-blue-50",
                hoverBorder: "hover:border-blue-300"
              },
              { 
                label: "Processing", 
                value: "PROCESSING", 
                icon: Loader2, 
                iconBg: "bg-amber-100",
                iconColor: "text-amber-600",
                activeBg: "bg-amber-50",
                activeBorder: "border-amber-500",
                activeText: "text-amber-700",
                hoverBg: "hover:bg-amber-50",
                hoverBorder: "hover:border-amber-300"
              },
              { 
                label: "Completed", 
                value: "COMPLETED", 
                icon: CheckCircle, 
                iconBg: "bg-green-100",
                iconColor: "text-green-600",
                activeBg: "bg-green-50",
                activeBorder: "border-green-500",
                activeText: "text-green-700",
                hoverBg: "hover:bg-green-50",
                hoverBorder: "hover:border-green-300"
              },
              { 
                label: "Canceled", 
                value: "CANCELED", 
                icon: XCircle, 
                iconBg: "bg-red-100",
                iconColor: "text-red-600",
                activeBg: "bg-red-50",
                activeBorder: "border-red-500",
                activeText: "text-red-700",
                hoverBg: "hover:bg-red-50",
                hoverBorder: "hover:border-red-300"
              },
            ].map((s) => {
              const Icon = s.icon;
              const isActive = status === s.value;
              const count = statusCounts[s.value] || 0;
              
              return (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => {
                    setStatus(s.value);
                    setPage(1);
                    setTimeout(() => load(), 0);
                  }}
                  className={`group relative overflow-hidden rounded-2xl border transition-all duration-300 ${
                    isActive
                      ? `${s.activeBg} ${s.activeBorder} border-2 shadow-lg scale-105`
                      : `bg-white border-gray-200 ${s.hoverBg} ${s.hoverBorder} hover:shadow-md hover:scale-[1.02]`
                  }`}
                >
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2.5">
                      <div className={`w-10 h-10 rounded-lg ${isActive ? s.iconBg : "bg-gray-100"} flex items-center justify-center transition-colors duration-300`}>
                        <Icon className={`h-5 w-5 ${isActive ? s.iconColor : "text-gray-500"} ${s.value === "PROCESSING" && isActive ? "animate-spin" : ""} transition-colors duration-300`} />
                      </div>
                    </div>
                    <div className="space-y-0.5">
                      <p className={`text-[10px] font-semibold uppercase tracking-wider ${isActive ? s.activeText : "text-gray-500"} transition-colors duration-300`}>
                        {s.label}
                      </p>
                      <p className={`text-2xl font-bold ${isActive ? s.activeText : "text-gray-900"} transition-colors duration-300`}>
                        {loading && !statusCounts[s.value] ? "..." : count.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  {isActive && (
                    <div className="absolute inset-0 pointer-events-none">
                      <div className="absolute top-0 right-0 w-20 h-20 bg-white/20 rounded-full -mr-10 -mt-10 blur-xl"></div>
                      <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/10 rounded-full -ml-8 -mb-8 blur-lg"></div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Group Type Filters */}
          <div className="flex gap-2 items-center justify-center w-full overflow-x-auto pb-1 scrollbar-hide">

            {[
              { label: "All Types", value: "" },
              { label: "Family", value: "family" },
              { label: "Workers", value: "workers" },
              { label: "Event", value: "event" },
              { label: "Students", value: "students" },
              { label: "Team", value: "team" },
              { label: "Other", value: "other" },
            ].map((gt) => (
              <button
                key={gt.value}
                type="button"
                onClick={() => {
                  setGroupType(gt.value);
                  setPage(1);
                  setTimeout(() => load(), 0);
                }}
                className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all duration-300 whitespace-nowrap flex-shrink-0 ${
                  groupType === gt.value
                    ? "bg-purple-50 border-purple-300 text-purple-700 scale-105 shadow-md"
                    : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:scale-105 hover:shadow-sm"
                }`}
              >
                {gt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <>
            {/* Skeleton Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Group Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Destination</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Headcount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check-In</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {[...Array(5)].map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-4 bg-gray-200 rounded w-12"></div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-4 bg-gray-200 rounded w-20"></div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-4 bg-gray-200 rounded w-32"></div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-4 bg-gray-200 rounded w-28"></div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-4 bg-gray-200 rounded w-20"></div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-4 bg-gray-200 rounded w-24"></div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-6 bg-gray-200 rounded-full w-20"></div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="h-8 bg-gray-200 rounded w-16 ml-auto"></div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : list.length === 0 ? (
          <>
            <div className="px-6 py-12 text-center">
              <UsersRound className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">No bookings found.</p>
              <p className="text-xs text-gray-400 mt-1">Try adjusting your filters or search query.</p>
            </div>

            {/* Booking Statistics Histogram */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm group transition-all duration-300 hover:shadow-lg hover:border-purple-300 hover:-translate-y-1">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 group-hover:text-purple-600 transition-colors duration-300">
                    <BarChart3 className="h-5 w-5 text-purple-600 group-hover:scale-110 transition-transform duration-300" />
                    Booking Statistics
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">Visualize booking data over time</p>
                </div>

                {/* Period Filter */}
                <div className="flex gap-2 flex-wrap">
                  {[
                    { label: "7 Days", value: "7d" },
                    { label: "30 Days", value: "30d" },
                    { label: "This Month", value: "month" },
                    { label: "This Year", value: "year" },
                  ].map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setHistogramPeriod(p.value)}
                      className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all duration-300 whitespace-nowrap ${
                        histogramPeriod === p.value
                          ? "bg-purple-50 border-purple-300 text-purple-700 scale-105 shadow-md"
                          : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:scale-105 hover:shadow-sm"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {histogramLoading ? (
                <div className="h-64 flex items-center justify-center">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-purple-600"></div>
                </div>
              ) : histogramData?.stats && histogramData.stats.length > 0 ? (
                <div className="h-64 w-full transform transition-all duration-500 group-hover:scale-[1.02]">
                  <Chart
                    type="bar"
                    data={histogramChartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
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
                            maxRotation: 45,
                            minRotation: 45,
                          },
                        },
                      },
                    }}
                  />
                </div>
              ) : (
                <div className="h-64 w-full flex flex-col justify-end p-4">
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

                      {/* Skeleton bars */}
                      <div className="absolute bottom-0 left-0 right-0 h-full flex items-end justify-around px-2">
                        {[...Array(7)].map((_, i) => (
                          <div
                            key={i}
                            className="w-8 bg-gray-200 rounded-t animate-pulse"
                            style={{ height: `${Math.random() * 70 + 30}%` }}
                          ></div>
                        ))}
                      </div>

                      {/* X-axis labels skeleton */}
                      <div className="absolute bottom-0 left-0 right-0 flex justify-between px-2">
                        {[...Array(7)].map((_, i) => (
                          <div key={i} className="h-3 w-10 bg-gray-200 rounded animate-pulse"></div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Group Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Destination</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Headcount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check-In</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {list.map((booking) => (
                    <tr key={booking.id} className="hover:bg-gray-50 transition-colors duration-150">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">#{booking.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{booking.groupType}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {booking.user ? (
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-400" />
                            <span>{booking.user.name}</span>
                          </div>
                        ) : (
                          "N/A"
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          <span>{booking.toRegion}{booking.toDistrict ? `, ${booking.toDistrict}` : ""}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-gray-400" />
                          <span>{booking.headcount} ({booking.roomsNeeded} rooms)</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {booking.checkIn ? (
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-gray-400" />
                            <span>{new Date(booking.checkIn).toLocaleDateString()}</span>
                          </div>
                        ) : (
                          "Flexible"
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${badgeClasses(booking.status)}`}>
                          {booking.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button className="text-purple-600 hover:text-purple-900">View</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-gray-200">
              {list.map((booking) => (
                <div key={booking.id} className="p-4 bg-white hover:bg-gray-50 transition-colors duration-150">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-900">#{booking.id}</span>
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${badgeClasses(booking.status)}`}>
                      {booking.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 mb-1 flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-400" />
                    <span>Customer: {booking.user?.name || "N/A"}</span>
                  </div>
                  <div className="text-sm text-gray-600 mb-1 flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-400" />
                    <span>Type: {booking.groupType} • {booking.headcount} people ({booking.roomsNeeded} rooms)</span>
                  </div>
                  <div className="text-sm text-gray-600 mb-1 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <span>Destination: {booking.toRegion}{booking.toDistrict ? `, ${booking.toDistrict}` : ""}</span>
                  </div>
                  <div className="text-sm text-gray-600 mb-1 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span>Check-In: {booking.checkIn ? new Date(booking.checkIn).toLocaleDateString() : "Flexible"}</span>
                  </div>
                  <div className="mt-3 text-right">
                    <button className="text-purple-600 hover:text-purple-900 text-sm">View Details</button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Pagination */}
      {list.length > 0 && (
        <div className="flex justify-center py-4">
          <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
              Page {page} of {pages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={page === pages}
              className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </nav>
        </div>
      )}
    </div>
  );
}

