"use client";
import { useEffect, useState } from "react";
import { XCircle, Loader2, FileText } from "lucide-react";
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
  rejectedReason?: string | null;
  booking?: {
    id: number;
    property?: {
      id: number;
      title: string;
    };
  };
};

export default function Rejected() {
  const [items, setItems] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters] = useState<RevenueFilters>({ status: "REJECTED" });

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    
    api.get<{ items: Invoice[] }>("/api/owner/revenue/invoices", { params: filters })
      .then(r => { 
        if (!mounted) return; 
        setItems(r.data.items || []); 
      })
      .catch(() => { 
        if (!mounted) return; 
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
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
          <Loader2 className="h-8 w-8 animate-spin text-red-600" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900">Rejected Invoices</h1>
        <p className="text-sm text-slate-600 mt-2 max-w-2xl">Loading your rejected invoices…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div className="flex flex-col items-center justify-center text-center px-4">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4 transition-all duration-300 hover:bg-red-200 hover:scale-105">
          <XCircle className="h-8 w-8 text-red-600" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">Rejected Invoices</h1>
        <p className="text-sm sm:text-base text-slate-600 mt-2 max-w-2xl leading-relaxed">
          Invoices that were rejected by NoLSAF. Review the rejection reason and take necessary action.
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
            <p className="text-sm sm:text-base text-slate-600 font-medium">No rejected invoices found.</p>
            <p className="text-xs sm:text-sm text-slate-500 mt-2">All your invoices have been approved or are pending review.</p>
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
                  <th className="px-4 sm:px-6 py-3 text-xs font-bold uppercase tracking-wide text-slate-600">Reason</th>
                  <th className="px-4 sm:px-6 py-3 text-xs font-bold uppercase tracking-wide text-slate-600 text-right">Total</th>
                  <th className="px-4 sm:px-6 py-3 text-xs font-bold uppercase tracking-wide text-slate-600 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {items.map((invoice) => {
                  const propertyTitle = invoice.booking?.property?.title || "Property";
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
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                          <XCircle className="h-3 w-3" />
                          REJECTED
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4 text-slate-700 max-w-[200px]">
                        <div className="truncate" title={invoice.rejectedReason || "—"}>
                          {invoice.rejectedReason || "—"}
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4 text-right font-semibold text-slate-900 whitespace-nowrap">
                        {formatCurrency(Number(invoice.total))}
                      </td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4 text-right">
                        <Link
                          href={`/owner/invoices/${invoice.id}`}
                          className="inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold text-blue-700 hover:text-blue-800 hover:bg-blue-50 rounded-lg border border-blue-200 hover:border-blue-300 transition-all duration-200 no-underline active:scale-95"
                        >
                          <FileText className="h-4 w-4" aria-hidden />
                          <span className="hidden sm:inline">View</span>
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
