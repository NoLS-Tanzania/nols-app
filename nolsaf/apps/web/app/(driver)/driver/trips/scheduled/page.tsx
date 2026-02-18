"use client";

import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import {
  Car,
  Bike,
  Truck,
  MapPin,
  Clock,
  Users,
  CheckCircle,
  Loader2,
  Hourglass,
  BadgeCheck,
  Trophy,
  Star,
} from "lucide-react";
import { useToast } from "@/hooks/useToast";

const api = axios.create({ baseURL: "", withCredentials: true });

type ScheduledTrip = {
  id: number;
  vehicleType?: string;
  claimCount?: number;
  claimsRemaining?: number;
  claimLimit?: number;
  claimOpensAt?: string;
  canClaim?: boolean;
  claimIneligibilityReason?: string | null;
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
  arrivalType?: string;
  arrivalNumber?: string;
  transportCompany?: string;
  arrivalTime?: string;
  pickupLocation?: string;
  notes?: string;
  status?: string;
  userRating?: number;
  userReview?: string;
  driverRating?: number;
  driverReview?: string;
  passenger?: {
    id: number;
    name: string;
    phone?: string;
    email?: string;
  };
  property?: {
    id: number;
    title: string;
    regionName?: string;
    district?: string;
    ward?: string;
  };
  createdAt: string;
};

const getVehicleLabel = (type?: string) => {
  if (!type) return "Vehicle";
  if (type === "PREMIUM") return "VIP";
  return type;
};

function formatDurationMs(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function buildGoogleMapsLink({
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
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  }
  return null;
}

function ClaimConfirmModal({
  open,
  confirming,
  termsAccepted,
  auctionAccepted,
  onToggleTerms,
  onToggleAuction,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  confirming: boolean;
  termsAccepted: boolean;
  auctionAccepted: boolean;
  onToggleTerms: (v: boolean) => void;
  onToggleAuction: (v: boolean) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  const canConfirm = termsAccepted && auctionAccepted && !confirming;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="presentation">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Confirm claim"
        className="bg-white rounded-2xl p-5 z-10 w-full max-w-md shadow-xl border border-slate-200"
      >
        <div className="font-semibold text-lg text-slate-900 mb-4">
          Are you sure you want to claim this trip?
        </div>

        <div className="space-y-3 mb-5">
          <label className="flex items-start gap-3 text-sm text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => onToggleTerms(e.target.checked)}
              className="mt-1 h-4 w-4"
            />
            <span>
              I agree to the{' '}
              <a href="/terms" target="_blank" rel="noreferrer" className="font-semibold text-[#02665e] underline">
                Terms of Service
              </a>
            </span>
          </label>

          <label className="flex items-start gap-3 text-sm text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={auctionAccepted}
              onChange={(e) => onToggleAuction(e.target.checked)}
              className="mt-1 h-4 w-4"
            />
            <span>I agree to NoLSAF Auction Policy</span>
          </label>
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            aria-label="Cancel"
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!canConfirm}
            aria-label="Confirm claim"
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#02665e] to-[#014e47] text-white font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {confirming ? "Claiming..." : "Agree & Claim"}
          </button>
        </div>
      </div>
    </div>
  );
}

function TripPreviewModal({
  trip,
  view,
  pickupCountdown,
  closePreview,
  openClaimConfirm,
  claiming,
  formatDate,
  formatTime,
  getVehicleIcon,
}: {
  trip: ScheduledTrip;
  view: "available" | "pending" | "awarded" | "finished";
  pickupCountdown: { text: string; classes: string } | null;
  closePreview: () => void;
  openClaimConfirm: (tripId: number) => void;
  claiming: number | null;
  formatDate: (dateString: string) => string;
  formatTime: (timeString?: string) => string | null;
  getVehicleIcon: (type?: string) => React.ReactNode;
}) {
  const pickupMaps = buildGoogleMapsLink({
    lat: trip.fromLatitude,
    lng: trip.fromLongitude,
    address: trip.fromAddress || trip.pickupLocation,
  });
  const dropoffMaps = buildGoogleMapsLink({
    lat: trip.toLatitude,
    lng: trip.toLongitude,
    address: trip.toAddress || trip.property?.title,
  });

  const scheduledDateLabel = `${formatDate(trip.scheduledDate)}${
    formatTime(trip.scheduledDate) ? ` • ${formatTime(trip.scheduledDate)}` : ""
  }`;

  const statusPill =
    view === "available"
      ? {
          label: "NEW",
          classes: "bg-sky-50 text-sky-900 border-sky-200",
          icon: (
            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-indigo-500 text-white text-[9px] font-black">
              N
            </span>
          ),
        }
      : view === "pending"
      ? {
          label: "PENDING REVIEW",
          classes: "bg-amber-50 text-amber-900 border-amber-200",
            icon: (
              <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-white text-[10px] font-black">
                !
              </span>
            ),
        }
      : view === "awarded"
        ? {
            label: "AWARDED",
            classes: "bg-emerald-50 text-emerald-900 border-emerald-200",
              icon: (
              <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 text-white shadow-sm">
                <Trophy className="h-3 w-3" />
                </span>
              ),
          }
        : view === "finished"
          ? {
              label: "FINISHED",
              classes: "bg-violet-50 text-violet-900 border-violet-200",
                icon: (
                  <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-violet-600 text-white text-[10px] font-black">
                    ★
                  </span>
                ),
            }
          : null;

  const hasArrivalInfo = Boolean(
    trip.pickupLocation || trip.arrivalType || trip.transportCompany || trip.arrivalNumber || trip.arrivalTime
  );
  const hasRatings = Boolean(trip.userRating || trip.userReview || trip.driverRating || trip.driverReview);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" role="presentation">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={closePreview} />

      <div className="relative z-10 flex min-h-full items-end justify-center px-3 pb-[calc(env(safe-area-inset-bottom)+0.6rem)] sm:items-center sm:px-3 sm:py-6">
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Trip details"
          className="bg-white w-full sm:max-w-md shadow-2xl border border-slate-200 max-h-[calc(100svh-(env(safe-area-inset-top)+1.25rem))] sm:max-h-[calc(100svh-3rem)] overflow-hidden flex flex-col rounded-t-3xl rounded-b-none sm:rounded-3xl"
        >
          {/* Mobile grab handle */}
          <div className="sm:hidden px-3 pt-3">
            <div className="mx-auto h-1 w-10 rounded-full bg-slate-200" />
          </div>

          {/* Header */}
          <div className="p-3 sm:p-4 border-b border-slate-200 bg-white">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-2">
                  <div className="text-2xl leading-none">{getVehicleIcon(trip.vehicleType)}</div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="font-extrabold text-slate-900 text-sm sm:text-base truncate">
                        {getVehicleLabel(trip.vehicleType)}
                      </div>
                      <div className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                        Booking #{trip.id}
                      </div>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-600 overflow-x-auto">
                      <span className="shrink-0">{scheduledDateLabel}</span>
                      {statusPill ? (
                        <span
                          className={
                            "inline-flex items-center gap-1 text-[11px] font-extrabold px-2 py-0.5 rounded-full border shrink-0 " +
                            statusPill.classes
                          }
                        >
                          {statusPill.icon}
                          {statusPill.label}
                        </span>
                      ) : null}
                      {pickupCountdown ? (
                        <span
                          className={
                            "inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border shrink-0 " +
                            pickupCountdown.classes
                          }
                        >
                          <Hourglass className="w-3.5 h-3.5" />
                          {pickupCountdown.text}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="text-[10px] font-semibold text-slate-500">Fare</div>
                <div className="text-sm font-extrabold text-[#02665e]">
                  {trip.amount ? `${Number(trip.amount).toLocaleString()} ${trip.currency || "TZS"}` : "n/a"}
                </div>
              </div>
            </div>
          </div>

          {/* Body (scrolls) */}
          <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4">
            <div className="space-y-3">
              {/* Route (compact) */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-[11px] font-bold tracking-wide text-slate-500 uppercase">Route</div>
                <div className="mt-3 space-y-2">
                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[11px] font-semibold text-slate-500">Pickup</div>
                        <div className="mt-0.5 text-sm font-semibold text-slate-900 line-clamp-1">
                          {trip.fromAddress || trip.pickupLocation || "Not specified"}
                        </div>
                      </div>
                      {pickupMaps ? (
                        <a
                          href={pickupMaps}
                          target="_blank"
                          rel="noreferrer"
                          className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-[#02665e] hover:text-[#014e47]"
                        >
                          <MapPin className="w-3.5 h-3.5" />
                          Maps
                        </a>
                      ) : null}
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[11px] font-semibold text-slate-500">Drop-off</div>
                        <div className="mt-0.5 text-sm font-semibold text-slate-900 line-clamp-1">
                          {trip.property?.title || trip.toAddress || "Not specified"}
                        </div>
                        {trip.property?.regionName || trip.property?.district || trip.property?.ward ? (
                          <div className="mt-0.5 text-xs text-slate-600 line-clamp-1">
                            {[trip.property?.ward, trip.property?.district, trip.property?.regionName]
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
                          className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-[#02665e] hover:text-[#014e47]"
                        >
                          <MapPin className="w-3.5 h-3.5" />
                          Maps
                        </a>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              {/* Key facts */}
              <div className="rounded-2xl border border-slate-200 bg-white p-3">
                <div className="text-[11px] font-bold tracking-wide text-slate-500 uppercase">Trip info</div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="inline-flex items-center gap-2">
                      <Users className="w-4 h-4 text-slate-400" />
                      <div>
                        <div className="text-[11px] font-semibold text-slate-500">Passengers</div>
                        <div className="text-sm font-semibold text-slate-900">
                          {trip.numberOfPassengers
                            ? `${trip.numberOfPassengers} passenger${trip.numberOfPassengers !== 1 ? "s" : ""}`
                            : "Not specified"}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="inline-flex items-center gap-2">
                      <Clock className="w-4 h-4 text-slate-400" />
                      <div>
                        <div className="text-[11px] font-semibold text-slate-500">Pickup time</div>
                        <div className="text-sm font-semibold text-slate-900">
                          {formatTime(trip.pickupTime || trip.scheduledDate) || "Not specified"}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {hasArrivalInfo ? (
                  <details className="mt-3 rounded-2xl border border-slate-200 bg-white">
                    <summary className="cursor-pointer select-none px-3 py-2 text-sm font-semibold text-slate-900 list-none">
                      Arrival & pickup info
                      <span className="ml-2 text-xs font-semibold text-slate-500">(tap)</span>
                    </summary>
                    <div className="px-3 pb-3">
                      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                        {trip.pickupLocation ? (
                          <div className="col-span-2">
                            <dt className="text-[11px] font-semibold text-slate-500">Specific pickup area</dt>
                            <dd className="font-semibold text-slate-900">{trip.pickupLocation}</dd>
                          </div>
                        ) : null}
                        {trip.arrivalType ? (
                          <div>
                            <dt className="text-[11px] font-semibold text-slate-500">Type</dt>
                            <dd className="font-semibold text-slate-900">{trip.arrivalType}</dd>
                          </div>
                        ) : null}
                        {trip.transportCompany ? (
                          <div>
                            <dt className="text-[11px] font-semibold text-slate-500">Company</dt>
                            <dd className="font-semibold text-slate-900">{trip.transportCompany}</dd>
                          </div>
                        ) : null}
                        {trip.arrivalNumber ? (
                          <div>
                            <dt className="text-[11px] font-semibold text-slate-500">Number</dt>
                            <dd className="font-semibold text-slate-900">{trip.arrivalNumber}</dd>
                          </div>
                        ) : null}
                        {trip.arrivalTime ? (
                          <div>
                            <dt className="text-[11px] font-semibold text-slate-500">Arrival time</dt>
                            <dd className="font-semibold text-slate-900">{formatTime(trip.arrivalTime) || ""}</dd>
                          </div>
                        ) : null}
                      </dl>
                    </div>
                  </details>
                ) : null}
              </div>

              {hasRatings ? (
                <details className="rounded-2xl border border-slate-200 bg-white">
                  <summary className="cursor-pointer select-none px-3 py-2 text-sm font-semibold text-slate-900 list-none">
                    Ratings & reviews
                    <span className="ml-2 text-xs font-semibold text-slate-500">(tap)</span>
                  </summary>
                  <div className="px-3 pb-3 text-sm text-slate-700 space-y-2">
                    {typeof trip.userRating === "number" ? (
                      <div className="inline-flex items-center gap-2">
                        <Star className="w-4 h-4 text-amber-500" />
                        <span>
                          <span className="text-slate-500">Passenger rated driver:</span>{" "}
                          <span className="font-semibold text-slate-900">{trip.userRating}/5</span>
                        </span>
                      </div>
                    ) : null}
                    {trip.userReview ? <div className="whitespace-pre-wrap">{trip.userReview}</div> : null}
                    {typeof trip.driverRating === "number" ? (
                      <div>
                        <span className="text-slate-500">Driver rated passenger:</span>{" "}
                        <span className="font-semibold text-slate-900">{trip.driverRating}/5</span>
                      </div>
                    ) : null}
                    {trip.driverReview ? <div className="whitespace-pre-wrap">{trip.driverReview}</div> : null}
                  </div>
                </details>
              ) : null}

              {trip.notes ? (
                <details className="rounded-2xl border border-amber-200 bg-amber-50">
                  <summary className="cursor-pointer select-none px-3 py-2 text-sm font-semibold text-amber-900 list-none">
                    Special instructions
                    <span className="ml-2 text-xs font-semibold text-amber-900/70">(tap)</span>
                  </summary>
                  <div className="px-3 pb-3 text-sm text-amber-900 whitespace-pre-wrap">{trip.notes}</div>
                </details>
              ) : null}
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-slate-200 bg-white p-2.5 sm:p-3">
            <div className="flex flex-row flex-wrap items-center justify-end gap-2">
              <button
                onClick={closePreview}
                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-colors"
              >
                Close
              </button>
              {view === "available" ? (
                <button
                  onClick={() => {
                    closePreview();
                    openClaimConfirm(trip.id);
                  }}
                  disabled={claiming !== null || trip.canClaim === false}
                  title={trip.canClaim === false ? trip.claimIneligibilityReason || "You can't claim this trip" : undefined}
                  className="px-3 py-2 rounded-xl bg-gradient-to-r from-[#02665e] to-[#014e47] text-white font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Claim this trip
                </button>
              ) : null}
            </div>

            {view === "available" && trip.canClaim === false && trip.claimIneligibilityReason ? (
              <div className="mt-2 text-xs font-semibold text-rose-700">{trip.claimIneligibilityReason}</div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DriverScheduledTripsPage() {
  const [trips, setTrips] = useState<ScheduledTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [claiming, setClaiming] = useState<number | null>(null);
  const [previewTrip, setPreviewTrip] = useState<ScheduledTrip | null>(null);
  const [selectedTripId, setSelectedTripId] = useState<number | null>(null);
  const [confirmTripId, setConfirmTripId] = useState<number | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [auctionAccepted, setAuctionAccepted] = useState(false);
  const [view, setView] = useState<"available" | "pending" | "awarded" | "finished">("available");
  const [filter, setFilter] = useState<"all" | "BODA" | "BAJAJI" | "CAR" | "XL" | "VIP">("all");
  const [, setTotal] = useState<number>(0);
  const [overview, setOverview] = useState<{ available: number; pending: number; awarded: number; finished: number }>(
    { available: 0, pending: 0, awarded: 0, finished: 0 }
  );
  const { success, error: showError } = useToast();

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const getPickupCountdown = (scheduledDate: string) => {
    const targetMs = new Date(scheduledDate).getTime();
    if (!Number.isFinite(targetMs)) return null;

    const diffMs = targetMs - nowMs;
    const absMs = Math.abs(diffMs);
    const totalSeconds = Math.max(0, Math.floor(absMs / 1000));
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const durationLabel =
      days > 0
        ? `${days}d ${hours}h ${minutes}m`
        : hours > 0
          ? `${hours}h ${minutes}m`
          : `${minutes}m ${seconds}s`;

    const text = diffMs >= 0 ? `Pickup in ${durationLabel}` : `Pickup overdue ${durationLabel}`;

    const urgency =
      diffMs < 0
        ? "overdue"
        : diffMs <= 30 * 60 * 1000
          ? "urgent"
          : diffMs <= 2 * 60 * 60 * 1000
            ? "soon"
            : "normal";

    const pulse = urgency === "urgent" || urgency === "overdue" ? "animate-pulse" : "";
    const classes =
      urgency === "overdue"
        ? `bg-rose-50 text-rose-900 border-rose-200 ${pulse}`
        : urgency === "urgent"
          ? `bg-rose-50 text-rose-900 border-rose-200 ${pulse}`
          : urgency === "soon"
            ? "bg-amber-50 text-amber-900 border-amber-200"
            : "bg-emerald-50 text-emerald-900 border-emerald-200";

    return { text, classes };
  };

  const loadTrips = useCallback(async () => {
    try {
      setLoading(true);
      let url = "/api/driver/trips/scheduled";
      const params = new URLSearchParams();
      if (view === "available") {
        if (filter !== "all") params.set("vehicleType", filter === "VIP" ? "PREMIUM" : filter);
        url = `/api/driver/trips/scheduled?${params.toString()}`;
      } else if (view === "pending") {
        url = `/api/driver/trips/claims/pending`;
      } else if (view === "awarded") {
        url = `/api/driver/trips/scheduled/assigned`;
      } else {
        url = `/api/driver/trips/claims/finished`;
      }

      const response = await api.get(url);
      setTrips(response.data.items || []);
      setTotal(Number(response.data.total || 0));
    } catch (err: any) {
      const msg = err?.response?.data?.error || "Failed to load scheduled trips";
      showError(msg);
    } finally {
      setLoading(false);
    }
  }, [filter, showError, view]);

  useEffect(() => {
    void loadTrips();
  }, [loadTrips]);

  useEffect(() => {
    setSelectedTripId((prev) => {
      if (!trips.length) return null;
      if (prev != null && trips.some((t) => t.id === prev)) return prev;
      return trips[0].id;
    });
  }, [trips]);

  useEffect(() => {
    // Best-effort fetch counts for sidebar badges.
    // Keep it lightweight by requesting pageSize=1 and using `total` from the response.
    const loadOverview = async () => {
      try {
        const [availableRes, pendingRes, awardedRes, finishedRes] = await Promise.all([
          api.get(`/api/driver/trips/scheduled?page=1&pageSize=1`),
          api.get(`/api/driver/trips/claims/pending?page=1&pageSize=1`),
          api.get(`/api/driver/trips/scheduled/assigned?page=1&pageSize=1`),
          api.get(`/api/driver/trips/claims/finished?page=1&pageSize=1`),
        ]);
        setOverview({
          available: Number(availableRes?.data?.total || 0),
          pending: Number(pendingRes?.data?.total || 0),
          awarded: Number(awardedRes?.data?.total || 0),
          finished: Number(finishedRes?.data?.total || 0),
        });
      } catch {
        // ignore
      }
    };
    loadOverview();
  }, []);

  const handleClaim = async (tripId: number) => {
    try {
      setClaiming(tripId);
      const response = await api.post(`/api/driver/trips/${tripId}/claim`);
      if (response.data.ok) {
        success("Claim submitted! Awaiting NoLSAF review.");
        // Remove from list
        setTrips((prev) => prev.filter((t) => t.id !== tripId));
        setSelectedTripId((prev) => (prev === tripId ? null : prev));
        return true;
      }
      return false;
    } catch (err: any) {
      const msg = err?.response?.data?.error || "Failed to claim trip";
      showError(msg);
      return false;
    } finally {
      setClaiming(null);
    }
  };

  const openClaimConfirm = (tripId: number) => {
    if (claiming !== null) return;

    const trip = trips.find((t) => t.id === tripId);
    if (trip?.canClaim === false) {
      showError(trip.claimIneligibilityReason || "You can't claim this trip");
      return;
    }

    setConfirmTripId(tripId);
    setTermsAccepted(false);
    setAuctionAccepted(false);
  };

  const closeClaimConfirm = () => {
    setConfirmTripId(null);
    setTermsAccepted(false);
    setAuctionAccepted(false);
  };

  const openPreview = (trip: ScheduledTrip) => {
    setPreviewTrip(trip);
  };

  const closePreview = () => {
    setPreviewTrip(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (timeString?: string) => {
    if (!timeString) return null;
    return new Date(timeString).toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getVehicleIcon = (type?: string): React.ReactNode => {
    const chip = (Icon: React.ComponentType<{ className?: string }>, chipClassName: string) => (
      <span
        className={
          "inline-flex h-10 w-10 items-center justify-center rounded-2xl border shadow-sm " +
          chipClassName
        }
      >
        <Icon className="h-5 w-5" />
      </span>
    );

    switch (type) {
      case "BODA":
        return chip(Bike, "bg-indigo-50 text-indigo-700 border-indigo-200");
      case "BAJAJI":
        return chip(Car, "bg-amber-50 text-amber-700 border-amber-200");
      case "CAR":
        return chip(Car, "bg-slate-50 text-slate-700 border-slate-200");
      case "XL":
        return chip(Truck, "bg-sky-50 text-sky-700 border-sky-200");
      case "PREMIUM":
      case "VIP":
        return chip(Car, "bg-gradient-to-br from-amber-200 via-yellow-100 to-amber-100 text-amber-950 border-amber-400");
      default:
        return chip(Car, "bg-slate-50 text-slate-700 border-slate-200");
    }
  };

  // selectedTripId is used to highlight the active list item.

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
        <div className="w-full max-w-6xl mx-auto p-4 sm:p-6">
          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm p-6">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-[#02665e]" />
              <div className="font-semibold text-slate-900">Loading your dashboard…</div>
            </div>
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="rounded-2xl border border-slate-200 bg-slate-50 p-5 animate-pulse">
                  <div className="h-4 w-32 bg-slate-200 rounded mb-3" />
                  <div className="h-3 w-48 bg-slate-200 rounded mb-2" />
                  <div className="h-3 w-40 bg-slate-200 rounded" />
                  <div className="mt-4 h-10 w-full bg-slate-200 rounded-xl" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const viewSubtitle =
    view === "available"
      ? "Preview trips and submit claims."
      : view === "pending"
        ? "Claims awaiting NoLSAF review."
        : view === "awarded"
          ? "Trips awarded to you (upcoming)."
          : "Completed trips and ratings.";

  const statusLabel =
    view === "pending" ? "Pending review" : view === "awarded" ? "Awarded" : view === "finished" ? "Finished" : null;

  const statusPill =
    view === "available"
      ? {
          label: "NEW",
          classes: "bg-sky-50 text-sky-900 border-sky-200",
          rowActive: "bg-sky-50/60",
          rowHover: "hover:bg-sky-50/40",
          rowBorder: "border-l-sky-400",
          icon: (
            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-indigo-500 text-white text-[9px] font-black">
              N
            </span>
          ),
        }
      : view === "pending"
      ? {
          label: "PENDING REVIEW",
          classes: "bg-amber-50 text-amber-900 border-amber-200",
          rowActive: "bg-amber-50/60",
          rowHover: "hover:bg-amber-50/40",
          rowBorder: "border-l-amber-400",
            icon: (
              <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-white text-[10px] font-black">
                !
              </span>
            ),
        }
      : view === "awarded"
        ? {
            label: "AWARDED",
            classes: "bg-emerald-50 text-emerald-900 border-emerald-200",
            rowActive: "bg-emerald-50/60",
            rowHover: "hover:bg-emerald-50/40",
            rowBorder: "border-l-emerald-500",
              icon: (
              <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 text-white shadow-sm">
                <Trophy className="h-3 w-3" />
                </span>
              ),
          }
        : view === "finished"
          ? {
              label: "FINISHED",
              classes: "bg-violet-50 text-violet-900 border-violet-200",
              rowActive: "bg-violet-50/60",
              rowHover: "hover:bg-violet-50/40",
              rowBorder: "border-l-violet-400",
                icon: (
                  <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-violet-600 text-white text-[10px] font-black">
                    ★
                  </span>
                ),
            }
          : null;

  return (
    <div
      className={
        "min-h-screen relative overflow-hidden " +
        (view === "awarded"
          ? "bg-gradient-to-b from-amber-50 via-white to-emerald-50"
          : view === "pending"
            ? "bg-gradient-to-b from-amber-50 via-white to-slate-50"
            : view === "finished"
              ? "bg-gradient-to-b from-violet-50 via-white to-slate-50"
              : "bg-gradient-to-b from-slate-50 via-white to-slate-50")
      }
    >
      {view === "awarded" || view === "pending" || view === "finished" ? (
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          {view === "awarded" ? (
            <>
              <div className="absolute -top-40 -right-40 h-[28rem] w-[28rem] rounded-full bg-gradient-to-br from-amber-300/35 to-yellow-200/10 blur-3xl" />
              <div className="absolute -bottom-44 -left-44 h-[30rem] w-[30rem] rounded-full bg-gradient-to-br from-emerald-300/25 to-sky-200/10 blur-3xl" />
              <div className="absolute top-8 right-8 h-24 w-24 rounded-3xl bg-gradient-to-br from-amber-400/15 to-yellow-300/5 border border-amber-200/40 rotate-12" />
              <Trophy className="absolute top-10 right-10 h-20 w-20 text-amber-400/15 rotate-12" />
            </>
          ) : view === "pending" ? (
            <>
              <div className="absolute -top-44 -right-44 h-[30rem] w-[30rem] rounded-full bg-gradient-to-br from-amber-300/30 to-orange-200/10 blur-3xl" />
              <div className="absolute -bottom-48 -left-48 h-[32rem] w-[32rem] rounded-full bg-gradient-to-br from-slate-300/20 to-amber-200/10 blur-3xl" />
              <div className="absolute top-8 right-8 h-24 w-24 rounded-3xl bg-gradient-to-br from-amber-400/12 to-orange-300/5 border border-amber-200/35 rotate-12" />
              <Hourglass className="absolute top-10 right-10 h-20 w-20 text-amber-500/12 rotate-12" />
            </>
          ) : (
            <>
              <div className="absolute -top-44 -right-44 h-[30rem] w-[30rem] rounded-full bg-gradient-to-br from-violet-300/25 to-fuchsia-200/10 blur-3xl" />
              <div className="absolute -bottom-48 -left-48 h-[32rem] w-[32rem] rounded-full bg-gradient-to-br from-slate-300/15 to-violet-200/10 blur-3xl" />
              <div className="absolute top-8 right-8 h-24 w-24 rounded-3xl bg-gradient-to-br from-violet-400/10 to-fuchsia-300/5 border border-violet-200/35 rotate-12" />
              <Star className="absolute top-10 right-10 h-20 w-20 text-violet-500/10 rotate-12" />
            </>
          )}
        </div>
      ) : null}

      <div className="relative z-10 w-full max-w-6xl mx-auto p-4 sm:p-6">
        {previewTrip ? (
          <TripPreviewModal
            trip={previewTrip}
            view={view}
            pickupCountdown={view === "awarded" ? getPickupCountdown(previewTrip.scheduledDate) : null}
            closePreview={closePreview}
            openClaimConfirm={openClaimConfirm}
            claiming={claiming}
            formatDate={formatDate}
            formatTime={formatTime}
            getVehicleIcon={getVehicleIcon}
          />
        ) : null}
        <ClaimConfirmModal
          open={confirmTripId !== null}
          confirming={confirmTripId !== null && claiming === confirmTripId}
          termsAccepted={termsAccepted}
          auctionAccepted={auctionAccepted}
          onToggleTerms={setTermsAccepted}
          onToggleAuction={setAuctionAccepted}
          onCancel={closeClaimConfirm}
          onConfirm={async () => {
            if (confirmTripId == null) return;
            if (!termsAccepted || !auctionAccepted) return;
            const ok = await handleClaim(confirmTripId);
            if (ok) closeClaimConfirm();
          }}
        />

        {/* Header */}
        <div className="mb-8">
          <div className="rounded-3xl border border-slate-200 bg-white/90 shadow-sm">
            <div className="p-5 sm:p-7">
              <div className="flex flex-col items-center text-center gap-5">
                <div>
                  <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#02665e]/10 border border-[#02665e]/20">
                    <BadgeCheck className="h-7 w-7 text-[#02665e]" />
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-3">Scheduled Trips</h1>
                  <p className="text-slate-600 mt-1 max-w-2xl mx-auto">{viewSubtitle}</p>
                </div>

                <div className="w-full max-w-3xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(
                [
                  {
                    key: "available" as const,
                    label: "Available",
                    count: overview.available,
                    activeRing: "ring-[#02665e]/30",
                    dot: "bg-[#02665e]",
                    soft: "bg-[#02665e]/10 text-[#02665e] border-[#02665e]/20",
                  },
                  {
                    key: "pending" as const,
                    label: "Pending",
                    count: overview.pending,
                    activeRing: "ring-amber-400/30",
                    dot: "bg-amber-500",
                    soft: "bg-amber-50 text-amber-900 border-amber-200",
                  },
                  {
                    key: "awarded" as const,
                    label: "Awarded",
                    count: overview.awarded,
                    activeRing: "ring-emerald-400/30",
                    dot: "bg-emerald-500",
                    soft: "bg-emerald-50 text-emerald-900 border-emerald-200",
                  },
                  {
                    key: "finished" as const,
                    label: "Finished",
                    count: overview.finished,
                    activeRing: "ring-violet-400/30",
                    dot: "bg-violet-500",
                    soft: "bg-violet-50 text-violet-900 border-violet-200",
                  },
                ]
              ).map((s) => {
                const active = view === s.key;
                return (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setView(s.key)}
                    aria-current={active ? "page" : undefined}
                    className={
                      "h-full text-left rounded-2xl bg-white border shadow-sm px-4 py-3 transition-all focus:outline-none focus:ring-4 " +
                      (active
                        ? `border-slate-300 ring-4 ${s.activeRing}`
                        : "border-slate-200 hover:border-slate-300 hover:shadow-md")
                    }
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-xs text-slate-500">{s.label}</div>
                        <div className="text-lg font-extrabold text-slate-900">{Number(s.count || 0).toLocaleString()}</div>
                      </div>
                      <div className={"inline-flex items-center gap-2 text-xs font-bold px-2 py-1 rounded-full border " + (active ? s.soft : "bg-slate-50 text-slate-700 border-slate-200")}
                      >
                        <span className={"h-2 w-2 rounded-full " + (active ? s.dot : "bg-slate-400")} />
                        View
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {view === "available" ? (
              <div className="w-full max-w-3xl mx-auto">
                <div className="mt-2 inline-flex flex-wrap items-center justify-center gap-1 rounded-2xl border border-slate-200 bg-slate-50 px-1 py-1">
                  {[
                    { key: "all" as const, label: "All" },
                    { key: "BODA" as const, label: "Boda" },
                    { key: "BAJAJI" as const, label: "Bajaji" },
                    { key: "CAR" as const, label: "Car" },
                    { key: "XL" as const, label: "XL" },
                    { key: "VIP" as const, label: "VIP" },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setFilter(tab.key)}
                      className={
                        "px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 " +
                        (filter === tab.key
                          ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                          : "text-slate-700 hover:text-slate-900")
                      }
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 items-start">
          <main className="space-y-4">
            {/* Trips */}
            {trips.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center shadow-sm">
                <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-slate-100 mb-4">
                  <Car className="h-7 w-7 text-slate-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">
                  {view === "available"
                    ? "No trips available"
                    : view === "pending"
                      ? "No pending claims"
                      : view === "awarded"
                        ? "No awarded claims"
                        : "No finished trips"}
                </h3>
                <p className="text-slate-600 max-w-xl mx-auto">
                  {view === "available"
                    ? filter === "all"
                      ? "There are no paid scheduled trips at the moment. Trips become claimable 72 hours before pickup time."
                      : `No ${filter} trips available. Try selecting a different vehicle type.`
                    : view === "pending"
                      ? "When you claim a trip, it will appear here while NoLSAF reviews it."
                      : view === "awarded"
                        ? "Trips awarded to you will show here."
                        : "Your completed trips will show here with ratings."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 items-start">
                {/* List */}
                <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                  <div className="divide-y divide-slate-100">
                    {trips.map((trip) => {
                      const active = selectedTripId === trip.id;
                      const dateLabel = `${formatDate(trip.scheduledDate)}${
                        formatTime(trip.scheduledDate) ? ` • ${formatTime(trip.scheduledDate)}` : ""
                      }`;
                      const pickupCountdown = view === "awarded" ? getPickupCountdown(trip.scheduledDate) : null;

                      return (
                        <div
                          key={trip.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => setSelectedTripId(trip.id)}
                          className={
                            "px-4 sm:px-5 py-4 transition-colors cursor-pointer [-webkit-tap-highlight-color:transparent] border-l-4 " +
                            (statusPill ? statusPill.rowBorder + " " : "border-l-transparent ") +
                            (active
                              ? statusPill
                                ? statusPill.rowActive
                                : "bg-slate-50"
                              : statusPill
                                ? statusPill.rowHover
                                : "hover:bg-slate-50")
                          }
                        >
                          <div className="flex items-start gap-4">
                            <div className="text-2xl mt-0.5">{getVehicleIcon(trip.vehicleType)}</div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <div className="font-extrabold text-slate-900 text-sm truncate">
                                      {getVehicleLabel(trip.vehicleType)}
                                    </div>
                                    {statusPill ? (
                                      <div
                                        className={
                                          "inline-flex items-center gap-1 text-[11px] font-extrabold px-2 py-0.5 rounded-full border " +
                                          statusPill.classes
                                        }
                                      >
                                        {statusPill.icon}
                                        {statusPill.label}
                                      </div>
                                    ) : null}
                                    {view === "finished" && typeof trip.userRating === "number" ? (
                                      <div className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200">
                                        <Star className="w-3.5 h-3.5" />
                                        {trip.userRating}/5
                                      </div>
                                    ) : null}
                                  </div>
                                  <div className="text-xs text-slate-600 mt-0.5">{dateLabel}</div>
                                </div>

                                <div className="shrink-0 min-w-[10.5rem] text-right">
                                  {trip.amount ? (
                                    <div className="font-extrabold text-[#02665e] text-sm leading-tight">
                                      {Number(trip.amount).toLocaleString()} {trip.currency || "TZS"}
                                    </div>
                                  ) : (
                                    <div className="text-xs text-slate-500">Fare: n/a</div>
                                  )}

                                  <div className="mt-1 flex flex-wrap justify-end gap-1">
                                    {trip.claimOpensAt ? (() => {
                                      const opensAtMs = new Date(trip.claimOpensAt).getTime();
                                      if (!Number.isFinite(opensAtMs)) return null;
                                      const isOpen = nowMs >= opensAtMs;
                                      const remaining = isOpen ? null : formatDurationMs(opensAtMs - nowMs);

                                      return (
                                        <div
                                          className={
                                            "inline-flex items-center gap-1 text-[11px] font-extrabold px-2 py-0.5 rounded-full border shadow-sm transition-all duration-300 " +
                                            (isOpen
                                              ? "bg-emerald-50 text-emerald-900 border-emerald-200"
                                              : "bg-slate-50 text-slate-700 border-slate-200")
                                          }
                                        >
                                          <Hourglass className={"w-3.5 h-3.5 " + (isOpen ? "text-emerald-600" : "text-slate-500")} />
                                          {isOpen ? "Claim open" : `Opens ${remaining}`}
                                        </div>
                                      );
                                    })() : null}

                                    {typeof trip.claimsRemaining === "number" ? (
                                      <div
                                        className={
                                          "inline-flex items-center gap-1 text-[11px] font-extrabold px-2 py-0.5 rounded-full border shadow-sm transition-all duration-300 " +
                                          (trip.claimsRemaining > 0
                                            ? "bg-amber-50 text-amber-900 border-amber-200"
                                            : "bg-rose-50 text-rose-900 border-rose-200")
                                        }
                                      >
                                        <Users className={"w-3.5 h-3.5 " + (trip.claimsRemaining > 0 ? "text-amber-700" : "text-rose-700")} />
                                        {trip.claimsRemaining}/{trip.claimLimit ?? 5}
                                      </div>
                                    ) : null}
                                  </div>
                                </div>
                              </div>

                              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                <div className="flex items-start gap-2 text-slate-700 min-w-0">
                                  <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
                                  <div className="min-w-0">
                                    <div className="text-[11px] font-semibold text-slate-500">Pickup</div>
                                    <div className="font-semibold text-slate-900 line-clamp-2">
                                      {trip.fromAddress || trip.pickupLocation || "Not specified"}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-start gap-2 text-slate-700 min-w-0">
                                  <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
                                  <div className="min-w-0">
                                    <div className="text-[11px] font-semibold text-slate-500">Drop-off</div>
                                    <div className="font-semibold text-slate-900 line-clamp-2">
                                      {trip.property?.title || trip.toAddress || "Not specified"}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="mt-3 flex items-center gap-3 text-xs text-slate-600 overflow-x-auto">
                                <div className="inline-flex items-center gap-1 shrink-0">
                                  <Users className="w-4 h-4 text-slate-400" />
                                  <span>{trip.numberOfPassengers ? `${trip.numberOfPassengers} pax` : "Passengers: n/a"}</span>
                                </div>
                                <div className="inline-flex items-center gap-1 shrink-0">
                                  <Clock className="w-4 h-4 text-slate-400" />
                                  <span>{formatTime(trip.pickupTime || trip.scheduledDate) || "Time: n/a"}</span>
                                </div>
                                {pickupCountdown ? (
                                  <div
                                    className={
                                      "inline-flex items-center gap-1 shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-full border " +
                                      pickupCountdown.classes
                                    }
                                  >
                                    <Hourglass className="w-3.5 h-3.5" />
                                    <span>{pickupCountdown.text}</span>
                                  </div>
                                ) : null}
                              </div>

                              <div className="mt-4 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openPreview(trip);
                                  }}
                                  className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-800 font-semibold text-xs hover:bg-slate-50 transition-colors [-webkit-tap-highlight-color:transparent]"
                                >
                                  Full details
                                </button>

                                {view === "available" ? (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openClaimConfirm(trip.id);
                                    }}
                                    disabled={claiming !== null || trip.canClaim === false}
                                    title={trip.canClaim === false ? trip.claimIneligibilityReason || "You can't claim this trip" : undefined}
                                    className="px-3 py-2 rounded-xl bg-gradient-to-r from-[#02665e] to-[#014e47] text-white font-semibold text-xs transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                  >
                                    {claiming === trip.id ? (
                                      <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Submitting…</span>
                                      </>
                                    ) : (
                                      <>
                                        <CheckCircle className="w-4 h-4" />
                                        <span>Submit claim</span>
                                      </>
                                    )}
                                  </button>
                                ) : (
                                  <div
                                    className={
                                      "px-3 py-2 rounded-xl border font-extrabold text-xs text-center " +
                                      (statusPill ? statusPill.classes : "bg-slate-50 text-slate-700 border-slate-200")
                                    }
                                  >
                                    {view === "awarded" ? "Awarded to you" : statusLabel}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

