"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import { Car, MapPin, Star, User, CheckCircle, Calendar, ArrowRight, Phone, Navigation, Eye, Clock, Gauge, Route } from "lucide-react";
import Link from "next/link";

const api = axios.create({ baseURL: "", withCredentials: true });

type Ride = {
  id: number;
  scheduledDate: string;
  pickupTime?: string;
  dropoffTime?: string;
  fromRegion?: string;
  fromDistrict?: string;
  fromWard?: string;
  fromAddress?: string;
  toRegion?: string;
  toDistrict?: string;
  toWard?: string;
  toAddress?: string;
  driver?: {
    id: number;
    name: string;
    phone?: string;
  };
  property?: {
    id: number;
    title: string;
  };
  status: string;
  amount?: number;
  rating?: number;
  isValid: boolean;
  createdAt: string;
};

function SkeletonPulse({ className = "" }: { className?: string }) {
  return <div className={`rounded-full bg-white/10 animate-pulse ${className}`} />;
}

function RideCardSkeleton() {
  return (
    <div className="relative overflow-hidden bg-white rounded-3xl border border-slate-100 shadow-[0_2px_20px_rgba(0,0,0,0.06)] p-5 sm:p-6">
      <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-3xl bg-gradient-to-b from-cyan-400 via-blue-500 to-indigo-500 opacity-40" />
      <div className="flex flex-col gap-4 pl-3">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-slate-100 animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-40 rounded-full bg-slate-200 animate-pulse" />
            <div className="h-3 w-28 rounded-full bg-slate-100 animate-pulse" />
          </div>
          <div className="h-6 w-20 rounded-full bg-slate-100 animate-pulse" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl bg-slate-50 border border-slate-100 p-3 space-y-2">
              <div className="h-3 w-16 rounded-full bg-slate-200 animate-pulse" />
              <div className="h-4 w-24 rounded-full bg-slate-100 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function MyRidesPage() {
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "scheduled" | "completed" | "expired">("all");
  const [entered, setEntered] = useState(false);
  const [, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRides();
  }, []);

  // Gentle mount animation
  useEffect(() => {
    const t = window.requestAnimationFrame(() => setEntered(true));
    return () => window.cancelAnimationFrame(t);
  }, []);

  const loadRides = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get("/api/customer/rides");
      setRides(response.data.items || []);
    } catch (err: any) {
      const msg = err?.response?.data?.error || "Failed to load rides";
      setError(msg);
      try {
        window.dispatchEvent(
          new CustomEvent("nols:toast", {
            detail: { type: "error", title: "Rides", message: msg, duration: 4500 },
          })
        );
      } catch {}
    } finally {
      setLoading(false);
    }
  };

  const filteredRides = rides.filter((ride) => {
    if (filter === "scheduled") return ride.isValid;
    if (filter === "completed") return !ride.isValid && ride.status === "COMPLETED";
    if (filter === "expired") return !ride.isValid && ride.status !== "COMPLETED";
    return true;
  });

  const scheduledCount = rides.filter((r) => r.isValid).length;
  const completedCount = rides.filter((r) => !r.isValid && r.status === "COMPLETED").length;
  const expiredCount = rides.filter((r) => !r.isValid && r.status !== "COMPLETED").length;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (timeString?: string) => {
    if (!timeString) return "N/A";
    return new Date(timeString).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatLocation = (ride: Ride, type: "from" | "to") => {
    const parts = [];
    if (type === "from") {
      if (ride.fromAddress) parts.push(ride.fromAddress);
      if (ride.fromWard) parts.push(ride.fromWard);
      if (ride.fromDistrict) parts.push(ride.fromDistrict);
      if (ride.fromRegion) parts.push(ride.fromRegion);
    } else {
      if (ride.property?.title) parts.push(ride.property.title);
      if (ride.toAddress) parts.push(ride.toAddress);
      if (ride.toWard) parts.push(ride.toWard);
      if (ride.toDistrict) parts.push(ride.toDistrict);
      if (ride.toRegion) parts.push(ride.toRegion);
    }
    return parts.length > 0 ? parts.join(", ") : "Not specified";
  };

  const getStatusLabel = (ride: Ride) => {
    if (!ride.isValid) {
      return ride.status === "COMPLETED" ? "Completed" : "Expired";
    }
    return ride.status === "CONFIRMED" ? "Confirmed" : "Scheduled";
  };

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-6">
        {/* Header skeleton */}
        <div
          className="relative overflow-hidden rounded-3xl p-8 sm:p-10"
          style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 55%, #0369a1 100%)" }}
        >
          {/* Decorative speed lines */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-10">
            {[12, 30, 50, 68, 82].map((top, i) => (
              <div
                key={i}
                className="absolute h-px bg-white rounded-full animate-pulse"
                style={{ top: `${top}%`, left: "5%", right: "5%", animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </div>
          <div className="relative flex flex-col items-center text-center gap-4">
            <SkeletonPulse className="h-16 w-16 rounded-2xl" />
            <SkeletonPulse className="h-8 w-44" />
            <SkeletonPulse className="h-4 w-64" />
            <div className="flex gap-3 mt-2">
              {[80, 96, 80].map((w, i) => (
                <SkeletonPulse key={i} className={`h-8 w-${w === 80 ? "20" : "24"} rounded-full`} />
              ))}
            </div>
          </div>
        </div>
        {/* Filter skeleton */}
        <div className="flex justify-center">
          <div className="inline-flex gap-2 rounded-2xl bg-slate-100 p-1.5 border border-slate-200">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-9 w-24 rounded-xl bg-white animate-pulse" />
            ))}
          </div>
        </div>
        {/* Cards skeleton */}
        <div className="space-y-4">
          <RideCardSkeleton />
          <RideCardSkeleton />
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
      {/* ═══════════════ PREMIUM HEADER ═══════════════ */}
      <div
        className="relative overflow-hidden rounded-3xl shadow-[0_4px_32px_rgba(3,105,161,0.25)]"
        style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 52%, #0369a1 100%)" }}
      >
        {/* Speed-line decorations */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 opacity-[0.07]">
            {[8, 22, 38, 55, 70, 85].map((top, i) => (
              <div
                key={i}
                className="absolute h-px rounded-full"
                style={{
                  top: `${top}%`,
                  left: `${5 + i * 2}%`,
                  right: `${5 + (5 - i) * 2}%`,
                  background: "linear-gradient(90deg, transparent, white, transparent)",
                }}
              />
            ))}
          </div>
          {/* Glowing orb */}
          <div
            className="absolute -right-16 -top-16 h-64 w-64 rounded-full opacity-20"
            style={{ background: "radial-gradient(circle, #38bdf8 0%, transparent 70%)" }}
          />
          <div
            className="absolute -left-8 bottom-0 h-40 w-40 rounded-full opacity-10"
            style={{ background: "radial-gradient(circle, #818cf8 0%, transparent 70%)" }}
          />
        </div>

        <div className="relative px-6 py-10 sm:px-10 sm:py-12">
          <div className="flex flex-col items-center text-center gap-4">
            {/* Icon with glow ring */}
            <div className="relative">
              <div className="absolute inset-0 rounded-2xl bg-cyan-400/30 blur-md scale-110" />
              <div
                className="relative h-16 w-16 rounded-2xl flex items-center justify-center shadow-lg"
                style={{ background: "linear-gradient(135deg, rgba(56,189,248,0.25) 0%, rgba(99,102,241,0.2) 100%)", border: "1px solid rgba(255,255,255,0.15)" }}
              >
                <Car className="h-8 w-8 text-white drop-shadow-md" />
              </div>
            </div>

            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight drop-shadow">
                My Rides
              </h1>
              <p className="mt-1.5 text-sm sm:text-base text-white/60 font-medium">
                Your complete transportation journey history
              </p>
            </div>

            {/* Stats chips */}
            <div className="flex flex-wrap justify-center gap-2 mt-1">
              <span className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold backdrop-blur-sm"
                style={{ background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.18)", color: "#bae6fd" }}>
                <Route className="h-3.5 w-3.5" />
                {rides.length} Total
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold backdrop-blur-sm"
                style={{ background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.18)", color: "#86efac" }}>
                <CheckCircle className="h-3.5 w-3.5" />
                {scheduledCount} Scheduled
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold backdrop-blur-sm"
                style={{ background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.18)", color: "#c4b5fd" }}>
                <Gauge className="h-3.5 w-3.5" />
                {completedCount} Completed
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════ FILTER TABS ═══════════════ */}
      <div className="flex justify-center">
        <div className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-slate-100/80 border border-slate-200 p-1.5 shadow-sm flex-wrap">
          {[
            { key: "all" as const, label: "All", count: rides.length },
            { key: "scheduled" as const, label: "Scheduled", count: scheduledCount },
            { key: "completed" as const, label: "Completed", count: completedCount },
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
                  "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold whitespace-nowrap transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/30 focus-visible:ring-offset-1",
                  active
                    ? "text-white shadow-md"
                    : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300",
                ].join(" ")}
                style={active ? { background: "linear-gradient(135deg, #1e3a5f 0%, #0369a1 100%)", border: "none" } : {}}
              >
                <span>{t.label}</span>
                <span
                  className={[
                    "inline-flex min-w-[1.3rem] items-center justify-center rounded-full px-1.5 py-0.5 text-xs font-bold",
                    active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600",
                  ].join(" ")}
                >
                  {t.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ═══════════════ EMPTY STATE ═══════════════ */}
      {filteredRides.length === 0 ? (
        <div className="relative overflow-hidden rounded-3xl border border-slate-100 bg-white p-12 text-center shadow-[0_2px_20px_rgba(0,0,0,0.05)]">
          <div className="pointer-events-none absolute inset-0 opacity-[0.03]"
            style={{ background: "radial-gradient(circle at 50% 0%, #0369a1, transparent 60%)" }} />
          <div className="relative">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl shadow-md"
              style={{ background: "linear-gradient(135deg, #1e3a5f 0%, #0369a1 100%)" }}>
              <Car className="h-8 w-8 text-white" />
            </div>
            <div className="mt-5 text-xl font-bold text-slate-900">No rides found</div>
            <div className="mt-2 text-sm text-slate-500 max-w-xs mx-auto leading-relaxed">
              {filter === "scheduled"
                ? "You don't have any scheduled rides at the moment."
                : filter === "completed"
                ? "You haven't completed any rides yet."
                : filter === "expired"
                ? "You don't have any expired rides."
                : "When you book a ride, it will appear here for easy access."}
            </div>
            {filter === "all" && (
              <div className="mt-7 flex justify-center">
                <Link
                  href="/public/properties"
                  className="group no-underline inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3 text-sm font-semibold text-white shadow-md hover:shadow-lg active:scale-[0.99] transition-all"
                  style={{ background: "linear-gradient(135deg, #1e3a5f 0%, #0369a1 100%)" }}
                >
                  Book a ride
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                </Link>
              </div>
            )}
          </div>
        </div>
      ) : (

      /* ═══════════════ RIDE CARDS ═══════════════ */
        <div className="space-y-4">
          {filteredRides.map((ride) => {
            const isActive = ride.isValid;
            const isCompleted = !ride.isValid && ride.status === "COMPLETED";
            const accentGradient = isActive
              ? "linear-gradient(180deg, #38bdf8 0%, #0369a1 100%)"
              : isCompleted
              ? "linear-gradient(180deg, #86efac 0%, #059669 100%)"
              : "linear-gradient(180deg, #fca5a5 0%, #dc2626 100%)";

            return (
              <div
                key={ride.id}
                className={`group relative overflow-hidden bg-white rounded-3xl border shadow-[0_2px_16px_rgba(0,0,0,0.05)] transition-all duration-200 hover:-translate-y-[2px] ${isActive ? "border-sky-100 hover:shadow-[0_6px_32px_rgba(3,105,161,0.12)]" : isCompleted ? "border-emerald-100 hover:shadow-[0_6px_32px_rgba(5,150,105,0.12)]" : "border-red-100 hover:shadow-[0_6px_32px_rgba(220,38,38,0.12)]"}`}
              >
                {/* Left accent bar */}
                <div
                  className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-3xl"
                  style={{ background: accentGradient }}
                />

                {/* Subtle top gradient wash */}
                <div
                  className="pointer-events-none absolute top-0 left-0 right-0 h-24 opacity-[0.03]"
                  style={{ background: isActive ? "linear-gradient(180deg, #0369a1, transparent)" : isCompleted ? "linear-gradient(180deg, #059669, transparent)" : "linear-gradient(180deg, #dc2626, transparent)" }}
                />

                <div className="relative pl-5 pr-5 pt-5 pb-5 sm:pl-6 sm:pr-6 sm:pt-6 sm:pb-5">

                  {/* ── Top row: icon + date + status badge ── */}
                  <div className="flex flex-wrap items-center gap-3">
                    <div
                      className="h-11 w-11 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm"
                      style={{ background: isActive ? "linear-gradient(135deg, #e0f2fe, #bae6fd)" : isCompleted ? "linear-gradient(135deg, #dcfce7, #bbf7d0)" : "linear-gradient(135deg, #fee2e2, #fecaca)" }}
                    >
                      <Car className={`h-5 w-5 ${isActive ? "text-sky-600" : isCompleted ? "text-emerald-600" : "text-red-500"}`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-bold text-slate-900 leading-tight">
                        {formatDate(ride.scheduledDate)}
                      </h3>
                      {ride.pickupTime && (
                        <div className="flex items-center gap-1 mt-0.5 text-xs text-slate-500">
                          <Clock className="h-3 w-3" />
                          Pickup at {formatTime(ride.pickupTime)}
                        </div>
                      )}
                    </div>

                    {/* Status badge */}
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                        isActive
                          ? "bg-sky-50 text-sky-700 border border-sky-200"
                          : isCompleted
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-red-50 text-red-600 border border-red-200"
                      }`}
                    >
                      {isActive ? (
                        <CheckCircle className="h-3.5 w-3.5" />
                      ) : isCompleted ? (
                        <CheckCircle className="h-3.5 w-3.5" />
                      ) : (
                        <Calendar className="h-3.5 w-3.5" />
                      )}
                      {getStatusLabel(ride)}
                    </span>
                  </div>

                  {/* ── Route visualizer ── */}
                  <div className="mt-4 flex items-stretch gap-3">
                    {/* Dot + line track */}
                    <div className="flex flex-col items-center gap-0 pt-3 pb-3 flex-shrink-0">
                      <div className="h-2.5 w-2.5 rounded-full bg-sky-500 shadow-sm ring-2 ring-sky-200" />
                      <div className="flex-1 w-px border-l-2 border-dashed border-slate-200 my-1" />
                      <div className="h-2.5 w-2.5 rounded-full bg-indigo-500 shadow-sm ring-2 ring-indigo-200" />
                    </div>

                    {/* From / To labels */}
                    <div className="flex-1 flex flex-col justify-between gap-2">
                      <div className="rounded-2xl bg-sky-50/70 border border-sky-100 px-3.5 py-2.5">
                        <div className="flex items-center gap-1.5 text-[10px] font-semibold text-sky-500 uppercase tracking-wide mb-0.5">
                          <MapPin className="h-3 w-3" />
                          From
                        </div>
                        <div className="text-sm font-semibold text-slate-800 line-clamp-1">
                          {formatLocation(ride, "from")}
                        </div>
                      </div>
                      <div className="rounded-2xl bg-indigo-50/70 border border-indigo-100 px-3.5 py-2.5">
                        <div className="flex items-center gap-1.5 text-[10px] font-semibold text-indigo-500 uppercase tracking-wide mb-0.5">
                          <Navigation className="h-3 w-3" />
                          To
                        </div>
                        <div className="text-sm font-semibold text-slate-800 line-clamp-1">
                          {formatLocation(ride, "to")}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ── Info chips row ── */}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <div className="inline-flex items-center gap-1.5 rounded-xl bg-slate-50 border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      {formatDate(ride.scheduledDate)}
                    </div>
                    {ride.pickupTime && (
                      <div className="inline-flex items-center gap-1.5 rounded-xl bg-slate-50 border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        {formatTime(ride.pickupTime)}
                      </div>
                    )}
                    {ride.amount && (
                      <div className="inline-flex items-center gap-1.5 rounded-xl bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs font-semibold text-amber-700">
                        <Star className="h-3.5 w-3.5 text-amber-400" />
                        {Number(ride.amount).toLocaleString("en-US")} TZS
                      </div>
                    )}
                  </div>

                  {/* ── Driver card ── */}
                  {ride.driver && (
                    <div
                      className="mt-4 rounded-2xl border px-4 py-3 flex items-center gap-3"
                      style={{ background: "linear-gradient(135deg, rgba(3,105,161,0.05) 0%, transparent 100%)", borderColor: "rgba(3,105,161,0.12)" }}
                    >
                      <div
                        className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm"
                        style={{ background: "linear-gradient(135deg, #1e3a5f 0%, #0369a1 100%)" }}
                      >
                        <User className="h-5 w-5 text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold text-slate-900 leading-tight">
                          {ride.driver.name}
                        </div>
                        {ride.driver.phone && (
                          <div className="flex items-center gap-1 mt-0.5 text-xs text-slate-500">
                            <Phone className="h-3 w-3" />
                            {ride.driver.phone}
                          </div>
                        )}
                      </div>
                      {ride.rating && (
                        <div className="flex items-center gap-1 bg-white rounded-full px-2.5 py-1 border border-amber-200 shadow-sm flex-shrink-0">
                          <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                          <span className="text-xs font-bold text-slate-800">{ride.rating.toFixed(1)}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── Action button ── */}
                  <div className="mt-4">
                    <Link
                      href={`/account/rides/${ride.id}`}
                      className="no-underline inline-flex items-center justify-center rounded-2xl w-10 h-10 text-white shadow-sm hover:shadow-md active:scale-[0.98] transition-all duration-200"
                      style={{ background: "linear-gradient(135deg, #1e3a5f 0%, #0369a1 100%)" }}
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
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
