"use client";
import React, { useEffect, useState } from 'react';
import TableRow from "@/components/TableRow";
import { Receipt, ChevronLeft, ChevronRight, Download, CheckCircle, DollarSign } from "lucide-react";

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
  const [markPaidModal, setMarkPaidModal] = useState<InvoiceRow | null>(null);

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

  async function approve(inv: InvoiceRow) {
    if (!confirm('Approve invoice #' + inv.id + '?')) return;
    try {
      const r = await fetch(`${apiBase.replace(/\/$/, '')}/api/admin/invoices/${inv.id}/approve`, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
      if (!r.ok) throw new Error('approve failed');
      const j = await r.json();
      setItems((cur) => cur.map(i => i.id === inv.id ? (j.invoice as InvoiceRow) : i));
      alert('Approved');
    } catch (e) { alert('Approve failed'); }
  }

  async function openMarkPaid(inv: InvoiceRow) {
    setMarkPaidModal(inv);
  }

  async function markPaid(inv: InvoiceRow, method = 'BANK', ref = '') {
    try {
      const r = await fetch(`${apiBase.replace(/\/$/, '')}/api/admin/invoices/${inv.id}/mark-paid`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ method, ref }) });
      if (!r.ok) throw new Error('mark-paid failed');
      const j = await r.json();
      setItems((cur) => cur.map(i => i.id === inv.id ? (j.invoice as InvoiceRow) : i));
      setMarkPaidModal(null);
      alert('Marked as paid');
    } catch (e) {
      alert('Mark paid failed');
    }
  }

  function downloadReceipt(inv: InvoiceRow) {
    const url = `${apiBase.replace(/\/$/, '')}/api/admin/invoices/${inv.id}/receipt.png`;
    window.open(url, '_blank');
  }

  function getStatusBadgeClass(status: string) {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('paid') || statusLower.includes('approved')) {
      return "inline-flex items-center px-2 py-1 rounded-md bg-green-50 text-green-700 text-xs font-medium";
    }
    if (statusLower.includes('pending') || statusLower.includes('unpaid')) {
      return "inline-flex items-center px-2 py-1 rounded-md bg-yellow-50 text-yellow-700 text-xs font-medium";
    }
    if (statusLower.includes('cancel') || statusLower.includes('reject')) {
      return "inline-flex items-center px-2 py-1 rounded-md bg-red-50 text-red-700 text-xs font-medium";
    }
    return "inline-flex items-center px-2 py-1 rounded-md bg-gray-50 text-gray-700 text-xs font-medium";
  }

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount);
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="flex flex-col items-center text-center mb-4">
          <Receipt className="h-8 w-8 text-gray-400 mb-3" />
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900">
            All Invoices Management
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage all invoices from owners, drivers, and bookings across the platform
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Total invoices: {total.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice #</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Owner</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Property</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Issued</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Net Payable</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <TableRow hover={false}>
                  <td colSpan={9} className="px-4 py-8 text-center text-sm text-gray-500">
                    Loading…
                  </td>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow hover={false}>
                  <td colSpan={9} className="px-4 py-8 text-center text-sm text-gray-500">
                    No invoices found
                  </td>
                </TableRow>
              ) : (
                items.map(i => (
                  <TableRow key={i.id}>
                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap font-medium">
                      #{i.id}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      <div className="font-medium">{i.invoiceNumber ?? '—'}</div>
                      {i.receiptNumber && (
                        <div className="text-xs text-gray-500">Receipt: {i.receiptNumber}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      <div className="font-medium">{i.owner?.name ?? `Owner #${i.ownerId}`}</div>
                      {i.owner?.email && (
                        <div className="text-xs text-gray-500">{i.owner.email}</div>
                      )}
                      {i.owner?.phone && (
                        <div className="text-xs text-gray-500">{i.owner.phone}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {i.booking?.property?.title ?? '—'}
                      {i.booking?.property?.type && (
                        <div className="text-xs text-gray-500">{i.booking.property.type}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                      {new Date(i.issuedAt).toLocaleDateString()}
                      <br />
                      <span className="text-xs text-gray-500">
                        {new Date(i.issuedAt).toLocaleTimeString()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right whitespace-nowrap font-medium">
                      {formatCurrency(Number(i.total))}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right whitespace-nowrap">
                      <div className="font-medium">{i.netPayable ? formatCurrency(Number(i.netPayable)) : '—'}</div>
                      {i.commissionAmount && (
                        <div className="text-xs text-gray-500">Commission: {formatCurrency(Number(i.commissionAmount))}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={getStatusBadgeClass(i.status)}>
                        {i.status}
                      </span>
                      {i.paidAt && (
                        <div className="text-xs text-gray-500 mt-1">
                          Paid: {new Date(i.paidAt).toLocaleDateString()}
                        </div>
                      )}
                      {i.paymentMethod && (
                        <div className="text-xs text-gray-500">
                          {i.paymentMethod}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex gap-2 justify-center flex-wrap">
                        {i.status !== 'APPROVED' && i.status !== 'PAID' && (
                          <button 
                            className="px-3 py-1 text-xs font-medium text-[#02665e] border border-[#02665e] rounded hover:bg-[#02665e] hover:text-white transition-all duration-200 active:bg-[#02665e] active:text-white touch-manipulation flex items-center gap-1"
                            onClick={() => approve(i)}
                          >
                            <CheckCircle className="h-3 w-3" />
                            Approve
                          </button>
                        )}
                        {i.status !== 'PAID' && (
                          <button 
                            className="px-3 py-1 text-xs font-medium text-gray-700 border border-gray-300 rounded hover:border-green-500 hover:text-green-600 transition-all duration-200 active:border-green-500 active:text-green-600 touch-manipulation flex items-center gap-1"
                            onClick={() => openMarkPaid(i)}
                          >
                            <DollarSign className="h-3 w-3" />
                            Mark Paid
                          </button>
                        )}
                        {i.receiptNumber && (
                          <button 
                            className="px-3 py-1 text-xs font-medium text-gray-700 border border-gray-300 rounded hover:border-blue-500 hover:text-blue-600 transition-all duration-200 active:border-blue-500 active:text-blue-600 touch-manipulation flex items-center gap-1"
                            onClick={() => downloadReceipt(i)}
                          >
                            <Download className="h-3 w-3" />
                            Receipt
                          </button>
                        )}
                      </div>
                    </td>
                  </TableRow>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
        <div className="flex gap-2">
          <button 
            className="p-2 border border-gray-300 rounded-lg hover:border-[#02665e] hover:text-[#02665e] transition-all duration-200 active:border-[#02665e] active:text-[#02665e] touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button 
            className="p-2 border border-gray-300 rounded-lg hover:border-[#02665e] hover:text-[#02665e] transition-all duration-200 active:border-[#02665e] active:text-[#02665e] touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            onClick={() => setPage(p => p + 1)}
            disabled={items.length < pageSize || loading || (page * pageSize >= total)}
            aria-label="Next page"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
        <div className="text-sm text-gray-600">
          Page <span className="font-semibold text-gray-900">{page}</span>
          {total > 0 && (
            <span className="ml-2 text-gray-500">
              (Total: {total})
            </span>
          )}
        </div>
      </div>

      {markPaidModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md border border-gray-200">
            <h2 className="text-lg font-semibold mb-4 text-gray-900">Mark Invoice Paid</h2>
            <p className="text-sm mb-4 text-gray-600">Invoice #{markPaidModal.id} — {markPaidModal.invoiceNumber ?? '—'}</p>
            <div className="mb-4">
              <label htmlFor="pmethod" className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
              <select 
                id="pmethod" 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#02665e] focus:border-[#02665e] outline-none"
                defaultValue="BANK"
              >
                <option value="BANK">Bank</option>
                <option value="MOMO">Mobile Money</option>
              </select>
            </div>
            <div className="mb-4">
              <label htmlFor="pref" className="block text-sm font-medium text-gray-700 mb-1">Reference</label>
              <input 
                id="pref" 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#02665e] focus:border-[#02665e] outline-none"
                placeholder="Enter payment reference"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button 
                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200"
                onClick={() => setMarkPaidModal(null)}
              >
                Cancel
              </button>
              <button 
                className="px-4 py-2 text-sm font-medium text-white bg-[#02665e] rounded-lg hover:bg-[#015b54] transition-all duration-200"
                onClick={() => {
                  const method = (document.getElementById('pmethod') as HTMLSelectElement).value;
                  const ref = (document.getElementById('pref') as HTMLInputElement).value;
                  markPaid(markPaidModal, method, ref);
                }}
              >
                Mark Paid
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
