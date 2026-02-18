"use client";

import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { DollarSign, Loader2, TrendingUp, FileText, CheckCircle, Check, Clock, XCircle, Search, X, RotateCcw, Calendar, Filter } from "lucide-react";
import Link from "next/link";
import DatePicker from "@/components/ui/DatePicker";

// Use same-origin calls + secure httpOnly cookie session.
const api = axios.create({ baseURL: "", withCredentials: true });

type Invoice = {
  id: number;
  invoiceNumber: string;
  status: string;
  issuedAt: string;
  paidAt?: string | null;
  total: number | string;
  netPayable: number | string;
  receiptNumber?: string | null;
  booking?: {
    id: number;
    property?: {
      id: number;
      title: string;
    };
  };
};

type RevenueStats = {
  totalRevenue: number;
  paidRevenue: number;
  pendingRevenue: number;
  totalInvoices: number;
  paidInvoices: number;
  pendingInvoices: number;
};

type InvoicesResponse = {
  items: Invoice[];
  hasMore?: boolean;
  nextBeforeId?: number | null;
};

export default function OwnerRevenuePage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [fromPickerOpen, setFromPickerOpen] = useState(false);
  const [toPickerOpen, setToPickerOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [search, setSearch] = useState<string>("");
  const [sortKey, setSortKey] = useState<string>("issuedAt_desc");
  const [hasMore, setHasMore] = useState(false);
  const [nextBeforeId, setNextBeforeId] = useState<number | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const didInitialLoad = useRef(false);
  const [stats, setStats] = useState<RevenueStats>({
    totalRevenue: 0,
    paidRevenue: 0,
    pendingRevenue: 0,
    totalInvoices: 0,
    paidInvoices: 0,
    pendingInvoices: 0,
  });

  useEffect(() => {
    let mounted = true;
    const isInitial = !didInitialLoad.current;
    const pageSize = 50;
    
    const loadRevenue = async () => {
      try {
        if (mounted) {
          if (isInitial) setLoading(true);
          else setRefreshing(true);
        }

        const [invoicesRes, statsRes] = await Promise.all([
          api.get<InvoicesResponse>("/api/owner/revenue/invoices", {
            params: {
              take: pageSize,
              status: statusFilter || undefined,
              date_from: dateFrom || undefined,
              date_to: dateTo || undefined,
            },
          }),
          api.get<RevenueStats>("/api/owner/revenue/stats", {
            params: {
              status: statusFilter || undefined,
              date_from: dateFrom || undefined,
              date_to: dateTo || undefined,
            },
          }),
        ]);

        if (!mounted) return;

        const items = invoicesRes.data?.items || [];
        setInvoices(items);
        setHasMore(Boolean(invoicesRes.data?.hasMore));
        setNextBeforeId(typeof invoicesRes.data?.nextBeforeId === "number" ? invoicesRes.data.nextBeforeId : null);
        setStats({
          totalRevenue: Number(statsRes.data?.totalRevenue ?? 0),
          paidRevenue: Number(statsRes.data?.paidRevenue ?? 0),
          pendingRevenue: Number(statsRes.data?.pendingRevenue ?? 0),
          totalInvoices: Number(statsRes.data?.totalInvoices ?? 0),
          paidInvoices: Number(statsRes.data?.paidInvoices ?? 0),
          pendingInvoices: Number(statsRes.data?.pendingInvoices ?? 0),
        });

        didInitialLoad.current = true;
      } catch (err: any) {
        console.error('Failed to load revenue:', err);
        if (mounted) {
          setInvoices([]);
          setHasMore(false);
          setNextBeforeId(null);
          setStats({
            totalRevenue: 0,
            paidRevenue: 0,
            pendingRevenue: 0,
            totalInvoices: 0,
            paidInvoices: 0,
            pendingInvoices: 0,
          });
        }
      } finally {
        if (mounted) {
          if (isInitial) setLoading(false);
          setRefreshing(false);
        }
      }
    };

    loadRevenue();
    return () => { mounted = false; };
  }, [statusFilter, dateFrom, dateTo]);

  const loadMore = async () => {
    if (!hasMore || loadingMore) return;
    const pageSize = 50;
    setLoadingMore(true);
    try {
      const response = await api.get<InvoicesResponse>("/api/owner/revenue/invoices", {
        params: {
          take: pageSize,
          beforeId: nextBeforeId ?? undefined,
          status: statusFilter || undefined,
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
        },
      });

      const items = response.data?.items || [];
      setInvoices((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        const merged = prev.slice();
        for (const inv of items) {
          if (!seen.has(inv.id)) merged.push(inv);
        }
        return merged;
      });
      setHasMore(Boolean(response.data?.hasMore));
      setNextBeforeId(typeof response.data?.nextBeforeId === "number" ? response.data.nextBeforeId : null);
    } catch (err) {
      console.error("Failed to load more invoices:", err);
    } finally {
      setLoadingMore(false);
    }
  };

  const filteredSorted = (() => {
    const q = search.trim().toLowerCase();
    let arr = invoices.slice();

    if (q) {
      arr = arr.filter((inv) => {
        const invNo = String(inv.invoiceNumber ?? "").toLowerCase();
        const prop = String(inv.booking?.property?.title ?? "").toLowerCase();
        const receipt = String(inv.receiptNumber ?? "").toLowerCase();
        return invNo.includes(q) || prop.includes(q) || receipt.includes(q);
      });
    }

    const cmpStr = (a: string, b: string) => a.localeCompare(b);
    const cmpNum = (a: number, b: number) => a - b;
    const toNum = (v: any) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : 0;
    };
    const toTime = (v: any) => {
      const t = new Date(String(v)).getTime();
      return Number.isFinite(t) ? t : 0;
    };

    const [key, dir] = sortKey.split("_");
    const mul = dir === "asc" ? 1 : -1;

    const payout = (inv: Invoice) => {
      const net = toNum(inv.netPayable);
      if (Number.isFinite(net) && net > 0) return net;
      return toNum(inv.total);
    };

    arr.sort((A, B) => {
      if (key === "invoiceNumber") return mul * cmpStr(String(A.invoiceNumber ?? ""), String(B.invoiceNumber ?? ""));
      if (key === "property") return mul * cmpStr(String(A.booking?.property?.title ?? ""), String(B.booking?.property?.title ?? ""));
      if (key === "status") return mul * cmpStr(String(A.status ?? ""), String(B.status ?? ""));
      if (key === "amount") return mul * cmpNum(payout(A), payout(B));
      // default: issuedAt
      return mul * cmpNum(toTime(A.issuedAt), toTime(B.issuedAt));
    });

    return arr;
  })();

  const activePanelFiltersCount =
    (statusFilter ? 1 : 0) +
    (dateFrom ? 1 : 0) +
    (dateTo ? 1 : 0) +
    (sortKey !== "issuedAt_desc" ? 1 : 0);

  useEffect(() => {
    if (!filtersOpen) {
      setFromPickerOpen(false);
      setToPickerOpen(false);
    }
  }, [filtersOpen]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatIsoShort = (iso?: string) => {
    if (!iso) return "";
    const parts = String(iso).split("-");
    if (parts.length !== 3) return String(iso);
    const [y, m, d] = parts;
    if (!y || !m || !d) return String(iso);
    try {
      const dt = new Date(`${y}-${m}-${d}T00:00:00`);
      if (Number.isNaN(dt.getTime())) return `${d} / ${m} / ${y}`;
      return dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    } catch {
      return `${d} / ${m} / ${y}`;
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { bg: string; text: string; border: string; icon: any }> = {
      'PAID': { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', icon: CheckCircle },
      'PROCESSING': { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', icon: Clock },
      'APPROVED': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: Clock },
      'VERIFIED': { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200', icon: CheckCircle },
      'REQUESTED': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: Clock },
      'PENDING': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: Clock },
      'REJECTED': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: XCircle },
    };
    
    const config = statusConfig[status.toUpperCase()] || { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', icon: FileText };
    const Icon = config.icon;
    
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text} border ${config.border}`}>
        <Icon className="h-3 w-3" />
        {status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-emerald-100 mb-4">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900">My Revenues</h1>
        <p className="text-sm text-slate-600 mt-2 max-w-2xl">Loading your revenue information…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div className="flex flex-col items-center justify-center text-center px-4">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-emerald-100 mb-4 transition-all duration-300 hover:bg-emerald-200 hover:scale-105">
          <DollarSign className="h-8 w-8 text-emerald-600" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">My Payouts</h1>
        <p className="text-sm sm:text-base text-slate-600 mt-2 max-w-2xl leading-relaxed">
          View and manage all your payouts from bookings, bonuses, and referrals in one place.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 px-4 sm:px-0">
        {/* Total Payout */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 sm:p-6 transition-all duration-300 hover:shadow-md hover:border-emerald-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              </div>
              <div className="min-w-0">
                <div className="text-xs text-slate-500 font-medium uppercase tracking-wide">Total payout</div>
                <div className="text-xl sm:text-2xl font-bold text-slate-900 mt-0.5 truncate">{formatCurrency(stats.totalRevenue)}</div>
              </div>
            </div>
          </div>
          <div className="text-xs text-slate-500 font-medium">{stats.totalInvoices} invoices</div>
        </div>

        {/* Paid Payout */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 sm:p-6 transition-all duration-300 hover:shadow-md hover:border-green-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div className="min-w-0">
                <div className="text-xs text-slate-500 font-medium uppercase tracking-wide">Paid payout</div>
                <div className="text-xl sm:text-2xl font-bold text-slate-900 mt-0.5 truncate">{formatCurrency(stats.paidRevenue)}</div>
              </div>
            </div>
          </div>
          <div className="text-xs text-slate-500 font-medium">{stats.paidInvoices} paid</div>
        </div>

        {/* Pending Payout */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 sm:p-6 transition-all duration-300 hover:shadow-md hover:border-amber-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div className="min-w-0">
                <div className="text-xs text-slate-500 font-medium uppercase tracking-wide">Pending payout</div>
                <div className="text-xl sm:text-2xl font-bold text-slate-900 mt-0.5 truncate">{formatCurrency(stats.pendingRevenue)}</div>
              </div>
            </div>
          </div>
          <div className="text-xs text-slate-500 font-medium">{stats.pendingInvoices} pending</div>
        </div>
      </div>

      {/* Invoices List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm sm:text-base font-semibold text-slate-900">Invoices</div>
              <div className="text-xs text-slate-500 font-medium">
                {filteredSorted.length} {filteredSorted.length === 1 ? 'invoice' : 'invoices'}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-emerald-50/30 p-4 sm:p-5 shadow-sm ring-1 ring-black/5">
              <div className="text-[11px] font-bold tracking-wide text-slate-500 uppercase mb-1">Search</div>
              <div className="grid grid-cols-[1fr_auto] items-end gap-3 sm:gap-4">
                <div className="relative min-w-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" aria-hidden />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Invoice, property, receipt…"
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-10 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300 transition-all duration-200"
                    aria-label="Search invoices"
                  />
                  {search ? (
                    <button
                      type="button"
                      onClick={() => setSearch("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm hover:bg-slate-50 hover:text-slate-700 transition-all duration-200"
                      aria-label="Clear search"
                    >
                      <X className="h-4 w-4" aria-hidden />
                    </button>
                  ) : null}
                </div>

                <div className="relative flex items-end justify-end flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setFiltersOpen((v) => !v)}
                    className="h-11 w-11 inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 hover:border-slate-300 active:scale-[0.99] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    aria-label="Open filters"
                    aria-expanded={filtersOpen}
                    title="Filters"
                  >
                    <Filter className="h-5 w-5" aria-hidden />
                  </button>

                  {activePanelFiltersCount > 0 ? (
                    <span className="pointer-events-none absolute -top-1.5 -right-1.5 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-emerald-600 px-2 text-[11px] font-extrabold text-white shadow ring-2 ring-white">
                      {activePanelFiltersCount}
                    </span>
                  ) : null}

                  {filtersOpen ? (
                    <>
                      <div className="fixed inset-0 z-[44] nols-soft-overlay" onClick={() => setFiltersOpen(false)} />
                      <div className="absolute right-0 top-full mt-2 z-[45] w-[min(560px,calc(100vw-2rem))] rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-emerald-50/30 shadow-xl ring-1 ring-black/10 p-4 sm:p-5 nols-soft-popover">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-slate-900">Filters</div>
                            <div className="text-xs text-slate-500 mt-0.5">Refine payouts by status, date range, and sorting.</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setFiltersOpen(false)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition"
                            aria-label="Close filters"
                          >
                            <X className="h-4 w-4" aria-hidden />
                          </button>
                        </div>

                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 items-end">
                          <div className="min-w-0">
                            <div className="text-[11px] font-bold tracking-wide text-slate-500 uppercase mb-1">Status</div>
                            <select
                              value={statusFilter}
                              onChange={(e) => setStatusFilter(e.target.value)}
                              className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 pr-10 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300 transition-all duration-200"
                              aria-label="Filter by status"
                            >
                              <option value="">All statuses</option>
                              <option value="REQUESTED">Requested</option>
                              <option value="VERIFIED">Verified</option>
                              <option value="APPROVED">Approved</option>
                              <option value="PROCESSING">Processing</option>
                              <option value="PAID">Paid</option>
                              <option value="REJECTED">Rejected</option>
                            </select>
                          </div>

                          <div className="min-w-0">
                            <div className="text-[11px] font-bold tracking-wide text-slate-500 uppercase mb-1">Sort</div>
                            <select
                              value={sortKey}
                              onChange={(e) => setSortKey(e.target.value)}
                              className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 pr-10 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300 transition-all duration-200"
                              aria-label="Sort invoices"
                            >
                              <option value="issuedAt_desc">Newest</option>
                              <option value="issuedAt_asc">Oldest</option>
                              <option value="amount_desc">Amount (high)</option>
                              <option value="amount_asc">Amount (low)</option>
                              <option value="status_asc">Status (A→Z)</option>
                              <option value="invoiceNumber_asc">Invoice # (A→Z)</option>
                            </select>
                          </div>

                          <div className="min-w-0">
                            <div className="text-[11px] font-bold tracking-wide text-slate-500 uppercase mb-1">From</div>
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => setFromPickerOpen(true)}
                                className={
                                  "h-11 w-full rounded-2xl border bg-white px-4 pl-11 pr-11 text-left text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all duration-200 " +
                                  (fromPickerOpen
                                    ? "border-emerald-300 ring-emerald-500/20"
                                    : "border-slate-200 hover:bg-slate-50/60 hover:border-slate-300")
                                }
                                aria-label="From date"
                                title="From date"
                              >
                                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" aria-hidden />
                                <span className={dateFrom ? "font-semibold tracking-wide text-slate-900" : "text-slate-400"}>
                                  {formatIsoShort(dateFrom) || "Select date"}
                                </span>
                              </button>

                              {dateFrom ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDateFrom("");
                                  }}
                                  className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm hover:bg-slate-50 hover:text-slate-700 transition"
                                  aria-label="Clear from date"
                                  title="Clear"
                                >
                                  <X className="h-4 w-4" aria-hidden />
                                </button>
                              ) : null}

                              {fromPickerOpen && (
                                <>
                                  <div className="fixed inset-0 z-[46] bg-black/5 nols-soft-overlay" onClick={() => setFromPickerOpen(false)} />
                                  <div className="absolute z-[47] top-full left-0 mt-2 nols-soft-popover">
                                    <DatePicker
                                      selected={dateFrom || undefined}
                                      onSelectAction={(s) => {
                                        const iso = Array.isArray(s) ? s[0] : s;
                                        if (iso) {
                                          setDateFrom(iso);
                                          if (dateTo && iso > dateTo) setDateTo("");
                                        }
                                        setFromPickerOpen(false);
                                      }}
                                      onCloseAction={() => setFromPickerOpen(false)}
                                      allowRange={false}
                                      allowPast
                                      twoMonths={false}
                                    />
                                  </div>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="min-w-0">
                            <div className="text-[11px] font-bold tracking-wide text-slate-500 uppercase mb-1">To</div>
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => setToPickerOpen(true)}
                                className={
                                  "h-11 w-full rounded-2xl border bg-white px-4 pl-11 pr-11 text-left text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all duration-200 " +
                                  (toPickerOpen
                                    ? "border-emerald-300 ring-emerald-500/20"
                                    : "border-slate-200 hover:bg-slate-50/60 hover:border-slate-300")
                                }
                                aria-label="To date"
                                title="To date"
                              >
                                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" aria-hidden />
                                <span className={dateTo ? "font-semibold tracking-wide text-slate-900" : "text-slate-400"}>
                                  {formatIsoShort(dateTo) || "Select date"}
                                </span>
                              </button>

                              {dateTo ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDateTo("");
                                  }}
                                  className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm hover:bg-slate-50 hover:text-slate-700 transition"
                                  aria-label="Clear to date"
                                  title="Clear"
                                >
                                  <X className="h-4 w-4" aria-hidden />
                                </button>
                              ) : null}

                              {toPickerOpen && (
                                <>
                                  <div className="fixed inset-0 z-[46] bg-black/5 nols-soft-overlay" onClick={() => setToPickerOpen(false)} />
                                  <div className="absolute z-[47] top-full right-0 mt-2 nols-soft-popover">
                                    <DatePicker
                                      selected={dateTo || undefined}
                                      onSelectAction={(s) => {
                                        const iso = Array.isArray(s) ? s[0] : s;
                                        if (iso) {
                                          setDateTo(iso);
                                          if (dateFrom && iso < dateFrom) setDateFrom("");
                                        }
                                        setToPickerOpen(false);
                                      }}
                                      onCloseAction={() => setToPickerOpen(false)}
                                      allowRange={false}
                                      allowPast
                                      minDate={dateFrom || undefined}
                                      twoMonths={false}
                                    />
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="text-xs text-slate-500 font-medium">
                            {activePanelFiltersCount > 0 ? `${activePanelFiltersCount} filter${activePanelFiltersCount === 1 ? "" : "s"} active` : "No filters applied"}
                          </div>
                          <div className="flex items-center gap-2 sm:justify-end">
                            <button
                              type="button"
                              onClick={() => {
                                setStatusFilter("");
                                setDateFrom("");
                                setDateTo("");
                                setSortKey("issuedAt_desc");
                                setFromPickerOpen(false);
                                setToPickerOpen(false);
                              }}
                              disabled={!statusFilter && !dateFrom && !dateTo && sortKey === "issuedAt_desc"}
                              className="h-11 w-11 inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 hover:border-slate-300 active:scale-[0.99] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                              aria-label="Reset filters"
                              title="Reset"
                            >
                              <RotateCcw className="h-4 w-4" aria-hidden />
                            </button>
                            <button
                              type="button"
                              onClick={() => setFiltersOpen(false)}
                              className="h-11 w-11 inline-flex items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 active:scale-[0.99] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/25"
                              aria-label="Apply filters"
                              title="Apply"
                            >
                              <Check className="h-5 w-5" aria-hidden />
                            </button>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {filteredSorted.length === 0 ? (
          <div className="p-12 sm:p-16 text-center">
            <FileText className="h-12 w-12 sm:h-16 sm:w-16 text-slate-400 mx-auto mb-4 opacity-50" />
            <p className="text-sm sm:text-base text-slate-600 font-medium">No invoices found.</p>
            <p className="text-xs sm:text-sm text-slate-500 mt-2">Try clearing filters or adjusting the date range.</p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="min-w-[760px] w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-left">
                  <th className="px-4 sm:px-6 py-3 text-xs font-bold uppercase tracking-wide text-slate-600">Invoice</th>
                  <th className="px-4 sm:px-6 py-3 text-xs font-bold uppercase tracking-wide text-slate-600">Property</th>
                  <th className="px-4 sm:px-6 py-3 text-xs font-bold uppercase tracking-wide text-slate-600">Issued</th>
                  <th className="px-4 sm:px-6 py-3 text-xs font-bold uppercase tracking-wide text-slate-600">Status</th>
                  <th className="px-4 sm:px-6 py-3 text-xs font-bold uppercase tracking-wide text-slate-600 text-right">Amount</th>
                  <th className="px-4 sm:px-6 py-3 text-xs font-bold uppercase tracking-wide text-slate-600 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {filteredSorted.map((invoice) => {
                  const propertyTitle = invoice.booking?.property?.title || "Property";
                  const payout = (() => {
                    const net = Number(invoice.netPayable);
                    if (Number.isFinite(net) && net > 0) return net;
                    const gross = Number(invoice.total);
                    return Number.isFinite(gross) ? gross : 0;
                  })();
                  const invoiceNumber = String((invoice as any)?.invoiceNumber ?? "");
                  const isOwnerSubmittedInvoice = invoiceNumber.startsWith("OINV-");
                  const viewHref = isOwnerSubmittedInvoice
                    ? `/owner/invoices/${invoice.id}`
                    : (invoice.status === "PAID" ? `/owner/revenue/receipts/${invoice.id}` : `/owner/revenue/invoices/${invoice.id}`);
                  const viewLabel = invoice.status === "PAID" ? "Receipt" : "View";
                  return (
                    <tr key={invoice.id} className="hover:bg-slate-50/60 transition-colors duration-150">
                      <td className="px-4 sm:px-6 py-3 sm:py-4">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="h-4 w-4 text-slate-400 flex-shrink-0" aria-hidden />
                          <div className="font-semibold text-slate-900 truncate">{invoice.invoiceNumber}</div>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4 text-slate-700 truncate max-w-[260px]">{propertyTitle}</td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4 text-slate-700 whitespace-nowrap">{formatDate(invoice.issuedAt)}</td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4">{getStatusBadge(invoice.status)}</td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4 text-right font-bold text-emerald-600 whitespace-nowrap">{formatCurrency(payout)}</td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4 text-right">
                        <Link
                          href={viewHref}
                          className="inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold text-blue-700 hover:text-blue-800 hover:bg-blue-50 rounded-lg border border-blue-200 hover:border-blue-300 transition-all duration-200 no-underline active:scale-95"
                        >
                          <FileText className="h-4 w-4" aria-hidden />
                          <span className="hidden sm:inline">{viewLabel}</span>
                          <span className="sm:hidden">View</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-4 border-t border-slate-200 bg-white">
              <div className="text-xs text-slate-500 font-medium">
                {refreshing ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> Updating…
                  </span>
                ) : (
                  <span>Showing {invoices.length} of {stats.totalInvoices} invoices</span>
                )}
              </div>

              {hasMore ? (
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 font-semibold hover:bg-slate-100 active:scale-[0.99] transition disabled:opacity-60"
                >
                  {loadingMore ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <TrendingUp className="h-4 w-4" aria-hidden />
                  )}
                  Load more
                </button>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

