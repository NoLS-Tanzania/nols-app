"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import {
  ArrowLeft,
  Building2,
  Calendar,
  CalendarCheck,
  CalendarX,
  CheckCircle,
  Clock,
  Download,
  FileText,
  Hash,
  Loader2,
  MapPin,
  Moon,
  Banknote,
  Receipt,
  Bed,
  XCircle,
  AlertTriangle,
  Phone,
  Mail,
  User,
  Tag,
  LayoutGrid,
} from "lucide-react";
import Link from "next/link";

const api = axios.create({ baseURL: "", withCredentials: true });

/* ─── types ───────────────────────────────────────────────────── */
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

/* ─── helpers ─────────────────────────────────────────────────── */
function getStatusMeta(status: string) {
  const s = status.toLowerCase();
  if (s.includes("confirmed") || s.includes("checked_in") || s.includes("checked_out"))
    return {
      label: status.replace(/_/g, " "),
      badge: "bg-emerald-50 text-emerald-700 border border-emerald-200",
      icon: <CheckCircle className="h-4 w-4" />,
      color: "#059669",
    };
  if (s.includes("cancel"))
    return {
      label: "Cancelled",
      badge: "bg-red-50 text-red-700 border border-red-200",
      icon: <XCircle className="h-4 w-4" />,
      color: "#dc2626",
    };
  if (s.includes("pending"))
    return {
      label: "Pending",
      badge: "bg-amber-50 text-amber-700 border border-amber-200",
      icon: <Clock className="h-4 w-4" />,
      color: "#d97706",
    };
  return {
    label: status.replace(/_/g, " "),
    badge: "bg-slate-100 text-slate-600 border border-slate-200",
    icon: <Loader2 className="h-4 w-4" />,
    color: "#64748b",
  };
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function nightsBetween(checkIn: string, checkOut: string) {
  const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

function canRequestCancellation(booking: BookingDetail) {
  const s = booking.status.toLowerCase();
  if (s.includes("cancel") || s.includes("checked_out")) return false;
  const checkIn = new Date(booking.checkIn);
  const now = new Date();
  const hoursUntilCheckIn = (checkIn.getTime() - now.getTime()) / (1000 * 60 * 60);
  return hoursUntilCheckIn > 24;
}

/* ─── small InfoRow ───────────────────────────────────────────── */
function InfoRow({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  accent?: string;
}) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-slate-100 last:border-0">
      <span
        className="mt-0.5 flex-shrink-0 p-1.5 rounded-lg"
        style={{ background: accent ? `${accent}18` : "#f1f5f9", color: accent || "#64748b" }}
      >
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-500 mb-0.5">{label}</p>
        <p className="text-sm font-medium text-slate-800 break-words">{value || "—"}</p>
      </div>
    </div>
  );
}

/* ─── skeleton ────────────────────────────────────────────────── */
function Skeleton() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* hero */}
      <div
        className="h-52"
        style={{ background: "linear-gradient(135deg,#0e2a7a 0%,#0a5c82 42%,#02665e 100%)" }}
      />
      <div className="max-w-3xl mx-auto px-4 -mt-16 space-y-4 pb-12">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-3xl shadow p-6 animate-pulse space-y-3">
            <div className="h-4 bg-slate-200 rounded w-1/3" />
            <div className="h-3 bg-slate-100 rounded w-2/3" />
            <div className="h-3 bg-slate-100 rounded w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── main page ───────────────────────────────────────────────── */
export default function BookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api
      .get(`/api/customer/bookings/${id}`)
      .then((r) => setBooking(r.data))
      .catch((e) => {
        const msg = e.response?.data?.error || "Failed to load booking details.";
        setError(msg);
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function downloadPDF() {
    if (!booking) return;
    setDownloading(true);
    try {
      const res = await api.get(`/api/customer/bookings/${booking.id}/pdf`, {
        responseType: "blob",
      });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `booking-${booking.id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // silent
    } finally {
      setDownloading(false);
    }
  }

  if (loading) return <Skeleton />;

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4 px-4">
        <div className="bg-white rounded-3xl shadow p-8 flex flex-col items-center gap-3 max-w-sm w-full text-center">
          <AlertTriangle className="h-10 w-10 text-amber-500" />
          <p className="text-slate-700 font-medium">{error || "Booking not found"}</p>
          <Link
            href="/account/bookings"
            className="mt-2 px-5 py-2 rounded-xl text-sm font-medium text-white"
            style={{ background: "linear-gradient(135deg,#0e2a7a,#0a5c82)" }}
          >
            Back to My Bookings
          </Link>
        </div>
      </div>
    );
  }

  const sm = getStatusMeta(booking.status);
  const nights = nightsBetween(booking.checkIn, booking.checkOut);
  const invoice = booking.invoices?.[0];
  const code = booking.code?.code || booking.bookingCode;
  const location = [booking.property.city, booking.property.district, booking.property.regionName]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Hero ───────────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg,#0e2a7a 0%,#0a5c82 42%,#02665e 100%)",
          minHeight: "200px",
        }}
      >
        {/* svg decorative lines */}
        <svg
          className="absolute inset-0 w-full h-full opacity-10"
          viewBox="0 0 800 200"
          preserveAspectRatio="none"
        >
          <path d="M0,160 C200,80 400,140 800,60" stroke="white" strokeWidth="1.5" fill="none" />
          <path d="M0,120 C150,180 350,80 800,100" stroke="white" strokeWidth="1" fill="none" />
          <circle cx="650" cy="50" r="60" fill="white" opacity="0.04" />
          <circle cx="100" cy="160" r="40" fill="white" opacity="0.04" />
        </svg>

        <div className="relative z-10 max-w-3xl mx-auto px-4 pt-6 pb-20">
          {/* back */}
          <button
            onClick={() => router.push("/account/bookings")}
            className="flex items-center gap-1.5 text-white/70 hover:text-white transition-colors mb-5 text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            My Bookings
          </button>

          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold text-white leading-tight">
                {booking.property.title}
              </h1>
              {location && (
                <p className="text-white/70 text-sm mt-1 flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {location}
                </p>
              )}
            </div>

            {/* status badge */}
            <span
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold capitalize ${sm.badge}`}
            >
              {sm.icon}
              {sm.label}
            </span>
          </div>
        </div>
      </div>

      {/* ── Content ────────────────────────────────────────────── */}
      <div className="max-w-3xl mx-auto px-4 -mt-12 pb-16 space-y-4">

        {/* ── Booking Dates card ─────────────────────────────── */}
        <div
          className="bg-white rounded-3xl shadow-[0_2px_16px_rgba(0,0,0,0.06)] overflow-hidden"
          style={{ borderLeft: "4px solid #0a5c82" }}
        >
          <div className="px-6 pt-5 pb-2 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-sky-600" />
            <h2 className="font-semibold text-slate-800 text-sm">Stay Dates</h2>
          </div>
          <div className="px-6 pb-5">
            <InfoRow
              icon={<CalendarCheck className="h-4 w-4" />}
              label="Check-in"
              value={formatDate(booking.checkIn)}
              accent="#059669"
            />
            <InfoRow
              icon={<CalendarX className="h-4 w-4" />}
              label="Check-out"
              value={formatDate(booking.checkOut)}
              accent="#dc2626"
            />
            <InfoRow
              icon={<Moon className="h-4 w-4" />}
              label="Duration"
              value={`${nights} night${nights !== 1 ? "s" : ""}`}
              accent="#0369a1"
            />
            <InfoRow
              icon={<Clock className="h-4 w-4" />}
              label="Booked on"
              value={formatDate(booking.createdAt)}
              accent="#64748b"
            />
          </div>
        </div>

        {/* ── Property & Room card ──────────────────────────── */}
        <div
          className="bg-white rounded-3xl shadow-[0_2px_16px_rgba(0,0,0,0.06)] overflow-hidden"
          style={{ borderLeft: "4px solid #02665e" }}
        >
          <div className="px-6 pt-5 pb-2 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-teal-600" />
            <h2 className="font-semibold text-slate-800 text-sm">Property & Room</h2>
          </div>
          <div className="px-6 pb-5">
            <InfoRow
              icon={<Building2 className="h-4 w-4" />}
              label="Property"
              value={booking.property.title}
              accent="#0369a1"
            />
            {booking.property.type && (
              <InfoRow
                icon={<Tag className="h-4 w-4" />}
                label="Type"
                value={booking.property.type}
                accent="#7c3aed"
              />
            )}
            {location && (
              <InfoRow
                icon={<MapPin className="h-4 w-4" />}
                label="Location"
                value={location}
                accent="#0a5c82"
              />
            )}
            {booking.roomType && (
              <InfoRow
                icon={<Bed className="h-4 w-4" />}
                label="Room Type"
                value={booking.roomType}
                accent="#059669"
              />
            )}
            {booking.rooms != null && (
              <InfoRow
                icon={<LayoutGrid className="h-4 w-4" />}
                label="Rooms"
                value={`${booking.rooms} room${booking.rooms !== 1 ? "s" : ""}`}
                accent="#d97706"
              />
            )}
          </div>
        </div>

        {/* ── Booking Code card ─────────────────────────────── */}
        {code && (
          <div
            className="bg-white rounded-3xl shadow-[0_2px_16px_rgba(0,0,0,0.06)] overflow-hidden"
            style={{ borderLeft: "4px solid #7c3aed" }}
          >
            <div className="px-6 pt-5 pb-2 flex items-center gap-2">
              <Hash className="h-4 w-4 text-violet-600" />
              <h2 className="font-semibold text-slate-800 text-sm">Booking Code</h2>
            </div>
            <div className="px-6 pb-5">
              <InfoRow
                icon={<Hash className="h-4 w-4" />}
                label="Code"
                value={
                  <span className="font-mono tracking-widest text-violet-700 font-bold">
                    {code}
                  </span>
                }
                accent="#7c3aed"
              />
              {(booking.code?.status || booking.codeStatus) && (
                <InfoRow
                  icon={<CheckCircle className="h-4 w-4" />}
                  label="Code Status"
                  value={(booking.code?.status || booking.codeStatus)?.replace(/_/g, " ")}
                  accent="#7c3aed"
                />
              )}
            </div>
          </div>
        )}

        {/* ── Payment card ──────────────────────────────────── */}
        <div
          className="bg-white rounded-3xl shadow-[0_2px_16px_rgba(0,0,0,0.06)] overflow-hidden"
          style={{ borderLeft: "4px solid #059669" }}
        >
          <div className="px-6 pt-5 pb-2 flex items-center gap-2">
            <Banknote className="h-4 w-4 text-emerald-600" />
            <h2 className="font-semibold text-slate-800 text-sm">Payment</h2>
          </div>
          <div className="px-6 pb-5">
            <InfoRow
              icon={<Banknote className="h-4 w-4" />}
              label="Total Amount"
              value={`${booking.currency || "TZS"} ${booking.totalAmount?.toLocaleString()}`}
              accent="#059669"
            />
            <InfoRow
              icon={booking.isPaid ? <CheckCircle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
              label="Payment Status"
              value={
                <span className={booking.isPaid ? "text-emerald-600 font-semibold" : "text-amber-600 font-semibold"}>
                  {booking.isPaid ? "Paid" : "Pending"}
                </span>
              }
              accent={booking.isPaid ? "#059669" : "#d97706"}
            />
            {invoice?.invoiceNumber && (
              <InfoRow
                icon={<FileText className="h-4 w-4" />}
                label="Invoice #"
                value={invoice.invoiceNumber}
                accent="#0369a1"
              />
            )}
            {invoice?.receiptNumber && (
              <InfoRow
                icon={<Receipt className="h-4 w-4" />}
                label="Receipt #"
                value={invoice.receiptNumber}
                accent="#059669"
              />
            )}
            {invoice?.status && (
              <InfoRow
                icon={<Tag className="h-4 w-4" />}
                label="Invoice Status"
                value={invoice.status.replace(/_/g, " ")}
                accent="#64748b"
              />
            )}
          </div>
        </div>

        {/* ── Property Owner card ───────────────────────────── */}
        {booking.property.owner && (
          <div
            className="bg-white rounded-3xl shadow-[0_2px_16px_rgba(0,0,0,0.06)] overflow-hidden"
            style={{ borderLeft: "4px solid #0369a1" }}
          >
            <div className="px-6 pt-5 pb-2 flex items-center gap-2">
              <User className="h-4 w-4 text-sky-600" />
              <h2 className="font-semibold text-slate-800 text-sm">Property Contact</h2>
            </div>
            <div className="px-6 pb-5">
              <InfoRow
                icon={<User className="h-4 w-4" />}
                label="Name"
                value={booking.property.owner.name}
                accent="#0369a1"
              />
              {booking.property.owner.phone && (
                <InfoRow
                  icon={<Phone className="h-4 w-4" />}
                  label="Phone"
                  value={
                    <a
                      href={`tel:${booking.property.owner.phone}`}
                      className="text-sky-600 hover:underline"
                    >
                      {booking.property.owner.phone}
                    </a>
                  }
                  accent="#0369a1"
                />
              )}
              {booking.property.owner.email && (
                <InfoRow
                  icon={<Mail className="h-4 w-4" />}
                  label="Email"
                  value={
                    <a
                      href={`mailto:${booking.property.owner.email}`}
                      className="text-sky-600 hover:underline"
                    >
                      {booking.property.owner.email}
                    </a>
                  }
                  accent="#0369a1"
                />
              )}
            </div>
          </div>
        )}

        {/* ── Actions ───────────────────────────────────────── */}
        <div className="flex flex-wrap gap-3 pt-2">
          {/* Download receipt */}
          <button
            onClick={downloadPDF}
            disabled={downloading}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-semibold text-white transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-60"
            style={{ background: "linear-gradient(135deg,#059669,#047857)" }}
          >
            {downloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {downloading ? "Downloading…" : "Download Receipt"}
          </button>

          {/* Request cancellation */}
          {canRequestCancellation(booking) && (
            <Link
              href={`/account/cancellations?code=${code || booking.id}`}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-semibold text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 transition-all hover:scale-[1.02] active:scale-95"
            >
              <XCircle className="h-4 w-4" />
              Request Cancellation
            </Link>
          )}

          {/* Back */}
          <Link
            href="/account/bookings"
            className="flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-semibold text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
            All Bookings
          </Link>
        </div>
      </div>
    </div>
  );
}
