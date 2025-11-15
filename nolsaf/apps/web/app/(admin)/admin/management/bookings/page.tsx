"use client";
import React, { useEffect, useState } from 'react';

type BookingRow = {
  id: number;
  status: string;
  checkIn: string;
  checkOut: string;
  guestName?: string | null;
  roomCode?: string | null;
  totalAmount?: number;
  property?: { id: number; title?: string };
};

export default function BookingsManagementPage(){
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
  const [items, setItems] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    (async () => {
      try {
        const r = await fetch(`${apiBase}/api/admin/bookings?page=${page}&pageSize=25`);
        if (!r.ok) throw new Error('fetch failed');
        const j = await r.json();
        if (!mounted) return;
        setItems(j.items ?? []);
      } catch (e) {
        console.error('bookings fetch', e);
        setItems([]);
      } finally { if (mounted) setLoading(false); }
    })();
    return () => { mounted = false; };
  }, [page, apiBase]);

  async function confirm(b: BookingRow) {
    try {
      const r = await fetch(`${apiBase}/api/admin/bookings/${b.id}/confirm`, { method: 'POST' });
      if (!r.ok) throw new Error('confirm failed');
      const j = await r.json();
      alert('Confirmed. Code: ' + (j.code ?? '—'));
    } catch (e) { alert('Confirm failed'); }
  }

  async function markCheckin(b: BookingRow) {
    try {
      const r = await fetch(`${apiBase}/api/admin/bookings/${b.id}/checkin`, { method: 'POST' });
      if (!r.ok) throw new Error('checkin failed');
      const j = await r.json();
      setItems(cur => cur.map(x => x.id === b.id ? (j.booking as BookingRow) : x));
      alert('Marked checked-in');
    } catch (e) { alert('Check-in failed'); }
  }

  async function markCheckout(b: BookingRow) {
    try {
      const r = await fetch(`${apiBase}/api/admin/bookings/${b.id}/checkout`, { method: 'POST' });
      if (!r.ok) throw new Error('checkout failed');
      const j = await r.json();
      setItems(cur => cur.map(x => x.id === b.id ? (j.booking as BookingRow) : x));
      alert('Marked checked-out');
    } catch (e) { alert('Check-out failed'); }
  }

  async function cancel(b: BookingRow) {
    const reason = prompt('Reason for cancel');
    if (!reason) return;
    try {
      const r = await fetch(`${apiBase}/api/admin/bookings/${b.id}/cancel`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason }) });
      if (!r.ok) throw new Error('cancel failed');
      const j = await r.json();
      setItems(cur => cur.map(x => x.id === b.id ? (j.booking as BookingRow) : x));
      alert('Canceled');
    } catch (e) { alert('Cancel failed'); }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Bookings</h1>
        <div className="text-sm text-gray-500">Showing admin booking records</div>
      </div>

      <div className="bg-white border rounded overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left">ID</th>
              <th className="px-3 py-2 text-left">Property</th>
              <th className="px-3 py-2 text-left">Guest</th>
              <th className="px-3 py-2 text-left">Check-in</th>
              <th className="px-3 py-2 text-left">Check-out</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7} className="p-4">Loading…</td></tr>}
            {!loading && items.map(b => (
              <tr key={b.id} className="border-t">
                <td className="px-3 py-2">{b.id}</td>
                <td className="px-3 py-2">{b.property?.title ?? '—'}</td>
                <td className="px-3 py-2">{b.guestName ?? '—'}</td>
                <td className="px-3 py-2">{new Date(b.checkIn).toLocaleString()}</td>
                <td className="px-3 py-2">{new Date(b.checkOut).toLocaleString()}</td>
                <td className="px-3 py-2">{b.status}</td>
                <td className="px-3 py-2">
                  <div className="flex gap-2">
                    <button className="btn btn-xs" onClick={() => confirm(b)}>Confirm</button>
                    <button className="btn btn-xs btn-ghost" onClick={() => markCheckin(b)}>Check-in</button>
                    <button className="btn btn-xs btn-ghost" onClick={() => markCheckout(b)}>Check-out</button>
                    <button className="btn btn-xs btn-danger" onClick={() => cancel(b)}>Cancel</button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && items.length === 0 && <tr><td colSpan={7} className="p-4">No bookings</td></tr>}
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
    </div>
  );
}
