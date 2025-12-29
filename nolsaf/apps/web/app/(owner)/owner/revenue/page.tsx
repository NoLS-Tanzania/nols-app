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
  }, []);

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
      'APPROVED': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: Clock },
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col items-center justify-center text-center">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-emerald-100 mb-4 transition-all duration-300">
          <DollarSign className="h-8 w-8 text-emerald-600" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900">My Revenues</h1>
        <p className="text-sm text-slate-600 mt-2 max-w-2xl">
          View and manage all your revenue from bookings, bonuses, and referrals in one place.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Total Revenue */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 transition-all duration-300 hover:shadow-md">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <div className="text-xs text-slate-500 font-medium">Total Revenue</div>
                <div className="text-2xl font-bold text-slate-900">{formatCurrency(stats.totalRevenue)}</div>
              </div>
            </div>
          </div>
          <div className="text-xs text-slate-500">{stats.totalInvoices} invoices</div>
        </div>

        {/* Paid Revenue */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 transition-all duration-300 hover:shadow-md">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <div className="text-xs text-slate-500 font-medium">Paid</div>
                <div className="text-2xl font-bold text-slate-900">{formatCurrency(stats.paidRevenue)}</div>
              </div>
            </div>
          </div>
          <div className="text-xs text-slate-500">{stats.paidInvoices} paid</div>
        </div>

        {/* Pending Revenue */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 transition-all duration-300 hover:shadow-md">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <div className="text-xs text-slate-500 font-medium">Pending</div>
                <div className="text-2xl font-bold text-slate-900">{formatCurrency(stats.pendingRevenue)}</div>
              </div>
            </div>
          </div>
          <div className="text-xs text-slate-500">{stats.pendingInvoices} pending</div>
        </div>
      </div>

      {/* Invoices List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900">All Invoices</h2>
        </div>
        
        {invoices.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <p className="text-sm text-slate-600">No invoices found.</p>
            <p className="text-xs text-slate-500 mt-1">Revenue invoices will appear here once bookings are confirmed.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {invoices.map((invoice) => (
              <div
                key={invoice.id}
                className="p-4 hover:bg-slate-50 transition-all duration-200"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <FileText className="h-5 w-5 text-slate-400 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-slate-900 truncate">
                          {invoice.invoiceNumber}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {invoice.booking?.property?.title || 'Property'}
                        </div>
                      </div>
                      {getStatusBadge(invoice.status)}
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3 text-sm">
                      <div>
                        <div className="text-xs text-slate-500">Issued</div>
                        <div className="font-medium text-slate-700">{formatDate(invoice.issuedAt)}</div>
                      </div>
                      {invoice.paidAt && (
                        <div>
                          <div className="text-xs text-slate-500">Paid</div>
                          <div className="font-medium text-slate-700">{formatDate(invoice.paidAt)}</div>
                        </div>
                      )}
                      <div>
                        <div className="text-xs text-slate-500">Total</div>
                        <div className="font-medium text-slate-700">{formatCurrency(Number(invoice.total))}</div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500">Net Payable</div>
                        <div className="font-bold text-emerald-600">{formatCurrency(Number(invoice.netPayable))}</div>
                      </div>
                    </div>
                  </div>
                  
                  <Link
                    href={`/owner/revenue/receipts/${invoice.id}`}
                    className="flex-shrink-0 inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg border border-blue-200 hover:border-blue-300 transition-all duration-200"
                  >
                    <FileText className="h-4 w-4" />
                    <span>View</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

