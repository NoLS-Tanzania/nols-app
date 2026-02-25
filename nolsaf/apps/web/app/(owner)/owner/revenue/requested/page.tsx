"use client";
import { useEffect, useMemo, useState } from "react";
import { Loader2, FileText, Clock, ArrowRight, RotateCw, Search, X, ArrowUpRight, Hash, TrendingUp, Hourglass } from "lucide-react";
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
    const totalAmount = items.reduce((sum, it) => {
      const net = toNumber(it.netPayable);
      return sum + (net > 0 ? net : toNumber(it.total));
    }, 0);
    return { totalCount, totalAmount };
  }, [items]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <div className="relative mb-6">
          <span className="absolute inset-0 rounded-full bg-amber-400/20 animate-ping" />
          <div className="relative inline-flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 shadow-lg shadow-amber-500/30">
            <Loader2 className="h-7 w-7 animate-spin text-white" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Requested Invoices</h1>
        <p className="text-sm text-slate-500 mt-2 max-w-sm">Fetching your pending invoices…</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">

      {/* ─── Hero Header ─────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-200/80 shadow-lg shadow-slate-200/60 flex flex-col sm:flex-row min-h-[180px]">

        {/* Left illustrated pane */}
        <div className="relative flex-shrink-0 sm:w-56 lg:w-64 flex items-center justify-center overflow-hidden bg-gradient-to-b from-amber-600 to-orange-500 p-8 sm:rounded-l-2xl">
          {/* Concentric rings */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-48 w-48 rounded-full border border-white/10" />
          </div>
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-32 w-32 rounded-full border border-white/15" />
          </div>
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-20 w-20 rounded-full bg-white/5" />
          </div>
          {/* Shine streak */}
          <div className="pointer-events-none absolute -top-6 -left-6 h-28 w-6 rotate-[30deg] bg-white/10 blur-sm" />
          {/* Icon */}
          <div className="relative z-10 flex flex-col items-center gap-3">
            <div className="flex items-center justify-center h-16 w-16 rounded-2xl bg-white/15 border border-white/25 shadow-lg backdrop-blur-sm">
              <Hourglass className="h-8 w-8 text-white drop-shadow" aria-hidden />
            </div>
            <span className="text-[11px] font-bold tracking-[0.18em] uppercase text-orange-100/90">Pending</span>
          </div>
        </div>

        {/* Right content pane */}
        <div className="relative flex-1 flex flex-col justify-between p-6 sm:p-7 lg:p-8">
          {/* Watermark */}
          <div className="pointer-events-none select-none absolute right-4 bottom-2 text-[72px] font-black text-amber-50 leading-none tracking-tight">
            AWAIT
          </div>

          {/* Top row: badge + actions */}
          <div className="relative flex items-start justify-between gap-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-bold text-amber-700 shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
              </span>
              Awaiting Review
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/owner/revenue/paid"
                className="no-underline inline-flex items-center gap-1.5 h-8 px-3.5 rounded-lg bg-slate-900 hover:bg-slate-700 text-white text-xs font-bold transition-all duration-200 active:scale-[0.97] shadow-sm"
                aria-label="Go to paid invoices"
              >
                Paid
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
              <Link
                href="/owner/revenue/rejected"
                className="no-underline inline-flex items-center gap-1.5 h-8 px-3.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all duration-200 active:scale-[0.97] shadow-sm"
                aria-label="Go to rejected invoices"
              >
                Rejected
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
              <button
                type="button"
                onClick={() => load({ silent: true })}
                disabled={refreshing}
                className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 transition-all duration-200 active:scale-95 disabled:opacity-50 shadow-sm"
                aria-label="Refresh"
                title="Refresh"
              >
                <RotateCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} aria-hidden />
              </button>
            </div>
          </div>

          {/* Title + subtitle */}
          <div className="relative mt-4">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight leading-none">
              Requested Invoices
            </h1>
            <p className="mt-2 text-sm text-slate-500 max-w-md leading-relaxed">
              Invoices submitted to NoLSAF awaiting verification and approval.
            </p>
          </div>

          {/* Bottom decorative rule */}
          <div className="relative mt-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-gradient-to-r from-amber-200 via-orange-100 to-transparent" />
            <Clock className="h-3.5 w-3.5 text-amber-300 flex-shrink-0" aria-hidden />
          </div>
        </div>
      </div>

      {/* ─── Stats Row ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow duration-300 p-5">
          <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-amber-400 to-orange-400 rounded-t-2xl" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Invoices</p>
              <p className="mt-2 text-4xl font-extrabold text-slate-900 tabular-nums leading-none">{stats.totalCount.toLocaleString()}</p>
              <p className="mt-1.5 text-xs text-slate-400">Awaiting processing</p>
            </div>
            <div className="flex-shrink-0 flex items-center justify-center h-14 w-14 rounded-2xl bg-amber-50 border border-amber-100 shadow-inner">
              <Hash className="h-6 w-6 text-amber-600" aria-hidden />
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-50 via-white to-orange-50 border border-amber-200/60 shadow-sm hover:shadow-md transition-shadow duration-300 p-5">
          <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-amber-500 to-orange-400 rounded-t-2xl" />
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Total amount</p>
              <p className="mt-2 text-3xl sm:text-4xl font-extrabold text-amber-700 tabular-nums leading-none truncate">{formatCurrency(stats.totalAmount)}</p>
              <p className="mt-1.5 text-xs text-amber-600/70">Value under review</p>
            </div>
            <div className="flex-shrink-0 flex items-center justify-center h-14 w-14 rounded-2xl bg-amber-100 border border-amber-200 shadow-inner">
              <TrendingUp className="h-6 w-6 text-amber-700" aria-hidden />
            </div>
          </div>
        </div>
      </div>

      {error ? (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span className="mt-0.5 h-4 w-4 flex-shrink-0 rounded-full bg-red-200 inline-flex items-center justify-center text-[10px] font-black text-red-600">!</span>
          {error}
        </div>
      ) : null}

      {/* ─── Invoices Table ───────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-slate-100 px-5 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="min-w-0 flex items-center gap-3">
            <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-amber-50 border border-amber-100">
              <FileText className="h-4 w-4 text-amber-600" aria-hidden />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900 leading-none">Invoices</div>
              <div className="text-xs text-slate-400 mt-0.5">{filtered.length} {filtered.length === 1 ? 'invoice' : 'invoices'} showing</div>
            </div>
          </div>

          <div className="flex gap-2 items-center">
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <Search className="h-3.5 w-3.5 text-slate-400" aria-hidden />
              </div>
              {search ? (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full inline-flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5" aria-hidden />
                </button>
              ) : null}
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search invoice, property…"
                className="h-9 w-full sm:w-72 pl-9 pr-9 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400 focus:bg-white transition-all duration-200"
                aria-label="Search requested invoices"
              />
            </div>
            <button
              type="button"
              onClick={() => load({ silent: true })}
              disabled={refreshing}
              className="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 transition-all active:scale-95 disabled:opacity-50 shadow-sm"
              aria-label="Refresh list"
              title="Refresh"
            >
              <RotateCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} aria-hidden />
            </button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 px-6 text-center">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-amber-50 border border-amber-200 mb-5">
              <Clock className="h-8 w-8 text-amber-400" aria-hidden />
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-1.5">No pending invoices</h2>
            <p className="text-sm text-slate-500">Nothing is waiting for approval right now.</p>
            <div className="mt-6 flex justify-center">
              <Link
                href="/owner/revenue/paid"
                className="no-underline inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-slate-900 hover:bg-slate-700 text-white text-sm font-semibold transition active:scale-[0.98] shadow-sm"
              >
                View Paid
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </div>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="min-w-[760px] w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200">
                  <th className="px-5 sm:px-6 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-slate-500">Invoice</th>
                  <th className="px-5 sm:px-6 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-slate-500">Property</th>
                  <th className="px-5 sm:px-6 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-slate-500">Issued</th>
                  <th className="px-5 sm:px-6 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-slate-500">Status</th>
                  <th className="px-5 sm:px-6 py-3 text-right text-[11px] font-bold uppercase tracking-widest text-slate-500">Amount</th>
                  <th className="px-5 sm:px-6 py-3 text-right text-[11px] font-bold uppercase tracking-widest text-slate-500">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filtered.map((invoice) => {
                  const propertyTitle = invoice.booking?.property?.title || "Property";
                  const payout = (() => {
                    const net = Number(invoice.netPayable);
                    if (Number.isFinite(net) && net > 0) return net;
                    const gross = Number(invoice.total);
                    return Number.isFinite(gross) ? gross : 0;
                  })();
                  const invoiceNumber = String((invoice as any)?.invoiceNumber ?? "");
                  const isOwnerSubmittedInvoice = invoiceNumber.startsWith("OINV-");
                  const viewHref = isOwnerSubmittedInvoice ? `/owner/invoices/${invoice.id}` : `/owner/revenue/invoices/${invoice.id}`;
                  return (
                    <TableRow key={invoice.id} className="group hover:bg-amber-50/40 transition-colors duration-150">
                      <td className="px-5 sm:px-6 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="flex-shrink-0 h-7 w-7 rounded-lg bg-slate-100 flex items-center justify-center">
                            <FileText className="h-3.5 w-3.5 text-slate-500" aria-hidden />
                          </div>
                          <span className="font-semibold text-slate-900">{invoice.invoiceNumber}</span>
                        </div>
                      </td>
                      <td className="px-5 sm:px-6 py-3.5 text-slate-600 truncate max-w-[200px]">{propertyTitle}</td>
                      <td className="px-5 sm:px-6 py-3.5 text-slate-500 whitespace-nowrap tabular-nums text-xs">{formatDate(invoice.issuedAt)}</td>
                      <td className="px-5 sm:px-6 py-3.5">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide bg-amber-50 text-amber-700 border border-amber-200 shadow-sm">
                          <Clock className="h-3 w-3" aria-hidden />
                          REQUESTED
                        </span>
                      </td>
                      <td className="px-5 sm:px-6 py-3.5 text-right">
                        <span className="font-bold text-emerald-700 tabular-nums">{formatCurrency(payout)}</span>
                      </td>
                      <td className="px-5 sm:px-6 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={viewHref}
                            className="no-underline inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 hover:border-blue-300 transition-all duration-150 active:scale-95"
                          >
                            <FileText className="h-3.5 w-3.5" aria-hidden />
                            <span className="hidden sm:inline">View</span>
                          </Link>
                          {invoice.bookingId && (
                            <Link
                              href={`/owner/bookings/checked-in/${invoice.bookingId}`}
                              className="no-underline inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 transition-all duration-150 active:scale-95"
                            >
                              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
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
