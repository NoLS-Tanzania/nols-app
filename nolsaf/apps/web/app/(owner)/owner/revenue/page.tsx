"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { DollarSign, Loader2, TrendingUp, FileText, CheckCircle, Clock, XCircle } from "lucide-react";
import Link from "next/link";

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
  commissionAmount: number | string;
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

export default function OwnerRevenuePage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [sortKey, setSortKey] = useState<string>("issuedAt_desc");
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
    
    const loadRevenue = async () => {
      try {
        // Fetch all invoices
        const response = await api.get('/api/owner/revenue/invoices', {
          params: {
            take: 500, // Get more invoices
            status: statusFilter || undefined,
            date_from: dateFrom || undefined,
            date_to: dateTo || undefined,
          }
        });
        
        if (!mounted) return;
        
        const items = response.data?.items || [];
        setInvoices(items);
        
        // Calculate stats
        const totalRev = items.reduce((sum: number, inv: Invoice) => sum + Number(inv.total || 0), 0);
        const paidRev = items
          .filter((inv: Invoice) => inv.status === 'PAID')
          .reduce((sum: number, inv: Invoice) => sum + Number(inv.total || 0), 0);
        const pendingRev = items
          .filter((inv: Invoice) => inv.status !== 'PAID')
          .reduce((sum: number, inv: Invoice) => sum + Number(inv.total || 0), 0);
        
        const paidCount = items.filter((inv: Invoice) => inv.status === 'PAID').length;
        const pendingCount = items.length - paidCount;
        
        setStats({
          totalRevenue: totalRev,
          paidRevenue: paidRev,
          pendingRevenue: pendingRev,
          totalInvoices: items.length,
          paidInvoices: paidCount,
          pendingInvoices: pendingCount,
        });
      } catch (err: any) {
        console.error('Failed to load revenue:', err);
        if (mounted) {
          setInvoices([]);
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
        if (mounted) setLoading(false);
      }
    };

    loadRevenue();
    return () => { mounted = false; };
  }, [statusFilter, dateFrom, dateTo]);

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

    arr.sort((A, B) => {
      if (key === "invoiceNumber") return mul * cmpStr(String(A.invoiceNumber ?? ""), String(B.invoiceNumber ?? ""));
      if (key === "property") return mul * cmpStr(String(A.booking?.property?.title ?? ""), String(B.booking?.property?.title ?? ""));
      if (key === "status") return mul * cmpStr(String(A.status ?? ""), String(B.status ?? ""));
      if (key === "total") return mul * cmpNum(toNum(A.total), toNum(B.total));
      if (key === "netPayable") return mul * cmpNum(toNum(A.netPayable), toNum(B.netPayable));
      // default: issuedAt
      return mul * cmpNum(toTime(A.issuedAt), toTime(B.issuedAt));
    });

    return arr;
  })();

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
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">My Revenues</h1>
        <p className="text-sm sm:text-base text-slate-600 mt-2 max-w-2xl leading-relaxed">
          View and manage all your revenue from bookings, bonuses, and referrals in one place.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 px-4 sm:px-0">
        {/* Total Revenue */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 sm:p-6 transition-all duration-300 hover:shadow-md hover:border-emerald-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              </div>
              <div className="min-w-0">
                <div className="text-xs text-slate-500 font-medium uppercase tracking-wide">Total Revenue</div>
                <div className="text-xl sm:text-2xl font-bold text-slate-900 mt-0.5 truncate">{formatCurrency(stats.totalRevenue)}</div>
              </div>
            </div>
          </div>
          <div className="text-xs text-slate-500 font-medium">{stats.totalInvoices} invoices</div>
        </div>

        {/* Paid Revenue */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 sm:p-6 transition-all duration-300 hover:shadow-md hover:border-green-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div className="min-w-0">
                <div className="text-xs text-slate-500 font-medium uppercase tracking-wide">Paid</div>
                <div className="text-xl sm:text-2xl font-bold text-slate-900 mt-0.5 truncate">{formatCurrency(stats.paidRevenue)}</div>
              </div>
            </div>
          </div>
          <div className="text-xs text-slate-500 font-medium">{stats.paidInvoices} paid</div>
        </div>

        {/* Pending Revenue */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 sm:p-6 transition-all duration-300 hover:shadow-md hover:border-amber-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div className="min-w-0">
                <div className="text-xs text-slate-500 font-medium uppercase tracking-wide">Pending</div>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 sm:gap-4 items-end">
                <div className="sm:col-span-2 lg:col-span-6 min-w-0">
                  <div className="text-[11px] font-bold tracking-wide text-slate-500 uppercase mb-1">Search</div>
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Invoice, property, receipt…"
                    className="h-10 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300 transition-all duration-200"
                  />
                </div>

                <div className="sm:col-span-1 lg:col-span-3 min-w-0">
                  <div className="text-[11px] font-bold tracking-wide text-slate-500 uppercase mb-1">Status</div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="h-10 w-full rounded-2xl border border-slate-200 bg-white px-4 pr-10 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300 transition-all duration-200"
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

                <div className="sm:col-span-1 lg:col-span-3 min-w-0">
                  <div className="text-[11px] font-bold tracking-wide text-slate-500 uppercase mb-1">Sort</div>
                  <select
                    value={sortKey}
                    onChange={(e) => setSortKey(e.target.value)}
                    className="h-10 w-full rounded-2xl border border-slate-200 bg-white px-4 pr-10 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300 transition-all duration-200"
                    aria-label="Sort invoices"
                  >
                    <option value="issuedAt_desc">Newest</option>
                    <option value="issuedAt_asc">Oldest</option>
                    <option value="total_desc">Total (high)</option>
                    <option value="total_asc">Total (low)</option>
                    <option value="netPayable_desc">Net (high)</option>
                    <option value="netPayable_asc">Net (low)</option>
                    <option value="status_asc">Status (A→Z)</option>
                    <option value="invoiceNumber_asc">Invoice # (A→Z)</option>
                  </select>
                </div>

                <div className="sm:col-span-1 lg:col-span-4 min-w-0">
                  <div className="text-[11px] font-bold tracking-wide text-slate-500 uppercase mb-1">From</div>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="h-10 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300 transition-all duration-200"
                    aria-label="From date"
                  />
                </div>

                <div className="sm:col-span-1 lg:col-span-4 min-w-0">
                  <div className="text-[11px] font-bold tracking-wide text-slate-500 uppercase mb-1">To</div>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="h-10 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300 transition-all duration-200"
                    aria-label="To date"
                  />
                </div>

                <div className="sm:col-span-2 lg:col-span-4 min-w-0">
                  <div className="text-[11px] font-bold tracking-wide text-transparent uppercase select-none mb-1">Actions</div>
                  <button
                    type="button"
                    onClick={() => { setStatusFilter(""); setDateFrom(""); setDateTo(""); setSearch(""); setSortKey("issuedAt_desc"); }}
                    className="h-10 w-full rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 hover:border-slate-300 active:scale-[0.99] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    Reset
                  </button>
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
                {filteredSorted.map((invoice) => {
                  const propertyTitle = invoice.booking?.property?.title || "Property";
                  const net = invoice.netPayable != null ? formatCurrency(Number(invoice.netPayable)) : "—";
                  const viewHref = invoice.status === "PAID" ? `/owner/revenue/receipts/${invoice.id}` : `/owner/invoices/${invoice.id}`;
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
                      <td className="px-4 sm:px-6 py-3 sm:py-4 text-right font-semibold text-slate-900 whitespace-nowrap">{formatCurrency(Number(invoice.total))}</td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4 text-right font-bold text-emerald-600 whitespace-nowrap">{net}</td>
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
          </div>
        )}
      </div>
    </div>
  );
}

