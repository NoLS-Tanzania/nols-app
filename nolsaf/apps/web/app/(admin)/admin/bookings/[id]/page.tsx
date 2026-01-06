"use client";
import React, { useEffect, useState } from "react";
import axios from "axios";
import Link from "next/link";
import { ArrowLeft, Home, User, Calendar, DollarSign, Key, X, AlertCircle, CheckCircle } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";

// Use same-origin calls + secure httpOnly cookie session.
const api = axios.create({ baseURL: "", withCredentials: true });

function InfoRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div>
      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{label}</div>
      <div className="font-semibold text-sm text-gray-900">{value || "—"}</div>
    </div>
  );
}

// Confirmation Modal Component
function ConfirmModal({ 
  open, 
  title, 
  message, 
  confirmLabel, 
  onConfirm, 
  onCancel 
}: { 
  open: boolean; 
  title: string; 
  message?: string;
  confirmLabel?: string;
  onConfirm: () => void; 
  onCancel: () => void; 
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="presentation">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div role="dialog" aria-modal="true" aria-label={title} className="bg-white rounded-lg p-5 z-10 w-full max-w-md shadow-lg">
        <div className="font-semibold text-lg mb-2">{title}</div>
        {message && <div className="text-sm text-gray-600 mb-4">{message}</div>}
        <div className="flex justify-end gap-3">
          <button 
            onClick={onCancel} 
            className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium transition-colors"
          >
            Cancel
          </button>
          <button 
            autoFocus 
            onClick={onConfirm} 
            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium transition-colors"
          >
            {confirmLabel || "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Cancel Reason Modal Component
function CancelReasonModal({ 
  open, 
  onConfirm, 
  onCancel 
}: { 
  open: boolean; 
  onConfirm: (reason: string) => void; 
  onCancel: () => void; 
}) {
  const [reason, setReason] = useState("");

  if (!open) return null;
  
  const handleConfirm = () => {
    if (!reason.trim()) return;
    onConfirm(reason.trim());
    setReason("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="presentation">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div role="dialog" aria-modal="true" aria-label="Cancel Booking" className="bg-white rounded-lg p-5 z-10 w-full max-w-md shadow-lg">
        <div className="font-semibold text-lg mb-2">Cancel Booking</div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Cancel Reason</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Enter reason for cancellation..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
            rows={4}
            autoFocus
          />
        </div>
        <div className="flex justify-end gap-3">
          <button 
            onClick={onCancel} 
            className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleConfirm}
            disabled={!reason.trim()}
            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Confirm Cancellation
          </button>
        </div>
      </div>
    </div>
  );
}

// Message Banner Component
function MessageBanner({ type, message, onClose }: { type: "success" | "error"; message: string; onClose: () => void }) {
  if (!message) return null;
  const isSuccess = type === "success";
  return (
    <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg max-w-md ${
      isSuccess ? "bg-emerald-50 border border-emerald-200" : "bg-red-50 border border-red-200"
    }`}>
      {isSuccess ? (
        <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0" />
      ) : (
        <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
      )}
      <div className={`flex-1 text-sm font-medium ${isSuccess ? "text-emerald-800" : "text-red-800"}`}>
        {message}
      </div>
      <button
        onClick={onClose}
        className={`p-1 rounded hover:bg-opacity-20 ${isSuccess ? "hover:bg-emerald-600" : "hover:bg-red-600"} transition-colors`}
        aria-label="Close"
      >
        <X className={`h-4 w-4 ${isSuccess ? "text-emerald-600" : "text-red-600"}`} />
      </button>
    </div>
  );
}

export default function AdminBookingDetail({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  const [b, setB] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [roomCode, setRoomCode] = useState("");
  
  // Modal and message states
  const [showVoidConfirm, setShowVoidConfirm] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const load = React.useCallback(async () => {
    try {
      const r = await api.get<any>(`/api/admin/bookings/${id}`);
      setB(r.data);
      setRoomCode(r.data.roomCode ?? "");
    } catch (err: any) {
      console.error("Failed to load booking:", err);
      if (err?.response?.status === 404) {
        setMessage({ type: "error", text: "Booking not found" });
      } else {
        setMessage({ type: "error", text: "Failed to load booking details" });
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // Auto-hide message after 5 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  async function confirmBooking() {
    setBusy(true);
    try {
      await api.post(`/api/admin/bookings/${id}/confirm`, { generateCode: true });
      await load();
      setMessage({ type: "success", text: "Booking confirmed and code generated successfully" });
    } catch (err: any) {
      setMessage({ type: "error", text: err?.response?.data?.error || "Failed to confirm booking" });
    }
    setBusy(false);
  }

  async function handleCancel(reason: string) {
    setShowCancelModal(false);
    setBusy(true);
    try {
      await api.post(`/api/admin/bookings/${id}/cancel`, { reason });
      await load();
      setMessage({ type: "success", text: "Booking cancelled successfully" });
    } catch (err: any) {
      setMessage({ type: "error", text: err?.response?.data?.error || "Failed to cancel booking" });
    }
    setBusy(false);
  }

  async function reassign() {
    if (!roomCode.trim()) {
      setMessage({ type: "error", text: "Please enter a room code" });
      return;
    }
    setBusy(true);
    try {
      await api.post(`/api/admin/bookings/${id}/reassign-room`, { roomCode });
      await load();
      setMessage({ type: "success", text: "Room reassigned successfully" });
    } catch (e: any) {
      setMessage({ type: "error", text: e?.response?.data?.error ?? "Failed to reassign room" });
    }
    setBusy(false);
  }

  async function handleVoidCode() {
    setShowVoidConfirm(false);
    if (!b?.code?.id) return;
    setBusy(true);
    try {
      await api.post(`/api/admin/bookings/codes/${b.code.id}/void`, { reason: "Voided from admin detail" });
      await load();
      setMessage({ type: "success", text: "Check-in code voided successfully" });
    } catch (err: any) {
      setMessage({ type: "error", text: err?.response?.data?.error || "Failed to void code" });
    }
    setBusy(false);
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-emerald-600"></div>
        </div>
      </div>
    );
  }

  if (!b) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">Booking not found</p>
          <Link
            href="/admin/bookings"
            className="text-emerald-600 hover:text-emerald-700 underline"
          >
            ← Back to bookings list
          </Link>
        </div>
      </div>
    );
  }

  const checkInDate = new Date(b.checkIn);
  const checkOutDate = new Date(b.checkOut);
  const nights = Math.max(0, Math.round((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)));

  return (
    <>
      <MessageBanner 
        type={message?.type || "error"} 
        message={message?.text || ""} 
        onClose={() => setMessage(null)} 
      />
      
      <ConfirmModal
        open={showVoidConfirm}
        title="Void Check-in Code"
        message="Are you sure you want to void this active check-in code? This action cannot be undone."
        confirmLabel="Void Code"
        onConfirm={handleVoidCode}
        onCancel={() => setShowVoidConfirm(false)}
      />

      <CancelReasonModal
        open={showCancelModal}
        onConfirm={handleCancel}
        onCancel={() => setShowCancelModal(false)}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link
                href="/admin/bookings"
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Back to bookings list"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Booking #{b.id}</h1>
                <div className="flex flex-wrap items-center gap-3 mt-2">
                  <StatusBadge s={b.status} />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {b.status === "NEW" && (
                <button
                  disabled={busy}
                  onClick={confirmBooking}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {busy ? "Processing..." : "Confirm & Generate Code"}
                </button>
              )}
              {b.status !== "CANCELED" && (
                <button
                  disabled={busy}
                  onClick={() => setShowCancelModal(true)}
                  className="px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Booking Dates & Details */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                  <Calendar className="h-5 w-5 text-purple-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Booking Dates & Details</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Check-in</div>
                      <div className="font-semibold text-sm text-gray-900">
                        {checkInDate.toLocaleDateString()}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {checkInDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Check-out</div>
                      <div className="font-semibold text-sm text-gray-900">
                        {checkOutDate.toLocaleDateString()}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {checkOutDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <div className="col-span-2">
                      <InfoRow label="Duration" value={`${nights} ${nights === 1 ? 'night' : 'nights'}`} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Property Details */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-[#02665e]/10 flex items-center justify-center flex-shrink-0">
                  <Home className="h-5 w-5 text-[#02665e]" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Property Details</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <InfoRow label="Property Name" value={b.property?.title} />
                    <InfoRow label="Property Type" value={b.property?.type} />
                    <InfoRow label="Country" value={b.property?.country} />
                    <InfoRow label="Region" value={b.property?.regionName} />
                    <InfoRow label="City" value={b.property?.city} />
                    <InfoRow label="District" value={b.property?.district} />
                    <InfoRow label="Ward" value={b.property?.ward} />
                  </div>
                </div>
              </div>
            </div>

            {/* Guest Information */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <User className="h-5 w-5 text-blue-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Guest Information</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <InfoRow label="Full Name" value={b.guestName || b.user?.name} />
                    <InfoRow label="Email" value={b.user?.email} />
                    <InfoRow label="Phone" value={b.user?.phone} />
                  </div>
                </div>
              </div>
            </div>

            {/* Room Assignment */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-[#02665e]/10 flex items-center justify-center flex-shrink-0">
                  <Home className="h-5 w-5 text-[#02665e]" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Room Assignment</h2>
                  <div className="flex items-center gap-3">
                    <input
                      className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      value={roomCode}
                      onChange={(e) => setRoomCode(e.target.value)}
                      placeholder="e.g., A-101"
                      disabled={busy}
                    />
                    <button
                      disabled={busy}
                      onClick={reassign}
                      className="px-4 py-2 bg-[#02665e] text-white rounded-lg hover:bg-[#013a37] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                    >
                      {busy ? "Updating..." : "Reassign"}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Financials */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                  <DollarSign className="h-5 w-5 text-amber-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Financials</h2>
                  <div className="text-2xl font-bold text-gray-900">
                    {new Intl.NumberFormat('en-US').format(Number(b.totalAmount || 0))} TZS
                  </div>
                  {b.notes && (
                    <div className="text-sm text-gray-600 mt-3 p-3 bg-gray-50 rounded-lg">
                      {b.notes}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Check-in Code */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                  <Key className="h-5 w-5 text-emerald-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Check-in Code</h2>
                  {b.code?.codeVisible ? (
                    <div className="space-y-4">
                      <div className="col-span-2">
                        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Code</div>
                        <div className="font-mono font-semibold text-lg text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">
                          {b.code.codeVisible}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <InfoRow label="Status" value={b.code.status} />
                        {b.code.generatedAt && (
                          <InfoRow
                            label="Generated At"
                            value={new Date(b.code.generatedAt).toLocaleString()}
                          />
                        )}
                        {b.code.usedAt && (
                          <InfoRow
                            label="Used At"
                            value={new Date(b.code.usedAt).toLocaleString()}
                          />
                        )}
                      </div>
                      {b.code.status === "ACTIVE" && (
                        <button
                          disabled={busy}
                          onClick={() => setShowVoidConfirm(true)}
                          className="w-full px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                        >
                          Void Code
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500">No active code yet. Confirm booking to generate.</div>
                  )}
                </div>
              </div>
            </div>

            {/* Owner Information */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                  <User className="h-5 w-5 text-indigo-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Owner</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <InfoRow label="Name" value={b.property?.owner?.name} />
                    <InfoRow label="Email" value={b.property?.owner?.email} />
                    {b.property?.owner?.phone && (
                      <InfoRow label="Phone" value={b.property?.owner?.phone} />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
