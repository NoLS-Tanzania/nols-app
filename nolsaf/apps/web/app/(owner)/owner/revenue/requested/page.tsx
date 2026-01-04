"use client";
import { useEffect, useState } from "react";
import { Wallet, Loader2, FileText, Clock, ArrowRight } from "lucide-react";
import axios from "axios";
import Link from "next/link";

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
  // Support both legacy SUBMITTED and canonical REQUESTED statuses.
  const [filters] = useState<RevenueFilters>({ status: "REQUESTED,SUBMITTED" });

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    
    api
      .get<{ items: Invoice[] }>("/api/owner/revenue/invoices", { params: filters })
      .then((r) => { 
        if (!mounted) return; 
        setItems(r.data.items || []); 
      })
      .catch((err) => {
        if (!mounted) return; 
        console.error("Failed to load invoices", err); 
        setItems([]);
      })
      .finally(() => { 
        if (!mounted) return; 
        setLoading(false); 
      });

    return () => { mounted = false; };
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
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div className="flex flex-col items-center justify-center text-center px-4">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-amber-100 mb-4 transition-all duration-300 hover:bg-amber-200 hover:scale-105">
          <Wallet className="h-8 w-8 text-amber-600" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">Requested Invoices</h1>
        <p className="text-sm sm:text-base text-slate-600 mt-2 max-w-2xl leading-relaxed">
          Invoices submitted to NoLSAF awaiting verification and approval.
        </p>
      </div>

      {/* Invoices List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm sm:text-base font-semibold text-slate-900">Invoices</div>
            <div className="text-xs text-slate-500 font-medium">
              {items.length} {items.length === 1 ? 'invoice' : 'invoices'}
            </div>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="p-12 sm:p-16 text-center">
            <FileText className="h-12 w-12 sm:h-16 sm:w-16 text-slate-400 mx-auto mb-4 opacity-50" />
            <p className="text-sm sm:text-base text-slate-600 font-medium">No requested invoices found.</p>
            <p className="text-xs sm:text-sm text-slate-500 mt-2">All submitted invoices have been processed.</p>
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
                {items.map((invoice) => {
                  const propertyTitle = invoice.booking?.property?.title || "Property";
                  const net = invoice.netPayable != null ? formatCurrency(Number(invoice.netPayable)) : "—";
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
                      <td className="px-4 sm:px-6 py-3 sm:py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          <Clock className="h-3 w-3" />
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
