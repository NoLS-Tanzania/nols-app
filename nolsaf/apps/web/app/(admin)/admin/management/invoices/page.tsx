"use client";
import React, { useEffect, useState } from 'react';

type InvoiceRow = {
  id: number;
  invoiceNumber?: string | null;
  issuedAt: string;
  total: number;
  netPayable: number;
  status: string;
  ownerId: number;
  booking?: { property?: { title?: string } } | null;
};

export default function InvoicesManagementPage(){
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
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
        const r = await fetch(`${apiBase}/api/admin/invoices?page=${page}&pageSize=${pageSize}`);
        if (!r.ok) throw new Error('fetch failed');
        const j = await r.json();
        if (!mounted) return;
        setItems(j.items ?? []);
        setTotal(j.total ?? 0);
      } catch (e) {
        console.error('invoices fetch', e);
        setItems([]);
      } finally { if (mounted) setLoading(false); }
    })();
    return () => { mounted = false; };
  }, [page, pageSize, apiBase]);

  async function approve(inv: InvoiceRow) {
    if (!confirm('Approve invoice #' + inv.id + '?')) return;
    try {
      const r = await fetch(`${apiBase}/api/admin/invoices/${inv.id}/approve`, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
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
      const r = await fetch(`${apiBase}/api/admin/invoices/${inv.id}/mark-paid`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ method, ref }) });
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
    const url = `${apiBase}/api/admin/invoices/${inv.id}/receipt.png`;
    window.open(url, '_blank');
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Invoices & Payments</h1>
        <div className="text-sm text-gray-500">Total: {total}</div>
      </div>

      <div className="bg-white border rounded overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left">#</th>
              <th className="px-3 py-2 text-left">Invoice</th>
              <th className="px-3 py-2 text-left">Property</th>
              <th className="px-3 py-2 text-left">Issued</th>
              <th className="px-3 py-2 text-right">Total</th>
              <th className="px-3 py-2 text-right">Net Payable</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={8} className="p-4">Loading…</td></tr>}
            {!loading && items.map(i => (
              <tr key={i.id} className="border-t">
                <td className="px-3 py-2">{i.id}</td>
                <td className="px-3 py-2">{i.invoiceNumber ?? '—'}</td>
                <td className="px-3 py-2">{i.booking?.property?.title ?? '—'}</td>
                <td className="px-3 py-2">{new Date(i.issuedAt).toLocaleString()}</td>
                <td className="px-3 py-2 text-right">{i.total?.toLocaleString()}</td>
                <td className="px-3 py-2 text-right">{i.netPayable?.toLocaleString()}</td>
                <td className="px-3 py-2">{i.status}</td>
                <td className="px-3 py-2">
                  <div className="flex gap-2">
                    <button className="btn btn-xs" onClick={() => approve(i)}>Approve</button>
                    <button className="btn btn-xs btn-ghost" onClick={() => openMarkPaid(i)}>Mark Paid</button>
                    <button className="btn btn-xs btn-link" onClick={() => downloadReceipt(i)}>Receipt</button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && items.length === 0 && <tr><td colSpan={8} className="p-4">No invoices</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-4">
        <div>
          <button className="btn btn-sm" onClick={() => setPage(p => Math.max(1, p - 1))}>Prev</button>
          <button className="btn btn-sm ml-2" onClick={() => setPage(p => p + 1)}>Next</button>
        </div>
        <div className="text-sm text-gray-500">Page {page}</div>
      </div>

      {markPaidModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Mark Invoice Paid</h2>
            <p className="text-sm mb-4">Invoice #{markPaidModal.id} — {markPaidModal.invoiceNumber ?? '—'}</p>
            <div className="mb-4">
              <label htmlFor="pmethod" className="block text-sm">Payment Method</label>
              <select id="pmethod" className="input w-full" defaultValue="BANK">
                <option value="BANK">Bank</option>
                <option value="MOMO">Mobile Money</option>
              </select>
            </div>
            <div className="mb-4">
              <label htmlFor="pref" className="block text-sm">Reference</label>
              <input id="pref" className="input w-full" />
            </div>
            <div className="flex justify-end gap-2">
              <button className="btn btn-ghost" onClick={() => setMarkPaidModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => {
                const method = (document.getElementById('pmethod') as HTMLSelectElement).value;
                const ref = (document.getElementById('pref') as HTMLInputElement).value;
                markPaid(markPaidModal, method, ref);
              }}>Mark Paid</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
