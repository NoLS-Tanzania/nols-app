"use client";
import { useEffect, useMemo, useState } from "react";
import { Wallet, Loader2, FileText, Clock, ArrowRight, RotateCw, Search, X, ArrowUpRight } from "lucide-react";
import axios from "axios";
import Link from "next/link";
import TableRow from "@/components/TableRow";

type RevenueFilters = { status?: string; [key: string]: any };

// Use same-origin calls + secure httpOnly cookie session.
const api = axios.create({ baseURL: "", withCredentials: true });

type Invoice = {
  id: number;
  invoiceNumber: string;
  status: string;
  issuedAt: string;
  total: number | string;
  netPayable: number | string;
  commissionAmount: number | string;
  commissionPercent?: number | string;
  bookingId?: number;
  booking?: {
    id: number;
    property?: {
      id: number;
      title: string;
    };
  };
};

export default function Requested() {
  const [items, setItems] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  // Support both legacy SUBMITTED and canonical REQUESTED statuses.
  const [filters] = useState<RevenueFilters>({ status: "REQUESTED,SUBMITTED" });

  const toNumber = (v: any) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const load = async (opts?: { silent?: boolean }) => {
    const silent = Boolean(opts?.silent);
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const r = await api.get<{ items: Invoice[] }>("/api/owner/revenue/invoices", { params: filters });
      setItems(r.data.items || []);
    } catch (err: any) {
      console.error("Failed to load invoices", err);
      if (!silent) setItems([]);
      setError(err?.response?.data?.error ?? err?.message ?? "Failed to load requested invoices");
    } finally {
      if (silent) setRefreshing(false);
      else setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!mounted) return;
      await load();
    })();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((inv) => {
      const property = String(inv.booking?.property?.title ?? "").toLowerCase();
      const invoiceNo = String(inv.invoiceNumber ?? "").toLowerCase();
      const bookingId = String(inv.booking?.id ?? inv.bookingId ?? "").toLowerCase();
      return property.includes(q) || invoiceNo.includes(q) || bookingId.includes(q);
    });
  }, [items, search]);

  const stats = useMemo(() => {
    const totalCount = items.length;
    const totalGross = items.reduce((sum, it) => sum + toNumber(it.total), 0);
    const totalNet = items.reduce((sum, it) => sum + toNumber(it.netPayable), 0);
    return { totalCount, totalGross, totalNet };
  }, [items]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-amber-100 mb-4">
          <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900">Requested Invoices</h1>
        <p className="text-sm text-slate-600 mt-2 max-w-2xl">Loading your requested invoices…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
      {/* Header */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 sm:p-8">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-start gap-4">
            <div className="hidden sm:block" />

            <div className="min-w-0 flex flex-col items-center text-center">
              <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-semibold text-amber-700">
                <Wallet className="h-4 w-4" aria-hidden />
                Requested
              </div>
              <h1 className="mt-3 text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Requested Invoices</h1>
              <p className="mt-1 text-sm text-gray-600 max-w-2xl">
                Invoices submitted to NoLSAF awaiting verification and approval.
              </p>
            </div>

            <div className="flex items-center justify-start sm:justify-end gap-2">
              <Link
                href="/owner/revenue/paid"
                className="no-underline inline-flex items-center justify-center h-10 px-3 rounded-md border border-gray-200 bg-white text-gray-800 shadow-sm hover:bg-gray-50 active:scale-[0.99] transition"
                aria-label="Go to paid invoices"
                title="Paid"
              >
                <span className="text-sm font-semibold">Paid</span>
                <ArrowUpRight className="ml-2 h-4 w-4" aria-hidden />
              </Link>
              <Link
                href="/owner/revenue/rejected"
                className="no-underline inline-flex items-center justify-center h-10 px-3 rounded-md border border-gray-200 bg-white text-gray-800 shadow-sm hover:bg-gray-50 active:scale-[0.99] transition"
                aria-label="Go to rejected invoices"
                title="Rejected"
              >
                <span className="text-sm font-semibold">Rejected</span>
                <ArrowUpRight className="ml-2 h-4 w-4" aria-hidden />
              </Link>
              <button
                type="button"
                onClick={() => load({ silent: true })}
                disabled={refreshing}
                className="inline-flex items-center justify-center h-10 w-10 rounded-md border border-slate-900 bg-slate-900 text-white shadow-sm hover:bg-slate-800 active:scale-[0.99] transition disabled:opacity-60"
                aria-label="Refresh"
                title="Refresh"
              >
                <RotateCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} aria-hidden />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="text-center text-xs font-medium text-gray-500">Invoices</div>
          <div className="mt-1 text-center text-2xl font-bold text-gray-900">{stats.totalCount.toLocaleString()}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="text-center text-xs font-medium text-gray-500">Total gross</div>
          <div className="mt-1 text-center text-2xl font-bold text-gray-900">{formatCurrency(stats.totalGross)}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="text-center text-xs font-medium text-gray-500">Net payable</div>
          <div className="mt-1 text-center text-2xl font-bold text-emerald-700">{formatCurrency(stats.totalNet)}</div>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      {/* Invoices List */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="sticky top-0 z-10 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-gray-900">Invoices</div>
            <div className="text-xs text-gray-500 mt-0.5">{filtered.length} {filtered.length === 1 ? 'invoice' : 'invoices'} showing</div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" aria-hidden />
              </div>
              {search ? (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center h-7 w-7 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-200/50 active:scale-95 transition"
                  aria-label="Clear search"
                  title="Clear"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              ) : null}
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search invoice, property…"
                className="h-10 w-full sm:w-72 pl-10 pr-10 rounded-md border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                aria-label="Search requested invoices"
              />
            </div>

            <button
              type="button"
              onClick={() => load({ silent: true })}
              disabled={refreshing}
              className="inline-flex items-center justify-center h-10 w-10 rounded-md border border-slate-900 bg-slate-900 text-white shadow-sm hover:bg-slate-800 active:scale-[0.99] transition disabled:opacity-60"
              aria-label="Refresh list"
              title="Refresh"
            >
              <RotateCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} aria-hidden />
            </button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="p-12 sm:p-16 text-center">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-slate-100 mb-4">
              <FileText className="h-8 w-8 text-slate-600" aria-hidden />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">No requested invoices</h2>
            <p className="text-sm sm:text-base text-slate-600 font-medium">Nothing is waiting for approval right now.</p>
            <p className="text-xs sm:text-sm text-slate-500 mt-2">Once you submit invoices, they’ll appear here until processed.</p>
            <div className="mt-5 flex items-center justify-center gap-2">
              <Link
                href="/owner/revenue/paid"
                className="no-underline inline-flex items-center justify-center h-10 px-4 rounded-md bg-emerald-700 text-white shadow-sm hover:bg-emerald-800 active:scale-[0.99] transition"
              >
                View Paid
                <ArrowUpRight className="ml-2 h-4 w-4" aria-hidden />
              </Link>
              <button
                type="button"
                onClick={() => load({ silent: true })}
                disabled={refreshing}
                className="inline-flex items-center justify-center h-10 w-10 rounded-md border border-slate-900 bg-slate-900 text-white shadow-sm hover:bg-slate-800 active:scale-[0.99] transition disabled:opacity-60"
                aria-label="Refresh"
                title="Refresh"
              >
                <RotateCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} aria-hidden />
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="min-w-[860px] w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-left">
                  <th className="px-4 sm:px-6 py-3 text-xs font-bold uppercase tracking-wide text-slate-600">Invoice</th>
                  <th className="px-4 sm:px-6 py-3 text-xs font-bold uppercase tracking-wide text-slate-600">Property</th>
                  <th className="px-4 sm:px-6 py-3 text-xs font-bold uppercase tracking-wide text-slate-600">Issued</th>
                  <th className="px-4 sm:px-6 py-3 text-xs font-bold uppercase tracking-wide text-slate-600">Status</th>
                  <th className="px-4 sm:px-6 py-3 text-xs font-bold uppercase tracking-wide text-slate-600 text-right">Total</th>
                  <th className="px-4 sm:px-6 py-3 text-xs font-bold uppercase tracking-wide text-slate-600 text-right">Net Payable</th>
                  <th className="px-4 sm:px-6 py-3 text-xs font-bold uppercase tracking-wide text-slate-600 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {filtered.map((invoice) => {
                  const propertyTitle = invoice.booking?.property?.title || "Property";
                  const net = invoice.netPayable != null ? formatCurrency(Number(invoice.netPayable)) : "—";
                  return (
                    <TableRow key={invoice.id} className="hover:bg-slate-50/60 transition-colors duration-150">
                      <td className="px-4 sm:px-6 py-3 sm:py-4">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="h-4 w-4 text-slate-400 flex-shrink-0" aria-hidden />
                          <div className="font-semibold text-slate-900 truncate">{invoice.invoiceNumber}</div>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4 text-slate-700 truncate max-w-[260px]">{propertyTitle}</td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4 text-slate-700 whitespace-nowrap">{formatDate(invoice.issuedAt)}</td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          <Clock className="h-3 w-3" aria-hidden />
                          REQUESTED
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4 text-right font-semibold text-slate-900 whitespace-nowrap">
                        {formatCurrency(Number(invoice.total))}
                      </td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4 text-right font-bold text-emerald-600 whitespace-nowrap">{net}</td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/owner/invoices/${invoice.id}`}
                            className="inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold text-blue-700 hover:text-blue-800 hover:bg-blue-50 rounded-lg border border-blue-200 hover:border-blue-300 transition-all duration-200 no-underline active:scale-95"
                          >
                            <FileText className="h-4 w-4" aria-hidden />
                            <span className="hidden sm:inline">View</span>
                          </Link>
                          {invoice.bookingId && (
                            <Link
                              href={`/owner/bookings/checked-in/${invoice.bookingId}`}
                              className="inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold text-slate-700 hover:text-slate-800 hover:bg-slate-50 rounded-lg border border-slate-200 hover:border-slate-300 transition-all duration-200 no-underline active:scale-95"
                            >
                              <ArrowRight className="h-4 w-4" aria-hidden />
                              <span className="hidden sm:inline">Booking</span>
                            </Link>
                          )}
                        </div>
                      </td>
                    </TableRow>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
