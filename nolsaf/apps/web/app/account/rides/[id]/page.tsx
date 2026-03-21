"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import axios from "axios";
import {
  MapPin,
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
  Star,
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
  driver?: {
    id: number;
    name: string | null;
    email?: string | null;
    phone?: string | null;
    avatarUrl?: string | null;
    plateNumber?: string | null;
    vehiclePlate?: string | null;
    vehicleType?: string | null;
    vehicleMake?: string | null;
    rating?: number | null;
    isVipDriver?: boolean;
    operationArea?: string | null;
    district?: string | null;
    region?: string | null;
  };
  property?: { id: number; title: string; regionName?: string; district?: string };
  paymentStatus?: string;
  createdAt: string;
  updatedAt: string;
};

/* --- helpers --- */
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

type DriverBioInput = {
  name?: string | null;
  rating?: number | null;
  isVipDriver?: boolean;
  operationArea?: string | null;
  district?: string | null;
  vehicleMake?: string | null;
};

function pickExtendedBio(d: DriverBioInput): string {
  const first = (d.name ?? "").split(" ")[0] || "Your driver";
  if (d.isVipDriver)
    return `Exclusively trained for executive and long-distance travel, ${first} is one of NoLSAF\u2019 Premium-certified specialists. Clients receive complete discretion, immaculate presentation, and an on-time arrival record that only genuine professionalism builds \u2014 expect nothing less than first-class, every single journey.`;
  if (d.rating != null && d.rating >= 4.5)
    return `With a near-perfect rating earned across hundreds of journeys, ${first} has built a reputation that only consistent excellence creates. Composed under any condition, communicative when it counts, and unfailingly punctual \u2014 ${first} is the standard every NoLSAF driver aspires to.`;
  const area = d.operationArea || d.district;
  if (area)
    return `Nobody reads ${area} the way ${first} does. Every route is mentally mapped before the journey begins \u2014 peak-hour shortcuts, alternate roads, and the local instinct to adapt on the spot. Passengers arrive relaxed, on time, and in the best possible hands.`;
  if (d.vehicleMake)
    return `Behind the wheel of a ${d.vehicleMake}, ${first} treats every trip as a VIP assignment. The vehicle is inspected before each journey, kept spotless inside and out, and driven with the steady care that tells a passenger they are exactly where they should be.`;
  return `Background-checked, fully licensed, and trusted by hundreds of NoLSAF passengers across Tanzania. ${first} brings calm conviction to every route \u2014 from pickup to drop-off, reliability is not a policy here; it is simply how ${first} works, every single time.`;
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
  const [cardFlipped, setCardFlipped] = useState(false);

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

  /* --- Loading --- */
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

  /* --- Error --- */
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

      {/* --- HERO HEADER --- */}
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

      {/* --- BODY GRID --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* --- LEFT / MAIN --- */}
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

        {/* --- RIGHT / SIDEBAR --- */}
        <div className="space-y-5">

          {/* ===== Driver Physical ID Card ===== */}
          {ride.driver && (<>
            {/* Perspective wrapper — 3D flip card LANDSCAPE */}
            <div style={{ perspective: "1200px" }}>
              <div
                className="h-[380px] sm:h-[300px]"
                style={{
                  position: "relative",
                  transformStyle: "preserve-3d",
                  transition: "transform 0.7s cubic-bezier(0.4,0,0.2,1)",
                  transform: cardFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                }}
              >

                {/* ── FRONT FACE — LANDSCAPE ── */}
                <div
                  style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden" }}
                  className="rounded-[20px] overflow-hidden shadow-2xl cursor-default select-none"
                >
                  {/* bg */}
                  <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, #0b1e35 0%, #0f2d4a 48%, #0c4a6e 100%)" }} />
                  {/* left photo strip — always visible */}
                  <div className="absolute top-0 left-0 bottom-0 w-[110px] sm:w-[140px]" style={{ background: "linear-gradient(180deg, rgba(5,150,105,0.18) 0%, rgba(3,105,161,0.22) 100%)", borderRight: "1px solid rgba(5,150,105,0.18)" }} />
                  {/* decorative SVG */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 500 300" fill="none" preserveAspectRatio="xMidYMid slice" aria-hidden>
                    {/* concentric arcs top-right */}
                    <circle cx="480" cy="40" r="110" stroke="white" strokeOpacity="0.05" strokeWidth="1" fill="none" />
                    <circle cx="480" cy="40" r="78"  stroke="white" strokeOpacity="0.04" strokeWidth="1" fill="none" />
                    <circle cx="480" cy="40" r="48"  stroke="white" strokeOpacity="0.035" strokeWidth="1" fill="none" />
                    {/* road path behind photo strip */}
                    <path d="M60 300 Q70 200 90 150 Q105 110 110 0" stroke="white" strokeOpacity="0.06" strokeWidth="24" fill="none" strokeLinecap="round" />
                    <path d="M60 300 Q70 200 90 150 Q105 110 110 0" stroke="white" strokeOpacity="0.12" strokeWidth="1.5" strokeDasharray="10 8" fill="none" strokeLinecap="round" />
                    {/* fingerprint — centred on the right detail column ~(330,170) */}
                    <g transform="translate(310,90)" opacity="0.055">
                      {/* core loops */}
                      <ellipse cx="40" cy="80" rx="6"  ry="9"  stroke="white" strokeWidth="1.3" fill="none"/>
                      <ellipse cx="40" cy="80" rx="13" ry="17" stroke="white" strokeWidth="1.3" fill="none"/>
                      <ellipse cx="40" cy="80" rx="21" ry="27" stroke="white" strokeWidth="1.2" fill="none"/>
                      <ellipse cx="40" cy="80" rx="30" ry="38" stroke="white" strokeWidth="1.2" fill="none"/>
                      <ellipse cx="40" cy="80" rx="39" ry="49" stroke="white" strokeWidth="1.1" fill="none"/>
                      <ellipse cx="40" cy="80" rx="49" ry="60" stroke="white" strokeWidth="1.1" fill="none"/>
                      <ellipse cx="40" cy="80" rx="59" ry="71" stroke="white" strokeWidth="1.0" fill="none"/>
                      {/* open bottom arcs to give fingerprint feel */}
                      <path d="M10 130 Q40 150 70 130" stroke="white" strokeWidth="1.1" fill="none" strokeLinecap="round"/>
                      <path d="M2  118 Q40 142 78 118" stroke="white" strokeWidth="1.0" fill="none" strokeLinecap="round"/>
                      {/* centre dot */}
                      <circle cx="40" cy="80" r="2.5" fill="white"/>
                    </g>
                  </svg>
                  {/* top sheen */}
                  <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none" />
                  {/* left green accent line */}
                  <div className="absolute top-0 left-0 bottom-0 w-[3px]" style={{ background: "linear-gradient(180deg, #10b981 0%, #0369a1 100%)" }} />
                  {/* bottom green stripe */}
                  <div className="absolute bottom-0 left-[110px] sm:left-[140px] right-0 h-[3px]" style={{ background: "linear-gradient(90deg, #059669, #0369a1)" }} />

                  {/* FRONT CONTENT — side-by-side on all sizes */}
                  <div className="relative flex flex-row h-full">

                    {/* LEFT — photo column */}
                    <div className="w-[110px] sm:w-[140px] flex-shrink-0 flex flex-col items-center justify-center gap-2 px-2 sm:px-3">
                      <div
                        className="h-[88px] w-[88px] rounded-full overflow-hidden flex items-center justify-center flex-shrink-0"
                        style={{
                          border: "2.5px solid rgba(5,150,105,0.7)",
                          boxShadow: "0 0 0 4px rgba(5,150,105,0.13), 0 8px 28px rgba(0,0,0,0.5)",
                          background: "linear-gradient(135deg, rgba(56,189,248,0.2), rgba(5,150,105,0.18))",
                        }}
                      >
                        {ride.driver.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={ride.driver.avatarUrl} alt={ride.driver.name ?? "Driver"} className="h-full w-full object-cover" />
                        ) : (
                          <span className="font-black text-white" style={{ fontSize: "2rem" }}>
                            {(ride.driver.name ?? "?")[0].toUpperCase()}
                          </span>
                        )}
                      </div>
                      {/* verified pill */}
                      <div
                        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5"
                        style={{ background: "#059669", border: "1.5px solid #0b1e35" }}
                      >
                        <svg viewBox="0 0 8 8" className="h-2 w-2 flex-shrink-0">
                          <path d="M1.5 4L3.3 5.8L6.5 2.2" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                        </svg>
                        <span className="text-[7px] font-black uppercase tracking-widest text-white">Verified</span>
                      </div>
                    </div>

                    {/* RIGHT — details column */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between py-3 pr-4 pl-3">

                      {/* top: branding + route icon + flip */}
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40">NoLSAF</p>
                          <p className="text-[10px] font-black text-white/55 tracking-widest">DRIVER ID CARD</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setCardFlipped(true)}
                            className="flex-shrink-0 h-6 w-6 rounded-full flex items-center justify-center hover:bg-emerald-500/20 transition-colors"
                            style={{ border: "1px solid rgba(255,255,255,0.15)", background: "transparent" }}
                            aria-label="View driver profile"
                          >
                            <svg viewBox="0 0 10 10" className="h-3 w-3" fill="none" aria-hidden>
                              <path d="M3.5 2L6.5 5L3.5 8" stroke="rgba(255,255,255,0.45)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </button>
                          {/* Route / navigation icon replacing chip */}
                          <div
                            className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ background: "rgba(5,150,105,0.18)", border: "1px solid rgba(5,150,105,0.35)" }}
                          >
                            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
                              {/* steering wheel */}
                              <circle cx="12" cy="12" r="9" stroke="#10b981" strokeWidth="1.6" />
                              <circle cx="12" cy="12" r="2.5" stroke="#10b981" strokeWidth="1.4" />
                              <line x1="12" y1="9.5" x2="12" y2="3" stroke="#10b981" strokeWidth="1.4" strokeLinecap="round" />
                              <line x1="14.5" y1="13.5" x2="20.2" y2="16.8" stroke="#10b981" strokeWidth="1.4" strokeLinecap="round" />
                              <line x1="9.5" y1="13.5" x2="3.8" y2="16.8" stroke="#10b981" strokeWidth="1.4" strokeLinecap="round" />
                            </svg>
                          </div>
                        </div>
                      </div>

                      {/* name + title + stars */}
                      <div>
                        <p
                          className="font-black text-white uppercase leading-tight"
                          style={{ fontSize: "clamp(1.05rem, 4vw, 1.3rem)", letterSpacing: "-0.01em", textShadow: "0 2px 10px rgba(0,0,0,0.4)" }}
                        >
                          {ride.driver.name}
                        </p>
                        <p className="text-[8px] font-black uppercase tracking-[0.25em] text-emerald-400 mt-0.5">
                          {ride.driver.isVipDriver ? "✶ Premium Certified" : "NoLSAF Certified Driver"}
                        </p>
                        {ride.driver.rating != null && (
                          <div className="flex items-center gap-0.5 mt-0.5">
                            {[1,2,3,4,5].map((i) => (
                              <Star key={i} className="h-2.5 w-2.5"
                                style={{
                                  fill: i <= Math.round(ride.driver!.rating!) ? "#fbbf24" : "transparent",
                                  color: i <= Math.round(ride.driver!.rating!) ? "#fbbf24" : "rgba(255,255,255,0.18)",
                                }}
                              />
                            ))}
                            <span className="ml-1 text-[9px] font-black text-white/45">{ride.driver.rating.toFixed(1)}</span>
                          </div>
                        )}
                      </div>

                      {/* info grid */}
                      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                        <div>
                          <p className="text-[7px] font-bold uppercase tracking-widest text-white/35">ID No.</p>
                          <p className="text-[10px] font-black text-white tracking-wider mt-0.5">
                            NLS-{String(ride.driver.id).padStart(4,"0")}-{new Date(ride.createdAt).getFullYear()}
                          </p>
                        </div>
                        <div>
                          <p className="text-[7px] font-bold uppercase tracking-widest text-white/35">Plate No.</p>
                          <p className="text-[10px] font-black text-white tracking-wider mt-0.5">
                            {ride.driver.plateNumber || ride.driver.vehiclePlate || "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[7px] font-bold uppercase tracking-widest text-white/35">Vehicle</p>
                          <p className="text-[10px] font-black text-white mt-0.5 truncate">
                            {[ride.driver.vehicleMake, ride.driver.vehicleType].filter(Boolean).join(" · ") || ride.vehicleType || "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[7px] font-bold uppercase tracking-widest text-white/35">Region / District</p>
                          <p className="text-[10px] font-black text-white mt-0.5 truncate">
                            {ride.driver.operationArea || ride.driver.district || ride.driver.region || "Tanzania"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[7px] font-bold uppercase tracking-widest text-white/35">Languages</p>
                          <p className="text-[10px] font-black text-white mt-0.5">English · Kiswahili</p>
                        </div>
                        {/* barcode + active dot — shares last row with Languages */}
                        <div className="flex flex-col justify-center gap-1">
                          <svg width="100" height="20" viewBox="0 0 100 20" aria-hidden>
                            {(() => {
                              const bars: { x: number; w: number }[] = [];
                              let x = 0;
                              let s = Math.abs((ride.driver!.id * 6364136223846793005 + 1442695040888963407) | 0) >>> 0;
                              const next = () => { s = ((s * 1664525) + 1013904223) >>> 0; return s; };
                              while (x < 100) {
                                const barW = (next() % 3) + 1;
                                const gapW = (next() % 3) + 2;
                                bars.push({ x, w: barW });
                                x += barW + gapW;
                              }
                              return bars.map(({ x, w }) => (
                                <rect key={x} x={x} y={1} width={w} height={18} rx="0.5" fill="rgba(255,255,255,0.72)" />
                              ));
                            })()}
                          </svg>
                          <div className="inline-flex items-center gap-1">
                            <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75" />
                              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
                            </span>
                            <span className="text-[7px] font-bold uppercase tracking-widest text-white/35">Active</span>
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
                {/* END FRONT FACE */}

                {/* ── BACK FACE — LANDSCAPE ── */}
                <div
                  style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                  className="rounded-[20px] overflow-hidden shadow-2xl cursor-default select-none"
                >
                  {/* bg */}
                  <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, #0b1e35 0%, #0f2d4a 55%, #0c4a6e 100%)" }} />
                  {/* top stripe */}
                  <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-emerald-500 via-teal-400 to-sky-500" />
                  <div className="absolute top-[3px] left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/18 to-transparent pointer-events-none" />
                  <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 500 230" fill="none" preserveAspectRatio="xMidYMid slice" aria-hidden>
                    <circle cx="460" cy="200" r="130" stroke="white" strokeOpacity="0.04" strokeWidth="1" fill="none" />
                    <circle cx="460" cy="200" r="90"  stroke="white" strokeOpacity="0.03" strokeWidth="1" fill="none" />
                    <circle cx="40"  cy="40"  r="80"  stroke="white" strokeOpacity="0.04" strokeWidth="1" fill="none" />
                  </svg>

                  {/* BACK CONTENT — side-by-side on all sizes */}
                  <div className="relative flex flex-row h-full">

                    {/* LEFT — quote stripe */}
                    <div className="w-[5px] flex-shrink-0" style={{ background: "linear-gradient(180deg, #10b981 0%, #0369a1 100%)" }} />
                    <div className="hidden sm:flex w-[110px] sm:w-[140px] flex-shrink-0 flex-col justify-center items-center gap-3 px-3 border-r border-white/8">
                      {/* big quote mark */}
                      <span className="font-black leading-none select-none" style={{ fontSize: "5rem", color: "rgba(16,185,129,0.18)", lineHeight: 1 }}>&ldquo;</span>
                      <div className="text-center">
                        <p className="text-[7px] font-black uppercase tracking-[0.22em] text-emerald-400">About</p>
                        <p className="text-[7px] font-black uppercase tracking-[0.22em] text-emerald-400">Driver</p>
                      </div>
                      {/* pulsing dot */}
                      <div className="inline-flex items-center gap-1">
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75" />
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
                        </span>
                      </div>
                    </div>

                    {/* RIGHT — bio + commitments */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between py-3 sm:py-3.5 pr-4 pl-4 sm:pl-3">
                      <div className="flex items-start justify-between mb-2">
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/50">NoLSAF · Driver Profile</p>
                        <button
                          onClick={() => setCardFlipped(false)}
                          className="flex-shrink-0 ml-2 h-6 w-6 rounded-full flex items-center justify-center hover:bg-emerald-500/20 transition-colors"
                          style={{ border: "1px solid rgba(255,255,255,0.15)", background: "transparent" }}
                          aria-label="Back to ID card"
                        >
                          <svg viewBox="0 0 10 10" className="h-3 w-3" fill="none" aria-hidden>
                            <path d="M6.5 2L3.5 5L6.5 8" stroke="rgba(255,255,255,0.45)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                      </div>

                      {/* bio */}
                      <p className="text-[11px] leading-[1.7] text-white/75 mb-3">
                        {pickExtendedBio(ride.driver)}
                      </p>

                      {/* commitment pills — 2 columns */}
                      <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                        {[
                          "Safety-first on every road",
                          "On-time, every time",
                          "Licensed & NoLSAF-verified",
                          "Clean vehicle, smooth ride",
                        ].map((item, i) => (
                          <div key={i} className="flex items-center gap-2 min-w-0">
                            <span
                              className="flex-shrink-0 h-4 w-4 rounded-full flex items-center justify-center"
                              style={{ background: "rgba(5,150,105,0.25)", border: "1.5px solid rgba(5,150,105,0.5)" }}
                            >
                              <svg viewBox="0 0 6 6" className="h-2 w-2">
                                <path d="M1 3L2.5 4.5L5 1.5" stroke="#10b981" strokeWidth="1.4" fill="none" strokeLinecap="round" />
                              </svg>
                            </span>
                            <p className="text-[10.5px] font-semibold text-white/65 leading-tight truncate">{item}</p>
                          </div>
                        ))}
                      </div>

                      {/* footer */}
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-[8px] font-black uppercase tracking-widest text-white/30">NoLSAF © {new Date().getFullYear()}</p>
                        <p className="text-[8px] font-black tracking-widest text-white/30">
                          NLS-{String(ride.driver.id).padStart(4,"0")}
                        </p>
                      </div>
                    </div>

                  </div>
                </div>
                {/* END BACK FACE */}

              </div>
            </div>
            {/* end 3D flip wrapper */}
            {/* Action buttons below the ID card */}
            <div className="flex gap-2 mt-1">
              {ride.driver.phone && (
                <a
                  href={`tel:${ride.driver.phone}`}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold bg-slate-900 text-white border border-slate-700 hover:bg-slate-800 transition-colors no-underline"
                >
                  <Phone className="h-4 w-4" />
                  Call Driver
                </a>
              )}
              <button
                onClick={() => setShowChat(!showChat)}
                className={`${
                  ride.driver.phone ? "flex-1" : "w-full"
                } inline-flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold transition-colors ${
                  showChat
                    ? "bg-sky-700 text-white border border-sky-700"
                    : "bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100"
                }`}
              >
                <MessageCircle className="h-4 w-4" />
                {showChat ? "Hide Chat" : "Chat with Driver"}
              </button>
            </div>
          </>)}

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

      {/* --- CHAT --- */}
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
              otherUserName={ride.driver.name ?? undefined}
              otherUserPhone={ride.driver.phone ?? undefined}
              className="h-[500px]"
            />
          </div>
        </div>
      )}
    </div>
  );
}
