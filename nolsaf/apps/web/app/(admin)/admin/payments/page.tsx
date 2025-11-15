"use client";

import { Wallet, CreditCard, Eye, Smartphone } from "lucide-react";
import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';

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
        const r = await api.get('/admin/payments');
        let list: any = r?.data;
        // common shapes: array or { items: [] } or { payments: [] }
        if (!list) list = [];
        if (list.items) list = list.items;
        if (list.payments) list = list.payments;
        if (!Array.isArray(list)) {
          // attempt to find array in data
          const arr = Object.values(r.data).find(v => Array.isArray(v));
          list = arr || [];
        }
        if (mounted) setPayments(list.map((p: any) => ({
          id: p.id || p.txn || p.transaction_id,
          date: p.date || p.createdAt || p.timestamp,
          txn: p.txn || p.transaction_id,
          invoice: p.invoice || p.code || p.invoiceNo,
          method: p.method || p.payment_method || p.card_description,
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
  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center text-center">
        <div className="rounded-full bg-blue-50 p-3 inline-flex items-center justify-center">
          <Wallet className="h-6 w-6 text-blue-600" />
        </div>
        <h1 className="mt-3 text-2xl font-semibold">Payments</h1>
        <p className="text-sm text-gray-500">Track and reconcile incoming and outgoing payments</p>
        {/* Buttons moved here so they appear directly under the header */}
        <div className="mt-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-center gap-3">
            <div className="flex items-center gap-2">
              <button onClick={()=>setActiveTab('waiting')} className={`px-3 py-1 rounded-full border transition-colors duration-150 ${activeTab==='waiting' ? 'bg-gray-200 text-gray-900 border-gray-300' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}>
                Waiting <span className="ml-2 inline-block px-2 py-0.5 text-xs rounded-full bg-yellow-100 text-yellow-800">{payments.filter(p=>p.status!=='Completed'&&p.status!=='Success').length}</span>
              </button>
              <button onClick={()=>setActiveTab('paid')} className={`px-3 py-1 rounded-full border transition-colors duration-150 ${activeTab==='paid' ? 'bg-gray-200 text-gray-900 border-gray-300' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}>
                Paid History <span className="ml-2 inline-block px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-800">{payments.filter(p=>p.status==='Completed'||p.status==='Success').length}</span>
              </button>
              {loading && <div className="ml-4 text-sm text-gray-500">Loading...</div>}
            </div>
            
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        {/* Table header is provided in the table below; removed duplicate mobile header */}

        <div>
          

          <div className="overflow-x-auto border border-gray-200 rounded-md shadow-sm">
            <table className="min-w-full table-auto border-collapse">
              <thead className="bg-gray-50">
                <tr className="text-sm text-gray-600 border-b divide-x divide-gray-200">
                  <th className="px-3 py-2 text-left w-36">Date</th>
                  <th className="px-3 py-2 text-left w-32">Owner</th>
                  <th className="px-3 py-2 text-left w-40">Invoice</th>
                  <th className="px-3 py-2 text-left w-40">Method</th>
                  <th className="px-3 py-2 text-right w-30">Amount</th>
                  <th className="px-3 py-2 text-left w-28">Status</th>
                  <th className="px-3 py-2 text-center w-20">{activeTab === 'waiting' ? 'Pay' : 'Receipt'}</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {payments.filter(p => activeTab==='waiting' ? (p.status!=='Completed' && p.status!=='Success') : (p.status==='Completed' || p.status==='Success')).map((p, i) => (
                  <tr key={(p.id||p.txn||i)} className="bg-white border-b last:border-b-0">
                    <td className="px-3 py-2 align-top">
                      <div className="font-medium">{formatDateOnly(p.date)}</div>
                      <div className="text-xs text-gray-500">{formatTimeWithSeconds(p.date)}</div>
                    </td>
                    <td className="px-3 py-2 align-top">{(p as any).ownerId||(p as any).owner||(p as any).owner_id||'-'}</td>
                    <td className="px-3 py-2 align-top"><code className="text-xs text-gray-700">{p.invoice || p.txn}</code></td>
                    <td className="px-3 py-2 align-top flex items-center gap-2">
                      {isMobileMoney(p.method, p) ? (
                        <Smartphone className="h-4 w-4 text-blue-500" />
                      ) : (
                        <CreditCard className="h-4 w-4 text-blue-500" />
                      )}
                      <span className="truncate">{formatMethodDisplay(p.method, p)}</span>
                    </td>
                    <td className="px-2 py-2 align-top text-right">{formatCurrency(p.amount, p.currency)}</td>
                    <td className="px-3 py-2 align-top">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${p.status==='Completed'||p.status==='Success' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{p.status}</span>
                    </td>
                    <td className="px-3 py-2 align-top text-center">
                      <button onClick={async()=>{
                        // open modal and lazy-load details if available
                        setSelectedPayment(p);
                        setModalOpen(true);
                        // attempt to fetch full invoice details
                        setModalLoading(true);
                        try{
                          const res = await api.get(`/admin/payments/${p.id || p.txn}`);
                          const data = res?.data;
                          // normalize if response wraps the item
                          const item = Array.isArray(data) ? data[0] : (data.payment || data.item || data);
                          if (item) setSelectedPayment(curr => ({ ...(curr||p), ...item } as Payment));
                        }catch(e){
                          // ignore — we'll show whatever we have in `p`
                        }finally{ setModalLoading(false); }
                      }} className="text-indigo-600 hover:text-indigo-900" aria-label={activeTab === 'waiting' ? 'View invoice to process payment' : 'View receipt'}>
                        <Eye className="h-4 w-4 inline" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Modal: view invoice / process payment */}
          {modalOpen && selectedPayment && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div className="absolute inset-0 bg-black/40" onClick={()=>{ if(!processing) { setModalOpen(false); setSelectedPayment(null); } }} />
              <div className="relative bg-white rounded-lg shadow-lg w-full max-w-2xl p-6 z-10">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Invoice {selectedPayment.invoice || selectedPayment.txn}</h3>
                  <button onClick={()=>{ if(!processing){ setModalOpen(false); setSelectedPayment(null); } }} className="text-gray-500 hover:text-gray-700">Close</button>
                </div>
                {modalLoading ? (
                  <div className="py-8 text-center">Loading invoice...</div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <div className="text-sm text-gray-600">Date</div>
                      <div className="text-sm font-medium">{formatDateOnly(selectedPayment.date)} {formatTimeWithSeconds(selectedPayment.date)}</div>
                    </div>
                    <div className="flex justify-between">
                      <div className="text-sm text-gray-600">Owner</div>
                      <div className="text-sm font-medium">{(selectedPayment as any).ownerId || (selectedPayment as any).owner || '-'}</div>
                    </div>
                    <div className="flex justify-between">
                      <div className="text-sm text-gray-600">Amount</div>
                      <div className="text-sm font-medium">{formatCurrency(selectedPayment.amount, selectedPayment.currency)}</div>
                    </div>
                    <div className="flex justify-between">
                      <div className="text-sm text-gray-600">Method</div>
                      <div className="text-sm font-medium">{formatMethodDisplay(selectedPayment.method, selectedPayment)}</div>
                    </div>
                    <div className="flex justify-between">
                      <div className="text-sm text-gray-600">Status</div>
                      <div className="text-sm font-medium">{selectedPayment.status}</div>
                    </div>
                    <div className="pt-4 flex gap-3">
                      {activeTab === 'waiting' && (
                        <button disabled={processing} onClick={async()=>{
                          if (!selectedPayment) return;
                          if (!confirm('Mark this payment as completed?')) return;
                          setProcessing(true);
                          try{
                            // Try a backend call to mark payment processed. Endpoint may vary; attempt common patterns.
                            await api.post(`/admin/payments/${selectedPayment.id}/process`);
                            // optimistic update in the table
                            setPayments(prev => prev.map(x => x.id === selectedPayment.id ? ({ ...x, status: 'Completed' }) : x));
                            setModalOpen(false);
                            setSelectedPayment(null);
                          }catch(err){
                            // fallback: try PATCH
                            try{
                              await api.patch(`/admin/payments/${selectedPayment.id}`, { status: 'Completed' });
                              setPayments(prev => prev.map(x => x.id === selectedPayment.id ? ({ ...x, status: 'Completed' }) : x));
                              setModalOpen(false);
                              setSelectedPayment(null);
                            }catch(e){
                              alert('Failed to mark payment completed — check server logs.');
                            }
                          }finally{ setProcessing(false); }
                        }} className="px-4 py-2 bg-indigo-600 text-white rounded">Mark as paid</button>
                      )}
                      <a href={(process.env.NEXT_PUBLIC_API_URL || '') + `/account/receipt/${selectedPayment.receiptId || selectedPayment.id}.pdf`} target="_blank" rel="noreferrer" className="px-4 py-2 border rounded text-indigo-600">Open PDF</a>
                      <button onClick={()=>{ setModalOpen(false); setSelectedPayment(null); }} className="px-4 py-2 border rounded">Close</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="mt-4 text-sm text-gray-500">Showing recent payments. Use tabs to switch between waiting and paid history.</div>
        </div>
      </div>
    </div>
  );
}
