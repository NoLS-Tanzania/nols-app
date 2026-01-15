"use client";
import React, { useEffect, useMemo, useState } from 'react';
import TableRow from "@/components/TableRow";
import { Receipt, ChevronLeft, ChevronRight, Download, Search, ChevronDown, X, CheckCircle2, Clock, XCircle } from "lucide-react";
import Link from "next/link";

type InvoiceRow = {
  id: number;
  invoiceNumber?: string | null;
  receiptNumber?: string | null;
  issuedAt: string;
  total: number;
  commissionAmount?: number | null;
  netPayable: number | null;
  status: string;
  ownerId: number;
  owner?: {
    id: number;
    name: string | null;
    email: string | null;
    phone: string | null;
    role: string;
  } | null;
  booking?: { 
    id: number;
    property?: { 
      id: number;
      title: string | null;
      type: string | null;
    } | null;
    user?: {
      id: number;
      name: string | null;
      email: string | null;
    } | null;
  } | null;
  verifiedByUser?: { id: number; name: string | null } | null;
  approvedByUser?: { id: number; name: string | null } | null;
  paidByUser?: { id: number; name: string | null } | null;
  paidAt?: string | null;
  paymentMethod?: string | null;
  paymentRef?: string | null;
};

export default function InvoicesManagementPage(){
  const apiBase = typeof window === 'undefined'
    ? (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4000")
    : '';
  const [items, setItems] = useState<InvoiceRow[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    (async () => {
      try {
        const url = `${apiBase.replace(/\/$/, '')}/api/admin/invoices?page=${page}&pageSize=${pageSize}`;
        const r = await fetch(url);
        if (!r.ok) throw new Error('fetch failed');
        const contentType = r.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const j = await r.json();
          if (!mounted) return;
          setItems(j.items ?? []);
          setTotal(j.total ?? 0);
        } else {
          throw new Error("Invalid response format");
        }
      } catch (e: any) {
        console.error('invoices fetch', e);
        if (mounted) {
          setItems([]);
        }
      } finally { if (mounted) setLoading(false); }
    })();
    return () => { mounted = false; };
  }, [page, pageSize, apiBase]);

  // Manual invoice actions intentionally removed (invoice lifecycle is automatic).

  function downloadReceipt(inv: InvoiceRow) {
    const url = `${apiBase.replace(/\/$/, '')}/api/admin/invoices/${inv.id}/receipt.png`;
    window.open(url, '_blank');
  }

  function getStatusIcon(status: string) {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('paid')) {
      return { Icon: CheckCircle2, className: "h-4 w-4 text-emerald-600" };
    }
    if (statusLower.includes('approved')) {
      return { Icon: CheckCircle2, className: "h-4 w-4 text-blue-600" };
    }
    if (statusLower.includes('pending') || statusLower.includes('requested') || statusLower.includes('unpaid')) {
      return { Icon: Clock, className: "h-4 w-4 text-amber-600" };
    }
    if (statusLower.includes('cancel') || statusLower.includes('reject')) {
      return { Icon: XCircle, className: "h-4 w-4 text-rose-600" };
    }
    return { Icon: Clock, className: "h-4 w-4 text-slate-500" };
  }

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount);
  }

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return items.filter((inv) => {
      if (statusFilter !== 'ALL' && inv.status !== statusFilter) return false;
      if (!q) return true;
      const haystack = [
        inv.invoiceNumber,
        inv.receiptNumber,
        String(inv.id),
        inv.owner?.name,
        inv.owner?.email,
        inv.owner?.phone,
        inv.booking?.property?.title,
        inv.booking?.property?.type,
        inv.status,
      ]
        .filter(Boolean)
        .join(' | ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [items, searchQuery, statusFilter]);

  const statusOptions = useMemo(() => {
    const unique = new Set<string>();
    items.forEach(i => unique.add(i.status));
    return ['ALL', ...Array.from(unique).sort()];
  }, [items]);

  const paidOnPage = useMemo(() => filteredItems.filter(i => i.status?.toLowerCase().includes('paid')).length, [filteredItems]);
  const pendingOnPage = useMemo(() => filteredItems.filter(i => {
    const s = i.status?.toLowerCase() ?? '';
    return s.includes('pending') || s.includes('unpaid');
  }).length, [filteredItems]);
  const approvedOnPage = useMemo(() => filteredItems.filter(i => i.status?.toLowerCase().includes('approved')).length, [filteredItems]);

  function applyQuickFilter(kind: 'ALL' | 'PAID' | 'APPROVED' | 'PENDING') {
    if (kind === 'ALL') {
      setSearchQuery('');
      setStatusFilter('ALL');
      return;
    }

    const candidates = statusOptions.filter(s => s !== 'ALL');
    const pick = (predicate: (s: string) => boolean) => candidates.find(s => predicate(s.toLowerCase()));

    const selected =
      kind === 'PAID'
        ? pick((s) => s.includes('paid'))
        : kind === 'APPROVED'
          ? pick((s) => s.includes('approved'))
          : pick((s) => s.includes('pending') || s.includes('unpaid'));

    setSearchQuery('');
    if (selected) {
      setStatusFilter(selected);
    } else {
      setStatusFilter('ALL');
      setSearchQuery(kind === 'PAID' ? 'paid' : kind === 'APPROVED' ? 'approved' : 'pending');
    }
  }

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-br from-[#02665e]/8 via-white to-sky-50" />
        <div className="relative p-6 sm:p-8">
          <div className="flex flex-col gap-5">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#02665e]/10 ring-1 ring-inset ring-[#02665e]/20">
                <Receipt className="h-6 w-6 text-[#02665e]" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">
                  All Invoices
                </h1>
                <p className="mt-1 text-sm text-slate-600 max-w-2xl mx-auto">
                  All invoices from owners and drivers across the platform.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <button
                type="button"
                onClick={() => applyQuickFilter('ALL')}
                className="group text-left rounded-2xl border border-slate-200 bg-white/70 p-4 backdrop-blur transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-[#02665e]/25 focus:outline-none focus:ring-2 focus:ring-[#02665e]/30"
                aria-label="Show all invoices"
              >
                <div className="text-xs font-medium text-slate-600">Total invoices</div>
                <div className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">{total.toLocaleString()}</div>
                <div className="mt-2 text-xs text-slate-500 group-hover:text-slate-600">Clear filters</div>
              </button>

              <button
                type="button"
                onClick={() => applyQuickFilter('PAID')}
                className="group text-left rounded-2xl border border-slate-200 bg-white/70 p-4 backdrop-blur transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-emerald-300/60 focus:outline-none focus:ring-2 focus:ring-emerald-300/40"
                aria-label="Filter paid invoices"
              >
                <div className="text-xs font-medium text-slate-600">Paid (this page)</div>
                <div className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">{paidOnPage.toLocaleString()}</div>
                <div className="mt-2 text-xs text-slate-500 group-hover:text-slate-600">Filter list</div>
              </button>

              <button
                type="button"
                onClick={() => applyQuickFilter('APPROVED')}
                className="group text-left rounded-2xl border border-slate-200 bg-white/70 p-4 backdrop-blur transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-sky-300/70 focus:outline-none focus:ring-2 focus:ring-sky-300/40"
                aria-label="Filter approved invoices"
              >
                <div className="text-xs font-medium text-slate-600">Approved (this page)</div>
                <div className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">{approvedOnPage.toLocaleString()}</div>
                <div className="mt-2 text-xs text-slate-500 group-hover:text-slate-600">Filter list</div>
              </button>

              <button
                type="button"
                onClick={() => applyQuickFilter('PENDING')}
                className="group text-left rounded-2xl border border-slate-200 bg-white/70 p-4 backdrop-blur transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-amber-300/70 focus:outline-none focus:ring-2 focus:ring-amber-300/40"
                aria-label="Filter pending or unpaid invoices"
              >
                <div className="text-xs font-medium text-slate-600">Pending/Unpaid (this page)</div>
                <div className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">{pendingOnPage.toLocaleString()}</div>
                <div className="mt-2 text-xs text-slate-500 group-hover:text-slate-600">Filter list</div>
              </button>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white/70 shadow-sm backdrop-blur overflow-hidden focus-within:ring-2 focus-within:ring-[#02665e]/20 focus-within:border-[#02665e]/30">
              <div className="flex flex-col sm:flex-row items-stretch overflow-hidden">
                <div className="relative flex-1 min-w-0">
                  <label htmlFor="invoiceSearch" className="sr-only">Search invoices</label>
                  <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    id="invoiceSearch"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by invoice #, receipt, owner, property, status…"
                    className="w-full min-w-0 border-0 bg-transparent py-3.5 pl-11 pr-4 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:ring-0"
                  />
                </div>

                <div className="flex min-w-0 items-stretch border-t border-slate-200/80 sm:border-t-0 sm:border-l">
                  <div className="relative w-full min-w-0 sm:w-64">
                    <label htmlFor="statusFilter" className="sr-only">Filter by status</label>
                    <select
                      id="statusFilter"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="h-full w-full min-w-0 !appearance-none !bg-none border-0 bg-transparent px-4 py-3.5 pr-10 text-sm font-medium text-slate-900 outline-none focus:ring-0"
                    >
                      {statusOptions.map((s) => (
                        <option key={s} value={s}>{s === 'ALL' ? 'All statuses' : s}</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  </div>

                  {(searchQuery.trim() || statusFilter !== 'ALL') ? (
                    <button
                      type="button"
                      onClick={() => { setSearchQuery(''); setStatusFilter('ALL'); }}
                      className="inline-flex shrink-0 items-center justify-center border-l border-slate-200/80 bg-white/40 px-3 text-slate-500 transition hover:bg-white/70 hover:text-slate-700 focus:outline-none"
                      aria-label="Clear filters"
                      title="Clear filters"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Invoice</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Owner</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Property</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Issued</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Total</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Net</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Receipt</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 8 }).map((_, idx) => (
                  <TableRow key={`sk-${idx}`} hover={false}>
                    <td colSpan={10} className="px-4 py-4">
                      <div className="h-10 w-full rounded-xl bg-slate-100 animate-pulse" />
                    </td>
                  </TableRow>
                ))
              ) : filteredItems.length === 0 ? (
                <TableRow hover={false}>
                  <td colSpan={10} className="px-4 py-10 text-center">
                    <div className="mx-auto max-w-md">
                      <div className="text-sm font-medium text-slate-900">No invoices match your filters</div>
                      <div className="mt-1 text-sm text-slate-600">Try clearing search or switching the status filter.</div>
                      <div className="mt-4 flex justify-center gap-2">
                        <button
                          className="px-3 py-2 text-sm font-medium text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition"
                          onClick={() => { setSearchQuery(''); setStatusFilter('ALL'); }}
                        >
                          Clear filters
                        </button>
                      </div>
                    </div>
                  </td>
                </TableRow>
              ) : (
                filteredItems.map(i => {
                  const invoiceType = i.owner?.role === 'DRIVER' ? 'Driver' : 'Owner';
                  return (
                  <TableRow key={i.id}>
                    <td className="px-4 py-3 text-sm text-slate-900 whitespace-nowrap font-semibold tabular-nums">
                      #{i.id.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-semibold ${
                        invoiceType === 'Driver' 
                          ? 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200' 
                          : 'bg-[#02665e]/10 text-[#02665e] ring-1 ring-inset ring-[#02665e]/20'
                      }`}>
                        {invoiceType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      <div className="font-semibold text-slate-900">{i.invoiceNumber ?? '—'}</div>
                      {i.receiptNumber && (
                        <div className="text-xs text-slate-500">Receipt: <span className="tabular-nums">{i.receiptNumber}</span></div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      <div className="font-semibold text-slate-900">{i.owner?.name ?? `Owner #${i.ownerId}`}</div>
                      {i.owner?.email && (
                        <div className="text-xs text-slate-500 truncate max-w-[260px]">{i.owner.email}</div>
                      )}
                      {i.owner?.phone && (
                        <div className="text-xs text-slate-500 tabular-nums">{i.owner.phone}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      <div className="font-medium text-slate-900">{i.booking?.property?.title ?? '—'}</div>
                      {i.booking?.property?.type && (
                        <div className="text-xs text-slate-500">{i.booking.property.type}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">
                      <div className="tabular-nums text-slate-900 font-medium">{new Date(i.issuedAt).toLocaleDateString()}</div>
                      <div className="text-xs text-slate-500 tabular-nums">{new Date(i.issuedAt).toLocaleTimeString()}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-900 text-right whitespace-nowrap font-semibold tabular-nums">
                      {formatCurrency(Number(i.total))}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-900 text-right whitespace-nowrap">
                      <div className="font-semibold tabular-nums">{i.netPayable ? formatCurrency(Number(i.netPayable)) : '—'}</div>
                      {i.commissionAmount && (
                        <div className="text-xs text-slate-500 tabular-nums">Commission: {formatCurrency(Number(i.commissionAmount))}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center">
                        {(() => {
                          const { Icon, className } = getStatusIcon(i.status);
                          return (
                            <span title={i.status}>
                              <Icon className={className} />
                            </span>
                          );
                        })()}
                      </div>
                      {i.paidAt && (
                        <div className="text-xs text-slate-500 mt-1.5 tabular-nums">
                          Paid: {new Date(i.paidAt).toLocaleDateString()}
                        </div>
                      )}
                      {i.paymentMethod && (
                        <div className="text-xs text-slate-500 mt-0.5">
                          {i.paymentMethod}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex justify-center">
                        {i.receiptNumber ? (
                          <button
                            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-all duration-200 hover:border-sky-300 hover:bg-sky-50/40 hover:text-sky-700 active:border-sky-400 active:text-sky-800"
                            onClick={() => downloadReceipt(i)}
                          >
                            <Download className="h-3 w-3" />
                            Receipt
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </div>
                    </td>
                  </TableRow>
                );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
        <div className="flex gap-2">
          <button 
            className="p-2 border border-slate-200 rounded-xl hover:border-[#02665e]/40 hover:text-[#02665e] transition-all duration-200 active:border-[#02665e] active:text-[#02665e] touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center bg-white"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button 
            className="p-2 border border-slate-200 rounded-xl hover:border-[#02665e]/40 hover:text-[#02665e] transition-all duration-200 active:border-[#02665e] active:text-[#02665e] touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center bg-white"
            onClick={() => setPage(p => p + 1)}
            disabled={items.length < pageSize || loading || (page * pageSize >= total)}
            aria-label="Next page"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
        <div className="text-sm text-slate-600">
          Page <span className="font-semibold text-slate-900 tabular-nums">{page}</span>
          {total > 0 && (
            <span className="ml-2 text-slate-500 tabular-nums">
              (Total: {total.toLocaleString()})
            </span>
          )}
        </div>
      </div>

      {/* Manual invoice actions intentionally removed (invoice lifecycle is automatic). */}
    </div>
  );
}
