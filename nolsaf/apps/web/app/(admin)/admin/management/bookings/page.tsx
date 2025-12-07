"use client";
import React, { useEffect, useState } from 'react';
import TableRow from "@/components/TableRow";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";

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
  const apiBase = typeof window === 'undefined'
    ? (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4000")
    : '';
  const [items, setItems] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const url = `${apiBase.replace(/\/$/, '')}/api/admin/bookings?page=${page}&pageSize=25`;
        const r = await fetch(url, {
          headers: { "x-role": "ADMIN" }
        });
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
        console.error('bookings fetch', e);
        if (mounted) {
          setError(e?.message ?? 'Failed to load bookings');
          setItems([]);
        }
      } finally { if (mounted) setLoading(false); }
    })();
    return () => { mounted = false; };
  }, [page, apiBase]);

  async function confirm(b: BookingRow) {
    try {
      const r = await fetch(`${apiBase.replace(/\/$/, '')}/api/admin/bookings/${b.id}/confirm`, { 
        method: 'POST',
        headers: { "x-role": "ADMIN" }
      });
      if (!r.ok) throw new Error('confirm failed');
      const j = await r.json();
      alert('Confirmed. Code: ' + (j.code ?? '—'));
      // Refresh data
      setPage(p => p);
    } catch (e) { alert('Confirm failed'); }
  }

  async function markCheckin(b: BookingRow) {
    try {
      const r = await fetch(`${apiBase.replace(/\/$/, '')}/api/admin/bookings/${b.id}/checkin`, { 
        method: 'POST',
        headers: { "x-role": "ADMIN" }
      });
      if (!r.ok) throw new Error('checkin failed');
      const j = await r.json();
      setItems(cur => cur.map(x => x.id === b.id ? (j.booking as BookingRow) : x));
      alert('Marked checked-in');
    } catch (e) { alert('Check-in failed'); }
  }

  async function markCheckout(b: BookingRow) {
    try {
      const r = await fetch(`${apiBase.replace(/\/$/, '')}/api/admin/bookings/${b.id}/checkout`, { 
        method: 'POST',
        headers: { "x-role": "ADMIN" }
      });
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
      const r = await fetch(`${apiBase.replace(/\/$/, '')}/api/admin/bookings/${b.id}/cancel`, { 
        method: 'POST', 
        headers: { 
          'Content-Type': 'application/json',
          "x-role": "ADMIN"
        }, 
        body: JSON.stringify({ reason }) 
      });
      if (!r.ok) throw new Error('cancel failed');
      const j = await r.json();
      setItems(cur => cur.map(x => x.id === b.id ? (j.booking as BookingRow) : x));
      alert('Canceled');
    } catch (e) { alert('Cancel failed'); }
  }

  function getStatusBadgeClass(status: string) {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('confirmed') || statusLower.includes('active')) {
      return "inline-flex items-center px-2 py-1 rounded-md bg-green-50 text-green-700 text-xs font-medium";
    }
    if (statusLower.includes('pending') || statusLower.includes('new')) {
      return "inline-flex items-center px-2 py-1 rounded-md bg-yellow-50 text-yellow-700 text-xs font-medium";
    }
    if (statusLower.includes('cancel') || statusLower.includes('reject')) {
      return "inline-flex items-center px-2 py-1 rounded-md bg-red-50 text-red-700 text-xs font-medium";
    }
    if (statusLower.includes('check') || statusLower.includes('complete')) {
      return "inline-flex items-center px-2 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-medium";
    }
    return "inline-flex items-center px-2 py-1 rounded-md bg-gray-50 text-gray-700 text-xs font-medium";
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="flex flex-col items-center text-center mb-4">
          <Calendar className="h-8 w-8 text-gray-400 mb-3" />
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900">
            Bookings
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Showing admin booking records
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Property</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Guest</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check-in</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check-out</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <TableRow hover={false}>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">
                    Loading…
                  </td>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow hover={false}>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">
                    No bookings
                  </td>
                </TableRow>
              ) : (
                items.map(b => (
                  <TableRow key={b.id}>
                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                      {b.id}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {b.property?.title ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {b.guestName ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                      {new Date(b.checkIn).toLocaleDateString()}
                      <br />
                      <span className="text-xs text-gray-500">
                        {new Date(b.checkIn).toLocaleTimeString()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                      {new Date(b.checkOut).toLocaleDateString()}
                      <br />
                      <span className="text-xs text-gray-500">
                        {new Date(b.checkOut).toLocaleTimeString()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={getStatusBadgeClass(b.status)}>
                        {b.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex gap-2 justify-center flex-wrap">
                        <button 
                          className="px-3 py-1 text-xs font-medium text-[#02665e] border border-[#02665e] rounded hover:bg-[#02665e] hover:text-white transition-all duration-200 active:bg-[#02665e] active:text-white touch-manipulation"
                          onClick={() => confirm(b)}
                        >
                          Confirm
                        </button>
                        <button 
                          className="px-3 py-1 text-xs font-medium text-gray-700 border border-gray-300 rounded hover:border-blue-500 hover:text-blue-600 transition-all duration-200 active:border-blue-500 active:text-blue-600 touch-manipulation"
                          onClick={() => markCheckin(b)}
                        >
                          Check-in
                        </button>
                        <button 
                          className="px-3 py-1 text-xs font-medium text-gray-700 border border-gray-300 rounded hover:border-green-500 hover:text-green-600 transition-all duration-200 active:border-green-500 active:text-green-600 touch-manipulation"
                          onClick={() => markCheckout(b)}
                        >
                          Check-out
                        </button>
                        <button 
                          className="px-3 py-1 text-xs font-medium text-red-600 border border-red-300 rounded hover:border-red-500 hover:bg-red-50 transition-all duration-200 active:border-red-500 active:bg-red-50 touch-manipulation"
                          onClick={() => cancel(b)}
                        >
                          Cancel
                        </button>
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
            disabled={items.length < 25 || loading || (page * 25 >= total)}
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
    </div>
  );
}
