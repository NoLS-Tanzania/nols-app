"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import { Calendar, Download, CheckCircle, XCircle, Eye, ArrowRight, BookOpen } from "lucide-react";
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

function SkeletonLine({ w = "w-full" }: { w?: string }) {
  return <div className={`h-3 ${w} rounded-full bg-slate-200/80 animate-pulse`} />;
}

function BookingCardSkeleton({ variant }: { variant: "active" | "expired" }) {
  const isActive = variant === "active";
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="min-w-[220px] flex-1">
              <SkeletonLine w="w-64" />
              <div className="mt-2">
                <SkeletonLine w="w-40" />
              </div>
            </div>
            <span
              className={[
                "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold",
                isActive ? "bg-[#02665e]/10 text-[#02665e]" : "bg-slate-100 text-slate-700",
              ].join(" ")}
            >
              {isActive ? <CheckCircle className="h-4 w-4" /> : <Calendar className="h-4 w-4 text-red-600" />}
              {isActive ? "Active" : "Expired"}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl bg-slate-50/70 border border-slate-200 p-3">
                <SkeletonLine w="w-20" />
                <div className="mt-2">
                  <SkeletonLine w="w-28" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row lg:flex-col lg:min-w-[220px]">
          <div className="group relative inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white p-2.5 text-slate-700 hover:bg-slate-50 hover:shadow-md hover:border-slate-400 transition-all duration-300 ease-in-out cursor-pointer">
            <Download className="h-4 w-4 transition-all duration-300 ease-in-out transform scale-100 translate-y-0 rotate-0 group-hover:scale-125 group-hover:-translate-y-1 group-hover:rotate-3" />
          </div>
          <div className="group relative inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white p-2.5 text-slate-700 hover:bg-slate-50 hover:shadow-md hover:border-slate-400 transition-all duration-300 ease-in-out cursor-pointer">
            <Eye className="h-4 w-4 transition-all duration-300 ease-in-out transform scale-100 translate-y-0 rotate-0 group-hover:scale-125 group-hover:-translate-y-1 group-hover:rotate-3" />
          </div>
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
    try {
      const response = await fetch(`/api/customer/bookings/${bookingId}/pdf`, {
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || "Failed to generate PDF");
        return;
      }

      // Get HTML content
      const html = await response.text();
      
      // Create a new window and print
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.onload = () => {
          printWindow.print();
        };
      }
    } catch (err: any) {
      alert("Failed to download PDF: " + (err?.message || "Unknown error"));
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

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <div className="text-center">
          <div className="mx-auto max-w-md">
            <div className="h-8 w-56 mx-auto rounded-full bg-slate-200/80 animate-pulse" />
            <div className="mt-3 h-4 w-72 mx-auto rounded-full bg-slate-200/70 animate-pulse" />
          </div>
        </div>

        <div className="flex justify-center">
          <div className="inline-flex items-center gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-1 shadow-sm">
          {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-9 w-24 rounded-xl bg-white/80 animate-pulse" />
          ))}
          </div>
        </div>

        <div className="space-y-4">
          <BookingCardSkeleton variant="active" />
          <BookingCardSkeleton variant="expired" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={[
        "mx-auto w-full max-w-5xl space-y-6 transition-all duration-300 ease-out",
        entered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1",
      ].join(" ")}
    >
      {/* Header Card */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="flex flex-col items-center text-center">
          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-[#02665e]/10 to-[#014d47]/10 flex items-center justify-center mb-4">
            <BookOpen className="h-8 w-8 text-[#02665e]" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">My Bookings</h1>
          <p className="text-sm text-gray-500 mt-1">View and manage all your bookings</p>
        </div>
      </div>

      {/* Filter tabs and Cancellation Management */}
      <div className="flex flex-col items-center gap-4">
        <div className="inline-flex items-center justify-center gap-2 flex-wrap">
        {[
          { key: "all" as const, label: "All", count: bookings.length },
          { key: "active" as const, label: "Valid", count: activeCount },
          { key: "expired" as const, label: "Expired", count: expiredCount },
        ].map((t) => {
          const active = filter === t.key;
          return (
            <button
              key={t.key}
              type="button"
              aria-pressed={active}
              onClick={() => setFilter(t.key)}
              className={[
                  "inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold whitespace-nowrap transition-all duration-200",
                active
                    ? "border-[#02665e] bg-[#02665e] text-white" 
                    : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400",
                "active:scale-[0.98]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#02665e]/25 focus-visible:ring-offset-2",
              ].join(" ")}
            >
              <span>{t.label}</span>
              <span
                className={[
                    "inline-flex min-w-6 items-center justify-center rounded-full px-1.5 py-0.5 text-xs font-bold",
                    active 
                      ? "bg-white/20 text-white" 
                      : "bg-gray-100 text-gray-600",
                ].join(" ")}
              >
                {t.count}
              </span>
            </button>
          );
        })}
        </div>
        
        <Link
          href="/account/cancellations"
          className="no-underline inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50 hover:border-red-300 hover:shadow-sm active:scale-[0.98] transition-all duration-200"
        >
          <XCircle className="h-4 w-4 text-red-600" />
          Manage Cancellations
        </Link>
      </div>

      {/* Keep UI clean: no large error banner (auto-fetch runs on load). */}

      {filteredBookings.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#02665e]/10 transition-transform duration-200 hover:scale-[1.03]">
            <Download className="h-7 w-7 text-[#02665e]" />
          </div>
          <div className="mt-4 text-lg font-bold text-slate-900">No bookings found</div>
          <div className="mt-1 text-sm text-slate-600">
            When you book a stay, it will appear here for easy access.
          </div>
          <div className="mt-6 flex justify-center">
            <Link
              href="/public/properties"
              className="group no-underline inline-flex items-center justify-center gap-2 rounded-xl bg-[#02665e] px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#014d47] hover:shadow-md active:scale-[0.99] transition"
            >
              Browse properties
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBookings.map((booking) => (
            <div
              key={booking.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-[2px]"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-bold text-slate-900">{booking.property.title}</h3>
                    {isActive(booking) ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#02665e]/10 px-3 py-1 text-xs font-semibold text-[#02665e]">
                        <CheckCircle className="h-4 w-4" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                        <Calendar className="h-4 w-4 text-red-600" />
                        Expired
                      </span>
                    )}
                  </div>
                  {/* Crucial context: location line */}
                  <div className="mt-1 text-sm text-slate-600">
                    {[booking.property.regionName, booking.property.city, booking.property.district].filter(Boolean).join(" • ")}
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                    <div className="rounded-xl bg-slate-50/70 border border-slate-200 p-3">
                      <div className="text-xs font-medium text-slate-500">Check-in</div>
                      <div className="mt-0.5 font-semibold text-slate-900">{formatDate(booking.checkIn)}</div>
                    </div>
                    <div className="rounded-xl bg-slate-50/70 border border-slate-200 p-3">
                      <div className="text-xs font-medium text-slate-500">Check-out</div>
                      <div className="mt-0.5 font-semibold text-slate-900">{formatDate(booking.checkOut)}</div>
                    </div>

                    {booking.roomType && (
                      <div className="rounded-xl bg-slate-50/70 border border-slate-200 p-3">
                        <div className="text-xs font-medium text-slate-500">Room type</div>
                        <div className="mt-0.5 font-semibold text-slate-900">{booking.roomType}</div>
                      </div>
                    )}
                    {booking.rooms && (
                      <div className="rounded-xl bg-slate-50/70 border border-slate-200 p-3">
                        <div className="text-xs font-medium text-slate-500">Rooms</div>
                        <div className="mt-0.5 font-semibold text-slate-900">{booking.rooms}</div>
                      </div>
                    )}

                    <div className="rounded-xl bg-slate-50/70 border border-slate-200 p-3">
                      <div className="text-xs font-medium text-slate-500">Amount</div>
                      <div className="mt-0.5 font-semibold text-slate-900">{formatAmount(booking.totalAmount)} TZS</div>
                    </div>
                    {booking.bookingCode && (
                      <div className="rounded-xl bg-slate-50/70 border border-slate-200 p-3">
                        <div className="text-xs font-medium text-slate-500">Booking code</div>
                        <div className="mt-0.5 font-mono font-semibold text-[#02665e]">{booking.bookingCode}</div>
                      </div>
                    )}
                  </div>

                  {booking.invoice?.receiptNumber && (
                    <div className="mt-3 text-sm text-slate-600">
                      <span className="font-medium text-slate-700">Receipt:</span> {booking.invoice.receiptNumber}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2 sm:flex-row lg:flex-col lg:min-w-[220px]">
                  {booking.bookingCode && (
                    <button
                      type="button"
                      onClick={() => downloadPDF(booking.id)}
                      className="group relative inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white p-2.5 text-slate-700 hover:bg-slate-50 hover:shadow-md hover:border-slate-400 active:scale-[0.95] transition-all duration-300 ease-in-out hover:scale-105"
                    >
                      <Download className="h-4 w-4 transition-all duration-300 ease-in-out transform scale-100 translate-y-0 rotate-0 group-hover:scale-125 group-hover:-translate-y-1 group-hover:rotate-3 group-active:scale-100 group-active:translate-y-0 group-active:rotate-0" />
                      <span className="absolute left-full ml-2 px-2 py-1 text-xs font-semibold bg-gray-900 text-white rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-all duration-300 shadow-lg z-10 transform translate-x-0 group-hover:translate-x-1">
                        Download
                      </span>
                    </button>
                  )}
                  {canRequestCancellation(booking) && (
                    <Link
                      href={`/account/cancellations?code=${encodeURIComponent(booking.bookingCode!)}`}
                      className="no-underline inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50 hover:shadow-sm active:scale-[0.99] transition-all duration-300 ease-in-out"
                    >
                      <XCircle className="h-4 w-4 transition-transform duration-300 hover:scale-110" />
                      Request cancellation
                    </Link>
                  )}
                  <Link
                    href={`/account/bookings/${booking.id}`}
                    className="group relative no-underline inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white p-2.5 text-slate-700 hover:bg-slate-50 hover:shadow-md hover:border-slate-400 active:scale-[0.95] transition-all duration-300 ease-in-out hover:scale-105"
                  >
                    <Eye className="h-4 w-4 transition-all duration-300 ease-in-out transform scale-100 translate-y-0 rotate-0 group-hover:scale-125 group-hover:-translate-y-1 group-hover:rotate-3 group-active:scale-100 group-active:translate-y-0 group-active:rotate-0" />
                    <span className="absolute left-full ml-2 px-2 py-1 text-xs font-semibold bg-gray-900 text-white rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-all duration-300 shadow-lg z-10 transform translate-x-0 group-hover:translate-x-1">
                    Preview
                    </span>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
