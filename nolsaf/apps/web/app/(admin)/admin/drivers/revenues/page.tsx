"use client";
import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { TrendingUp, Search, X, Calendar, DollarSign, Clock, Users, PieChart, BarChart3, ArrowUpRight, ArrowDownRight } from "lucide-react";
import DatePicker from "@/components/ui/DatePicker";
import axios from "axios";
import Chart from "@/components/Chart";
import type { ChartData } from "chart.js";

// Use same-origin for HTTP calls so Next.js rewrites proxy to the API
const api = axios.create({ baseURL: "", withCredentials: true });
function authify() {}

type RevenueRow = {
  id: number;
  driver: { id: number; name: string; email: string; phone: string | null } | null;
  grossRevenue: number;
  commissionAmount: number;
  netRevenue: number;
  tripCount: number;
  invoiceCount: number;
  lastPaymentDate: string | null;
};

type RevenueStats = {
  date: string;
  grossRevenue: number;
  netRevenue: number;
  commissionAmount: number;
  tripCount: number;
};

type RevenueStatsResponse = {
  stats: RevenueStats[];
  summary: {
    totalGrossRevenue: number;
    totalNetRevenue: number;
    totalCommission: number;
    totalTrips: number;
    totalInvoices: number;
    averageRevenue: number;
    growthRate: number;
  };
  topDrivers: Array<{
    driverId: number;
    driverName: string;
    totalRevenue: number;
    tripCount: number;
  }>;
  period: string;
  startDate: string;
  endDate: string;
};

export default function AdminDriversRevenuesPage() {
  const [date, setDate] = useState<string | string[]>("");
  const [q, setQ] = useState("");
  const [list, setList] = useState<RevenueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 30;
  const searchRef = useRef<HTMLInputElement | null>(null);
  const [pickerAnim, setPickerAnim] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  
  // Stats state
  const [statsPeriod, setStatsPeriod] = useState<string>("30d");
  const [statsData, setStatsData] = useState<RevenueStatsResponse | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const params: any = {
        page,
        pageSize,
      };
      if (date) {
        if (Array.isArray(date)) {
          params.start = date[0];
          params.end = date[1];
        } else {
          params.date = date;
        }
      }
      if (q) params.q = q;

      const r = await api.get<{ items: RevenueRow[]; total: number }>("/admin/drivers/revenues", { params });
      setList(r.data?.items ?? []);
      setTotal(r.data?.total ?? 0);
    } catch (err) {
      console.error("Failed to load revenues", err);
      setList([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const r = await api.get<RevenueStatsResponse>("/admin/drivers/revenues/stats", {
        params: { period: statsPeriod },
      });
      setStatsData(r.data);
    } catch (err) {
      console.error("Failed to load revenue statistics", err);
      setStatsData(null);
    } finally {
      setStatsLoading(false);
    }
  }, [statsPeriod]);

  useEffect(() => {
    authify();
    load();
  }, [page, date, q]);

  useEffect(() => {
    authify();
    loadStats();
  }, [loadStats]);

  const pages = Math.max(1, Math.ceil(total / pageSize));

  // Prepare area chart data for revenue trends
  const revenueChartData = useMemo<ChartData<"line">>(() => {
    if (!statsData || statsData.stats.length === 0) {
      return {
        labels: [],
        datasets: [],
      };
    }

    const labels = statsData.stats.map((s) => {
      const d = new Date(s.date);
      return statsPeriod === "year" 
        ? d.toLocaleDateString("en-US", { month: "short" })
        : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    });
    
    return {
      labels,
      datasets: [
        {
          label: "Gross Revenue",
          data: statsData.stats.map((s) => s.grossRevenue),
          fill: true,
          backgroundColor: "rgba(59, 130, 246, 0.1)",
          borderColor: "rgba(59, 130, 246, 1)",
          borderWidth: 2,
          tension: 0.4,
          pointBackgroundColor: "rgba(59, 130, 246, 1)",
          pointBorderColor: "#fff",
          pointHoverBackgroundColor: "#fff",
          pointHoverBorderColor: "rgba(59, 130, 246, 1)",
          pointRadius: 4,
          pointHoverRadius: 6,
        },
        {
          label: "Net Revenue",
          data: statsData.stats.map((s) => s.netRevenue),
          fill: true,
          backgroundColor: "rgba(16, 185, 129, 0.1)",
          borderColor: "rgba(16, 185, 129, 1)",
          borderWidth: 2,
          tension: 0.4,
          pointBackgroundColor: "rgba(16, 185, 129, 1)",
          pointBorderColor: "#fff",
          pointHoverBackgroundColor: "#fff",
          pointHoverBorderColor: "rgba(16, 185, 129, 1)",
          pointRadius: 4,
          pointHoverRadius: 6,
        },
      ],
    };
  }, [statsData, statsPeriod]);

  // Prepare bar chart data for top drivers
  const topDriversChartData = useMemo<ChartData<"bar">>(() => {
    if (!statsData || !statsData.topDrivers || statsData.topDrivers.length === 0) {
      return {
        labels: [],
        datasets: [],
      };
    }

    const top5 = statsData.topDrivers.slice(0, 5);
    const labels = top5.map((d) => d.driverName.split(" ")[0] || "Driver");
    const colors = [
      "rgba(59, 130, 246, 0.8)",
      "rgba(16, 185, 129, 0.8)",
      "rgba(245, 158, 11, 0.8)",
      "rgba(139, 92, 246, 0.8)",
      "rgba(236, 72, 153, 0.8)",
    ];

    return {
      labels,
      datasets: [
        {
          label: "Revenue",
          data: top5.map((d) => d.totalRevenue),
          backgroundColor: colors.slice(0, top5.length),
          borderColor: colors.slice(0, top5.length).map(c => c.replace("0.8", "1")),
          borderWidth: 2,
          borderRadius: 6,
        },
      ],
    };
  }, [statsData]);

  // Prepare donut chart data for revenue breakdown
  const revenueBreakdownData = useMemo<ChartData<"doughnut">>(() => {
    if (!statsData || !statsData.summary) {
      return {
        labels: [],
        datasets: [],
      };
    }

    const { totalCommission, totalNetRevenue } = statsData.summary;
    
    return {
      labels: ["Net Revenue", "Commission"],
      datasets: [
        {
          data: [totalNetRevenue, totalCommission],
          backgroundColor: [
            "rgba(16, 185, 129, 0.8)",
            "rgba(245, 158, 11, 0.8)",
          ],
          borderColor: "#fff",
          borderWidth: 3,
          hoverOffset: 8,
        },
      ],
    };
  }, [statsData]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="flex flex-col items-center text-center">
          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center mb-4">
            <TrendingUp className="h-8 w-8 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Driver Revenues</h1>
          <p className="text-sm text-gray-500 mt-1">Comprehensive revenue analytics and insights for all drivers</p>
        </div>
      </div>

      {/* Summary Cards */}
      {statsData && statsData.summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:border-blue-300 group">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-500 mb-1">Gross Revenue</div>
                <div className="text-2xl font-bold text-gray-900">
                  {statsData.summary.totalGrossRevenue.toLocaleString()} TZS
                </div>
                {statsData.summary.growthRate !== 0 && (
                  <div className={`text-xs mt-1 flex items-center gap-1 ${statsData.summary.growthRate > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {statsData.summary.growthRate > 0 ? (
                      <ArrowUpRight className="h-3 w-3" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3" />
                    )}
                    <span>{Math.abs(statsData.summary.growthRate).toFixed(1)}%</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:border-emerald-300 group">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-emerald-50 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <TrendingUp className="h-6 w-6 text-emerald-600" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-500 mb-1">Net Revenue</div>
                <div className="text-2xl font-bold text-gray-900">
                  {statsData.summary.totalNetRevenue.toLocaleString()} TZS
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:border-amber-300 group">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-amber-50 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <BarChart3 className="h-6 w-6 text-amber-600" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-500 mb-1">Total Commission</div>
                <div className="text-2xl font-bold text-gray-900">
                  {statsData.summary.totalCommission.toLocaleString()} TZS
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:border-purple-300 group">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-purple-50 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-500 mb-1">Total Trips</div>
                <div className="text-2xl font-bold text-gray-900">
                  {statsData.summary.totalTrips.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Avg: {statsData.summary.averageRevenue.toLocaleString()} TZS
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Trends - Area Chart */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 p-6 shadow-sm transition-all duration-300 hover:shadow-lg hover:border-blue-300 hover:-translate-y-1 group">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 group-hover:text-blue-600 transition-colors duration-300">
                <TrendingUp className="h-5 w-5 text-blue-600 group-hover:scale-110 transition-transform duration-300" />
                Revenue Trends
              </h3>
              <p className="text-sm text-gray-500 mt-1">Gross and net revenue over time</p>
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
                  onClick={() => setStatsPeriod(p.value)}
                  className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all duration-300 whitespace-nowrap ${
                    statsPeriod === p.value
                      ? "bg-blue-50 border-blue-300 text-blue-700 scale-105 shadow-md"
                      : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:scale-105 hover:shadow-sm"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {statsLoading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-blue-600"></div>
            </div>
          ) : statsData && statsData.stats.length > 0 ? (
            <div className="h-64 w-full transform transition-all duration-500 group-hover:scale-[1.02]">
              <Chart
                type="line"
                data={revenueChartData}
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
                          return `${label}: ${value.toLocaleString()} TZS`;
                        },
                      },
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        callback: (value: any) => {
                          return `${(value / 1000).toFixed(0)}K TZS`;
                        },
                        font: {
                          size: 11,
                        },
                      },
                      grid: {
                        color: "rgba(0, 0, 0, 0.1)",
                      },
                      title: {
                        display: true,
                        text: "Amount (TZS)",
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
              {/* Skeleton Area Chart */}
              <div className="relative h-full w-full">
                <div className="absolute left-0 top-0 bottom-8 w-8 flex flex-col justify-between">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-4 bg-gray-200 rounded animate-pulse"></div>
                  ))}
                </div>
                <div className="ml-10 h-full relative">
                  <div className="absolute inset-0 flex flex-col justify-between">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="h-px bg-gray-200"></div>
                    ))}
                  </div>
                  <svg className="w-full h-full" viewBox="0 0 400 300" preserveAspectRatio="none">
                    <path
                      d="M 0 250 Q 80 200, 160 180 T 320 150 T 400 100"
                      fill="rgba(59, 130, 246, 0.1)"
                      stroke="rgba(59, 130, 246, 0.3)"
                      strokeWidth="2"
                      className="animate-pulse"
                    />
                  </svg>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Revenue Breakdown - Donut Chart */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm transition-all duration-300 hover:shadow-lg hover:border-purple-300 hover:-translate-y-1 group">
          <div className="flex items-center gap-2 mb-6">
            <PieChart className="h-5 w-5 text-purple-600 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300" />
            <h3 className="text-lg font-semibold text-gray-900 group-hover:text-purple-600 transition-colors duration-300">Revenue Breakdown</h3>
          </div>

          {statsLoading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-purple-600"></div>
            </div>
          ) : statsData && statsData.summary ? (
            <div className="h-64 w-full transform transition-all duration-500 group-hover:scale-[1.02]">
              <Chart
                type="doughnut"
                data={revenueBreakdownData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: true,
                      position: "bottom",
                      labels: {
                        padding: 15,
                        font: {
                          size: 11,
                        },
                        usePointStyle: true,
                      },
                    },
                    tooltip: {
                      callbacks: {
                        label: (context: any) => {
                          const label = context.label || "";
                          const value = context.parsed || 0;
                          const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                          const percentage = ((value / total) * 100).toFixed(1);
                          return `${label}: ${value.toLocaleString()} TZS (${percentage}%)`;
                        },
                      },
                    },
                  },
                }}
              />
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center">
              <div className="text-center">
                <PieChart className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No revenue data available</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Top Drivers Chart */}
      {statsData && statsData.topDrivers && statsData.topDrivers.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm transition-all duration-300 hover:shadow-lg hover:border-emerald-300 hover:-translate-y-1 group">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="h-5 w-5 text-emerald-600 group-hover:scale-110 transition-transform duration-300" />
            <h3 className="text-lg font-semibold text-gray-900 group-hover:text-emerald-600 transition-colors duration-300">Top Earning Drivers</h3>
          </div>

          <div className="h-64 w-full transform transition-all duration-500 group-hover:scale-[1.02]">
            <Chart
              type="bar"
              data={topDriversChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                plugins: {
                  legend: {
                    display: false,
                  },
                  tooltip: {
                    callbacks: {
                      label: (context: any) => {
                        const value = context.parsed.x || 0;
                        const driver = statsData.topDrivers[context.dataIndex];
                        return `${driver.driverName}: ${value.toLocaleString()} TZS (${driver.tripCount} trips)`;
                      },
                    },
                  },
                },
                scales: {
                  x: {
                    beginAtZero: true,
                    ticks: {
                      callback: (value: any) => {
                        return `${(value / 1000).toFixed(0)}K TZS`;
                      },
                      font: {
                        size: 11,
                      },
                    },
                    grid: {
                      color: "rgba(0, 0, 0, 0.1)",
                    },
                    title: {
                      display: true,
                      text: "Revenue (TZS)",
                      font: {
                        size: 12,
                      },
                    },
                  },
                  y: {
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
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm overflow-hidden">
        <div className="flex flex-col gap-4 w-full box-border">
          {/* Top Row: Search and Date Picker */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full">
            {/* Search Box */}
            <div className="relative w-full sm:flex-1 min-w-0">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
                <input
                  ref={searchRef}
                  type="text"
                  className="w-full box-border pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                  placeholder="Search by driver name or email..."
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
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors z-10"
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
                className={`w-full box-border px-3 py-2 rounded-lg border border-gray-300 text-sm flex items-center justify-center gap-2 text-gray-700 bg-white transition-all ${
                  pickerAnim ? "ring-2 ring-blue-100" : "hover:bg-gray-50"
                }`}
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
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="px-6 py-12 text-center">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-blue-600"></div>
            <p className="mt-3 text-sm text-gray-500">Loading revenues...</p>
          </div>
        ) : list.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <TrendingUp className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No revenue data found.</p>
            <p className="text-xs text-gray-400 mt-1">Try adjusting your filters or search query.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Driver</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gross Revenue</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Commission</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Net Revenue</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trips</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoices</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Payment</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {list.map((revenue) => (
                    <tr key={revenue.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {revenue.driver ? (
                          <div>
                            <div className="font-medium">{revenue.driver.name}</div>
                            <div className="text-xs text-gray-500">{revenue.driver.email}</div>
                          </div>
                        ) : (
                          <span className="text-gray-400">Unassigned</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        {revenue.grossRevenue.toLocaleString()} TZS
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-amber-600">
                        -{revenue.commissionAmount.toLocaleString()} TZS
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-emerald-600">
                        {revenue.netRevenue.toLocaleString()} TZS
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {revenue.tripCount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {revenue.invoiceCount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {revenue.lastPaymentDate ? (
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-gray-400 flex-shrink-0" />
                            <span>{new Date(revenue.lastPaymentDate).toLocaleDateString()}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-2 p-4">
              {list.map((revenue) => (
                <div key={revenue.id} className="border rounded-lg p-3 bg-white">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">
                        {revenue.driver?.name || "Unassigned"}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        {revenue.driver?.email}
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <div className="text-sm font-semibold text-emerald-600">
                        {revenue.netRevenue.toLocaleString()} TZS
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {revenue.tripCount} trips
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-gray-100 flex justify-between text-xs">
                    <span className="text-gray-500">Gross: {revenue.grossRevenue.toLocaleString()} TZS</span>
                    <span className="text-amber-600">Commission: -{revenue.commissionAmount.toLocaleString()} TZS</span>
                  </div>
                  {revenue.lastPaymentDate && (
                    <div className="mt-2 text-xs text-gray-400">
                      Last payment: {new Date(revenue.lastPaymentDate).toLocaleDateString()}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Pagination */}
            {pages > 1 && (
              <div className="px-4 sm:px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-sm text-gray-500 text-center sm:text-left">
                  Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total} drivers
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(pages, p + 1))}
                    disabled={page === pages}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

