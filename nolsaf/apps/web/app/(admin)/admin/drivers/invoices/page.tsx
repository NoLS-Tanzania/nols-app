"use client";
import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { FileText, Search, X, Calendar, DollarSign, Clock, BarChart3 } from "lucide-react";
import DatePicker from "@/components/ui/DatePicker";
import axios from "axios";
import Chart from "@/components/Chart";
import type { ChartData } from "chart.js";

// Use same-origin for HTTP calls so Next.js rewrites proxy to the API
const api = axios.create({ baseURL: "", withCredentials: true });
function authify() {}

type InvoiceRow = {
  id: number;
  invoiceNumber: string;
  receiptNumber: string | null;
  driver: { id: number; name: string; email: string; phone: string | null } | null;
  amount: number;
  status: string;
  issuedAt: string;
  createdAt: string;
};

function badgeClasses(v: string) {
  switch (v) {
    case "PENDING":
      return "bg-gray-100 text-gray-700";
    case "APPROVED":
      return "bg-blue-100 text-blue-700";
    case "PROCESSING":
      return "bg-yellow-100 text-yellow-700";
    case "PAID":
      return "bg-emerald-100 text-emerald-700";
    case "REJECTED":
      return "bg-red-100 text-red-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

type InvoiceStats = {
  date: string;
  count: number;
  paid: number;
  amount: number;
};

type InvoiceStatsResponse = {
  stats: InvoiceStats[];
  period: string;
  startDate: string;
  endDate: string;
};

export default function AdminDriversInvoicesPage() {
  const [status, setStatus] = useState<string>("");
  const [date, setDate] = useState<string | string[]>("");
  const [q, setQ] = useState("");
  const [list, setList] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 30;
  const searchRef = useRef<HTMLInputElement | null>(null);
  const [pickerAnim, setPickerAnim] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  
  // Histogram state
  const [histogramPeriod, setHistogramPeriod] = useState<string>("30d");
  const [histogramData, setHistogramData] = useState<InvoiceStatsResponse | null>(null);
  const [histogramLoading, setHistogramLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const params: any = {
        page,
        pageSize,
      };
      if (status) params.status = status;
      if (date) {
        if (Array.isArray(date)) {
          params.start = date[0];
          params.end = date[1];
        } else {
          params.date = date;
        }
      }
      if (q) params.q = q;

      const r = await api.get<{ items: InvoiceRow[]; total: number }>("/api/admin/drivers/invoices", { params });
      setList(r.data?.items ?? []);
      setTotal(r.data?.total ?? 0);
    } catch (err) {
      console.error("Failed to load invoices", err);
      setList([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  const loadHistogram = useCallback(async () => {
    setHistogramLoading(true);
    try {
      const r = await api.get<InvoiceStatsResponse>("/api/admin/drivers/invoices/stats", {
        params: { period: histogramPeriod },
      });
      setHistogramData(r.data);
    } catch (err) {
      console.error("Failed to load invoice statistics", err);
      setHistogramData(null);
    } finally {
      setHistogramLoading(false);
    }
  }, [histogramPeriod]);

  useEffect(() => {
    authify();
    load();
  }, [page, status, date, q]);

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
          label: "Total Invoices",
          data: histogramData.stats.map((s) => s.count),
          backgroundColor: "rgba(59, 130, 246, 0.6)",
          borderColor: "rgba(59, 130, 246, 1)",
          borderWidth: 1,
        },
        {
          label: "Paid",
          data: histogramData.stats.map((s) => s.paid),
          backgroundColor: "rgba(16, 185, 129, 0.6)",
          borderColor: "rgba(16, 185, 129, 1)",
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
          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center mb-4">
            <FileText className="h-8 w-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Driver Invoices</h1>
          <p className="text-sm text-gray-500 mt-1">View and manage all driver invoices and payments</p>
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
                  placeholder="Search invoices..."
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

          {/* Bottom Row: Status Filters */}
          <div className="flex gap-2 items-center justify-center w-full overflow-x-auto pb-1 scrollbar-hide">
            {[
              { label: "All", value: "" },
              { label: "Pending", value: "PENDING" },
              { label: "Approved", value: "APPROVED" },
              { label: "Processing", value: "PROCESSING" },
              { label: "Paid", value: "PAID" },
              { label: "Rejected", value: "REJECTED" },
            ].map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => {
                  setStatus(s.value);
                  setPage(1);
                  setTimeout(() => load(), 0);
                }}
                className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all duration-200 whitespace-nowrap flex-shrink-0 ${
                  status === s.value
                    ? "bg-blue-50 border-blue-300 text-blue-700"
                    : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="px-6 py-12 text-center">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-blue-600"></div>
            <p className="mt-3 text-sm text-gray-500">Loading invoices...</p>
          </div>
        ) : list.length === 0 ? (
          <>
            <div className="px-6 py-12 text-center">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">No invoices found.</p>
              <p className="text-xs text-gray-400 mt-1">Try adjusting your filters or search query.</p>
            </div>
            
            {/* Invoice Statistics Histogram */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm transition-all duration-300 hover:shadow-lg hover:border-blue-300 hover:-translate-y-1 group">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 group-hover:text-blue-600 transition-colors duration-300">
                    <BarChart3 className="h-5 w-5 text-blue-600 group-hover:scale-110 transition-transform duration-300" />
                    Invoice Statistics
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">Visualize invoice data over time</p>
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
                      ? "bg-blue-50 border-blue-300 text-blue-700 scale-105 shadow-md"
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
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-blue-600"></div>
                </div>
              ) : histogramData && histogramData.stats.length > 0 ? (
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
                              const index = context.dataIndex;
                              const amount = histogramData.stats[index]?.amount || 0;
                              if (label === "Total Invoices") {
                                return `${label}: ${value} invoices (${amount.toLocaleString()} TZS)`;
                              }
                              return `${label}: ${value} invoices`;
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
                            text: "Number of Invoices",
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
                  {/* Skeleton Histogram */}
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
                      <div className="absolute bottom-0 left-0 right-0 h-full flex items-end justify-between gap-2 px-2">
                        {[...Array(7)].map((_, i) => {
                          const height = Math.random() * 60 + 20; // Random height between 20% and 80%
                          return (
                            <div
                              key={i}
                              className="flex-1 flex flex-col items-center justify-end gap-1"
                            >
                              <div
                                className="w-full bg-gray-200 rounded-t animate-pulse"
                                style={{ height: `${height}%` }}
                              ></div>
                              <div className="h-3 w-12 bg-gray-200 rounded animate-pulse"></div>
                            </div>
                          );
                        })}
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice #</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Driver</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Issued At</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {list.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {invoice.invoiceNumber || `INV-${invoice.id}`}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {invoice.driver ? (
                          <div>
                            <div className="font-medium">{invoice.driver.name}</div>
                            <div className="text-xs text-gray-500">{invoice.driver.email}</div>
                          </div>
                        ) : (
                          <span className="text-gray-400">Unassigned</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          <span>{invoice.amount.toLocaleString()} TZS</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          <span>{new Date(invoice.issuedAt).toLocaleDateString()}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${badgeClasses(invoice.status)}`}>
                          {invoice.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-2 p-4">
              {list.map((invoice) => (
                <div key={invoice.id} className="border rounded-lg p-3 bg-white">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{invoice.invoiceNumber || `INV-${invoice.id}`}</div>
                      <div className="text-sm text-gray-500 mt-1">
                        {invoice.driver?.name || "Unassigned"}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {new Date(invoice.issuedAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${badgeClasses(invoice.status)}`}>
                        {invoice.status}
                      </span>
                      <div className="text-sm font-semibold text-gray-900 mt-1">
                        {invoice.amount.toLocaleString()} TZS
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {pages > 1 && (
              <div className="px-4 sm:px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-sm text-gray-500 text-center sm:text-left">
                  Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total} invoices
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

