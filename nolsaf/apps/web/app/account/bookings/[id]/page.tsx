"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import {
  ArrowLeft,
  Building2,
  CalendarCheck,
  CalendarX,
  CheckCircle,
  Clock,
  FileText,
  Hash,
  MapPin,
  Moon,
  Banknote,
  Receipt,
  XCircle,
  AlertCircle,
  Phone,
  Mail,
  User,
  Tag,
  ShieldCheck,
  Star,
  Sparkles,
  ScanLine,
} from "lucide-react";
import Link from "next/link";

const api = axios.create({ baseURL: "", withCredentials: true });

type BookingDetail = {
  id: number;
  status: string;
  checkIn: string;
  checkOut: string;
  totalAmount: number;
  currency?: string;
  roomType?: string;
  rooms?: number;
  services?: any;
  notes?: string;
  isValid: boolean;
  isPaid: boolean;
  bookingCode?: string | null;
  codeStatus?: string | null;
  createdAt: string;
  updatedAt: string;
  property: {
    id: number;
    title: string;
    type?: string;
    regionName?: string;
    district?: string;
    city?: string;
    owner?: { id: number; name: string; email?: string; phone?: string };
  };
  code?: { code: string; status: string } | null;
  invoices?: Array<{
    invoiceNumber?: string;
    receiptNumber?: string;
    status?: string;
    amount?: number;
  }>;
  user?: { id: number; name: string; email?: string; phone?: string };
};

function getStatusMeta(status: string) {
  const s = status.toLowerCase();
  if (s.includes("confirmed"))
    return {
      label: "Confirmed",
      badge: "bg-emerald-50 text-emerald-700 border border-emerald-200",
      icon: <CheckCircle className="h-3.5 w-3.5" />,
    };
  if (s.includes("checked_in"))
    return {
      label: "Checked In",
      badge: "bg-sky-50 text-sky-700 border border-sky-200",
      icon: <ShieldCheck className="h-3.5 w-3.5" />,
    };
  if (s.includes("checked_out") || s.includes("completed"))
    return {
      label: "Completed",
      badge: "bg-violet-50 text-violet-700 border border-violet-200",
      icon: <Star className="h-3.5 w-3.5" />,
    };
  if (s.includes("cancel"))
    return {
      label: "Cancelled",
      badge: "bg-red-50 text-red-700 border border-red-200",
      icon: <XCircle className="h-3.5 w-3.5" />,
    };
  if (s.includes("pending"))
    return {
      label: "Pending",
      badge: "bg-amber-50 text-amber-700 border border-amber-200",
      icon: <Clock className="h-3.5 w-3.5" />,
    };
  return {
    label: status.replace(/_/g, " "),
    badge: "bg-indigo-50 text-indigo-700 border border-indigo-200",
    icon: <Sparkles className="h-3.5 w-3.5" />,
  };
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function nights(ci: string, co: string) {
  return Math.round(
    (new Date(co).getTime() - new Date(ci).getTime()) / 86400000
  );
}

function canCancel(b: BookingDetail) {
  const s = b.status.toLowerCase();
  if (s.includes("cancel") || s.includes("checked_out")) return false;
  return (new Date(b.checkIn).getTime() - Date.now()) / 3600000 > 24;
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">
        {label}
      </p>
      <p className="text-sm font-bold text-slate-800 leading-snug">{value}</p>
    </div>
  );
}

export default function BookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);
  const [qrUrl, setQrUrl] = useState<string>("");

  useEffect(() => {
    if (!id) return;
    api
      .get(`/api/customer/bookings/${id}`)
      .then((r) => setBooking(r.data))
      .catch((e) =>
        setError(e.response?.data?.error || "Failed to load booking.")
      )
      .finally(() => setLoading(false));
  }, [id]);

  // Generate QR once booking loads
  useEffect(() => {
    if (!booking) return;
    const qrContent =
      booking.code?.code ||
      booking.bookingCode ||
      `NOLS-BOOKING-${booking.id}`;
    (async () => {
      try {
        const QR = (await import("qrcode")) as any;
        const url = await QR.default.toDataURL(qrContent, {
          width: 220,
          margin: 2,
          color: { dark: "#0f172a", light: "#f0fdf4" },
        });
        setQrUrl(url);
      } catch {}
    })();
  }, [booking]);

  function copyCode(code: string) {
    navigator.clipboard.writeText(code).then(() => {
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    });
  }

  /* ── Loading skeleton ── */
  if (loading)
    return (
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <div
          className="relative overflow-hidden rounded-3xl p-8 sm:p-10 animate-pulse"
          style={{
            background:
              "linear-gradient(135deg,#0f1f5c 0%,#0a5c82 52%,#02665e 100%)",
          }}
        >
          <div className="flex flex-col items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-white/10" />
            <div className="h-8 w-56 rounded-full bg-white/10" />
            <div className="h-4 w-36 rounded-full bg-white/10" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-5">
            <div className="h-52 rounded-3xl bg-slate-100 animate-pulse" />
            <div className="h-40 rounded-3xl bg-slate-100 animate-pulse" />
          </div>
          <div className="space-y-5">
            <div className="h-48 rounded-3xl bg-slate-200 animate-pulse" />
            <div className="h-36 rounded-3xl bg-slate-100 animate-pulse" />
          </div>
        </div>
      </div>
    );

  /* ── Error ── */
  if (error || !booking)
    return (
      <div className="mx-auto w-full max-w-4xl">
        <div className="relative overflow-hidden rounded-3xl border border-red-200 bg-red-50 p-10 text-center shadow-sm">
          <AlertCircle className="w-14 h-14 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-red-900 mb-2">
            Booking Not Found
          </h2>
          <p className="text-red-700 mb-6 text-sm">
            {error || "We couldn't load this booking."}
          </p>
          <Link
            href="/account/bookings"
            className="no-underline inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-semibold text-white shadow-sm hover:shadow-md transition-all"
            style={{ background: "linear-gradient(135deg,#0f1f5c,#0a5c82)" }}
          >
            <ArrowLeft className="w-4 h-4" /> Back to My Bookings
          </Link>
        </div>
      </div>
    );

  const meta = getStatusMeta(booking.status);
  const n = nights(booking.checkIn, booking.checkOut);
  const invoice = booking.invoices?.[0];
  const code = booking.code?.code || booking.bookingCode;
  const codeStatus = booking.code?.status || booking.codeStatus;
  const location = [
    booking.property.city,
    booking.property.district,
    booking.property.regionName,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">

      {/* ── HERO ── */}
      <div
        className="relative overflow-hidden rounded-3xl shadow-[0_4px_32px_rgba(10,92,130,0.22)]"
        style={{
          background:
            "linear-gradient(135deg,#0f1f5c 0%,#0a5c82 52%,#02665e 100%)",
        }}
      >
        {/* Decorative horizontal lines */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 opacity-[0.07]">
            {[12, 28, 45, 62, 78, 92].map((top, i) => (
              <div
                key={i}
                className="absolute h-px rounded-full"
                style={{
                  top: `${top}%`,
                  left: `${4 + i * 2}%`,
                  right: `${4 + (5 - i) * 2}%`,
                  background:
                    "linear-gradient(90deg,transparent,white,transparent)",
                }}
              />
            ))}
          </div>
          <div
            className="absolute -right-16 -top-16 h-64 w-64 rounded-full opacity-20"
            style={{
              background: "radial-gradient(circle,#38bdf8 0%,transparent 70%)",
            }}
          />
          <div
            className="absolute -left-8 bottom-0 h-40 w-40 rounded-full opacity-10"
            style={{
              background: "radial-gradient(circle,#34d399 0%,transparent 70%)",
            }}
          />
        </div>

        <div className="relative px-6 py-8 sm:px-10 sm:py-10">
          {/* Back nav */}
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => router.push("/account/bookings")}
              className="inline-flex items-center justify-center h-9 w-9 rounded-xl transition-all hover:scale-105 active:scale-95"
              style={{
                background: "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.18)",
              }}
            >
              <ArrowLeft className="w-4 h-4 text-white" />
            </button>
            <span className="text-sm font-medium text-white/60">
              My Bookings
            </span>
          </div>

          {/* Property title + status */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            {/* Icon bubble */}
            <div className="relative flex-shrink-0">
              <div className="absolute inset-0 rounded-2xl bg-teal-400/25 blur-md scale-110" />
              <div
                className="relative h-16 w-16 rounded-2xl flex items-center justify-center shadow-lg"
                style={{
                  background:
                    "linear-gradient(135deg,rgba(52,211,153,0.22) 0%,rgba(14,116,144,0.18) 100%)",
                  border: "1px solid rgba(255,255,255,0.15)",
                }}
              >
                <Building2 className="h-8 w-8 text-white drop-shadow-md" />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-xl sm:text-3xl font-extrabold text-white tracking-tight break-words min-w-0">
                  {booking.property.title}
                </h1>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold backdrop-blur-sm ${meta.badge}`}
                >
                  {meta.icon} {meta.label}
                </span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                {location && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/60">
                    <MapPin className="h-3.5 w-3.5" />
                    {location}
                  </span>
                )}
                {booking.property.type && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/60">
                    <Tag className="h-3.5 w-3.5" />
                    {booking.property.type}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/60">
                  <Hash className="h-3.5 w-3.5" />
                  Booking #{booking.id}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── BODY GRID ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── LEFT — main 2/3 ── */}
        <div className="lg:col-span-2 space-y-5 min-w-0">

          {/* Stay Dates card */}
          <div className="relative overflow-hidden bg-white rounded-3xl border border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.05)]">
            <div
              className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-3xl"
              style={{
                background: "linear-gradient(180deg,#7dd3fc 0%,#0a5c82 100%)",
              }}
            />
            <div className="pl-5 pr-5 pt-5 pb-5">
              <div className="flex items-center gap-2 mb-4">
                <div
                  className="h-7 w-7 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "linear-gradient(135deg,#0a5c82,#02665e)" }}
                >
                  <Moon className="h-3.5 w-3.5 text-white" />
                </div>
                <h2 className="text-base font-bold text-slate-900">
                  Stay Dates
                </h2>
              </div>

              {/* Timeline */}
              <div className="relative flex items-stretch gap-3 mb-4">
                <div className="flex flex-col items-center pt-3 pb-3 flex-shrink-0">
                  <div className="h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-emerald-200" />
                  <div className="flex-1 w-px border-l-2 border-dashed border-slate-200 my-1.5" />
                  <div className="h-3 w-3 rounded-full bg-rose-500 ring-2 ring-rose-200" />
                </div>
                <div className="flex-1 flex flex-col gap-3">
                  <div className="rounded-2xl bg-emerald-50 border border-emerald-100 px-4 py-3">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-emerald-600 mb-0.5">
                      <CalendarCheck className="h-3 w-3" /> Check-in
                    </div>
                    <p className="text-sm font-bold text-slate-800">
                      {fmt(booking.checkIn)}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-rose-50 border border-rose-100 px-4 py-3">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-rose-500 mb-0.5">
                      <CalendarX className="h-3 w-3" /> Check-out
                    </div>
                    <p className="text-sm font-bold text-slate-800">
                      {fmt(booking.checkOut)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <InfoRow
                  label="Duration"
                  value={`${n} night${n !== 1 ? "s" : ""}`}
                />
                <InfoRow label="Booked on" value={fmt(booking.createdAt)} />
                {booking.status && (
                  <InfoRow
                    label="Status"
                    value={booking.status.replace(/_/g, " ")}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Property & Room card */}
          <div className="relative overflow-hidden bg-white rounded-3xl border border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.05)]">
            <div
              className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-3xl"
              style={{
                background: "linear-gradient(180deg,#6ee7b7 0%,#02665e 100%)",
              }}
            />
            <div className="pl-5 pr-5 pt-5 pb-5">
              <div className="flex items-center gap-2 mb-4">
                <div
                  className="h-7 w-7 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "linear-gradient(135deg,#02665e,#059669)" }}
                >
                  <Building2 className="h-3.5 w-3.5 text-white" />
                </div>
                <h2 className="text-base font-bold text-slate-900">
                  Property &amp; Room
                </h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <InfoRow label="Property" value={booking.property.title} />
                {booking.property.type && (
                  <InfoRow label="Type" value={booking.property.type} />
                )}
                {location && <InfoRow label="Location" value={location} />}
                {booking.roomType && (
                  <InfoRow label="Room Type" value={booking.roomType} />
                )}
                {booking.rooms != null && (
                  <InfoRow
                    label="Rooms"
                    value={`${booking.rooms} room${
                      booking.rooms !== 1 ? "s" : ""
                    }`}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Booking Code card */}
          {code && (
            <div className="relative overflow-hidden bg-white rounded-3xl border border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.05)]">
              <div
                className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-3xl"
                style={{
                  background:
                    "linear-gradient(180deg,#c4b5fd 0%,#7c3aed 100%)",
                }}
              />
              <div className="pl-5 pr-5 pt-5 pb-5">
                <div className="flex items-center gap-2 mb-4">
                  <div
                    className="h-7 w-7 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{
                      background: "linear-gradient(135deg,#7c3aed,#a78bfa)",
                    }}
                  >
                    <Hash className="h-3.5 w-3.5 text-white" />
                  </div>
                  <h2 className="text-base font-bold text-slate-900">
                    Booking Code
                  </h2>
                  {codeStatus && (
                    <span
                      className={`ml-auto inline-flex text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border ${
                        codeStatus === "ACTIVE"
                          ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                          : codeStatus === "USED"
                          ? "bg-sky-50 text-sky-600 border-sky-200"
                          : "bg-slate-100 text-slate-500 border-slate-200"
                      }`}
                    >
                      {codeStatus}
                    </span>
                  )}
                </div>

                {/* Perforated divider */}
                <div className="relative flex items-center mb-1 overflow-hidden">
                  <div className="flex-1 border-t-2 border-dashed border-slate-200" />
                </div>

                <div
                  className="mt-3 rounded-2xl px-6 py-5 flex flex-col items-center gap-1 cursor-pointer select-none transition-all active:scale-[0.98] hover:brightness-[0.97]"
                  style={{
                    background: "linear-gradient(135deg,#f5f3ff,#ede9fe)",
                  }}
                  onClick={() => copyCode(code)}
                >
                  <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-violet-400 mb-1">
                    {codeCopied ? "✓ Copied to clipboard" : "Tap to copy"}
                  </p>
                  <p className="text-xl sm:text-3xl font-black tracking-[0.15em] sm:tracking-[0.3em] text-violet-700 font-mono break-all text-center w-full">
                    {code}
                  </p>
                </div>
                <p className="text-center text-xs text-slate-400 mt-3">
                  Show this code at the property reception on arrival
                </p>
              </div>
            </div>
          )}

          {/* Notes card */}
          {booking.notes && (
            <div className="relative overflow-hidden bg-white rounded-3xl border border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.05)]">
              <div
                className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-3xl"
                style={{
                  background:
                    "linear-gradient(180deg,#fde68a 0%,#d97706 100%)",
                }}
              />
              <div className="pl-5 pr-5 pt-5 pb-5">
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className="h-7 w-7 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{
                      background: "linear-gradient(135deg,#d97706,#f59e0b)",
                    }}
                  >
                    <FileText className="h-3.5 w-3.5 text-white" />
                  </div>
                  <h2 className="text-base font-bold text-slate-900">Notes</h2>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {booking.notes}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT — sidebar 1/3 ── */}
        <div className="space-y-5 min-w-0">

          {/* Payment — dark gradient card */}
          <div
            className="relative overflow-hidden rounded-3xl shadow-[0_2px_20px_rgba(10,92,130,0.15)]"
            style={{
              background: "linear-gradient(135deg,#0b2240 0%,#0a3f35 100%)",
            }}
          >
            <div
              className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-20"
              style={{
                background: "radial-gradient(circle,#34d399,transparent 70%)",
              }}
            />
            <div className="relative px-5 py-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-6 w-6 rounded-lg bg-emerald-400/20 flex items-center justify-center">
                  <Banknote className="h-3.5 w-3.5 text-emerald-300" />
                </div>
                <h2 className="text-sm font-bold text-white/80 uppercase tracking-wide">
                  Payment
                </h2>
              </div>

              {/* Amount + payment status row */}
              <div className="flex items-end justify-between gap-2 mb-4">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-white/40 mb-0.5">
                    Total Amount
                  </p>
                  <p className="text-xl font-black text-white leading-tight truncate">
                    <span className="text-sm font-semibold text-white/50 mr-1">
                      {booking.currency || "TZS"}
                    </span>
                    {booking.totalAmount?.toLocaleString()}
                  </p>
                </div>
                <div
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold border ${
                    booking.isPaid
                      ? "bg-emerald-400/15 text-emerald-300 border-emerald-400/30"
                      : "bg-amber-400/15 text-amber-300 border-amber-400/30"
                  }`}
                >
                  {booking.isPaid ? (
                    <CheckCircle className="h-3.5 w-3.5" />
                  ) : (
                    <Clock className="h-3.5 w-3.5" />
                  )}
                  {booking.isPaid ? "Paid" : "Pending"}
                </div>
              </div>

              {(invoice?.invoiceNumber || invoice?.receiptNumber) && (
                <div className="space-y-2 border-t border-white/10 pt-3 mb-4">
                  {invoice.invoiceNumber && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-white/40 flex items-center gap-1">
                        <FileText className="h-3 w-3" /> Invoice
                      </span>
                      <span className="text-xs font-mono text-white/70">
                        {invoice.invoiceNumber}
                      </span>
                    </div>
                  )}
                  {invoice.receiptNumber && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-white/40 flex items-center gap-1">
                        <Receipt className="h-3 w-3" /> Receipt
                      </span>
                      <span className="text-xs font-mono text-emerald-300">
                        {invoice.receiptNumber}
                      </span>
                    </div>
                  )}
                  {invoice.status && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-white/40">Inv. Status</span>
                      <span className="text-xs font-semibold text-white/60 capitalize">
                        {invoice.status.replace(/_/g, " ")}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* QR Code */}
              <div className="border-t border-white/10 pt-4">
                <div className="flex items-center gap-1.5 mb-3">
                  <ScanLine className="h-3.5 w-3.5 text-emerald-300" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">
                    Check-in QR Code
                  </span>
                </div>
                <div className="flex flex-col items-center">
                  {qrUrl ? (
                    <div className="rounded-2xl p-2.5 shadow-lg w-full max-w-[200px]" style={{ background: "rgba(255,255,255,0.96)" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={qrUrl}
                        alt="Booking QR Code"
                        className="block w-full h-auto"
                        style={{ imageRendering: "pixelated" }}
                      />
                    </div>
                  ) : (
                    <div
                      className="rounded-2xl animate-pulse w-full max-w-[200px] aspect-square"
                      style={{ background: "rgba(255,255,255,0.08)" }}
                    />
                  )}
                  <p className="mt-2.5 text-[11px] font-semibold text-white/40 text-center">
                    Show to reception on arrival
                  </p>
                  {(code || booking.bookingCode) && (
                    <p className="mt-0.5 text-xs font-mono font-bold tracking-widest text-emerald-300">
                      {code || booking.bookingCode}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Property Contact card */}
          {booking.property.owner && (
            <div className="relative overflow-hidden bg-white rounded-3xl border border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.05)]">
              <div
                className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-3xl"
                style={{
                  background:
                    "linear-gradient(180deg,#7dd3fc 0%,#0369a1 100%)",
                }}
              />
              <div className="pl-5 pr-5 pt-5 pb-5">
                <div className="flex items-center gap-2 mb-4">
                  <div
                    className="h-7 w-7 rounded-xl flex items-center justify-center"
                    style={{
                      background: "linear-gradient(135deg,#0369a1,#0a5c82)",
                    }}
                  >
                    <User className="h-3.5 w-3.5 text-white" />
                  </div>
                  <h2 className="text-base font-bold text-slate-900">
                    Property Contact
                  </h2>
                </div>
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="h-11 w-11 rounded-2xl flex items-center justify-center text-white font-black text-base flex-shrink-0 shadow-sm"
                    style={{
                      background: "linear-gradient(135deg,#0a5c82,#02665e)",
                    }}
                  >
                    {booking.property.owner.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800 text-sm truncate">
                      {booking.property.owner.name}
                    </p>
                    <p className="text-xs text-slate-400">Property Manager</p>
                  </div>
                  <div className="flex gap-1.5">
                    {booking.property.owner.phone && (
                      <a
                        href={`tel:${booking.property.owner.phone}`}
                        className="h-8 w-8 rounded-xl bg-sky-50 hover:bg-sky-100 flex items-center justify-center text-sky-600 transition-colors"
                        title="Call"
                      >
                        <Phone className="h-3.5 w-3.5" />
                      </a>
                    )}
                    {booking.property.owner.email && (
                      <a
                        href={`mailto:${booking.property.owner.email}`}
                        className="h-8 w-8 rounded-xl bg-sky-50 hover:bg-sky-100 flex items-center justify-center text-sky-600 transition-colors"
                        title="Email"
                      >
                        <Mail className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                </div>
                {booking.property.owner.phone && (
                  <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
                    <Phone className="h-3 w-3 text-slate-400" />
                    {booking.property.owner.phone}
                  </p>
                )}
                {booking.property.owner.email && (
                  <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1 truncate">
                    <Mail className="h-3 w-3 text-slate-400" />
                    {booking.property.owner.email}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Cancellation button */}
          {canCancel(booking) && (
            <Link
              href={`/account/cancellations?code=${code || booking.id}`}
              className="no-underline w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl text-sm font-bold text-red-600 border-2 border-red-200 bg-white hover:bg-red-50 transition-all hover:scale-[1.01] active:scale-[0.98]"
            >
              <XCircle className="h-4 w-4" />
              Request Cancellation
            </Link>
          )}

          {/* Back to list */}
          <Link
            href="/account/bookings"
            className="no-underline w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-sm font-semibold text-slate-500 border border-slate-200 bg-white hover:bg-slate-50 transition-all"
          >
            <ArrowLeft className="h-4 w-4" /> All My Bookings
          </Link>
        </div>
      </div>
    </div>
  );
}
