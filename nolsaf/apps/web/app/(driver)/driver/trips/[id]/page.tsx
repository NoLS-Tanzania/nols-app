"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  MapPin,
  CalendarDays,
  Clock,
  Car,
  Users,
  Banknote,
  Navigation,
  Plane,
  Train,
  Bus,
  Package,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";

type TripDetail = {
  id: number;
  status: string;
  vehicleType: string;
  scheduledDate: string;
  pickupTime?: string;
  dropoffTime?: string;
  fromRegion?: string;
  fromDistrict?: string;
  fromWard?: string;
  fromAddress?: string;
  fromLatitude?: number;
  fromLongitude?: number;
  toRegion?: string;
  toDistrict?: string;
  toWard?: string;
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
  paymentStatus?: string;
  tripCode?: string;
  isAssigned?: boolean;
  passenger?: { id: number; name?: string; phone?: string; email?: string };
  property?: { id: number; title?: string; regionName?: string; district?: string };
  claim?: { id: number; status: string; createdAt: string } | null;
  createdAt: string;
  updatedAt: string;
};

function fmtDate(d?: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function fmtTime(d?: string) {
  if (!d) return null;
  return new Date(d).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

const STATUS_STYLES: Record<string, string> = {
  ASSIGNED: "bg-emerald-100 text-emerald-800 border-emerald-200",
  CONFIRMED: "bg-blue-100 text-blue-800 border-blue-200",
  PENDING: "bg-amber-100 text-amber-800 border-amber-200",
  IN_PROGRESS: "bg-purple-100 text-purple-800 border-purple-200",
  COMPLETED: "bg-slate-100 text-slate-600 border-slate-200",
  CANCELLED: "bg-red-100 text-red-700 border-red-200",
};

const CLAIM_STATUS_STYLES: Record<string, string> = {
  ACCEPTED: "bg-emerald-100 text-emerald-800",
  PENDING: "bg-amber-100 text-amber-800",
  REJECTED: "bg-red-100 text-red-700",
};

function ArrivalIcon({ type }: { type?: string }) {
  const t = (type ?? "").toUpperCase();
  if (t === "FLIGHT") return <Plane size={16} className="text-[#02665e]" />;
  if (t === "TRAIN") return <Train size={16} className="text-[#02665e]" />;
  if (t === "BUS") return <Bus size={16} className="text-[#02665e]" />;
  return <Package size={16} className="text-[#02665e]" />;
}

export default function TripDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f0faf9] via-white to-[#e8f5f4]">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-[#02665e]/10 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-[#02665e]/10 transition-colors text-[#02665e]"
          aria-label="Go back"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-base font-semibold text-slate-800 truncate">Trip Details</h1>
        {trip?.tripCode && (
          <span className="ml-auto text-xs font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
            #{trip.tripCode}
          </span>
        )}
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 size={36} className="animate-spin text-[#02665e]/50" />
            <p className="text-sm text-slate-500">Loading trip details…</p>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <AlertCircle size={36} className="text-red-400" />
            <p className="text-sm font-medium text-red-600">{error}</p>
            <button
              onClick={() => router.back()}
              className="mt-2 text-xs text-[#02665e] underline"
            >
              Go back
            </button>
          </div>
        )}

        {/* Content */}
        {!loading && trip && (
          <>
            {/* Status + Assignment Hero */}
            <div className="rounded-2xl overflow-hidden shadow-sm border border-[#02665e]/10">
              <div className="bg-gradient-to-r from-[#02665e] to-[#028570] px-5 py-4">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <p className="text-white/70 text-xs font-medium uppercase tracking-wide mb-1">Booking status</p>
                    <span
                      className={`inline-flex items-center text-xs font-semibold px-3 py-1 rounded-full border ${STATUS_STYLES[trip.status] ?? "bg-white/20 text-white border-white/20"}`}
                    >
                      {trip.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  {trip.claim && (
                    <div className="text-right">
                      <p className="text-white/70 text-xs font-medium uppercase tracking-wide mb-1">Your claim</p>
                      <span
                        className={`inline-flex items-center text-xs font-semibold px-3 py-1 rounded-full ${CLAIM_STATUS_STYLES[trip.claim.status] ?? "bg-white/20 text-white"}`}
                      >
                        {trip.claim.status === "ACCEPTED" && <CheckCircle2 size={11} className="mr-1" />}
                        {trip.claim.status}
                      </span>
                    </div>
                  )}
                  {trip.isAssigned && !trip.claim && (
                    <div className="text-right">
                      <span className="inline-flex items-center text-xs font-semibold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800">
                        <CheckCircle2 size={11} className="mr-1" /> Assigned to you
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Date & vehicle */}
              <div className="bg-white px-5 py-4 grid grid-cols-2 divide-x divide-slate-100">
                <div className="pr-4">
                  <p className="text-xs text-slate-400 mb-0.5 flex items-center gap-1">
                    <CalendarDays size={12} /> Date
                  </p>
                  <p className="text-sm font-semibold text-slate-800">{fmtDate(trip.scheduledDate)}</p>
                  {trip.pickupTime && (
                    <p className="text-xs text-[#02665e] font-medium mt-0.5 flex items-center gap-1">
                      <Clock size={11} /> Pickup {fmtTime(trip.pickupTime)}
                    </p>
                  )}
                </div>
                <div className="pl-4">
                  <p className="text-xs text-slate-400 mb-0.5 flex items-center gap-1">
                    <Car size={12} /> Vehicle
                  </p>
                  <p className="text-sm font-semibold text-slate-800">{trip.vehicleType ?? "—"}</p>
                  {trip.numberOfPassengers != null && (
                    <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                      <Users size={11} /> {trip.numberOfPassengers} passenger{trip.numberOfPassengers !== 1 ? "s" : ""}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Route */}
            <div className="rounded-2xl bg-white border border-slate-100 shadow-sm px-5 py-4 space-y-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Route</p>

              <div className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#02665e] mt-1" />
                  <div className="w-0.5 flex-1 bg-gradient-to-b from-[#02665e] to-slate-200 my-1" />
                  <MapPin size={14} className="text-rose-500" />
                </div>
                <div className="flex-1 space-y-3">
                  <div>
                    <p className="text-xs text-slate-400">From</p>
                    <p className="text-sm font-semibold text-slate-800">
                      {[trip.fromWard, trip.fromDistrict, trip.fromRegion].filter(Boolean).join(", ") || trip.fromAddress || "—"}
                    </p>
                    {trip.fromAddress && (trip.fromWard || trip.fromDistrict || trip.fromRegion) && (
                      <p className="text-xs text-slate-500">{trip.fromAddress}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">To</p>
                    <p className="text-sm font-semibold text-slate-800">
                      {[trip.toWard, trip.toDistrict, trip.toRegion].filter(Boolean).join(", ") ||
                        trip.toAddress ||
                        trip.property?.title ||
                        "—"}
                    </p>
                    {trip.toAddress && (trip.toWard || trip.toDistrict || trip.toRegion) && (
                      <p className="text-xs text-slate-500">{trip.toAddress}</p>
                    )}
                  </div>
                </div>
              </div>

              {trip.pickupLocation && (
                <div className="pt-1 flex items-start gap-2 border-t border-slate-50">
                  <Navigation size={13} className="text-[#02665e] mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-slate-400">Pickup point</p>
                    <p className="text-sm font-medium text-slate-700">{trip.pickupLocation}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Fare */}
            {trip.amount != null && (
              <div className="rounded-2xl bg-white border border-slate-100 shadow-sm px-5 py-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <Banknote size={20} className="text-[#02665e]" />
                </div>
                <div>
                  <p className="text-xs text-slate-400">Trip fare</p>
                  <p className="text-xl font-bold text-slate-900">
                    {trip.currency ?? "TZS"}{" "}
                    <span>{Number(trip.amount).toLocaleString()}</span>
                  </p>
                  {trip.paymentStatus && (
                    <p className="text-xs text-slate-500 capitalize">{trip.paymentStatus.toLowerCase().replace(/_/g, " ")}</p>
                  )}
                </div>
              </div>
            )}

            {/* Arrival info */}
            {(trip.arrivalType || trip.arrivalNumber || trip.transportCompany || trip.arrivalTime) && (
              <div className="rounded-2xl bg-white border border-slate-100 shadow-sm px-5 py-4 space-y-2">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Arrival info</p>
                <div className="flex items-start gap-2">
                  <ArrivalIcon type={trip.arrivalType} />
                  <div className="space-y-0.5">
                    {trip.arrivalType && <p className="text-sm font-medium text-slate-800 capitalize">{trip.arrivalType.toLowerCase()}</p>}
                    {trip.transportCompany && <p className="text-xs text-slate-500">{trip.transportCompany}</p>}
                    {trip.arrivalNumber && (
                      <p className="text-xs text-slate-600">
                        Ref: <span className="font-mono font-semibold">{trip.arrivalNumber}</span>
                      </p>
                    )}
                    {trip.arrivalTime && <p className="text-xs text-slate-500">Arrival: {fmtTime(trip.arrivalTime)}</p>}
                  </div>
                </div>
              </div>
            )}

            {/* Notes */}
            {trip.notes && (
              <div className="rounded-2xl bg-white border border-slate-100 shadow-sm px-5 py-4 space-y-2">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-1">
                  <FileText size={12} /> Notes
                </p>
                <p className="text-sm text-slate-700 leading-relaxed">{trip.notes}</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
