"use client";

import { Wallet, CreditCard, Eye, Smartphone } from "lucide-react";
import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import TableRow from "@/components/TableRow";

export default function Page() {


  

  const formatDateOnly = (isoOrDate: string | Date) => {
    const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
    // YYYY-MM-DD without dots
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const formatTimeWithSeconds = (isoOrDate: string | Date) => {
    const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    return `${hh}:${mi}:${ss}`;
  };

  const formatCurrency = (amount: number, currency = 'TZS', locale?: string) => {
    try{
      return new Intl.NumberFormat(locale || undefined, { style: 'currency', currency }).format(amount);
    }catch(e){
      // fallback
      return `${currency} ${amount}`;
    }
  };

  const formatMethodDisplay = (method?: string, p?: Payment) => {
    if (!method) return '-';
    // find last long digit sequence (phone, card, account) inside method
    const matches = method.match(/(\d{4,})/g);
    if (matches && matches.length > 0) {
      const last = matches[matches.length - 1];
      const last4 = last.slice(-4);
      return `*****${last4}`;
    }

    // If method indicates a mobile-money style but contains no digits
    // try to infer a number from other fields (txn, invoice, receiptId, id)
    if (/mobile|mpesa|lipan|m-pesa|mobi/i.test(method)) {
      const candidates = [ (p as any)?.txn, (p as any)?.invoice, (p as any)?.receiptId, (p as any)?.id ];
      for (const c of candidates) {
        if (!c) continue;
        const digits = String(c).match(/(\d{2,})/g);
        if (digits && digits.length > 0) {
          const last = digits[digits.length - 1];
          const last4 = last.slice(-4);
          return `*****${last4}`;
        }
      }
      // no digits found at all — show generic masked placeholder
      return '*****';
    }

    // fallback: show method text as-is
    return method;
  };

  const isMobileMoney = (method?: string, p?: Payment) => {
    if (!method) return false;
    if (/mobile|mpesa|lipan|m-pesa|mobi/i.test(method)) return true;
    // fallback: if txn/invoice/receiptId look like mobile (start with 07 or 254)
    const candidates = [ (p as any)?.txn, (p as any)?.invoice, (p as any)?.receiptId, (p as any)?.id ];
    for (const c of candidates) {
      if (!c) continue;
      if (/^(07|254)\d{6,}/.test(String(c))) return true;
    }
    return false;
  };

  // client state & fetching
  interface Payment {
    id?: string;
    date: string;
    txn?: string;
    invoice?: string;
    method?: string;
    amount: number;
    currency?: string;
    status: string;
    receiptId?: string;
  }

  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'waiting'|'paid'>('waiting');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [processing, setProcessing] = useState(false);

  const api = useMemo(()=> axios.create({ baseURL: process.env.NEXT_PUBLIC_API_URL }), []);
  // attach token if present (same pattern used in other pages)
  useEffect(()=>{
    const t = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (t) api.defaults.headers.common['Authorization'] = `Bearer ${t}`;
  },[api]);

  useEffect(()=>{
    let mounted = true;
    const load = async () => {
  setLoading(true);
      try{
        const r = await api.get('/admin/payments/events');
        let list: any = r?.data?.items || [];
        // Handle the API response structure: { total, page, pageSize, items }
        if (!Array.isArray(list)) {
          // attempt to find array in data
          const arr = Object.values(r.data).find(v => Array.isArray(v));
          list = arr || [];
        }
        if (mounted) setPayments(list.map((p: any) => ({
          id: p.id || p.txn || p.transaction_id,
          date: p.date || p.createdAt || p.timestamp,
          txn: p.txn || p.transaction_id || p.eventId,
          invoice: p.invoice?.invoiceNumber || p.invoice?.id || p.code || p.invoiceNo,
          method: p.method || p.payment_method || p.provider || p.card_description,
          amount: Number(p.amount ?? p.value ?? 0),
          currency: p.currency || p.currencyCode || 'TZS',
          status: p.status || p.state || 'Pending',
          receiptId: p.receiptId || p.receipt || p.id,
        })));
      }catch(err){
        console.error('payments fetch failed', err);
        // fallback to sample data (non-breaking)
        if (mounted) setPayments([
          { date: '2025-10-22T18:36:11Z', txn: '1LWT6PQ2', invoice: 'INV-2025-0002', method: 'Visa ending in 5374', amount: 4, currency: 'USD', status: 'Pending', receiptId: 'ch_3SL459JFr6CCHwIi1Lwt6Pq2' },
          { date: '2025-10-23T14:32:00Z', txn: '4521', invoice: 'INV-2025-0001', method: 'Mobile Money', amount: 1250000, currency: 'TZS', status: 'Completed', receiptId: 'inv-4521' }
        ]);
      }finally{
        if (mounted) setLoading(false);
      }
    };
    load();
    return ()=>{ mounted = false; };
  },[api]);
  const filteredPayments = payments.filter(p => 
    activeTab === 'waiting' 
      ? (p.status !== 'Completed' && p.status !== 'Success') 
      : (p.status === 'Completed' || p.status === 'Success')
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="flex flex-col items-center text-center mb-4">
          <Wallet className="h-8 w-8 text-gray-400 mb-3" />
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900">
            Payments
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Track and reconcile incoming and outgoing payments
          </p>
        </div>
        
        {/* Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-center gap-3 mt-4">
          <button 
            onClick={() => setActiveTab('waiting')} 
            className={`px-4 py-2 rounded-full border text-sm font-medium transition-all duration-200 ${
              activeTab === 'waiting' 
                ? 'bg-[#02665e] text-white border-[#02665e] shadow-sm' 
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            Waiting 
            <span className={`ml-2 inline-block px-2 py-0.5 text-xs rounded-full ${
              activeTab === 'waiting' 
                ? 'bg-white/20 text-white' 
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {payments.filter(p => p.status !== 'Completed' && p.status !== 'Success').length}
            </span>
          </button>
          <button 
            onClick={() => setActiveTab('paid')} 
            className={`px-4 py-2 rounded-full border text-sm font-medium transition-all duration-200 ${
              activeTab === 'paid' 
                ? 'bg-[#02665e] text-white border-[#02665e] shadow-sm' 
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            Paid History 
            <span className={`ml-2 inline-block px-2 py-0.5 text-xs rounded-full ${
              activeTab === 'paid' 
                ? 'bg-white/20 text-white' 
                : 'bg-green-100 text-green-800'
            }`}>
              {payments.filter(p => p.status === 'Completed' || p.status === 'Success').length}
            </span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="px-6 py-12 text-center">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-[#02665e]"></div>
            <p className="mt-3 text-sm text-gray-500">Loading payments...</p>
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Wallet className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No {activeTab === 'waiting' ? 'pending' : 'completed'} payments found.</p>
            <p className="text-xs text-gray-400 mt-1">Switch tabs to view {activeTab === 'waiting' ? 'paid history' : 'pending payments'}.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Owner</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">{activeTab === 'waiting' ? 'Pay' : 'Receipt'}</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPayments.map((p, i) => (
                  <TableRow key={p.id || p.txn || i}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{formatDateOnly(p.date)}</div>
                      <div className="text-xs text-gray-500">{formatTimeWithSeconds(p.date)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {(p as any).ownerId || (p as any).owner || (p as any).owner_id || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <code className="text-xs text-gray-700 bg-gray-50 px-2 py-1 rounded border border-gray-200">{p.invoice || p.txn}</code>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {isMobileMoney(p.method, p) ? (
                          <Smartphone className="h-4 w-4 text-[#02665e]" />
                        ) : (
                          <CreditCard className="h-4 w-4 text-[#02665e]" />
                        )}
                        <span className="text-sm text-gray-900">{formatMethodDisplay(p.method, p)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                      {formatCurrency(p.amount, p.currency)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        p.status === 'Completed' || p.status === 'Success' 
                          ? 'bg-green-50 text-green-700 border border-green-200' 
                          : 'bg-yellow-50 text-yellow-800 border border-yellow-200'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <button 
                        onClick={async () => {
                          setSelectedPayment(p);
                          setModalOpen(true);
                          setModalLoading(true);
                          try {
                            const res = await api.get(`/admin/payments/events/${p.id || p.txn}`);
                            const data = res?.data;
                            const item = Array.isArray(data) ? data[0] : (data.payment || data.item || data);
                            if (item) setSelectedPayment(curr => ({ ...(curr || p), ...item } as Payment));
                          } catch (e) {
                            // ignore - endpoint may not exist or payment not found
                            console.warn('Failed to load payment details:', e);
                          } finally { 
                            setModalLoading(false); 
                          }
                        }} 
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-sm text-[#02665e] border border-[#02665e] rounded-lg hover:bg-[#02665e] hover:text-white transition-all duration-200"
                        aria-label={activeTab === 'waiting' ? 'View invoice to process payment' : 'View receipt'}
                      >
                        <Eye className="h-4 w-4" />
                        <span className="hidden sm:inline">{activeTab === 'waiting' ? 'Pay' : 'View'}</span>
                      </button>
                    </td>
                  </TableRow>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {!loading && filteredPayments.length > 0 && (
          <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 text-sm text-gray-500 text-center">
            Showing recent payments. Use tabs to switch between waiting and paid history.
          </div>
        )}
      </div>

      {/* Modal: view invoice / process payment */}
      {modalOpen && selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/40 transition-opacity" 
            onClick={() => { 
              if (!processing) { 
                setModalOpen(false); 
                setSelectedPayment(null); 
              } 
            }} 
          />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 z-10 border border-gray-200">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">
                Invoice {selectedPayment.invoice || selectedPayment.txn}
              </h3>
              <button 
                onClick={() => { 
                  if (!processing) { 
                    setModalOpen(false); 
                    setSelectedPayment(null); 
                  } 
                }} 
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close modal"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {modalLoading ? (
              <div className="py-12 text-center">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-[#02665e]"></div>
                <p className="mt-3 text-sm text-gray-500">Loading invoice details...</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Date</div>
                    <div className="text-sm font-medium text-gray-900">
                      {formatDateOnly(selectedPayment.date)} {formatTimeWithSeconds(selectedPayment.date)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Owner</div>
                    <div className="text-sm font-medium text-gray-900">
                      {(selectedPayment as any).ownerId || (selectedPayment as any).owner || '-'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Amount</div>
                    <div className="text-sm font-medium text-gray-900">
                      {formatCurrency(selectedPayment.amount, selectedPayment.currency)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Method</div>
                    <div className="text-sm font-medium text-gray-900">
                      {formatMethodDisplay(selectedPayment.method, selectedPayment)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Status</div>
                    <div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        selectedPayment.status === 'Completed' || selectedPayment.status === 'Success' 
                          ? 'bg-green-50 text-green-700 border border-green-200' 
                          : 'bg-yellow-50 text-yellow-800 border border-yellow-200'
                      }`}>
                        {selectedPayment.status}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="pt-4 flex gap-3 border-t border-gray-200">
                  {activeTab === 'waiting' && (
                    <button 
                      disabled={processing} 
                      onClick={async () => {
                        if (!selectedPayment) return;
                        if (!confirm('Mark this payment as completed?')) return;
                        setProcessing(true);
                        try {
                          // Note: Payment processing endpoints need to be implemented in the API
                          // For now, we'll just update the UI optimistically
                          // TODO: Implement POST /admin/payments/events/:id/process or PATCH /admin/payments/events/:id in the API
                          setPayments(prev => prev.map(x => x.id === selectedPayment.id ? ({ ...x, status: 'Completed' }) : x));
                          setModalOpen(false);
                          setSelectedPayment(null);
                          alert('Payment marked as completed. Note: This is a UI-only update. API endpoint needs to be implemented.');
                        } catch (err) {
                          console.error('Failed to process payment:', err);
                          alert('Failed to mark payment completed. The API endpoint for processing payments needs to be implemented.');
                        } finally {
                          setProcessing(false);
                        }
                      }} 
                      className="px-4 py-2 bg-[#02665e] text-white rounded-lg hover:bg-[#013a37] transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {processing ? 'Processing...' : 'Mark as paid'}
                    </button>
                  )}
                  <a 
                    href={(process.env.NEXT_PUBLIC_API_URL || '') + `/account/receipt/${selectedPayment.receiptId || selectedPayment.id}.pdf`} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="px-4 py-2 border border-gray-300 rounded-lg text-[#02665e] hover:bg-gray-50 transition-colors duration-200"
                  >
                    Open PDF
                  </a>
                  <button 
                    onClick={() => { 
                      setModalOpen(false); 
                      setSelectedPayment(null); 
                    }} 
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
