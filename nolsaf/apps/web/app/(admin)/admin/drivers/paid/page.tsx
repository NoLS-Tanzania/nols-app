"use client";
import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { CreditCard, Search, X, Calendar, Clock, TrendingUp, PieChart, ExternalLink, MapPinned, Route, ShieldCheck, UserRound } from "lucide-react";
import DatePicker from "@/components/ui/DatePicker";
import axios from "axios";
import Chart from "@/components/Chart";
import type { ChartData } from "chart.js";

// Use same-origin for HTTP calls so Next.js rewrites proxy to the API
const api = axios.create({ baseURL: "", withCredentials: true });

function authify() {
  if (typeof window === "undefined") return;

  const lsToken =
    window.localStorage.getItem("token") ||
    window.localStorage.getItem("nolsaf_token") ||
    window.localStorage.getItem("__Host-nolsaf_token");

  if (lsToken) {
    api.defaults.headers.common["Authorization"] = `Bearer ${lsToken}`;
    return;
  }

  const m = String(document.cookie || "").match(/(?:^|;\s*)(?:nolsaf_token|__Host-nolsaf_token)=([^;]+)/);
  const cookieToken = m?.[1] ? decodeURIComponent(m[1]) : "";
  if (cookieToken) {
    api.defaults.headers.common["Authorization"] = `Bearer ${cookieToken}`;
  }
}

type PaidRow = {
  id: number;
  trip: {
    id: number;
    code: string;
    status: string;
    scheduledAt: string | null;
    pickup: string;
    dropoff: string;
    vehicleType: string | null;
  };
  driver: { id: number; name: string; email: string; phone: string | null } | null;
  gross: number;
  commissionAmount: number;
  netPaid: number;
  paidAt: string;
  paymentMethod: string | null;
  paymentRef: string | null;
  paidBy: { id: number; name: string; email: string } | null;
};

type TripDetailsResponse = {
  trip: {
    id: number;
    tripCode: string;
    status: string;
    scheduledAt: string | null;
    pickupTime: string | null;
    dropoffTime: string | null;
    accomplishedAt: string | null;
    pickup: string;
    dropoff: string;
    vehicleType: string | null;
    passengerCount: number | null;
    amount: number;
    currency: string;
    paymentStatus: string | null;
    paymentMethod: string | null;
    paymentRef: string | null;
    notes: string | null;
    customerRating: number | null;
    customerReview: string | null;
    driverRating: number | null;
    driverReview: string | null;
    createdAt: string | null;
    updatedAt: string | null;
    user: { id: number; name: string; email: string; phone: string | null } | null;
    driver: { id: number; name: string; email: string; phone: string | null } | null;
    payout: {
      id: number;
      status: string;
      currency: string;
      grossAmount: number | null;
      commissionPercent: number | null;
      commissionAmount: number | null;
      netPaid: number | null;
      approvedAt: string | null;
      paidAt: string | null;
      paymentMethod: string | null;
      paymentRef: string | null;
      createdAt: string | null;
      updatedAt: string | null;
    } | null;
  };
};

type PaidStats = {
  date: string;
  count: number;
  totalPaid: number;
  totalCommission: number;
};

type PaidStatsResponse = {
  stats: PaidStats[];
  summary: {
    totalPaid: number;
    totalCount: number;
    totalCommission: number;
    averagePayment: number;
  };
  period: string;
  startDate: string;
  endDate: string;
};

const moneyFormatter = new Intl.NumberFormat("en-US");
const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});
const dateFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

function formatMoney(value: number) {
  return `${moneyFormatter.format(Math.round(value))} TZS`;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "N/A";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "N/A" : dateTimeFormatter.format(parsed);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "N/A";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "N/A" : dateFormatter.format(parsed);
}

function formatRating(value: number | null | undefined) {
  if (value == null) return "Not rated";
  return `${value.toFixed(1)}/5`;
}

export default function AdminDriversPaidPage() {
  const [date, setDate] = useState<string | string[]>("");
  const [q, setQ] = useState("");
  const [list, setList] = useState<PaidRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 30;
  const searchRef = useRef<HTMLInputElement | null>(null);
  const [pickerAnim, setPickerAnim] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  
  // Stats state
  const [statsPeriod, setStatsPeriod] = useState<string>("30d");
  const [statsData, setStatsData] = useState<PaidStatsResponse | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [detailsTripId, setDetailsTripId] = useState<number | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [detailsData, setDetailsData] = useState<TripDetailsResponse | null>(null);

  const load = useCallback(async () => {
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

      const r = await api.get<{ items: PaidRow[]; total: number }>("/api/admin/drivers/paid", { params });
      setList(r.data?.items ?? []);
      setTotal(r.data?.total ?? 0);
    } catch (err) {
      console.error("Failed to load paid records", err);
      setList([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, date, q]);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const r = await api.get<PaidStatsResponse>("/api/admin/drivers/paid/stats", {
        params: { period: statsPeriod },
      });
      setStatsData(r.data);
    } catch (err) {
      console.error("Failed to load payment statistics", err);
      setStatsData(null);
    } finally {
      setStatsLoading(false);
    }
  }, [statsPeriod]);

  useEffect(() => {
    authify();
    load();
  }, [load]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const openDetails = useCallback(async (tripId: number) => {
    setDetailsTripId(tripId);
    setDetailsOpen(true);
    setDetailsLoading(true);
    setDetailsError(null);
    try {
      const response = await api.get<TripDetailsResponse>(`/api/admin/drivers/trips/${tripId}`);
      setDetailsData(response.data);
    } catch (err) {
      console.error("Failed to load trip details", err);
      setDetailsData(null);
      setDetailsError("Unable to load trip details right now.");
    } finally {
      setDetailsLoading(false);
    }
  }, []);

  const closeDetails = useCallback(() => {
    setDetailsOpen(false);
    setDetailsTripId(null);
    setDetailsLoading(false);
    setDetailsError(null);
    setDetailsData(null);
  }, []);

  const pages = Math.max(1, Math.ceil(total / pageSize));

  // Prepare area chart data (modern gradient fill)
  const areaChartData = useMemo<ChartData<"line">>(() => {
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
          label: "Total Paid",
          data: statsData.stats.map((s) => s.totalPaid),
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
          label: "Commission",
          data: statsData.stats.map((s) => s.totalCommission),
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

  // Prepare donut chart data for payment method breakdown
  const donutChartData = useMemo<ChartData<"doughnut">>(() => {
    if (!list || list.length === 0) {
      return {
        labels: [],
        datasets: [],
      };
    }

    const methodCounts = new Map<string, number>();
    list.forEach((item) => {
      const method = item.paymentMethod || "Unknown";
      methodCounts.set(method, (methodCounts.get(method) || 0) + 1);
    });

    const labels = Array.from(methodCounts.keys());
    const data = Array.from(methodCounts.values());
    const colors = [
      "rgba(59, 130, 246, 0.8)",
      "rgba(16, 185, 129, 0.8)",
      "rgba(245, 158, 11, 0.8)",
      "rgba(239, 68, 68, 0.8)",
      "rgba(139, 92, 246, 0.8)",
      "rgba(236, 72, 153, 0.8)",
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
  }, [list]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Premium Header Banner */}
      <div
        className="relative rounded-2xl overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #0e2a7a 0%, #0a5c82 38%, #02665e 100%)",
          boxShadow: "0 28px 65px -15px rgba(2,102,94,0.45), 0 8px 22px -8px rgba(14,42,122,0.50)",
        }}
      >
        {/* Sparkline SVG */}
        <svg aria-hidden="true" className="absolute inset-0 w-full h-full pointer-events-none select-none" viewBox="0 0 900 220" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
          <circle cx="860" cy="-20" r="130" fill="none" stroke="rgba(255,255,255,0.055)" strokeWidth="1.2" />
          <circle cx="860" cy="-20" r="195" fill="none" stroke="rgba(255,255,255,0.035)" strokeWidth="1" />
          <circle cx="40" cy="240" r="110" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
          <line x1="0" y1="55" x2="900" y2="55" stroke="rgba(255,255,255,0.045)" strokeWidth="0.8" />
          <line x1="0" y1="110" x2="900" y2="110" stroke="rgba(255,255,255,0.045)" strokeWidth="0.8" />
          <line x1="0" y1="165" x2="900" y2="165" stroke="rgba(255,255,255,0.03)" strokeWidth="0.8" />
          <polyline points="0,170 80,155 160,140 240,145 320,120 400,105 480,118 560,92 640,75 720,88 800,60 900,48" fill="none" stroke="rgba(255,255,255,0.30)" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
          <polygon points="0,170 80,155 160,140 240,145 320,120 400,105 480,118 560,92 640,75 720,88 800,60 900,48 900,220 0,220" fill="rgba(255,255,255,0.04)" />
          <polyline points="0,190 100,178 200,168 300,175 400,155 500,142 600,150 700,128 800,115 900,100" fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="1.4" strokeDasharray="5 4" strokeLinejoin="round" />
          <circle cx="320" cy="120" r="4.5" fill="rgba(56,189,248,0.70)" />
          <circle cx="320" cy="120" r="9" fill="rgba(56,189,248,0.15)" />
          <circle cx="560" cy="92" r="4.5" fill="rgba(16,185,129,0.70)" />
          <circle cx="560" cy="92" r="9" fill="rgba(16,185,129,0.15)" />
          <circle cx="800" cy="60" r="4.5" fill="rgba(165,180,252,0.70)" />
          <circle cx="800" cy="60" r="9" fill="rgba(165,180,252,0.15)" />
          <ellipse cx="450" cy="110" rx="260" ry="70" fill="url(#drvPayGlow)" />
          <defs>
            <radialGradient id="drvPayGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(2,102,94,0.18)" />
              <stop offset="100%" stopColor="rgba(2,102,94,0)" />
            </radialGradient>
          </defs>
        </svg>

        <div className="relative z-10 px-6 pt-8 pb-7 sm:px-8 sm:pt-10">
          {/* Icon + title */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center justify-center rounded-xl flex-shrink-0" style={{ width: 46, height: 46, background: "rgba(255,255,255,0.10)", border: "1.5px solid rgba(255,255,255,0.18)", boxShadow: "0 0 0 8px rgba(255,255,255,0.05), 0 8px 32px rgba(0,0,0,0.35)" }}>
              <CreditCard className="h-5 w-5" style={{ color: "rgba(255,255,255,0.92)" }} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight" style={{ color: "#ffffff", textShadow: "0 2px 12px rgba(0,0,0,0.40)" }}>Driver Payments</h1>
              <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.58)" }}>Completed transport trip payouts from admins to drivers, with full trip visibility and payment accountability</p>
            </div>
          </div>

          {/* KPI chips */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              {
                label: "Total Paid",
                value: statsData?.summary ? formatMoney(statsData.summary.totalPaid) : null,
                bg: "rgba(56,189,248,0.18)", border: "rgba(56,189,248,0.32)", color: "#7dd3fc",
              },
              {
                label: "Total Payments",
                value: statsData?.summary ? statsData.summary.totalCount.toLocaleString() : null,
                bg: "rgba(16,185,129,0.18)", border: "rgba(16,185,129,0.32)", color: "#6ee7b7",
              },
              {
                label: "Total Commission",
                value: statsData?.summary ? formatMoney(statsData.summary.totalCommission) : null,
                bg: "rgba(245,158,11,0.18)", border: "rgba(245,158,11,0.32)", color: "#fcd34d",
              },
              {
                label: "Avg Payment",
                value: statsData?.summary ? formatMoney(statsData.summary.averagePayment) : null,
                bg: "rgba(99,102,241,0.18)", border: "rgba(99,102,241,0.32)", color: "#a5b4fc",
              },
            ].map((kpi) => (
              <div key={kpi.label} className="rounded-xl px-4 py-3" style={{ background: kpi.bg, border: `1px solid ${kpi.border}`, backdropFilter: "blur(8px)" }}>
                {statsLoading || kpi.value === null ? (
                  <div className="animate-pulse rounded-lg h-10 w-full" style={{ background: "rgba(255,255,255,0.12)" }} />
                ) : (
                  <>
                    <div className="text-xs uppercase tracking-widest mb-1" style={{ color: "rgba(255,255,255,0.55)" }}>{kpi.label}</div>
                    <div className="text-lg sm:text-xl font-black tabular-nums leading-tight" style={{ color: kpi.color, textShadow: `0 0 18px ${kpi.color}55` }}>{kpi.value}</div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Area Chart - Main Visualization */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 p-6 shadow-sm transition-all duration-300 hover:shadow-lg hover:border-blue-300 hover:-translate-y-1 group">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 group-hover:text-blue-600 transition-colors duration-300">
                <TrendingUp className="h-5 w-5 text-blue-600 group-hover:scale-110 transition-transform duration-300" />
                Payment Trends
              </h3>
              <p className="text-sm text-gray-500 mt-1">Payment and commission trends over time</p>
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
                data={areaChartData}
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

        {/* Donut Chart - Payment Methods */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm transition-all duration-300 hover:shadow-lg hover:border-purple-300 hover:-translate-y-1 group">
          <div className="flex items-center gap-2 mb-6">
            <PieChart className="h-5 w-5 text-purple-600 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300" />
            <h3 className="text-lg font-semibold text-gray-900 group-hover:text-purple-600 transition-colors duration-300">Payment Methods</h3>
          </div>

          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-purple-600"></div>
            </div>
          ) : list.length > 0 ? (
            <div className="h-64 w-full transform transition-all duration-500 group-hover:scale-[1.02]">
              <Chart
                type="doughnut"
                data={donutChartData}
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
                          return `${label}: ${value} (${percentage}%)`;
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
                <p className="text-sm text-gray-500">No payment data available</p>
              </div>
            </div>
          )}
        </div>
      </div>

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
                  placeholder="Search by trip, driver, payer, or payment reference..."
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (page !== 1) setPage(1);
                      else load();
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
                      onSelectAction={(s) => {
                        setDate(s as string | string[]);
                        setPage(1);
                      }}
                      onCloseAction={() => setPickerOpen(false)}
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
            <p className="mt-3 text-sm text-gray-500">Loading payments...</p>
          </div>
        ) : list.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <CreditCard className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No payments found.</p>
            <p className="text-xs text-gray-400 mt-1">Try adjusting your filters or search query.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trip</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Driver</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Route</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gross</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Commission</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Net Paid</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paid At</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paid By</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {list.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm text-gray-900 min-w-[220px]">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 rounded-xl border border-sky-200 bg-sky-50 p-2 text-sky-700">
                            <Route className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">{payment.trip.code}</div>
                            <div className="mt-1 text-xs text-gray-500">{payment.trip.vehicleType || "Transport trip"}</div>
                            <div className="mt-1 inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                              {payment.trip.status}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {payment.driver ? (
                          <div>
                            <div className="font-medium">{payment.driver.name}</div>
                            <div className="text-xs text-gray-500">{payment.driver.email}</div>
                          </div>
                        ) : (
                          <span className="text-gray-400">Unassigned</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 min-w-[280px]">
                        <div className="space-y-2">
                          <div className="flex items-start gap-2 text-gray-700">
                            <MapPinned className="mt-0.5 h-4 w-4 text-sky-600 flex-shrink-0" />
                            <span className="line-clamp-2">{payment.trip.pickup}</span>
                          </div>
                          <div className="flex items-start gap-2 text-gray-500">
                            <ExternalLink className="mt-0.5 h-4 w-4 text-emerald-600 flex-shrink-0" />
                            <span className="line-clamp-2">{payment.trip.dropoff}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatMoney(payment.gross)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-amber-600">
                        -{formatMoney(payment.commissionAmount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-emerald-600">
                        {formatMoney(payment.netPaid)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 min-w-[170px]">
                        <div className="flex items-start gap-2">
                          <Clock className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          <div>
                            <div>{formatDateTime(payment.paidAt)}</div>
                            <div className="text-xs text-gray-500">{payment.paymentMethod || "Method not recorded"}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 min-w-[160px]">
                        {payment.paidBy ? (
                          <div>
                            <div className="font-medium">{payment.paidBy.name || "Admin"}</div>
                            <div className="text-xs text-gray-500">{payment.paidBy.email}</div>
                          </div>
                        ) : (
                          <span className="text-gray-400">Unknown admin</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button
                          type="button"
                          onClick={() => openDetails(payment.trip.id)}
                          className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-1.5 font-medium text-slate-700 shadow-sm transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Trip Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-2 p-4">
              {list.map((payment) => (
                <div key={payment.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="bg-gradient-to-r from-slate-900 via-sky-900 to-emerald-800 px-4 py-3 text-white">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold tracking-wide">{payment.trip.code}</div>
                        <div className="mt-1 text-xs text-slate-200">{payment.trip.vehicleType || "Transport trip"}</div>
                      </div>
                      <div className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-100">
                        {payment.trip.status}
                      </div>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{payment.driver?.name || "Unassigned"}</div>
                        <div className="mt-1 text-sm text-gray-500">{payment.driver?.email || "No driver email"}</div>
                        <div className="mt-3 space-y-2 text-xs text-gray-600">
                          <div className="flex items-start gap-2">
                            <MapPinned className="mt-0.5 h-3.5 w-3.5 text-sky-600 flex-shrink-0" />
                            <span>{payment.trip.pickup}</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <ExternalLink className="mt-0.5 h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
                            <span>{payment.trip.dropoff}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <div className="text-sm font-semibold text-emerald-600">{formatMoney(payment.netPaid)}</div>
                        <div className="mt-1 text-xs text-gray-500">{payment.paymentMethod || "Method not recorded"}</div>
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3 text-xs">
                      <div>
                        <div className="text-slate-500">Gross</div>
                        <div className="mt-1 font-semibold text-slate-900">{formatMoney(payment.gross)}</div>
                      </div>
                      <div>
                        <div className="text-slate-500">Commission</div>
                        <div className="mt-1 font-semibold text-amber-600">-{formatMoney(payment.commissionAmount)}</div>
                      </div>
                      <div>
                        <div className="text-slate-500">Paid at</div>
                        <div className="mt-1 font-semibold text-slate-900">{formatDateTime(payment.paidAt)}</div>
                      </div>
                      <div>
                        <div className="text-slate-500">Paid by</div>
                        <div className="mt-1 font-semibold text-slate-900">{payment.paidBy?.name || "Unknown admin"}</div>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-4 text-xs text-slate-500">
                      <span>{payment.paymentRef || "No payment reference"}</span>
                      <button
                        type="button"
                        onClick={() => openDetails(payment.trip.id)}
                        className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 font-medium text-sky-700"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Trip Details
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {pages > 1 && (
              <div className="px-4 sm:px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-sm text-gray-500 text-center sm:text-left">
                  Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total} payments
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

      {detailsOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 p-0 sm:items-center sm:p-6">
          <button type="button" className="absolute inset-0 cursor-default" onClick={closeDetails} aria-label="Close trip details" />
          <div className="relative z-10 max-h-[92vh] w-full overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-w-4xl sm:rounded-3xl">
            <div className="relative overflow-hidden bg-gradient-to-r from-slate-950 via-sky-900 to-emerald-800 px-6 py-5 text-white sm:px-8">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(125,211,252,0.2),transparent_40%),radial-gradient(circle_at_bottom_left,rgba(110,231,183,0.16),transparent_38%)]" />
              <div className="relative flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs uppercase tracking-[0.28em] text-slate-300">Trip Payout Details</div>
                  <h2 className="mt-2 text-xl font-black tracking-tight">
                    {detailsData?.trip.tripCode || (detailsTripId ? `Trip #${detailsTripId}` : "Trip Details")}
                  </h2>
                  <p className="mt-1 text-sm text-slate-200">Customer, route, payout history, timestamps, and ratings for this completed driver payout.</p>
                </div>
                <button
                  type="button"
                  onClick={closeDetails}
                  className="rounded-full border border-white/15 bg-white/10 p-2 text-white transition hover:bg-white/20"
                  aria-label="Close trip details"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="max-h-[calc(92vh-96px)] overflow-y-auto px-6 py-6 sm:px-8">
              {detailsLoading ? (
                <div className="flex min-h-[260px] items-center justify-center">
                  <div className="inline-block h-7 w-7 animate-spin rounded-full border-2 border-slate-300 border-t-sky-600"></div>
                </div>
              ) : detailsError ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-5 text-sm text-rose-700">{detailsError}</div>
              ) : detailsData ? (
                <div className="space-y-6">
                  <div className="grid gap-4 lg:grid-cols-4">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 lg:col-span-2">
                      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Route</div>
                      <div className="mt-3 space-y-3 text-sm text-slate-700">
                        <div className="flex gap-3">
                          <MapPinned className="mt-0.5 h-4 w-4 text-sky-600 flex-shrink-0" />
                          <div>
                            <div className="text-xs uppercase tracking-wide text-slate-500">Pickup</div>
                            <div className="font-medium text-slate-900">{detailsData.trip.pickup}</div>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <ExternalLink className="mt-0.5 h-4 w-4 text-emerald-600 flex-shrink-0" />
                          <div>
                            <div className="text-xs uppercase tracking-wide text-slate-500">Dropoff</div>
                            <div className="font-medium text-slate-900">{detailsData.trip.dropoff}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Customer</div>
                      <div className="mt-3 space-y-1">
                        <div className="font-semibold text-slate-900">{detailsData.trip.user?.name || "N/A"}</div>
                        <div className="text-sm text-slate-600">{detailsData.trip.user?.phone || detailsData.trip.user?.email || "No contact recorded"}</div>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Net Paid</div>
                      <div className="mt-3 text-2xl font-black text-emerald-700">{formatMoney(detailsData.trip.payout?.netPaid ?? detailsData.trip.amount)}</div>
                      <div className="mt-2 text-xs text-emerald-700/80">Status: {detailsData.trip.payout?.status || detailsData.trip.status}</div>
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                        <ShieldCheck className="h-4 w-4 text-sky-600" />
                        Trip Timeline
                      </div>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-xl bg-slate-50 p-3">
                          <div className="text-xs uppercase tracking-wide text-slate-500">Scheduled</div>
                          <div className="mt-1 text-sm font-medium text-slate-900">{formatDateTime(detailsData.trip.scheduledAt)}</div>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-3">
                          <div className="text-xs uppercase tracking-wide text-slate-500">Accomplished</div>
                          <div className="mt-1 text-sm font-medium text-slate-900">{formatDateTime(detailsData.trip.accomplishedAt)}</div>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-3">
                          <div className="text-xs uppercase tracking-wide text-slate-500">Picked Up</div>
                          <div className="mt-1 text-sm font-medium text-slate-900">{formatDateTime(detailsData.trip.pickupTime)}</div>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-3">
                          <div className="text-xs uppercase tracking-wide text-slate-500">Dropped Off</div>
                          <div className="mt-1 text-sm font-medium text-slate-900">{formatDateTime(detailsData.trip.dropoffTime)}</div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                        <UserRound className="h-4 w-4 text-emerald-600" />
                        Trip Context
                      </div>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-xl bg-slate-50 p-3">
                          <div className="text-xs uppercase tracking-wide text-slate-500">Driver</div>
                          <div className="mt-1 text-sm font-medium text-slate-900">{detailsData.trip.driver?.name || "Unassigned"}</div>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-3">
                          <div className="text-xs uppercase tracking-wide text-slate-500">Vehicle Type</div>
                          <div className="mt-1 text-sm font-medium text-slate-900">{detailsData.trip.vehicleType || "N/A"}</div>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-3">
                          <div className="text-xs uppercase tracking-wide text-slate-500">Passengers</div>
                          <div className="mt-1 text-sm font-medium text-slate-900">{detailsData.trip.passengerCount ?? "N/A"}</div>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-3">
                          <div className="text-xs uppercase tracking-wide text-slate-500">Payment Status</div>
                          <div className="mt-1 text-sm font-medium text-slate-900">{detailsData.trip.paymentStatus || "N/A"}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-3">
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                        <CreditCard className="h-4 w-4 text-violet-600" />
                        Payout Breakdown
                      </div>
                      <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        <div className="rounded-xl bg-slate-50 p-3">
                          <div className="text-xs uppercase tracking-wide text-slate-500">Gross</div>
                          <div className="mt-1 text-sm font-semibold text-slate-900">{formatMoney(detailsData.trip.payout?.grossAmount ?? detailsData.trip.amount)}</div>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-3">
                          <div className="text-xs uppercase tracking-wide text-slate-500">Commission</div>
                          <div className="mt-1 text-sm font-semibold text-amber-600">-{formatMoney(detailsData.trip.payout?.commissionAmount ?? 0)}</div>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-3">
                          <div className="text-xs uppercase tracking-wide text-slate-500">Net Paid</div>
                          <div className="mt-1 text-sm font-semibold text-emerald-600">{formatMoney(detailsData.trip.payout?.netPaid ?? detailsData.trip.amount)}</div>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-3">
                          <div className="text-xs uppercase tracking-wide text-slate-500">Payment Method</div>
                          <div className="mt-1 text-sm font-medium text-slate-900">{detailsData.trip.payout?.paymentMethod || detailsData.trip.paymentMethod || "N/A"}</div>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-3">
                          <div className="text-xs uppercase tracking-wide text-slate-500">Reference</div>
                          <div className="mt-1 text-sm font-medium text-slate-900 break-words">{detailsData.trip.payout?.paymentRef || detailsData.trip.paymentRef || "N/A"}</div>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-3">
                          <div className="text-xs uppercase tracking-wide text-slate-500">Paid At</div>
                          <div className="mt-1 text-sm font-medium text-slate-900">{formatDateTime(detailsData.trip.payout?.paidAt)}</div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                        <ShieldCheck className="h-4 w-4 text-amber-600" />
                        Ratings
                      </div>
                      <div className="mt-4 space-y-3">
                        <div className="rounded-xl bg-slate-50 p-3">
                          <div className="text-xs uppercase tracking-wide text-slate-500">Customer Rating</div>
                          <div className="mt-1 text-sm font-semibold text-slate-900">{formatRating(detailsData.trip.customerRating)}</div>
                          <div className="mt-1 text-xs text-slate-500">{detailsData.trip.customerReview || "No customer review provided."}</div>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-3">
                          <div className="text-xs uppercase tracking-wide text-slate-500">Driver Rating</div>
                          <div className="mt-1 text-sm font-semibold text-slate-900">{formatRating(detailsData.trip.driverRating)}</div>
                          <div className="mt-1 text-xs text-slate-500">{detailsData.trip.driverReview || "No driver review provided."}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {detailsData.trip.notes && (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                        <CreditCard className="h-4 w-4 text-slate-600" />
                        Notes
                      </div>
                      <p className="mt-2 text-sm text-slate-700">{detailsData.trip.notes}</p>
                    </div>
                  )}

                  <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                      <span>Booked: {formatDate(detailsData.trip.createdAt)}</span>
                      <span>Updated: {formatDateTime(detailsData.trip.updatedAt)}</span>
                      <span>Reference: {detailsData.trip.paymentRef || "N/A"}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-600">No trip details available.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

