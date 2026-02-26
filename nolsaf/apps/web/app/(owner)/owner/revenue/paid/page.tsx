"use client";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, FileText, Receipt, RotateCw, Search, X, ArrowUpRight, TrendingUp, Hash } from "lucide-react";
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

export default function Paid() {
  const [items, setItems] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filters] = useState<RevenueFilters>({ status: "PAID" });

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
      setError(err?.response?.data?.error ?? err?.message ?? "Failed to load paid invoices");
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

  const toNumber = (v: any) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
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
      const receiptNo = String(inv.receiptNumber ?? "").toLowerCase();
      const bookingId = String(inv.booking?.id ?? "").toLowerCase();
      return property.includes(q) || invoiceNo.includes(q) || receiptNo.includes(q) || bookingId.includes(q);
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
          <span className="absolute inset-0 rounded-full bg-emerald-400/20 animate-ping" />
          <div className="relative inline-flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/30">
            <Loader2 className="h-7 w-7 animate-spin text-white" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Paid Invoices</h1>
        <p className="text-sm text-slate-500 mt-2 max-w-sm">Loading your payment history…</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">

      {/* ─── Hero Header ─────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-xl shadow-slate-100/70">
        {/* Left accent strip */}
        <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-slate-800 via-slate-400 to-transparent rounded-l-2xl" />
        {/* Faint watermark */}
        <div className="pointer-events-none select-none absolute right-0 bottom-0 text-[120px] font-black text-slate-100/80 leading-none tracking-tighter pr-4 pb-1" aria-hidden>
          PAID
        </div>
        {/* Subtle dot grid */}
        <div
          className="pointer-events-none absolute right-0 top-0 h-full w-1/2 opacity-[0.035]"
          style={{ backgroundImage: "radial-gradient(circle, #334155 1px, transparent 1px)", backgroundSize: "18px 18px" }}
        />

        <div className="relative pl-8 pr-6 pt-6 pb-6 sm:pt-7 sm:pb-7 sm:pr-8 lg:pt-8 lg:pb-8 lg:pr-10 lg:pl-10">
          {/* Top row */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-slate-100 border border-slate-200">
                <CheckCircle2 className="h-5 w-5 text-slate-700" aria-hidden />
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                Processed
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/owner/revenue/requested"
                className="no-underline inline-flex items-center gap-1.5 h-8 px-3.5 rounded-lg bg-slate-900 hover:bg-slate-700 text-white text-xs font-bold transition-all duration-200 active:scale-[0.97] shadow-sm"
                aria-label="Go to requested invoices"
              >
                Requested
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

          {/* Title block */}
          <div className="mt-5">
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight leading-none">
              Paid Invoices
            </h1>
            <p className="mt-2.5 text-sm text-slate-500 max-w-md leading-relaxed">
              View all invoices that have been paid and processed by NoLSAF.
            </p>
          </div>

          {/* Separator */}
          <div className="mt-6 h-px bg-gradient-to-r from-slate-200 via-slate-100 to-transparent" />
        </div>
      </div>

      {/* ─── Stats Row ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Count card */}
        <div className="relative rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-200 p-5 flex items-center gap-4">
          <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-xl bg-slate-100 border border-slate-200">
            <Hash className="h-5 w-5 text-slate-600" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Invoices</p>
            <p className="mt-0.5 text-3xl font-black text-slate-900 tabular-nums leading-none">{stats.totalCount.toLocaleString()}</p>
            <p className="mt-1 text-xs text-slate-400">Paid &amp; processed</p>
          </div>
        </div>

        {/* Amount card — paid / confirmed green-blue */}
        <div className="relative rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 border border-emerald-500/30 shadow-lg shadow-emerald-600/25 hover:shadow-emerald-600/40 hover:-translate-y-0.5 transition-all duration-200 p-5 flex items-center gap-4 overflow-hidden">
          {/* Decorative glow circle */}
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/10 pointer-events-none" />
          <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
          <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-xl bg-white/20 border border-white/25 backdrop-blur-sm shadow-inner">
            <TrendingUp className="h-5 w-5 text-white drop-shadow" aria-hidden />
          </div>
          <div className="relative min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-widest text-white/70">Total Amount</p>
            <p className="mt-0.5 text-3xl font-black text-white tabular-nums leading-none truncate drop-shadow">{formatCurrency(stats.totalAmount)}</p>
            <div className="mt-1.5 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/20 border border-white/30">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              <p className="text-[10px] font-semibold text-white/90 tracking-wide">Paid &amp; confirmed by NoLSAF</p>
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
            <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-emerald-50 border border-emerald-100">
              <FileText className="h-4 w-4 text-emerald-600" aria-hidden />
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
                placeholder="Search invoice, receipt, property…"
                className="h-9 w-full sm:w-72 pl-9 pr-9 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 focus:bg-white transition-all duration-200"
                aria-label="Search paid invoices"
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
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-slate-100 border border-slate-200 mb-5">
              <Receipt className="h-8 w-8 text-slate-400" aria-hidden />
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-1.5">No paid invoices yet</h2>
            <p className="text-sm text-slate-500">Once payments are processed, they&apos;ll appear here.</p>
            <div className="mt-6 flex justify-center gap-2">
              <Link
                href="/owner/revenue/requested"
                className="no-underline inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold transition active:scale-[0.98] shadow-sm"
              >
                View Requested
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </div>
          </div>

        ) : (
          <div className="w-full overflow-x-auto">
            <table className="min-w-[820px] w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200">
                  <th className="px-5 sm:px-6 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-slate-500">Invoice</th>
                  <th className="px-5 sm:px-6 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-slate-500">Property</th>
                  <th className="px-5 sm:px-6 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-slate-500">Issued</th>
                  <th className="px-5 sm:px-6 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-slate-500">Paid</th>
                  <th className="px-5 sm:px-6 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-slate-500">Status</th>
                  <th className="px-5 sm:px-6 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-slate-500">Receipt</th>
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
                  const invoiceHref = isOwnerSubmittedInvoice ? `/owner/invoices/${invoice.id}` : `/owner/revenue/invoices/${invoice.id}`;
                  return (
                    <TableRow key={invoice.id} className="group hover:bg-emerald-50/40 transition-colors duration-150">
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
                      <td className="px-5 sm:px-6 py-3.5 text-slate-500 whitespace-nowrap tabular-nums text-xs">
                        {invoice.paidAt ? formatDate(invoice.paidAt) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-5 sm:px-6 py-3.5">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm">
                          <CheckCircle2 className="h-3 w-3" aria-hidden />
                          PAID
                        </span>
                      </td>
                      <td className="px-5 sm:px-6 py-3.5">
                        {invoice.receiptNumber ? (
                          <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">{invoice.receiptNumber}</span>
                        ) : (
                          <span className="text-slate-300 text-base">—</span>
                        )}
                      </td>
                      <td className="px-5 sm:px-6 py-3.5 text-right">
                        <span className="font-bold text-emerald-700 tabular-nums">{formatCurrency(payout)}</span>
                      </td>
                      <td className="px-5 sm:px-6 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/owner/revenue/receipts/${invoice.id}`}
                            className="no-underline inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 hover:border-emerald-300 transition-all duration-150 active:scale-95"
                          >
                            <Receipt className="h-3.5 w-3.5" aria-hidden />
                            <span className="hidden sm:inline">Receipt</span>
                          </Link>
                          <Link
                            href={invoiceHref}
                            className="no-underline inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 hover:border-blue-300 transition-all duration-150 active:scale-95"
                          >
                            <FileText className="h-3.5 w-3.5" aria-hidden />
                            <span className="hidden sm:inline">Invoice</span>
                          </Link>
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
