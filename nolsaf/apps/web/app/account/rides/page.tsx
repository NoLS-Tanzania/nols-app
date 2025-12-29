"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import { Car, MapPin, Clock, Star, User, CheckCircle, Calendar, ArrowRight, Phone, Navigation } from "lucide-react";
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

function SkeletonLine({ w = "w-full" }: { w?: string }) {
  return <div className={`h-3 ${w} rounded-full bg-slate-200/80 animate-pulse`} />;
}

function RideCardSkeleton({ variant }: { variant: "active" | "expired" }) {
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
              {isActive ? "Scheduled" : "Completed"}
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
      </div>
    </div>
  );
}

export default function MyRidesPage() {
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "scheduled" | "completed" | "expired">("all");
  const [entered, setEntered] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        <div className="text-center">
          <div className="mx-auto max-w-md">
            <div className="h-8 w-56 mx-auto rounded-full bg-slate-200/80 animate-pulse" />
            <div className="mt-3 h-4 w-72 mx-auto rounded-full bg-slate-200/70 animate-pulse" />
          </div>
        </div>

        <div className="flex justify-center">
          <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-1 shadow-sm">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-9 w-24 rounded-xl bg-white/80 animate-pulse" />
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <RideCardSkeleton variant="active" />
          <RideCardSkeleton variant="expired" />
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
            <Car className="h-8 w-8 text-[#02665e]" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">My Rides</h1>
          <p className="text-sm text-gray-500 mt-1">View all your transportation bookings</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex justify-center">
        <div className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-1 shadow-sm flex-wrap">
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
                    active ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600",
                  ].join(" ")}
                >
                  {t.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {filteredRides.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#02665e]/10 transition-transform duration-200 hover:scale-[1.03]">
            <Car className="h-7 w-7 text-[#02665e]" />
          </div>
          <div className="mt-4 text-lg font-bold text-slate-900">No rides found</div>
          <div className="mt-1 text-sm text-slate-600">
            {filter === "scheduled"
              ? "You don't have any scheduled rides at the moment."
              : filter === "completed"
              ? "You haven't completed any rides yet."
              : filter === "expired"
              ? "You don't have any expired rides."
              : "When you book a ride, it will appear here for easy access."}
          </div>
          {filter === "all" && (
            <div className="mt-6 flex justify-center">
              <Link
                href="/public/properties"
                className="group no-underline inline-flex items-center justify-center gap-2 rounded-xl bg-[#02665e] px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#014d47] hover:shadow-md active:scale-[0.99] transition"
              >
                Book a ride
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRides.map((ride) => (
            <div
              key={ride.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-[2px]"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  {/* Header with date and status */}
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-[#02665e]/10 rounded-xl">
                        <Car className="h-5 w-5 text-[#02665e]" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">
                          {formatDate(ride.scheduledDate)}
                        </h3>
                        {ride.pickupTime && (
                          <p className="text-sm text-slate-600">
                            Pickup: {formatTime(ride.pickupTime)}
                          </p>
                        )}
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                        ride.isValid
                          ? "bg-[#02665e]/10 text-[#02665e]"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {ride.isValid ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <Calendar className="h-4 w-4 text-red-600" />
                      )}
                      {getStatusLabel(ride)}
                    </span>
                  </div>

                  {/* Route Information */}
                  <div className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                    {/* From Location */}
                    <div className="rounded-xl bg-slate-50/70 border border-slate-200 p-3">
                      <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-1">
                        <MapPin className="h-3.5 w-3.5 text-[#02665e]" />
                        From
                      </div>
                      <div className="mt-0.5 font-semibold text-slate-900 line-clamp-2">
                        {formatLocation(ride, "from")}
                      </div>
                    </div>

                    {/* To Location */}
                    <div className="rounded-xl bg-slate-50/70 border border-slate-200 p-3">
                      <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-1">
                        <Navigation className="h-3.5 w-3.5 text-[#02665e]" />
                        To
                      </div>
                      <div className="mt-0.5 font-semibold text-slate-900 line-clamp-2">
                        {formatLocation(ride, "to")}
                      </div>
                    </div>

                    {/* Scheduled Date/Time */}
                    <div className="rounded-xl bg-slate-50/70 border border-slate-200 p-3">
                      <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-1">
                        <Calendar className="h-3.5 w-3.5 text-[#02665e]" />
                        Scheduled
                      </div>
                      <div className="mt-0.5 font-semibold text-slate-900">
                        {formatDate(ride.scheduledDate)}
                      </div>
                      {ride.pickupTime && (
                        <div className="mt-1 text-xs text-slate-600">
                          {formatTime(ride.pickupTime)}
                        </div>
                      )}
                    </div>

                    {/* Amount */}
                    {ride.amount && (
                      <div className="rounded-xl bg-slate-50/70 border border-slate-200 p-3">
                        <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-1">
                          <Star className="h-3.5 w-3.5 text-[#02665e]" />
                          Amount
                        </div>
                        <div className="mt-0.5 font-semibold text-slate-900">
                          {Number(ride.amount).toLocaleString("en-US")} TZS
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Driver Information */}
                  {ride.driver && (
                    <div className="mt-4 rounded-xl bg-gradient-to-r from-[#02665e]/5 to-transparent border border-[#02665e]/10 p-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-[#02665e]/10 flex items-center justify-center flex-shrink-0">
                          <User className="h-5 w-5 text-[#02665e]" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-slate-900">
                            {ride.driver.name}
                          </div>
                          {ride.driver.phone && (
                            <div className="flex items-center gap-1 mt-0.5 text-xs text-slate-600">
                              <Phone className="h-3 w-3" />
                              {ride.driver.phone}
                            </div>
                          )}
                        </div>
                        {ride.rating && (
                          <div className="flex items-center gap-1 bg-white rounded-full px-2.5 py-1 border border-slate-200">
                            <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                            <span className="text-xs font-semibold text-slate-900">
                              {ride.rating.toFixed(1)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
