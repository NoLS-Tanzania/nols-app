"use client";

import React from "react";
import { createPortal } from "react-dom";
import {
  Trophy,
  MapPin,
  Clock,
  Users,
  Hourglass,
  Star,
  Car,
  Truck,
  Bike,
  Sparkles,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

export type AwardedTrip = {
  id: number;
  vehicleType?: string;
  scheduledDate: string;
  pickupTime?: string;
  fromAddress?: string;
  fromLatitude?: number;
  fromLongitude?: number;
  toAddress?: string;
  toLatitude?: number;
  toLongitude?: number;
  amount?: number;
  currency?: string;
  numberOfPassengers?: number;
  notes?: string;
  arrivalType?: string;
  arrivalNumber?: string;
  transportCompany?: string;
  arrivalTime?: string;
  pickupLocation?: string;
  property?: {
    id: number;
    title: string;
    regionName?: string;
    district?: string;
    ward?: string;
  };
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(dateString: string) {
  const d = new Date(dateString);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTime(dateString?: string) {
  if (!dateString) return null;
  const d = new Date(dateString);
  const h = d.getHours();
  const m = d.getMinutes();
  if (isNaN(h)) return null;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function buildMapsLink({
  lat,
  lng,
  address,
}: {
  lat?: number;
  lng?: number;
  address?: string;
}) {
  if (typeof lat === "number" && typeof lng === "number") {
    return `https://www.google.com/maps?q=${lat},${lng}`;
  }
  if (address) {
    return `https://www.google.com/maps/search/${encodeURIComponent(address)}`;
  }
  return null;
}

function pickupCountdown(scheduledDate: string): {
  text: string;
  urgent: boolean;
  low: boolean;
} {
  const diff = new Date(scheduledDate).getTime() - Date.now();
  if (diff <= 0) return { text: "Pickup now", urgent: true, low: false };
  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const urgent = diff < 60 * 60 * 1000;
  const low = !urgent && diff < 3 * 60 * 60 * 1000;
  let text = "";
  if (days > 0) text = `Pickup in ${days}d ${hours}h ${minutes}m`;
  else if (hours > 0) text = `Pickup in ${hours}h ${minutes}m`;
  else text = `Pickup in ${minutes}m`;
  return { text, urgent, low };
}

const getVehicleLabel = (type?: string) => {
  if (!type) return "Vehicle";
  if (type === "PREMIUM") return "VIP";
  return type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
};

function VehicleIcon({ type }: { type?: string }) {
  const cls = "h-5 w-5 text-white";
  if (type === "TRUCK" || type === "VAN") return <Truck className={cls} />;
  if (type === "BIKE" || type === "MOTORCYCLE") return <Bike className={cls} />;
  return <Car className={cls} />;
}

// ─── Motivational messages — rotate by trip id so it's stable per trip ────────

const AWARD_MESSAGES: { headline: string; body: string }[] = [
  {
    headline: "You've been chosen. Now shine.",
    body: "Not every driver makes the cut — but you did. Your consistency, professionalism, and dedication earned you this trip. Go deliver something unforgettable.",
  },
  {
    headline: "This trip belongs to you.",
    body: "Out of every available driver, the system picked you. That's not luck — that's your track record doing the talking. Make every kilometre count.",
  },
  {
    headline: "The best drivers earn the best trips.",
    body: "You've worked hard to build your reputation, and it shows. This awarded trip is proof that excellence gets noticed. Go make it count.",
  },
  {
    headline: "Congratulations — you earned this.",
    body: "Only drivers with the right scores, ratings, and reliability unlock awarded trips. You're one of them. Step up, show up, and deliver greatness.",
  },
  {
    headline: "Awarded. That says it all.",
    body: "An awarded trip means the platform trusts you with something important. A passenger is counting on you — and you've already proven you're up for it.",
  },
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function AwardedTripCard({
  trip,
  onClose,
}: {
  trip: AwardedTrip;
  onClose: () => void;
}) {
  const pickupMaps = buildMapsLink({
    lat: trip.fromLatitude,
    lng: trip.fromLongitude,
    address: trip.fromAddress,
  });
  const dropoffMaps = buildMapsLink({
    lat: trip.toLatitude,
    lng: trip.toLongitude,
    address: trip.toAddress || trip.property?.title,
  });

  const scheduledDateLabel = `${formatDate(trip.scheduledDate)}${
    formatTime(trip.scheduledDate) ? ` • ${formatTime(trip.scheduledDate)}` : ""
  }`;

  const countdown = pickupCountdown(trip.scheduledDate);

  const hasArrivalInfo = Boolean(
    trip.pickupLocation ||
      trip.arrivalType ||
      trip.transportCompany ||
      trip.arrivalNumber ||
      trip.arrivalTime
  );

  const message = AWARD_MESSAGES[trip.id % AWARD_MESSAGES.length];

  return createPortal(
    <div className="fixed inset-0 z-[9999] overflow-hidden" role="presentation">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-[4px]"
        onClick={onClose}
      />

      <div className="absolute inset-0 z-10 grid place-items-center px-3 py-4 sm:px-4 sm:py-6">
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Awarded trip details"
          className="relative flex flex-col w-full max-w-md overflow-hidden rounded-[2rem] h-[min(90svh,50rem)] border border-amber-400/20"
          style={{
            boxShadow:
              "0 32px_80px rgba(0,0,0,0.65), 0 0 80px rgba(251,191,36,0.10)",
          }}
        >
          {/* ══════════════════════════════════════
              PREMIUM DARK HEADER
          ══════════════════════════════════════ */}
          <div className="relative bg-slate-900 overflow-hidden px-5 pt-5 pb-5 flex-shrink-0">
            {/* Ambient glows — gold / amber for awarded */}
            <div className="pointer-events-none absolute -top-12 -right-12 h-52 w-52 rounded-full bg-amber-500/18 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-8 -left-8 h-36 w-36 rounded-full bg-yellow-400/10 blur-2xl" />
            <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-72 w-72 rounded-full bg-amber-400/5 blur-3xl" />
            {/* Gold accent line at bottom of header */}
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/60 to-transparent" />

            {/* ─ Row 1: vehicle chip + AWARDED badge ─ */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                {/* Vehicle icon in amber/orange pill */}
                <div className="flex-shrink-0 h-11 w-11 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-900/40">
                  <VehicleIcon type={trip.vehicleType} />
                </div>
                <div>
                  <div className="text-base font-black text-white tracking-tight leading-none">
                    {getVehicleLabel(trip.vehicleType)}
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-bold text-white/50 bg-white/8 border border-white/10 px-2 py-0.5 rounded-full">
                      #{trip.id}
                    </span>
                    <span className="text-[11px] text-white/40">
                      {scheduledDateLabel}
                    </span>
                  </div>
                </div>
              </div>

              {/* AWARDED badge — golden gradient, glowing */}
              <span className="inline-flex items-center gap-1.5 text-[11px] font-black px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-400 to-yellow-400 text-amber-950 border border-amber-300/50 shadow-md shadow-amber-500/40 flex-shrink-0">
                <Trophy className="h-3.5 w-3.5" />
                AWARDED
              </span>
            </div>

            {/* ─ Celebration banner ─ */}
            <div className="mt-4 rounded-2xl bg-gradient-to-r from-amber-500/12 via-yellow-400/8 to-amber-500/12 border border-amber-400/20 px-4 py-3.5">
              <div className="flex items-start gap-3">
                {/* Pulsing trophy */}
                <div className="relative flex-shrink-0 mt-0.5">
                  <div
                    className="absolute inset-0 rounded-full bg-amber-400/30 animate-ping"
                    style={{ animationDuration: "2.2s" }}
                  />
                  <div className="relative h-9 w-9 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center shadow-lg shadow-amber-900/50">
                    <Trophy className="h-4.5 w-4.5 text-white h-5 w-5" />
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-black text-amber-300 leading-tight tracking-tight">
                    {message.headline}
                  </div>
                  <div className="mt-1 text-[11px] text-amber-200/55 leading-relaxed">
                    {message.body}
                  </div>
                </div>
              </div>
            </div>

            {/* ─ Fare hero + countdown ─ */}
            <div className="mt-4 flex items-end justify-between gap-3">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-white/35 mb-1">
                  Fare
                </div>
                <div className="text-3xl sm:text-4xl font-black text-white leading-none tracking-tight">
                  {trip.amount ? Number(trip.amount).toLocaleString() : "—"}
                </div>
                <div className="text-sm font-bold text-amber-400 mt-1">
                  {trip.currency || "TZS"}
                </div>
              </div>

              {/* Pickup countdown chip */}
              <span
                className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-2xl border ${
                  countdown.urgent
                    ? "bg-rose-950/80 border-rose-500/70 text-rose-300"
                    : countdown.low
                    ? "bg-amber-950/60 border-amber-400/60 text-amber-300"
                    : "bg-white/5 border-white/15 text-white/70"
                }`}
              >
                <Hourglass className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="leading-tight">{countdown.text}</span>
              </span>
            </div>
          </div>

          {/* ══════════════════════════════════════
              SCROLLABLE BODY
          ══════════════════════════════════════ */}
          <div className="flex-1 min-h-0 overflow-y-auto bg-slate-50">
            <div className="p-4 space-y-3">

              {/* ─ Route ─ */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-4 pt-3 pb-0">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Route
                  </div>
                </div>
                <div className="px-4 pb-4 pt-3">

                  {/* Pickup node */}
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col items-center flex-shrink-0 pt-0.5">
                      <div className="h-3 w-3 rounded-full bg-[#02665e] ring-[3px] ring-[#02665e]/20" />
                      <div
                        className="w-px bg-gradient-to-b from-[#02665e]/50 to-slate-200 mt-1.5"
                        style={{ minHeight: 30 }}
                      />
                    </div>
                    <div className="flex-1 min-w-0 pb-3">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        Pickup
                      </div>
                      <div className="mt-0.5 text-sm font-bold text-slate-900 leading-snug">
                        {trip.fromAddress || "Not specified"}
                      </div>
                    </div>
                    {pickupMaps ? (
                      <a
                        href={pickupMaps}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-shrink-0 flex items-center gap-1 text-xs font-bold text-[#02665e] hover:text-[#014e47] mt-0.5 bg-[#02665e]/8 hover:bg-[#02665e]/15 px-2.5 py-1.5 rounded-xl border border-[#02665e]/20 transition-colors"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        Maps
                      </a>
                    ) : null}
                  </div>

                  {/* Drop-off node */}
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 pt-0.5">
                      <div className="h-3 w-3 rounded-full bg-rose-500 ring-[3px] ring-rose-500/20" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        Drop-off
                      </div>
                      <div className="mt-0.5 text-sm font-bold text-slate-900 leading-snug">
                        {trip.property?.title || trip.toAddress || "Not specified"}
                      </div>
                      {trip.property?.regionName ||
                      trip.property?.district ||
                      trip.property?.ward ? (
                        <div className="mt-0.5 text-xs text-slate-500 leading-snug">
                          {[
                            trip.property.ward,
                            trip.property.district,
                            trip.property.regionName,
                          ]
                            .filter(Boolean)
                            .join(", ")}
                        </div>
                      ) : null}
                    </div>
                    {dropoffMaps ? (
                      <a
                        href={dropoffMaps}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-shrink-0 flex items-center gap-1 text-xs font-bold text-[#02665e] hover:text-[#014e47] mt-0.5 bg-[#02665e]/8 hover:bg-[#02665e]/15 px-2.5 py-1.5 rounded-xl border border-[#02665e]/20 transition-colors"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        Maps
                      </a>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* ─ Info pills ─ */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="flex-shrink-0 h-9 w-9 rounded-xl bg-[#02665e]/10 flex items-center justify-center">
                      <Users className="w-4 h-4 text-[#02665e]" />
                    </div>
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        Passengers
                      </div>
                      <div className="text-base font-black text-slate-900 leading-none mt-0.5">
                        {trip.numberOfPassengers ?? "—"}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="flex-shrink-0 h-9 w-9 rounded-xl bg-amber-50 flex items-center justify-center">
                      <Clock className="w-4 h-4 text-amber-600" />
                    </div>
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        Pickup time
                      </div>
                      <div className="text-base font-black text-slate-900 leading-none mt-0.5">
                        {formatTime(trip.pickupTime || trip.scheduledDate) || "—"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ─ Special instructions ─ */}
              {trip.notes ? (
                <div className="rounded-2xl border border-amber-300 bg-amber-50 overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-amber-200 flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-amber-500 flex-shrink-0" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-800">
                      Special instructions
                    </span>
                  </div>
                  <div className="px-4 py-3 text-sm font-semibold text-amber-900 whitespace-pre-wrap leading-relaxed">
                    {trip.notes}
                  </div>
                </div>
              ) : null}

              {/* ─ Arrival & pickup info (collapsible) ─ */}
              {hasArrivalInfo ? (
                <details className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <summary className="flex items-center justify-between px-4 py-3 cursor-pointer select-none list-none">
                    <span className="text-sm font-bold text-slate-900">
                      Arrival &amp; pickup info
                    </span>
                    <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                      tap
                    </span>
                  </summary>
                  <div className="border-t border-slate-100 px-4 pb-4 pt-3">
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                      {trip.pickupLocation ? (
                        <div className="col-span-2">
                          <dt className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                            Specific pickup area
                          </dt>
                          <dd className="font-bold text-slate-900 mt-0.5 text-sm">
                            {trip.pickupLocation}
                          </dd>
                        </div>
                      ) : null}
                      {trip.arrivalType ? (
                        <div>
                          <dt className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                            Type
                          </dt>
                          <dd className="font-bold text-slate-900 mt-0.5 text-sm">
                            {trip.arrivalType}
                          </dd>
                        </div>
                      ) : null}
                      {trip.transportCompany ? (
                        <div>
                          <dt className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                            Company
                          </dt>
                          <dd className="font-bold text-slate-900 mt-0.5 text-sm">
                            {trip.transportCompany}
                          </dd>
                        </div>
                      ) : null}
                      {trip.arrivalNumber ? (
                        <div>
                          <dt className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                            Number
                          </dt>
                          <dd className="font-bold text-slate-900 mt-0.5 text-sm">
                            {trip.arrivalNumber}
                          </dd>
                        </div>
                      ) : null}
                      {trip.arrivalTime ? (
                        <div>
                          <dt className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                            Arrival time
                          </dt>
                          <dd className="font-bold text-slate-900 mt-0.5 text-sm">
                            {formatTime(trip.arrivalTime) || ""}
                          </dd>
                        </div>
                      ) : null}
                    </dl>
                  </div>
                </details>
              ) : null}

              {/* ─ Motivational footer card ─ */}
              <div className="rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-amber-500/15 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 h-9 w-9 rounded-xl bg-gradient-to-br from-amber-400/20 to-yellow-500/20 border border-amber-400/20 flex items-center justify-center mt-0.5">
                    <Star className="h-4 w-4 text-amber-400" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="h-3 w-3 text-amber-400/70 flex-shrink-0" />
                      <span className="text-[10px] font-black text-amber-300 uppercase tracking-wider">
                        You earned this
                      </span>
                    </div>
                    <div className="mt-1 text-[11px] text-white/45 leading-relaxed">
                      Awarded trips are reserved for drivers with outstanding performance. Your dedication, reliability, and professionalism got you here — now go make this trip exceptional.
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* ══════════════════════════════════════
              FOOTER
          ══════════════════════════════════════ */}
          <div className="bg-white border-t border-slate-200 px-3 py-3 sm:px-4 sm:py-4 flex-shrink-0">
            <button
              onClick={onClose}
              className="w-full py-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 active:scale-[0.97] text-slate-700 font-bold transition-all text-sm"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
