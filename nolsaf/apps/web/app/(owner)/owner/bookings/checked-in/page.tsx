"use client";
import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { Calendar, Eye, Send, LogOut } from "lucide-react";

const api = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_URL });

export default function CheckedIn() {
  const [list, setList] = useState<any[]>([]);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [confirmingCheckout, setConfirmingCheckout] = useState<any | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  // Set auth header once on mount
  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (token) api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  }, []);

  // Load checked-in bookings
  useEffect(() => {
    api.get<any[]>("/owner/bookings/checked-in").then((r) => setList(r.data));
  }, []);

  const handleSendInvoice = async (b: any) => {
    setOpenMenuId(null);
    try {
      const resp = await api.post(`/owner/bookings/${b.id}/send-invoice`);
      if (resp?.data?.ok) {
        alert("Invoice created and sent to NoLSAF.");
        // optimistic update: mark booking as having an invoice (optional)
        setList((prev) => prev.map((p) => (p.id === b.id ? { ...p, hasInvoice: true } : p)));
      } else {
        alert("Invoice request completed. Admin will be notified.");
      }
    } catch (err: any) {
      console.warn('send-invoice failed', err);
      alert("Unable to send invoice automatically. Please try again or contact support.");
    }
  };

  const handleRequestCheckout = (b: any) => {
    // open confirm modal
    setConfirmingCheckout(b);
    setOpenMenuId(null);
  };

  const confirmCheckout = async (b: any) => {
    try {
      const resp = await api.post(`/owner/bookings/${b.id}/confirm-checkout`);
      if (resp?.data?.ok) {
        alert("Check-out confirmed. Thank you — the booking has been checked out.");
        setList((prev) => prev.map((p) => (p.id === b.id ? { ...p, status: resp.data.status } : p)));
      } else {
        alert("Could not confirm check-out. Please contact support.");
      }
    } catch (err: any) {
      console.warn('confirm-checkout failed', err);
      alert("Unable to confirm check-out. Please try again or contact support.");
    } finally {
      setConfirmingCheckout(null);
    }
  };

  // close menu when clicking outside the wrapper
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapperRef.current) return;
      const target = e.target as Node;
      if (!wrapperRef.current.contains(target)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  return (
    <>
    <div ref={wrapperRef} className="min-h-[60vh] flex items-start justify-center px-4 py-6">
      <div className="w-full max-w-2xl">
        <div className="flex justify-center">
          <span
            title="Checked-In"
            role="img"
            aria-label="Checked-In bookings"
            className="inline-flex items-center justify-center rounded-md p-2 hover:bg-white/10 transition-colors"
          >
            <Calendar className="h-8 w-8 text-blue-600" aria-hidden="true" />
          </span>
        </div>

  <h1 className="text-2xl font-semibold text-center mt-3">Checked-In</h1>
  {/* Screen-reader only summary of count for accessibility */}
  <div className="sr-only" aria-live="polite">{`${list.length} guests currently checked-in.`}</div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm border-collapse table-auto">
            <thead>
              <tr className="text-left">
                <th className="px-3 py-2 border-b">Booking Code</th>
                <th className="px-3 py-2 border-b">Full Name</th>
                <th className="px-3 py-2 border-b">Phone No</th>
                <th className="px-3 py-2 border-b">Room Type</th>
                <th className="px-3 py-2 border-b">Amount Paid</th>
                <th className="px-3 py-2 border-b">Status</th>
                <th className="px-3 py-2 border-b">Action</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr>
                  <td className="px-3 py-6 border-b text-center" colSpan={7}>
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Calendar className="h-12 w-12 text-slate-400" aria-hidden="true" />
                      <div className="text-sm opacity-70">No guests currently checked-in.</div>
                    </div>
                  </td>
                </tr>
              ) : (
                list.map((b) => {
                  const bookingCode = b?.code?.codeVisible ?? b.codeVisible ?? b.roomCode ?? b.id;
                  const fullName = b?.guestName ?? b?.customerName ?? '-';
                  const phone = b?.guestPhone ?? b?.phone ?? '-';
                  const roomType = b?.roomType ?? '-';
                  const amount = b?.totalAmount != null ? `TZS ${b.totalAmount}` : '-';
                  return (
                    <tr key={b.id} className="align-top">
                      <td className="px-3 py-2 border-b">{bookingCode}</td>
                      <td className="px-3 py-2 border-b">{fullName}</td>
                      <td className="px-3 py-2 border-b">{phone}</td>
                      <td className="px-3 py-2 border-b">{roomType}</td>
                      <td className="px-3 py-2 border-b">{amount}</td>
                      <td className="px-3 py-2 border-b">
                        <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-700 border border-green-300">{b.status}</span>
                      </td>
                      <td className="px-3 py-2 border-b">
                        <div className="relative inline-block">
                          <button
                            aria-label="Actions"
                            title="Actions"
                            onClick={() => setOpenMenuId(openMenuId === b.id ? null : b.id)}
                            className="p-2 rounded-md hover:bg-gray-100"
                          >
                            <Eye className="h-5 w-5" />
                          </button>

                          {openMenuId === b.id && (
                            <div className="absolute right-0 mt-2 w-48 bg-white border rounded shadow-md z-10">
                              <button className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-2" onClick={() => handleSendInvoice(b)}>
                                <Send className="h-4 w-4" />
                                <span>Send Invoice</span>
                              </button>
                              <button className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-2" onClick={() => handleRequestCheckout(b)}>
                                <LogOut className="h-4 w-4" />
                                <span>Confirm Check-out</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>

      {/* Confirm Checkout Modal (simple) */}
      {confirmingCheckout && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded shadow-lg w-full max-w-md p-6">
            <h3 className="text-lg font-semibold">Confirm Check-out</h3>
            <p className="mt-3 text-sm">Are you sure you want to confirm check-out for <strong>{confirmingCheckout.guestName ?? confirmingCheckout.customerName ?? 'this guest'}</strong>? This will complete the check-out process.</p>
            <div className="mt-4 flex justify-end gap-2">
              <button className="px-3 py-2 rounded border" onClick={() => setConfirmingCheckout(null)}>Cancel</button>
              <button className="px-3 py-2 rounded bg-blue-600 text-white" onClick={() => confirmCheckout(confirmingCheckout)}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Note: previous Cell helper removed — table view is used for Checked-In list
