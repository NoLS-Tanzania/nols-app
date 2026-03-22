"use client";

import { use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  MapPin,
  Car,
  Truck,
  Bike,
  Clock,
  Users,
  Hourglass,
  Plane,
  Train,
  Bus,
  Package,
  FileText,
  AlertCircle,
  Loader2,
  Trophy,
  CheckCircle2,
  Sparkles,
  BadgeCheck,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type TripDetail = {
  id: number;
  status: string;
  vehicleType?: string | null;
  scheduledDate: string;
  pickupTime?: string | null;
  dropoffTime?: string | null;
  fromRegion?: string | null;
  fromDistrict?: string | null;
  fromWard?: string | null;
  fromAddress?: string | null;
  fromLatitude?: number | null;
  fromLongitude?: number | null;
  toRegion?: string | null;
  toDistrict?: string | null;
  toWard?: string | null;
  toAddress?: string | null;
  toLatitude?: number | null;
  toLongitude?: number | null;
  amount?: number | null;
  currency?: string | null;
  numberOfPassengers?: number | null;
  notes?: string | null;
  arrivalType?: string | null;
  arrivalNumber?: string | null;
  transportCompany?: string | null;
  arrivalTime?: string | null;
  pickupLocation?: string | null;
  paymentStatus?: string | null;
  tripCode?: string | null;
  isAssigned?: boolean;
  passenger?: { id: number; name?: string | null; phone?: string | null; email?: string | null } | null;
  property?: { id: number; title?: string | null; regionName?: string | null; district?: string | null; ward?: string | null } | null;
  claim?: { id: number; status: string; createdAt: string } | null;
  createdAt: string;
  updatedAt: string;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(d?: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-GB", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
  });
}

function fmtTime(d?: string | null) {
  if (!d) return null;
  const date = new Date(d);
  const h = date.getHours();
  const m = date.getMinutes();
  if (isNaN(h)) return null;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function pickupCountdown(scheduledDate: string, pickupTime?: string | null) {
  const ref = pickupTime || scheduledDate;
  const diff = new Date(ref).getTime() - Date.now();
  if (diff <= 0) return { text: "Pickup now", urgent: true, low: false };
  const totalSec = Math.floor(diff / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const urgent = diff < 60 * 60 * 1000;
  const low = !urgent && diff < 3 * 60 * 60 * 1000;
  let text = "";
  if (days > 0) text = `In ${days}d ${hours}h ${minutes}m`;
  else if (hours > 0) text = `In ${hours}h ${minutes}m`;
  else text = `In ${minutes}m`;
  return { text, urgent, low };
}

function buildMaps({ lat, lng, address }: { lat?: number | null; lng?: number | null; address?: string | null }) {
  if (typeof lat === "number" && typeof lng === "number") {
    return `https://www.google.com/maps?q=${lat},${lng}`;
  }
  if (address) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  return null;
}

function getVehicleLabel(type?: string | null) {
  if (!type) return null;
  if (type === "PREMIUM") return "VIP Premium";
  return type.charAt(0) + type.slice(1).toLowerCase();
}

function VehicleIcon({ type, cls }: { type?: string | null; cls?: string }) {
  const c = cls ?? "h-6 w-6 text-white";
  if (type === "TRUCK" || type === "VAN") return <Truck className={c} />;
  if (type === "BIKE" || type === "MOTORCYCLE" || type === "BODA") return <Bike className={c} />;
  return <Car className={c} />;
}

function ArrivalIcon({ type, cls }: { type?: string | null; cls?: string }) {
  const c = cls ?? "h-4 w-4 text-white";
  const t = (type ?? "").toUpperCase();
  if (t === "FLIGHT") return <Plane className={c} />;
  if (t === "TRAIN") return <Train className={c} />;
  if (t === "BUS") return <Bus className={c} />;
  return <Package className={c} />;
}

const MOTIV_MSGS = [
  { headline: "This trip is yours — deliver greatness.", sub: "Your reputation earned this booking. Show up, shine, and make every kilometre count." },
  { headline: "You earned this. Go make it unforgettable.", sub: "Every great driver started the same way — one trip at a time. This one is yours." },
  { headline: "Confidence wins trips. Yours did.", sub: "Not every driver gets here. You did. Go deliver something worth remembering." },
  { headline: "The best drivers get the best trips.", sub: "Your track record got you to this point. Now finish what you started." },
  { headline: "Step up. A passenger is counting on you.", sub: "Reliability and professionalism got you this trip. Keep the standard high." },
];

const CONFIRMED_STATUS = new Set(["ASSIGNED", "CONFIRMED", "IN_PROGRESS"]);
const STATUS_LABEL: Record<string, string> = {
  ASSIGNED: "Assigned to you",
  CONFIRMED: "Confirmed",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  PENDING: "Pending",
  PENDING_ASSIGNMENT: "Awaiting driver",
  CANCELLED: "Cancelled",
  CANCELED: "Cancelled",
};

// ─── Main page ────────────────────────────────────────────────────────────────

export default function TripDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [, forceUpdate] = useState(0);

  // Tick every minute to keep countdown fresh
  useEffect(() => {
    tickRef.current = setInterval(() => forceUpdate((n) => n + 1), 60_000);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch(`/api/driver/trips/${encodeURIComponent(id)}`, {
          credentials: "include",
          signal: controller.signal,
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setError(body.error ?? `Error ${res.status}`);
        } else {
          setTrip(await res.json());
        }
      } catch (e: any) {
        if (e.name !== "AbortError") setError("Failed to load trip details.");
      } finally {
        setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [id]);

  // ─ Loading ─
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-4">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-[#02665e]/30 animate-ping" style={{ animationDuration: "2s" }} />
          <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-[#02665e] to-[#028570] flex items-center justify-center shadow-lg">
            <Loader2 size={28} className="animate-spin text-white" />
          </div>
        </div>
        <p className="text-white/50 text-sm font-medium">Loading trip details…</p>
      </div>
    );
  }

  // ─ Error ─
  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-500/15 flex items-center justify-center">
          <AlertCircle size={28} className="text-red-400" />
        </div>
        <div>
          <p className="text-white font-bold text-base">{error}</p>
          <p className="text-white/40 text-sm mt-1">This trip may no longer be accessible.</p>
        </div>
        <button onClick={() => router.back()} className="mt-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-sm font-semibold transition-colors">
          Go back
        </button>
      </div>
    );
  }

  if (!trip) return null;

  // ─ Derived values ─
  const motiv = MOTIV_MSGS[trip.id % MOTIV_MSGS.length];
  const countdown = pickupCountdown(trip.scheduledDate, trip.pickupTime);
  const isPositiveStatus = CONFIRMED_STATUS.has(trip.status);
  const claimAccepted = trip.claim?.status === "ACCEPTED";
  const claimPending = trip.claim?.status === "PENDING";
  const showMotiv = isPositiveStatus || claimAccepted;

  // Smart location display: prefer address, fall back to region/district/ward
  const fromDisplay =
    trip.fromAddress ||
    [trip.fromWard, trip.fromDistrict, trip.fromRegion].filter(Boolean).join(", ") ||
    null;
  const toDisplay =
    trip.toAddress ||
    trip.property?.title ||
    [trip.toWard, trip.toDistrict, trip.toRegion].filter(Boolean).join(", ") ||
    null;
  const toSub = trip.property
    ? [trip.property.ward, trip.property.district, trip.property.regionName].filter(Boolean).join(", ")
    : null;

  const pickupMaps = buildMaps({ lat: trip.fromLatitude, lng: trip.fromLongitude, address: fromDisplay });
  const dropoffMaps = buildMaps({ lat: trip.toLatitude, lng: trip.toLongitude, address: toDisplay });
  const hasArrival = !!(trip.pickupLocation || trip.arrivalType || trip.transportCompany || trip.arrivalNumber || trip.arrivalTime);
  const separatePickupPoint = trip.pickupLocation && trip.pickupLocation !== fromDisplay;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* ══════════════════════════════════════════════════════
          DARK HERO HEADER
      ══════════════════════════════════════════════════════ */}
      <div className="relative bg-slate-900 overflow-hidden flex-shrink-0">
        {/* Ambient glows */}
        <div className="pointer-events-none absolute -top-12 -right-12 h-56 w-56 rounded-full bg-[#02665e]/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-8 -left-8 h-40 w-40 rounded-full bg-[#02665e]/12 blur-2xl" />
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#02665e]/50 to-transparent" />

        {/* Back + trip code */}
        <div className="relative z-10 flex items-center justify-between px-4 pt-4 pb-1">
          <button
            onClick={() => router.back()}
            className="flex items-center justify-center w-9 h-9 rounded-full bg-white/8 hover:bg-white/16 border border-white/10 transition-colors text-white"
            aria-label="Go back"
          >
            <ArrowLeft size={18} />
          </button>
          {trip.tripCode && (
            <span className="text-[10px] font-mono text-white/35 bg-white/5 border border-white/8 px-2.5 py-1 rounded-full truncate max-w-[180px]">
              #{trip.tripCode}
            </span>
          )}
        </div>

        {/* Vehicle icon + status */}
        <div className="relative z-10 px-5 pt-3 pb-2 flex items-center gap-3">
          <div className="flex-shrink-0 h-12 w-12 rounded-2xl bg-gradient-to-br from-[#02665e] to-[#028a78] flex items-center justify-center shadow-lg shadow-[#02665e]/40">
            <VehicleIcon type={trip.vehicleType} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-lg font-black text-white leading-tight tracking-tight">
              {getVehicleLabel(trip.vehicleType) ?? "Scheduled Trip"}
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                isPositiveStatus
                  ? "bg-emerald-400/20 text-emerald-300 border border-emerald-400/30"
                  : trip.status === "COMPLETED"
                  ? "bg-white/10 text-white/50 border border-white/10"
                  : "bg-amber-400/20 text-amber-300 border border-amber-400/30"
              }`}>
                {isPositiveStatus && <CheckCircle2 size={9} />}
                {STATUS_LABEL[trip.status] ?? trip.status}
              </span>
              {claimAccepted && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-400 text-amber-950">
                  <Trophy size={9} /> AWARDED
                </span>
              )}
              {claimPending && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-white/60 border border-white/10">
                  <Hourglass size={9} /> Claim pending
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Motivational banner (only for positive outcomes) */}
        {showMotiv && (
          <div className="relative z-10 mx-5 mt-2 mb-1 rounded-2xl bg-gradient-to-r from-[#02665e]/20 via-[#028570]/12 to-[#02665e]/20 border border-[#02665e]/30 px-4 py-3">
            <div className="flex items-start gap-3">
              <div className="relative flex-shrink-0 mt-0.5">
                <div className="absolute inset-0 rounded-full bg-[#02665e]/40 animate-ping" style={{ animationDuration: "2.5s" }} />
                <div className="relative h-8 w-8 rounded-full bg-gradient-to-br from-[#02665e] to-[#028a78] flex items-center justify-center shadow-md">
                  <Sparkles size={14} className="text-white" />
                </div>
              </div>
              <div className="min-w-0">
                <div className="text-[13px] font-black text-emerald-300 leading-tight">{motiv.headline}</div>
                <div className="mt-0.5 text-[11px] text-white/45 leading-relaxed">{motiv.sub}</div>
              </div>
            </div>
          </div>
        )}

        {/* Fare hero + countdown chip */}
        <div className="relative z-10 px-5 pt-4 pb-5 flex items-end justify-between gap-3">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-white/35 mb-1">Trip fare</div>
            {trip.amount != null ? (
              <>
                <div className="text-4xl font-black text-white leading-none tracking-tight">
                  {Number(trip.amount).toLocaleString()}
                </div>
                <div className="text-sm font-bold text-[#02c8a7] mt-1">{trip.currency ?? "TZS"}</div>
              </>
            ) : (
              <div className="text-2xl font-black text-white/30 leading-none">Fare TBD</div>
            )}
          </div>
          <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-2xl border flex-shrink-0 ${
            countdown.urgent
              ? "bg-rose-950/80 border-rose-500/60 text-rose-300"
              : countdown.low
              ? "bg-amber-950/60 border-amber-400/50 text-amber-300"
              : "bg-white/6 border-white/12 text-white/60"
          }`}>
            <Hourglass size={13} className="flex-shrink-0" />
            {countdown.text}
          </span>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          SCROLLABLE BODY
      ══════════════════════════════════════════════════════ */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-4 py-5 space-y-3">

          {/* Date & time */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-[#02665e]/10 flex items-center justify-center">
              <Clock size={18} className="text-[#02665e]" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Date & time</div>
              <div className="text-sm font-bold text-slate-900">{fmtDate(trip.scheduledDate) ?? "—"}</div>
              {fmtTime(trip.pickupTime || trip.scheduledDate) && (
                <div className="mt-0.5 text-xs font-semibold text-[#02665e]">
                  Pickup at {fmtTime(trip.pickupTime || trip.scheduledDate)}
                </div>
              )}
              {trip.dropoffTime && fmtTime(trip.dropoffTime) && (
                <div className="mt-0.5 text-xs text-slate-500">Drop-off by {fmtTime(trip.dropoffTime)}</div>
              )}
            </div>
          </div>

          {/* Route */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 pt-3 pb-0">
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Route</div>
            </div>
            <div className="px-4 pb-4 pt-3">
              {/* Pickup node */}
              <div className="flex items-start gap-3">
                <div className="flex flex-col items-center flex-shrink-0 pt-1">
                  <div className="h-3 w-3 rounded-full bg-[#02665e] ring-[3px] ring-[#02665e]/20" />
                  <div className="w-px bg-gradient-to-b from-[#02665e]/50 to-slate-200 mt-1.5" style={{ minHeight: 32 }} />
                </div>
                <div className="flex-1 min-w-0 pb-4">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Pickup</div>
                  <div className="mt-0.5 text-sm font-bold text-slate-900 leading-snug">
                    {fromDisplay ?? <span className="text-slate-400 font-normal italic text-xs">Location not specified</span>}
                  </div>
                </div>
                {pickupMaps && (
                  <a href={pickupMaps} target="_blank" rel="noreferrer"
                    className="flex-shrink-0 flex items-center gap-1 text-xs font-bold text-[#02665e] hover:text-[#014e47] mt-0.5 bg-[#02665e]/8 hover:bg-[#02665e]/15 px-2.5 py-1.5 rounded-xl border border-[#02665e]/20 transition-colors">
                    <MapPin size={12} /> Maps
                  </a>
                )}
              </div>
              {/* Drop-off node */}
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 pt-1">
                  <div className="h-3 w-3 rounded-full bg-rose-500 ring-[3px] ring-rose-500/20" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Drop-off</div>
                  <div className="mt-0.5 text-sm font-bold text-slate-900 leading-snug">
                    {toDisplay ?? <span className="text-slate-400 font-normal italic text-xs">Destination not specified</span>}
                  </div>
                  {toSub && <div className="mt-0.5 text-xs text-slate-500">{toSub}</div>}
                </div>
                {dropoffMaps && (
                  <a href={dropoffMaps} target="_blank" rel="noreferrer"
                    className="flex-shrink-0 flex items-center gap-1 text-xs font-bold text-[#02665e] hover:text-[#014e47] mt-0.5 bg-[#02665e]/8 hover:bg-[#02665e]/15 px-2.5 py-1.5 rounded-xl border border-[#02665e]/20 transition-colors">
                    <MapPin size={12} /> Maps
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Meeting point (if separate from pickup address) */}
          {separatePickupPoint && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center">
                <MapPin size={18} className="text-rose-500" />
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Meeting point</div>
                <div className="mt-0.5 text-sm font-semibold text-slate-800">{trip.pickupLocation}</div>
              </div>
            </div>
          )}

          {/* Stats pills */}
          {(trip.numberOfPassengers != null || trip.vehicleType) && (
            <div className={`grid gap-3 ${trip.numberOfPassengers != null && trip.vehicleType ? "grid-cols-2" : "grid-cols-1"}`}>
              {trip.numberOfPassengers != null && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3.5 flex items-center gap-2.5">
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-[#02665e]/10 flex items-center justify-center">
                    <Users size={17} className="text-[#02665e]" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Passengers</div>
                    <div className="text-xl font-black text-slate-900 leading-none mt-0.5">{trip.numberOfPassengers}</div>
                  </div>
                </div>
              )}
              {trip.vehicleType && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3.5 flex items-center gap-2.5">
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-[#02665e]/10 flex items-center justify-center">
                    <VehicleIcon type={trip.vehicleType} cls="h-5 w-5 text-[#02665e]" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Vehicle</div>
                    <div className="text-sm font-black text-slate-900 leading-none mt-0.5">{getVehicleLabel(trip.vehicleType)}</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Arrival info */}
          {hasArrival && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Arrival info</div>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-[#02665e]/10 flex items-center justify-center">
                  <ArrivalIcon type={trip.arrivalType} cls="h-5 w-5 text-[#02665e]" />
                </div>
                <div className="space-y-0.5">
                  {trip.arrivalType && <div className="text-sm font-bold text-slate-900 capitalize">{trip.arrivalType.toLowerCase()} arrival</div>}
                  {trip.transportCompany && <div className="text-xs font-medium text-slate-600">{trip.transportCompany}</div>}
                  {trip.arrivalNumber && <div className="text-xs text-slate-600">Ref: <span className="font-mono font-semibold">{trip.arrivalNumber}</span></div>}
                  {trip.arrivalTime && <div className="text-xs text-slate-500">Arrives: {fmtTime(trip.arrivalTime)}</div>}
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          {trip.notes && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1">
                <FileText size={11} /> Special instructions
              </div>
              <p className="text-sm text-slate-700 leading-relaxed">{trip.notes}</p>
            </div>
          )}

          {/* Claim status callout */}
          {trip.claim && !claimAccepted && (
            <div className={`rounded-2xl border px-4 py-4 ${claimPending ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200"}`}>
              <div className="flex items-center gap-2">
                <Hourglass size={16} className={claimPending ? "text-amber-600" : "text-red-500"} />
                <p className="text-sm font-bold text-slate-800">
                  {claimPending ? "Your claim is under review" : "Claim not selected"}
                </p>
              </div>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                {claimPending
                  ? "The admin is reviewing all claims for this trip. You will be notified once a decision is made."
                  : "This trip was awarded to another driver. Keep going — there are more trips ahead."}
              </p>
            </div>
          )}

          {/* Assigned callout */}
          {trip.isAssigned && (
            <div className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 px-4 py-4">
              <div className="flex items-center gap-2">
                <BadgeCheck size={16} className="text-[#02665e]" />
                <p className="text-sm font-bold text-[#02665e]">You are the assigned driver</p>
              </div>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                This trip is confirmed in your schedule. Report on time and deliver an excellent experience.
              </p>
            </div>
          )}

          <div className="h-6" />
        </div>
      </div>
    </div>
  );
}
