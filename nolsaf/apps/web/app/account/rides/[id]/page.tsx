"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import axios from "axios";
import {
  MapPin,
  User,
  ArrowLeft,
  Phone,
  Navigation,
  MessageCircle,
  AlertCircle,
  Car,
  Calendar,
  Clock,
  Banknote,
  CheckCircle,
  XCircle,
  Loader2,
  Plane,
  Bus,
  Train,
  Ship,
  Hash,
  Building2,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import TransportChat from "@/components/TransportChat";

const api = axios.create({ baseURL: "", withCredentials: true });

type Ride = {
  id: number;
  status: string;
  vehicleType?: string;
  scheduledDate: string;
  pickupTime?: string;
  dropoffTime?: string;
  fromAddress?: string;
  fromLatitude?: number;
  fromLongitude?: number;
  toAddress?: string;
  toLatitude?: number;
  toLongitude?: number;
  amount?: number;
  currency?: string;
  arrivalType?: string;
  arrivalNumber?: string;
  transportCompany?: string;
  arrivalTime?: string;
  pickupLocation?: string;
  numberOfPassengers?: number;
  notes?: string;
  user?: { id: number; name: string; email?: string; phone?: string };
  driver?: { id: number; name: string; email?: string; phone?: string };
  property?: { id: number; title: string; regionName?: string; district?: string };
  paymentStatus?: string;
  createdAt: string;
  updatedAt: string;
};

/* â”€â”€â”€ helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function getStatusMeta(status: string) {
  const s = status.toLowerCase();
  if (s.includes("completed"))
    return { label: "Completed", color: "#059669", bg: "rgba(5,150,105,0.12)", border: "rgba(5,150,105,0.25)", text: "text-emerald-700", badge: "bg-emerald-50 text-emerald-700 border border-emerald-200", icon: <CheckCircle className="h-4 w-4" /> };
  if (s.includes("cancel"))
    return { label: "Cancelled", color: "#dc2626", bg: "rgba(220,38,38,0.1)", border: "rgba(220,38,38,0.2)", text: "text-red-700", badge: "bg-red-50 text-red-700 border border-red-200", icon: <XCircle className="h-4 w-4" /> };
  if (s.includes("in_progress") || s.includes("assigned"))
    return { label: status.replace(/_/g, " "), color: "#0369a1", bg: "rgba(3,105,161,0.1)", border: "rgba(3,105,161,0.2)", text: "text-sky-700", badge: "bg-sky-50 text-sky-700 border border-sky-200", icon: <Loader2 className="h-4 w-4 animate-spin" /> };
  if (s.includes("pending"))
    return { label: status.replace(/_/g, " "), color: "#d97706", bg: "rgba(217,119,6,0.1)", border: "rgba(217,119,6,0.2)", text: "text-amber-700", badge: "bg-amber-50 text-amber-700 border border-amber-200", icon: <Clock className="h-4 w-4" /> };
  return { label: status.replace(/_/g, " "), color: "#64748b", bg: "rgba(100,116,139,0.1)", border: "rgba(100,116,139,0.18)", text: "text-slate-600", badge: "bg-slate-100 text-slate-600 border border-slate-200", icon: <Car className="h-4 w-4" /> };
}

function arrivalIcon(type?: string) {
  if (!type) return <Car className="h-5 w-5" />;
  const t = type.toUpperCase();
  if (t === "FLIGHT") return <Plane className="h-5 w-5" />;
  if (t === "BUS") return <Bus className="h-5 w-5" />;
  if (t === "TRAIN") return <Train className="h-5 w-5" />;
  if (t === "FERRY") return <Ship className="h-5 w-5" />;
  return <Car className="h-5 w-5" />;
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">{label}</p>
      <p className="text-sm font-bold text-slate-800 leading-snug">{value}</p>
    </div>
  );
}

export default function RideDetailPage() {
  const params = useParams();
  const rideId = Number((params as any)?.id ?? "");
  const [ride, setRide] = useState<Ride | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [showChat, setShowChat] = useState(false);

  useEffect(() => {
    api.get("/api/account/me").then((res) => setCurrentUserId(res.data?.id || null)).catch(() => {});
    if (rideId) {
      api.get(`/api/transport-bookings/${rideId}`)
        .then((res) => setRide(res.data))
        .catch((err) => setError(err?.response?.data?.error || "Failed to load ride details"))
        .finally(() => setLoading(false));
    }
  }, [rideId]);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  const formatTime = (t?: string) =>
    t ? new Date(t).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "N/A";

  /* â”€â”€ Loading â”€â”€ */
  if (loading) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <div
          className="relative overflow-hidden rounded-3xl p-8 sm:p-10 animate-pulse"
          style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 52%, #0369a1 100%)" }}
        >
          <div className="flex flex-col items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-white/10" />
            <div className="h-8 w-48 rounded-full bg-white/10" />
            <div className="h-4 w-32 rounded-full bg-white/10" />
          </div>
        </div>
        <div className="h-48 rounded-3xl bg-slate-100 animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-64 rounded-3xl bg-slate-100 animate-pulse" />
          <div className="h-48 rounded-3xl bg-slate-100 animate-pulse" />
        </div>
      </div>
    );
  }

  /* â”€â”€ Error â”€â”€ */
  if (error || !ride) {
    return (
      <div className="mx-auto w-full max-w-4xl p-6">
        <div className="relative overflow-hidden rounded-3xl border border-red-200 bg-red-50 p-10 text-center shadow-sm">
          <AlertCircle className="w-14 h-14 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-red-900 mb-2">Something went wrong</h2>
          <p className="text-red-700 mb-6 text-sm">{error || "Ride not found"}</p>
          <Link
            href="/account/rides"
            className="no-underline inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-semibold text-white shadow-sm hover:shadow-md transition-all"
            style={{ background: "linear-gradient(135deg, #1e3a5f 0%, #0369a1 100%)" }}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Rides
          </Link>
        </div>
      </div>
    );
  }

  const meta = getStatusMeta(ride.status);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â• HERO HEADER â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <div
        className="relative overflow-hidden rounded-3xl shadow-[0_4px_32px_rgba(3,105,161,0.22)]"
        style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 52%, #0369a1 100%)" }}
      >
        {/* Speed lines */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 opacity-[0.07]">
            {[10, 25, 42, 60, 75, 90].map((top, i) => (
              <div key={i} className="absolute h-px rounded-full"
                style={{ top: `${top}%`, left: `${5 + i * 2}%`, right: `${5 + (5 - i) * 2}%`,
                  background: "linear-gradient(90deg, transparent, white, transparent)" }} />
            ))}
          </div>
          <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full opacity-20"
            style={{ background: "radial-gradient(circle, #38bdf8 0%, transparent 70%)" }} />
          <div className="absolute -left-8 bottom-0 h-40 w-40 rounded-full opacity-10"
            style={{ background: "radial-gradient(circle, #818cf8 0%, transparent 70%)" }} />
        </div>

        <div className="relative px-6 py-8 sm:px-10 sm:py-10">
          {/* Back button row */}
          <div className="flex items-center gap-3 mb-6">
            <Link
              href="/account/rides"
              className="no-underline inline-flex items-center justify-center h-9 w-9 rounded-xl transition-all hover:scale-105 active:scale-95"
              style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.18)" }}
            >
              <ArrowLeft className="w-4 h-4 text-white" />
            </Link>
            <span className="text-sm font-medium text-white/60">Back to My Rides</span>
          </div>

          {/* Main hero content */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            {/* Icon */}
            <div className="relative flex-shrink-0">
              <div className="absolute inset-0 rounded-2xl bg-cyan-400/25 blur-md scale-110" />
              <div className="relative h-16 w-16 rounded-2xl flex items-center justify-center shadow-lg"
                style={{ background: "linear-gradient(135deg, rgba(56,189,248,0.22) 0%, rgba(99,102,241,0.18) 100%)", border: "1px solid rgba(255,255,255,0.15)" }}>
                <Car className="h-8 w-8 text-white drop-shadow-md" />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Ride Details</h1>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold backdrop-blur-sm ${meta.badge}`}>
                  {meta.icon}
                  {meta.label}
                </span>
              </div>
              <div className="flex flex-wrap gap-3 mt-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/60">
                  <Hash className="h-3.5 w-3.5" />
                  Booking #{ride.id}
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/60">
                  <Calendar className="h-3.5 w-3.5" />
                  {formatDate(ride.scheduledDate)}
                </span>
                {ride.pickupTime && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/60">
                    <Clock className="h-3.5 w-3.5" />
                    {formatTime(ride.pickupTime)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â• BODY GRID â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* â”€â”€ LEFT / MAIN â”€â”€ */}
        <div className="lg:col-span-2 space-y-5">

          {/* Trip Info Card */}
          <div className="relative overflow-hidden bg-white rounded-3xl border border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.05)]">
            <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-3xl"
              style={{ background: "linear-gradient(180deg, #38bdf8 0%, #0369a1 100%)" }} />
            <div className="pl-6 pr-6 pt-5 pb-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-7 w-7 rounded-xl flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, #1e3a5f, #0369a1)" }}>
                  <Car className="h-3.5 w-3.5 text-white" />
                </div>
                <h2 className="text-base font-bold text-slate-900">Trip Overview</h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <InfoRow label="Scheduled Date" value={formatDate(ride.scheduledDate)} />
                {ride.pickupTime && <InfoRow label="Pickup Time" value={formatTime(ride.pickupTime)} />}
                {ride.dropoffTime && <InfoRow label="Drop-off Time" value={formatTime(ride.dropoffTime)} />}
                {ride.vehicleType && <InfoRow label="Vehicle Type" value={ride.vehicleType} />}
                {ride.numberOfPassengers && <InfoRow label="Passengers" value={String(ride.numberOfPassengers)} />}
              </div>
            </div>
          </div>

          {/* Route Visualizer */}
          <div className="relative overflow-hidden bg-white rounded-3xl border border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.05)]">
            <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-3xl"
              style={{ background: "linear-gradient(180deg, #38bdf8 0%, #818cf8 100%)" }} />
            <div className="pl-6 pr-6 pt-5 pb-5">
              <div className="flex items-center gap-2 mb-5">
                <div className="h-7 w-7 rounded-xl flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, #0369a1, #818cf8)" }}>
                  <Navigation className="h-3.5 w-3.5 text-white" />
                </div>
                <h2 className="text-base font-bold text-slate-900">Route</h2>
              </div>

              <div className="flex items-stretch gap-3">
                {/* Track */}
                <div className="flex flex-col items-center gap-0 pt-3 pb-3 flex-shrink-0">
                  <div className="h-3 w-3 rounded-full bg-sky-500 ring-2 ring-sky-200 shadow-sm" />
                  <div className="flex-1 w-px border-l-2 border-dashed border-slate-200 my-1.5" />
                  <div className="h-3 w-3 rounded-full bg-indigo-500 ring-2 ring-indigo-200 shadow-sm" />
                </div>

                {/* Labels */}
                <div className="flex-1 flex flex-col gap-3">
                  {/* From */}
                  <div className="rounded-2xl bg-sky-50 border border-sky-100 px-4 py-3">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-sky-500 mb-1">
                      <MapPin className="h-3 w-3" /> Pickup
                    </div>
                    <p className="text-sm font-bold text-slate-800">{ride.fromAddress || "Not specified"}</p>
                    {ride.fromLatitude && ride.fromLongitude && (
                      <a href={`https://www.google.com/maps?q=${ride.fromLatitude},${ride.fromLongitude}`}
                        target="_blank" rel="noopener noreferrer"
                        className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-sky-600 hover:text-sky-700 no-underline">
                        <ExternalLink className="h-3 w-3" /> View on Map
                      </a>
                    )}
                  </div>

                  {/* To */}
                  <div className="rounded-2xl bg-indigo-50 border border-indigo-100 px-4 py-3">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-indigo-500 mb-1">
                      <Navigation className="h-3 w-3" /> Drop-off
                    </div>
                    <p className="text-sm font-bold text-slate-800">
                      {ride.property?.title || ride.toAddress || "Not specified"}
                    </p>
                    {ride.toLatitude && ride.toLongitude && (
                      <a href={`https://www.google.com/maps?q=${ride.toLatitude},${ride.toLongitude}`}
                        target="_blank" rel="noopener noreferrer"
                        className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 no-underline">
                        <ExternalLink className="h-3 w-3" /> View on Map
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Arrival Information */}
          {(ride.arrivalType || ride.arrivalNumber || ride.pickupLocation) && (
            <div className="relative overflow-hidden bg-white rounded-3xl border border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.05)]">
              <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-3xl"
                style={{ background: "linear-gradient(180deg, #f59e0b 0%, #d97706 100%)" }} />
              <div className="pl-6 pr-6 pt-5 pb-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-7 w-7 rounded-xl flex items-center justify-center text-white"
                    style={{ background: "linear-gradient(135deg, #d97706, #f59e0b)" }}>
                    {arrivalIcon(ride.arrivalType)}
                  </div>
                  <h2 className="text-base font-bold text-slate-900">Arrival Information</h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {ride.pickupLocation && <InfoRow label="Pickup Location" value={ride.pickupLocation} />}
                  {ride.arrivalType && <InfoRow label="Arrival Type" value={ride.arrivalType} />}
                  {ride.arrivalNumber && (
                    <InfoRow
                      label={ride.arrivalType === "FLIGHT" ? "Flight No." : ride.arrivalType === "BUS" ? "Bus No." : ride.arrivalType === "TRAIN" ? "Train No." : ride.arrivalType === "FERRY" ? "Ferry No." : "Transport No."}
                      value={ride.arrivalNumber}
                    />
                  )}
                  {ride.transportCompany && (
                    <InfoRow
                      label={ride.arrivalType === "FLIGHT" ? "Airline" : ride.arrivalType === "BUS" ? "Bus Company" : ride.arrivalType === "TRAIN" ? "Train Operator" : ride.arrivalType === "FERRY" ? "Ferry Operator" : "Company"}
                      value={ride.transportCompany}
                    />
                  )}
                  {ride.arrivalTime && <InfoRow label="Arrival Time" value={formatTime(ride.arrivalTime)} />}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* â”€â”€ RIGHT / SIDEBAR â”€â”€ */}
        <div className="space-y-5">

          {/* Driver Card */}
          {ride.driver && (
            <div className="relative overflow-hidden rounded-3xl shadow-[0_2px_20px_rgba(3,105,161,0.12)]"
              style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 60%, #0369a1 100%)" }}>
              {/* Glow */}
              <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-20"
                style={{ background: "radial-gradient(circle, #38bdf8, transparent 70%)" }} />
              <div className="relative px-5 py-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-6 w-6 rounded-lg bg-white/15 flex items-center justify-center">
                    <User className="h-3.5 w-3.5 text-white" />
                  </div>
                  <h2 className="text-sm font-bold text-white/80 uppercase tracking-wide">Your Driver</h2>
                </div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-12 w-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-md"
                    style={{ background: "linear-gradient(135deg, rgba(56,189,248,0.25), rgba(99,102,241,0.20))", border: "1px solid rgba(255,255,255,0.15)" }}>
                    <User className="h-6 w-6 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-white text-base leading-tight">{ride.driver.name}</p>
                    {ride.driver.phone && (
                      <a href={`tel:${ride.driver.phone}`}
                        className="no-underline mt-1 inline-flex items-center gap-1 text-xs font-semibold text-sky-300 hover:text-sky-200 transition-colors">
                        <Phone className="w-3 h-3" />
                        {ride.driver.phone}
                      </a>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setShowChat(!showChat)}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-2xl py-2.5 text-sm font-bold transition-all active:scale-[0.98] hover:scale-[1.01]"
                  style={{ background: showChat ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.20)", color: "white" }}
                >
                  <MessageCircle className="w-4 h-4" />
                  {showChat ? "Hide Chat" : "Chat with Driver"}
                </button>
              </div>
            </div>
          )}

          {/* Payment Card */}
          <div className="relative overflow-hidden bg-white rounded-3xl border border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.05)]">
            <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-3xl"
              style={{ background: "linear-gradient(180deg, #86efac 0%, #059669 100%)" }} />
            <div className="pl-5 pr-5 pt-5 pb-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-7 w-7 rounded-xl flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, #059669, #10b981)" }}>
                  <Banknote className="h-3.5 w-3.5 text-white" />
                </div>
                <h2 className="text-base font-bold text-slate-900">Payment</h2>
              </div>
              <div className="space-y-3">
                {ride.amount && (
                  <div className="flex items-center justify-between rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Amount</span>
                    <span className="text-sm font-extrabold text-slate-900">
                      {Number(ride.amount).toLocaleString()} {ride.currency || "TZS"}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</span>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
                    ride.paymentStatus === "PAID"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-amber-50 text-amber-700 border border-amber-200"
                  }`}>
                    {ride.paymentStatus === "PAID"
                      ? <><CheckCircle className="h-3 w-3" /> Paid</>
                      : <><Clock className="h-3 w-3" /> {ride.paymentStatus || "Pending"}</>}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Property Card */}
          {ride.property && (
            <div className="relative overflow-hidden bg-white rounded-3xl border border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.05)]">
              <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-3xl"
                style={{ background: "linear-gradient(180deg, #c4b5fd 0%, #7c3aed 100%)" }} />
              <div className="pl-5 pr-5 pt-5 pb-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-7 w-7 rounded-xl flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg, #7c3aed, #a78bfa)" }}>
                    <Building2 className="h-3.5 w-3.5 text-white" />
                  </div>
                  <h2 className="text-base font-bold text-slate-900">Destination Property</h2>
                </div>
                <div className="rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3">
                  <p className="text-sm font-bold text-slate-800 leading-snug">{ride.property.title}</p>
                  {(ride.property.district || ride.property.regionName) && (
                    <p className="text-xs text-slate-500 mt-0.5">
                      {[ride.property.district, ride.property.regionName].filter(Boolean).join(", ")}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â• CHAT â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {showChat && ride.driver && currentUserId && (
        <div className="relative overflow-hidden bg-white rounded-3xl border border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.05)]">
          <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-3xl"
            style={{ background: "linear-gradient(180deg, #38bdf8 0%, #0369a1 100%)" }} />
          <div className="pl-6 pr-6 pt-5 pb-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-7 w-7 rounded-xl flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #1e3a5f, #0369a1)" }}>
                <MessageCircle className="h-3.5 w-3.5 text-white" />
              </div>
              <h2 className="text-base font-bold text-slate-900">Chat with {ride.driver.name}</h2>
            </div>
            <TransportChat
              bookingId={ride.id}
              currentUserId={currentUserId}
              currentUserType="PASSENGER"
              otherUserName={ride.driver.name}
              otherUserPhone={ride.driver.phone}
              className="h-[500px]"
            />
          </div>
        </div>
      )}
    </div>
  );
}
