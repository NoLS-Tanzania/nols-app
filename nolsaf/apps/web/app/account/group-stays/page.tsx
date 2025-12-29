"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import { Users, Calendar, MapPin, CheckCircle, XCircle, User, Phone, Globe, ArrowRight, Building2 } from "lucide-react";
import Link from "next/link";

const api = axios.create({ baseURL: "", withCredentials: true });

type GroupStay = {
  id: number;
  arrangement: {
    id: number;
    property: {
      id: number;
      title: string;
      type: string;
      regionName?: string;
      district?: string;
      city?: string;
    };
  };
  checkIn: string;
  checkOut: string;
  status: string;
  totalAmount: number;
  numberOfGuests: number;
  passengers?: Array<{
    id: number;
    name: string;
    phone?: string;
    nationality?: string;
  }>;
  isValid: boolean;
  createdAt: string;
};

function SkeletonLine({ w = "w-full" }: { w?: string }) {
  return <div className={`h-3 ${w} rounded-full bg-slate-200/80 animate-pulse`} />;
}

function GroupStayCardSkeleton({ variant }: { variant: "active" | "expired" }) {
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
              {isActive ? "Active" : "Completed"}
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

export default function MyGroupStaysPage() {
  const [groupStays, setGroupStays] = useState<GroupStay[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "active" | "completed" | "expired">("all");
  const [entered, setEntered] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadGroupStays();
  }, []);

  // Gentle mount animation
  useEffect(() => {
    const t = window.requestAnimationFrame(() => setEntered(true));
    return () => window.cancelAnimationFrame(t);
  }, []);

  const loadGroupStays = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get("/api/customer/group-stays");
      setGroupStays(response.data.items || []);
    } catch (err: any) {
      const msg = err?.response?.data?.error || "Failed to fetch group stays";
      setError(msg);
      try {
        window.dispatchEvent(
          new CustomEvent("nols:toast", {
            detail: { type: "error", title: "Group Stays", message: msg, duration: 4500 },
          })
        );
      } catch {}
    } finally {
      setLoading(false);
    }
  };

  const filteredGroupStays = groupStays.filter((stay) => {
    if (filter === "active") return stay.isValid;
    if (filter === "completed") return !stay.isValid && stay.status === "COMPLETED";
    if (filter === "expired") return !stay.isValid && stay.status !== "COMPLETED" && stay.status !== "CANCELED";
    return true;
  });

  const activeCount = groupStays.filter((s) => s.isValid).length;
  const completedCount = groupStays.filter((s) => !s.isValid && s.status === "COMPLETED").length;
  const expiredCount = groupStays.filter((s) => !s.isValid && s.status !== "COMPLETED" && s.status !== "CANCELED").length;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusLabel = (stay: GroupStay) => {
    if (stay.isValid) {
      return stay.status === "CONFIRMED" ? "Confirmed" : "Active";
    }
    if (stay.status === "COMPLETED") return "Completed";
    if (stay.status === "CANCELED") return "Canceled";
    return "Expired";
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
          <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-1 shadow-sm flex-wrap">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-9 w-24 rounded-xl bg-white/80 animate-pulse" />
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <GroupStayCardSkeleton variant="active" />
          <GroupStayCardSkeleton variant="expired" />
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
            <Users className="h-8 w-8 text-[#02665e]" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">My Group Stay</h1>
          <p className="text-sm text-gray-500 mt-1">View all your group booking arrangements</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex justify-center">
        <div className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-1 shadow-sm flex-wrap">
          {[
            { key: "all" as const, label: "All", count: groupStays.length },
            { key: "active" as const, label: "Active", count: activeCount },
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

      {filteredGroupStays.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#02665e]/10 transition-transform duration-200 hover:scale-[1.03]">
            <Users className="h-7 w-7 text-[#02665e]" />
          </div>
          <div className="mt-4 text-lg font-bold text-slate-900">No group stays found</div>
          <div className="mt-1 text-sm text-slate-600">
            {filter === "active"
              ? "You don't have any active group stays at the moment."
              : filter === "completed"
              ? "You haven't completed any group stays yet."
              : filter === "expired"
              ? "You don't have any expired group stays."
              : "When you book a group stay, it will appear here for easy access."}
          </div>
          {filter === "all" && (
            <div className="mt-6 flex justify-center">
              <Link
                href="/public/group-stays"
                className="group no-underline inline-flex items-center justify-center gap-2 rounded-xl bg-[#02665e] px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#014d47] hover:shadow-md active:scale-[0.99] transition"
              >
                Book a group stay
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredGroupStays.map((stay) => (
            <div
              key={stay.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-[2px]"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  {/* Header with property title and status */}
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-[#02665e]/10 rounded-xl">
                        <Users className="h-5 w-5 text-[#02665e]" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">
                          {stay.arrangement.property.title}
                        </h3>
                        <div className="mt-1 text-sm text-slate-600">
                          {stay.arrangement.property.type}
                        </div>
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                        stay.isValid
                          ? "bg-[#02665e]/10 text-[#02665e]"
                          : stay.status === "COMPLETED"
                          ? "bg-green-100 text-green-700"
                          : stay.status === "CANCELED"
                          ? "bg-red-100 text-red-700"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {stay.isValid ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <Calendar className="h-4 w-4" />
                      )}
                      {getStatusLabel(stay)}
                    </span>
                  </div>

                  {/* Location */}
                  {stay.arrangement.property.regionName && (
                    <div className="mt-2 text-sm text-slate-600">
                      {[
                        stay.arrangement.property.regionName,
                        stay.arrangement.property.city,
                        stay.arrangement.property.district,
                      ]
                        .filter(Boolean)
                        .join(" • ")}
                    </div>
                  )}

                  {/* Booking Information Grid */}
                  <div className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                    {/* Check-in */}
                    <div className="rounded-xl bg-slate-50/70 border border-slate-200 p-3">
                      <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-1">
                        <Calendar className="h-3.5 w-3.5 text-[#02665e]" />
                        Check-in
                      </div>
                      <div className="mt-0.5 font-semibold text-slate-900">
                        {formatDate(stay.checkIn)}
                      </div>
                    </div>

                    {/* Check-out */}
                    <div className="rounded-xl bg-slate-50/70 border border-slate-200 p-3">
                      <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-1">
                        <Calendar className="h-3.5 w-3.5 text-[#02665e]" />
                        Check-out
                      </div>
                      <div className="mt-0.5 font-semibold text-slate-900">
                        {formatDate(stay.checkOut)}
                      </div>
                    </div>

                    {/* Number of Guests */}
                    <div className="rounded-xl bg-slate-50/70 border border-slate-200 p-3">
                      <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-1">
                        <Users className="h-3.5 w-3.5 text-[#02665e]" />
                        Guests
                      </div>
                      <div className="mt-0.5 font-semibold text-slate-900">
                        {stay.numberOfGuests} {stay.numberOfGuests === 1 ? "guest" : "guests"}
                      </div>
                    </div>

                    {/* Total Amount */}
                    <div className="rounded-xl bg-slate-50/70 border border-slate-200 p-3">
                      <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-1">
                        <Building2 className="h-3.5 w-3.5 text-[#02665e]" />
                        Total Amount
                      </div>
                      <div className="mt-0.5 font-semibold text-slate-900">
                        {Number(stay.totalAmount).toLocaleString("en-US")} TZS
                      </div>
                    </div>
                  </div>

                  {/* Passengers List */}
                  {stay.passengers && stay.passengers.length > 0 && (
                    <div className="mt-4 rounded-xl bg-gradient-to-r from-[#02665e]/5 to-transparent border border-[#02665e]/10 p-4">
                      <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-900 mb-3">
                        <User className="h-4 w-4 text-[#02665e]" />
                        Passengers ({stay.passengers.length})
                      </h4>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {stay.passengers.map((passenger) => (
                          <div
                            key={passenger.id}
                            className="bg-white rounded-lg border border-slate-200 p-3 flex items-start gap-3"
                          >
                            <div className="h-8 w-8 rounded-full bg-[#02665e]/10 flex items-center justify-center flex-shrink-0">
                              <User className="h-4 w-4 text-[#02665e]" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-semibold text-slate-900">
                                {passenger.name}
                              </div>
                              <div className="flex flex-wrap items-center gap-2 mt-1">
                                {passenger.nationality && (
                                  <div className="flex items-center gap-1 text-xs text-slate-600">
                                    <Globe className="h-3 w-3" />
                                    {passenger.nationality}
                                  </div>
                                )}
                                {passenger.phone && (
                                  <div className="flex items-center gap-1 text-xs text-slate-600">
                                    <Phone className="h-3 w-3" />
                                    {passenger.phone}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
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
