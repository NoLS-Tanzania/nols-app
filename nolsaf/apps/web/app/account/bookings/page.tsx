"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import {
  Calendar, Download, CheckCircle, XCircle, Eye,
  ArrowRight, BookOpen, MapPin, Clock, CreditCard,
  Hash, BedDouble, DoorOpen,
} from "lucide-react";
import Link from "next/link";

const api = axios.create({ baseURL: "", withCredentials: true });

type Booking = {
  id: number;
  property: {
    id: number;
    title: string;
    type: string;
    regionName?: string;
    district?: string;
    city?: string;
  };
  checkIn: string;
  checkOut: string;
  status: string;
  totalAmount: number;
  roomType?: string;
  rooms?: number;
  services?: any;
  isValid: boolean;
  isPaid: boolean;
  bookingCode: string | null;
  codeStatus: string | null;
  invoice?: {
    invoiceNumber?: string;
    receiptNumber?: string;
    status?: string;
  };
  createdAt: string;
};

function canRequestCancellation(b: Booking): boolean {
  if (!b.bookingCode) return false;
  if (b.status === "CANCELED") return false;
  if (b.codeStatus !== "ACTIVE") return false;
  const now = new Date();
  const checkIn = new Date(b.checkIn);
  return now < checkIn;
}

function BookingCardSkeleton() {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-white border border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.05)]">
      <div className="absolute left-0 inset-y-0 w-[3px] rounded-l-3xl bg-slate-200 animate-pulse" />
      <div className="pl-6 pr-5 pt-5 pb-5 sm:pl-7 sm:pr-6 sm:pt-6 sm:pb-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5 flex-1">
            <div className="w-11 h-11 rounded-2xl bg-slate-200 animate-pulse flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-52 bg-slate-200 rounded animate-pulse" />
              <div className="h-3 w-36 bg-slate-200 rounded animate-pulse" />
            </div>
          </div>
          <div className="h-6 w-20 bg-slate-200 rounded-full animate-pulse" />
        </div>
        <div className="flex flex-wrap gap-2">
          {[1,2,3,4].map(i => <div key={i} className="h-7 w-28 bg-slate-100 rounded-xl animate-pulse" />)}
        </div>
        <div className="flex gap-2 justify-end">
          <div className="h-9 w-24 bg-slate-100 rounded-xl animate-pulse" />
          <div className="h-9 w-9 bg-slate-100 rounded-xl animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "active" | "expired">("all");
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    loadBookings();
  }, []);

  // Gentle mount animation (clean + modern)
  useEffect(() => {
    const t = window.requestAnimationFrame(() => setEntered(true));
    return () => window.cancelAnimationFrame(t);
  }, []);

  const loadBookings = async () => {
    try {
      setLoading(true);
      const response = await api.get("/api/customer/bookings");
      // Strict principle:
      // Only treat PAID + VALID as "bookings" in this list.
      const items: Booking[] = response.data.items || [];
      const onlyPaidValid = items.filter((b) => Boolean(b?.isValid) && Boolean(b?.isPaid));
      setBookings(onlyPaidValid);
    } catch (err: any) {
      // Keep UI clean: show a small toast instead of a big banner.
      const msg = err?.response?.data?.error || "Failed to load bookings";
      try {
        window.dispatchEvent(
          new CustomEvent("nols:toast", {
            detail: { type: "error", title: "Bookings", message: msg, duration: 4500 },
          })
        );
      } catch {}
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = async (bookingId: number) => {
    const toast = (type: "error" | "success", message: string) => {
      try {
        window.dispatchEvent(new CustomEvent("nols:toast", {
          detail: { type, title: "Booking PDF", message, duration: 5000 },
        }));
      } catch {}
    };

    try {
      const response = await fetch(`/api/customer/bookings/${bookingId}/pdf`, {
        credentials: "include",
      });

      if (!response.ok) {
        let errMsg = "Failed to generate PDF";
        try { errMsg = (await response.json()).error || errMsg; } catch {}
        toast("error", errMsg);
        return;
      }

      // True binary PDF download — no print dialog needed
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      // Try to get filename from Content-Disposition header
      const disposition = response.headers.get("content-disposition") || "";
      const match = disposition.match(/filename="?([^";\n]+)"?/i);
      anchor.download = match?.[1] ?? `Booking-${bookingId}.pdf`;
      anchor.href = url;
      anchor.style.display = "none";
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (err: any) {
      try {
        window.dispatchEvent(new CustomEvent("nols:toast", {
          detail: { type: "error", title: "Booking PDF", message: "Failed to download PDF: " + (err?.message || "Unknown error"), duration: 5000 },
        }));
      } catch {}
    }
  };

  // Expired means: checkout date has passed (after a completed stay).
  const isExpired = (b: Booking) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const co = new Date(b.checkOut);
      co.setHours(0, 0, 0, 0);
      return co.getTime() < today.getTime();
    } catch {
      return false;
    }
  };
  const isActive = (b: Booking) => !isExpired(b);

  const filteredBookings = bookings.filter((booking) => {
    if (filter === "active") return isActive(booking);
    if (filter === "expired") return isExpired(booking);
    return true;
  });

  const activeCount = bookings.filter(isActive).length;
  const expiredCount = bookings.filter(isExpired).length;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatAmount = (amount: number) => {
    return Number(amount).toLocaleString("en-US");
  };

  const nights = (checkIn: string, checkOut: string) => {
    const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
    return Math.round(diff / 86400000);
  };

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <div className="relative overflow-hidden rounded-2xl h-36" style={{ background: "linear-gradient(135deg,#0e2a7a 0%,#0a5c82 42%,#02665e 100%)" }}>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-white/15 animate-pulse" />
            <div className="h-5 w-36 bg-white/15 rounded animate-pulse" />
            <div className="h-3 w-52 bg-white/10 rounded animate-pulse" />
          </div>
        </div>
        <div className="flex justify-center gap-2">
          {[1,2,3].map(i => <div key={i} className="h-9 w-24 rounded-xl bg-slate-100 animate-pulse" />)}
        </div>
        <div className="space-y-4">
          <BookingCardSkeleton />
          <BookingCardSkeleton />
          <BookingCardSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className={["mx-auto w-full max-w-5xl space-y-6 transition-all duration-300 ease-out", entered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"].join(" ")}>

      {/* ── Premium Header ── */}
      <div className="relative overflow-hidden rounded-2xl shadow-lg" style={{ background: "linear-gradient(135deg,#0e2a7a 0%,#0a5c82 42%,#02665e 100%)" }}>
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 900 120" fill="none" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <circle cx="820" cy="10" r="120" stroke="white" strokeOpacity="0.06" strokeWidth="1" fill="none"/>
          <polyline points="0,90 160,72 320,80 480,52 640,62 800,36 900,48" stroke="white" strokeOpacity="0.10" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
          <polygon points="0,90 160,72 320,80 480,52 640,62 800,36 900,48 900,120 0,120" fill="white" fillOpacity="0.03"/>
        </svg>
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent"/>
        <div className="relative flex flex-col items-center text-center px-8 py-8">
          <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center mb-4 shadow-lg">
            <BookOpen className="h-7 w-7 text-white" />
          </div>
          <div className="flex items-center gap-3 flex-wrap justify-center">
            <h1 className="text-2xl font-black text-white tracking-tight">My Bookings</h1>
            {bookings.length > 0 && (
              <span className="inline-flex items-center gap-1.5 bg-white/15 border border-white/25 text-white text-[10px] font-bold uppercase tracking-widest rounded-full px-3 py-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"/>
                {bookings.length} {bookings.length === 1 ? "booking" : "bookings"}
              </span>
            )}
          </div>
          <p className="text-teal-300/80 text-sm mt-1 font-medium">View and manage all your confirmed stays</p>
        </div>
      </div>

      {/* ── Filter tabs + Cancellation link ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
          {([
            { key: "all" as const, label: "All", count: bookings.length },
            { key: "active" as const, label: "Valid", count: activeCount },
            { key: "expired" as const, label: "Expired", count: expiredCount },
          ]).map((t) => {
            const active = filter === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setFilter(t.key)}
                className={["inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold whitespace-nowrap transition-all duration-200 active:scale-[0.97]", active ? "shadow-sm text-white" : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"].join(" ")}
                style={active ? { background: "linear-gradient(135deg,#0e2a7a,#02665e)" } : {}}
              >
                <span>{t.label}</span>
                <span className={["inline-flex min-w-[20px] items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-black", active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"].join(" ")}>{t.count}</span>
              </button>
            );
          })}
        </div>
        <Link
          href="/account/cancellations"
          className="no-underline inline-flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-2 text-[12px] font-bold text-red-600 hover:bg-red-100 hover:border-red-200 transition-colors"
        >
          <XCircle className="h-3.5 w-3.5" />
          Manage Cancellations
        </Link>
      </div>

      {/* ── Empty state ── */}
      {filteredBookings.length === 0 ? (
        <div className="rounded-3xl border border-slate-100 bg-white p-12 text-center shadow-sm">
          <div className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: "linear-gradient(135deg,#0e2a7a,#02665e)" }}>
            <BookOpen className="h-8 w-8 text-white" />
          </div>
          <div className="text-lg font-black text-slate-900">No bookings found</div>
          <div className="mt-1.5 text-sm text-slate-500 max-w-xs mx-auto">
            {filter === "active" ? "You have no active bookings right now." : filter === "expired" ? "No expired bookings yet." : "When you book a stay, it will appear here."}
          </div>
          {filter === "all" && (
            <div className="mt-6 flex justify-center">
              <Link href="/public/properties" className="group no-underline inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-white shadow-sm hover:shadow-md active:scale-[0.99] transition-all" style={{ background: "linear-gradient(135deg,#0e2a7a,#02665e)" }}>
                Browse Properties
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBookings.map((booking) => {
            const active = isActive(booking);
            const nightCount = nights(booking.checkIn, booking.checkOut);
            const location = [booking.property.regionName, booking.property.city, booking.property.district].filter(Boolean).join(" · ");
            return (
              <div
                key={booking.id}
                className="relative overflow-hidden rounded-3xl bg-white border border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.05)] transition-all duration-300 hover:shadow-[0_8px_32px_rgba(2,102,94,0.10)] hover:-translate-y-0.5"
              >
                {/* Left accent bar */}
                <div className="absolute left-0 inset-y-0 w-[3px] rounded-l-3xl" style={{ background: active ? "linear-gradient(180deg,#0e2a7a 0%,#02665e 100%)" : "linear-gradient(180deg,#cbd5e1,#94a3b8)" }} />
                <div className="pointer-events-none absolute -right-16 -top-12 h-40 w-40 rounded-full blur-3xl" style={{ background: active ? "rgba(2,102,94,0.05)" : "rgba(148,163,184,0.06)" }} />

                <div className="pl-6 pr-5 pt-5 pb-5 sm:pl-7 sm:pr-6 sm:pt-6 sm:pb-6">
                  {/* ── Top row ── */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3.5 min-w-0">
                      <div className="mt-0.5 flex-shrink-0 w-11 h-11 rounded-2xl shadow-md flex items-center justify-center" style={{ background: active ? "linear-gradient(135deg,#0e2a7a 0%,#02665e 100%)" : "linear-gradient(135deg,#94a3b8,#64748b)" }}>
                        <BookOpen className="h-5 w-5 text-white" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-[16px] sm:text-[17px] font-extrabold text-slate-900 tracking-tight leading-tight line-clamp-1">{booking.property.title}</h3>
                        {location && (
                          <div className="mt-[3px] flex items-center gap-1.5 text-[12px] text-slate-500 font-medium">
                            <MapPin className="h-3 w-3 flex-shrink-0 text-teal-500" />
                            <span className="line-clamp-1">{location}</span>
                          </div>
                        )}
                        {booking.bookingCode && (
                          <div className="mt-[3px] flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
                            <Hash className="h-2.5 w-2.5 flex-shrink-0" />
                            {booking.bookingCode}
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Status pill */}
                    <div className={["flex-shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold shadow-sm", active ? "bg-teal-50 border-teal-100 text-teal-700" : "bg-slate-50 border-slate-200 text-slate-500"].join(" ")}>
                      <span className={["h-1.5 w-1.5 rounded-full", active ? "bg-teal-500" : "bg-slate-400"].join(" ")} />
                      {active ? <CheckCircle className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                      {active ? "Active" : "Expired"}
                    </div>
                  </div>

                  {/* ── Info chips ── */}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-xl bg-teal-50 border border-teal-100 px-3 py-1.5 text-[11px] font-semibold text-teal-800">
                      <Calendar className="h-3 w-3 text-teal-500 flex-shrink-0" />
                      {formatDate(booking.checkIn)} → {formatDate(booking.checkOut)}
                    </span>
                    {nightCount > 0 && (
                      <span className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-50 border border-indigo-100 px-3 py-1.5 text-[11px] font-semibold text-indigo-800">
                        <Clock className="h-3 w-3 text-indigo-400 flex-shrink-0" />
                        {nightCount} {nightCount === 1 ? "night" : "nights"}
                      </span>
                    )}
                    {booking.roomType && (
                      <span className="inline-flex items-center gap-1.5 rounded-xl bg-violet-50 border border-violet-100 px-3 py-1.5 text-[11px] font-semibold text-violet-800">
                        <BedDouble className="h-3 w-3 text-violet-400 flex-shrink-0" />
                        {booking.roomType}
                      </span>
                    )}
                    {booking.rooms && (
                      <span className="inline-flex items-center gap-1.5 rounded-xl bg-sky-50 border border-sky-100 px-3 py-1.5 text-[11px] font-semibold text-sky-800">
                        <DoorOpen className="h-3 w-3 text-sky-400 flex-shrink-0" />
                        {booking.rooms} {booking.rooms === 1 ? "room" : "rooms"}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1.5 rounded-xl bg-amber-50 border border-amber-100 px-3 py-1.5 text-[11px] font-semibold text-amber-800">
                      <CreditCard className="h-3 w-3 text-amber-500 flex-shrink-0" />
                      {formatAmount(booking.totalAmount)} TZS
                    </span>
                    {booking.invoice?.receiptNumber && (
                      <span className="inline-flex items-center gap-1.5 rounded-xl bg-slate-50 border border-slate-200 px-3 py-1.5 text-[11px] font-semibold text-slate-600">
                        <Hash className="h-3 w-3 text-slate-400 flex-shrink-0" />
                        Receipt: {booking.invoice.receiptNumber}
                      </span>
                    )}
                  </div>

                  {/* ── Actions ── */}
                  <div className="mt-4 flex items-center justify-end gap-2 flex-wrap">
                    {canRequestCancellation(booking) && (
                      <Link
                        href={`/account/cancellations?code=${encodeURIComponent(booking.bookingCode!)}`}
                        className="no-underline inline-flex items-center gap-1.5 rounded-xl border border-red-100 bg-red-50 hover:bg-red-100 px-3 py-1.5 text-[11px] font-bold text-red-600 transition-colors"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Cancel
                      </Link>
                    )}
                    {booking.bookingCode && (
                      <button
                        type="button"
                        onClick={() => downloadPDF(booking.id)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 text-[11px] font-bold text-slate-600 transition-colors"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Receipt
                      </button>
                    )}
                    <Link
                      href={`/account/bookings/${booking.id}`}
                      className="no-underline inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-bold text-white shadow-sm transition-all hover:shadow-md hover:opacity-90"
                      style={{ background: "linear-gradient(135deg,#0a5c82,#02665e)" }}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      View Details
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
