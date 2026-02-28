"use client";
import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { ClipboardList, Calendar, Users, DollarSign, CheckCircle, XCircle, Clock, ArrowRight, Truck, FileText, MessageSquare, Send, ChevronDown } from "lucide-react";
import Link from "next/link";
import LogoSpinner from "@/components/LogoSpinner";
import TripProposalReport from "@/components/TripProposalReport";

const api = axios.create({ baseURL: "", withCredentials: true });


type PlanRequest = {
  id: number;
  role: string;
  tripType: string;
  destinations: string | null;
  dateFrom: string | null;
  dateTo: string | null;
  groupSize: number | null;
  budget: number | null;
  notes: string | null;
  status: string;
  transportRequired: boolean;
  vehicleType: string | null;
  pickupLocation: string | null;
  dropoffLocation: string | null;
  vehiclesNeeded: number | null;
  passengerCount: number | null;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  adminResponse: string | null;
  suggestedItineraries: string | null;
  requiredPermits: string | null;
  estimatedTimeline: string | null;
  assignedAgent: string | null;
  respondedAt: string | null;
  isValid: boolean;
  createdAt: string;
  updatedAt: string;
};

function SkeletonLine({ w = "w-full" }: { w?: string }) {
  return <div className={`h-3 ${w} rounded-full bg-slate-200/80 animate-pulse`} />;
}

function PlanRequestCardSkeleton({ variant }: { variant: "active" | "completed" }) {
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

          <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-2">
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

export default function MyEventPlansPage() {
  const [planRequests, setPlanRequests] = useState<PlanRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "active" | "pending" | "completed" | "expired">("all");
  const [entered, setEntered] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);

  useEffect(() => {
    loadPlanRequests();
  }, []);

  // Gentle mount animation
  useEffect(() => {
    const t = window.requestAnimationFrame(() => setEntered(true));
    return () => window.cancelAnimationFrame(t);
  }, []);

  const loadPlanRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      setErrorStatus(null);
      const response = await api.get("/api/customer/plan-requests");
      setPlanRequests(response.data.items || []);
    } catch (err: any) {
      const status = err?.response?.status ?? null;
      const msg = err?.response?.data?.error || (status === 401 ? "Please sign in to view your plan requests." : "Failed to fetch plan requests");
      setError(msg);
      setErrorStatus(status);
      try {
        window.dispatchEvent(
          new CustomEvent("nols:toast", {
            detail: { type: "error", title: "Plan Requests", message: msg, duration: 4500 },
          })
        );
      } catch {}
    } finally {
      setLoading(false);
    }
  };

  const filteredRequests = planRequests.filter((request) => {
    if (filter === "active") return request.isValid && request.status !== "NEW" && request.status !== "PENDING";
    if (filter === "pending") return request.status === "NEW" || request.status === "PENDING";
    if (filter === "completed") return !request.isValid && request.status === "COMPLETED";
    if (filter === "expired") return !request.isValid && request.status !== "COMPLETED" && request.status !== "CANCELED";
    return true;
  });

  const activeCount = planRequests.filter((r) => r.isValid && r.status !== "NEW" && r.status !== "PENDING").length;
  const pendingCount = planRequests.filter((r) => r.status === "NEW" || r.status === "PENDING").length;
  const completedCount = planRequests.filter((r) => !r.isValid && r.status === "COMPLETED").length;
  const expiredCount = planRequests.filter((r) => !r.isValid && r.status !== "COMPLETED" && r.status !== "CANCELED").length;

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Not specified";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusLabel = (request: PlanRequest) => {
    if (request.isValid) {
      if (request.status === "NEW") return "New";
      if (request.status === "PENDING") return "Pending";
      if (request.status === "IN_PROGRESS") return "In Progress";
      return "Active";
    }
    if (request.status === "COMPLETED") return "Completed";
    if (request.status === "CANCELED") return "Canceled";
    return "Expired";
  };

  const getStatusColor = (request: PlanRequest) => {
    if (request.isValid) {
      if (request.status === "NEW") return "bg-blue-100 text-blue-700";
      if (request.status === "PENDING") return "bg-amber-100 text-amber-700";
      if (request.status === "IN_PROGRESS") return "bg-[#02665e]/10 text-[#02665e]";
      return "bg-[#02665e]/10 text-[#02665e]";
    }
    if (request.status === "COMPLETED") return "bg-green-100 text-green-700";
    if (request.status === "CANCELED") return "bg-red-100 text-red-700";
    return "bg-slate-100 text-slate-700";
  };

  const getTimeline = (request: PlanRequest) => {
    const hasAdminResponse = Boolean(
      request.respondedAt ||
        request.adminResponse ||
        request.suggestedItineraries ||
        request.requiredPermits ||
        request.estimatedTimeline ||
        request.assignedAgent
    );

    const createdDone = true;
    const inProgressDone =
      request.status === "IN_PROGRESS" ||
      request.status === "COMPLETED" ||
      (request.isValid && request.status !== "NEW" && request.status !== "PENDING") ||
      hasAdminResponse;
    const respondedDone = hasAdminResponse;

    return {
      steps: [
        { key: "created" as const, label: "Created", done: createdDone },
        { key: "in_progress" as const, label: "In progress", done: inProgressDone },
        { key: "responded" as const, label: "Responded", done: respondedDone },
      ],
    };
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
          <PlanRequestCardSkeleton variant="active" />
          <PlanRequestCardSkeleton variant="completed" />
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
            <ClipboardList className="h-8 w-8 text-[#02665e]" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">My Plan Requests</h1>
          <p className="text-sm text-gray-500 mt-1">Track progress for your “Plan with Us” requests</p>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="text-sm font-bold text-rose-900">We couldn’t load your plan requests</div>
              <div className="mt-1 text-sm text-rose-800">{error}</div>
            </div>
            <div className="flex items-center gap-2">
              {errorStatus === 401 && (
                <Link
                  href="/account/login"
                  className="no-underline inline-flex items-center justify-center rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-rose-700 transition"
                >
                  Sign in
                </Link>
              )}
              <button
                type="button"
                onClick={loadPlanRequests}
                className="inline-flex items-center justify-center rounded-xl border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-900 shadow-sm hover:bg-rose-100/60 transition"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex justify-center">
        <div className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-1 shadow-sm flex-wrap">
          {[
            { key: "all" as const, label: "All", count: planRequests.length },
            { key: "pending" as const, label: "Pending", count: pendingCount },
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

      {filteredRequests.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#02665e]/10 transition-transform duration-200 hover:scale-[1.03]">
            <ClipboardList className="h-7 w-7 text-[#02665e]" />
          </div>
          <div className="mt-4 text-lg font-bold text-slate-900">No plan requests found</div>
          <div className="mt-1 text-sm text-slate-600">
            {filter === "pending"
              ? "You don't have any pending event plans at the moment."
              : filter === "active"
              ? "You don't have any active event plans at the moment."
              : filter === "completed"
              ? "You haven't completed any event plans yet."
              : filter === "expired"
              ? "You don't have any expired event plans."
              : "When you submit a Plan with Us request, it will appear here for easy access."}
          </div>
          {filter === "all" && (
            <div className="mt-6 flex justify-center">
              <Link
                href="/public/plan-with-us"
                className="group no-underline inline-flex items-center justify-center gap-2 rounded-xl bg-[#02665e] px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#014d47] hover:shadow-md active:scale-[0.99] transition"
              >
                Plan with Us
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((request) => {
            const timeline = getTimeline(request);
            return (
              <div
                key={request.id}
                className="relative overflow-hidden rounded-3xl border border-slate-200/70 bg-white p-5 sm:p-6 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-[2px]"
              >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />
              <div className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-gradient-to-br from-emerald-100/70 to-cyan-100/40 blur-2xl" />
              <div className="pointer-events-none absolute -left-24 -bottom-24 h-56 w-56 rounded-full bg-gradient-to-br from-slate-100/70 to-emerald-100/40 blur-2xl" />
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  {/* Header with role/trip type and status */}
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="mt-0.5 rounded-2xl bg-emerald-50 border border-emerald-100 p-2.5 shadow-sm">
                        <ClipboardList className="h-5 w-5 text-[#02665e]" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
                            {request.role} • {request.tripType}
                          </h3>
                          <span className="text-xs font-medium text-slate-500">Request #{request.id}</span>
                        </div>
                        {request.destinations && (
                          <div className="mt-1 text-sm text-slate-600 line-clamp-2">
                            {request.destinations}
                          </div>
                        )}
                        <div className="mt-1.5 text-xs text-slate-500">
                          Updated {formatDate(request.updatedAt)}
                        </div>

                        {/* Compact timeline */}
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white/70 px-3 py-1.5 shadow-sm">
                            {timeline.steps.map((step, idx) => (
                              <div key={step.key} className="inline-flex items-center gap-2">
                                <div
                                  className={[
                                    "h-2 w-2 rounded-full",
                                    step.done ? "bg-gradient-to-r from-emerald-600 to-teal-600 shadow-[0_0_0_3px_rgba(16,185,129,0.12)]" : "bg-slate-300",
                                  ].join(" ")}
                                  aria-hidden
                                />
                                <div className={step.done ? "text-xs font-semibold text-slate-700" : "text-xs font-medium text-slate-500"}>{step.label}</div>
                                {idx !== timeline.steps.length - 1 && (
                                  <div className="h-px w-6 bg-slate-200" aria-hidden />
                                )}
                              </div>
                            ))}
                          </div>
                          {request.createdAt && (
                            <div className="text-[11px] text-slate-500">
                              Submitted {formatDate(request.createdAt)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <span
                      className={[
                        "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset shadow-sm",
                        getStatusColor(request),
                      ].join(" ")}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" aria-hidden />
                      {request.isValid ? <CheckCircle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                      {getStatusLabel(request)}
                    </span>
                  </div>

                  {/* Request Information Grid */}
                  <div className="mt-5 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                    {/* Date Range */}
                    {(request.dateFrom || request.dateTo) && (
                      <div className="rounded-2xl bg-slate-50/60 border border-slate-200/70 p-4 shadow-sm">
                        <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-1">
                          <Calendar className="h-3.5 w-3.5 text-[#02665e]" />
                          Date Range
                        </div>
                        <div className="mt-0.5 font-semibold text-slate-900">
                          {request.dateFrom && request.dateTo
                            ? `${formatDate(request.dateFrom)} - ${formatDate(request.dateTo)}`
                            : request.dateFrom
                            ? `From: ${formatDate(request.dateFrom)}`
                            : request.dateTo
                            ? `Until: ${formatDate(request.dateTo)}`
                            : "Not specified"}
                        </div>
                      </div>
                    )}

                    {/* Group Size */}
                    {request.groupSize && (
                      <div className="rounded-2xl bg-slate-50/60 border border-slate-200/70 p-4 shadow-sm">
                        <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-1">
                          <Users className="h-3.5 w-3.5 text-[#02665e]" />
                          Group Size
                        </div>
                        <div className="mt-0.5 font-semibold text-slate-900">
                          {request.groupSize} {request.groupSize === 1 ? "person" : "people"}
                        </div>
                      </div>
                    )}

                    {/* Budget */}
                    {request.budget && (
                      <div className="rounded-2xl bg-slate-50/60 border border-slate-200/70 p-4 shadow-sm">
                        <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-1">
                          <DollarSign className="h-3.5 w-3.5 text-[#02665e]" />
                          Budget
                        </div>
                        <div className="mt-0.5 font-semibold text-slate-900">
                          {Number(request.budget).toLocaleString("en-US")} TZS
                        </div>
                      </div>
                    )}

                    {/* Transport Required */}
                    {request.transportRequired && (
                      <div className="rounded-2xl bg-slate-50/60 border border-slate-200/70 p-4 shadow-sm">
                        <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-1">
                          <Truck className="h-3.5 w-3.5 text-[#02665e]" />
                          Transport
                        </div>
                        <div className="mt-0.5 font-semibold text-slate-900">
                          {request.vehicleType || "Required"}
                          {request.vehiclesNeeded && ` • ${request.vehiclesNeeded} vehicle${request.vehiclesNeeded > 1 ? "s" : ""}`}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ── Trip Proposal ── */}
                  {(request.suggestedItineraries || request.requiredPermits || request.estimatedTimeline || request.assignedAgent || request.adminResponse) && (
                    request.status === "COMPLETED" ? (
                      <TripProposalReport request={{
                        ...request,
                        destinations: request.destinations || "",
                        notes: request.notes || "",
                        budget: request.budget?.toString() ?? null,
                        customer: { name: request.fullName || "Valued Customer", email: request.email || "", phone: request.phone },
                      }} />
                    ) : (
                    <div className="mt-6 rounded-2xl bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border border-blue-200/60 p-5 sm:p-6 shadow-lg transition-all duration-300 hover:shadow-xl">
                      <div className="flex items-center gap-3 mb-5">
                        <div className="p-2.5 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl shadow-md">
                          <CheckCircle className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-slate-900">Feedback from Admin</h3>
                          {request.respondedAt && (
                            <p className="text-xs text-slate-500 mt-0.5">
                              Provided on {formatDate(request.respondedAt)}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4">
                        {/* Suggested Itineraries */}
                        {request.suggestedItineraries && (
                          <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-blue-100 p-4 sm:p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:border-blue-200">
                            <div className="flex items-center gap-2 mb-3">
                              <div className="p-1.5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
                                <FileText className="h-4 w-4 text-white" />
                              </div>
                              <h4 className="text-sm font-bold text-slate-900">Suggested Itineraries with Prices</h4>
                            </div>
                            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                              {request.suggestedItineraries}
                            </p>
                          </div>
                        )}

                        {/* Required Permits */}
                        {request.requiredPermits && (
                          <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-amber-100 p-4 sm:p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:border-amber-200">
                            <div className="flex items-center gap-2 mb-3">
                              <div className="p-1.5 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg">
                                <ClipboardList className="h-4 w-4 text-white" />
                              </div>
                              <h4 className="text-sm font-bold text-slate-900">Checklist of Required Permits and Documents</h4>
                            </div>
                            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                              {request.requiredPermits}
                            </p>
                          </div>
                        )}

                        {/* Estimated Timeline */}
                        {request.estimatedTimeline && (
                          <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-green-100 p-4 sm:p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:border-green-200">
                            <div className="flex items-center gap-2 mb-3">
                              <div className="p-1.5 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg">
                                <Calendar className="h-4 w-4 text-white" />
                              </div>
                              <h4 className="text-sm font-bold text-slate-900">Estimated Timelines and Booking Windows</h4>
                            </div>
                            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                              {request.estimatedTimeline}
                            </p>
                          </div>
                        )}

                        {/* Assigned Agent */}
                        {request.assignedAgent && (
                          <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-purple-100 p-4 sm:p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:border-purple-200">
                            <div className="flex items-center gap-2 mb-3">
                              <div className="p-1.5 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
                                <Users className="h-4 w-4 text-white" />
                              </div>
                              <h4 className="text-sm font-bold text-slate-900">Assigned Agent / Contact</h4>
                            </div>
                            <p className="text-sm text-slate-700 leading-relaxed font-medium">
                              {request.assignedAgent}
                            </p>
                          </div>
                        )}

                        {/* Additional Notes / Recommendations */}
                        {request.adminResponse && (
                          <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-indigo-100 p-4 sm:p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:border-indigo-200">
                            <div className="flex items-center gap-2 mb-3">
                              <div className="p-1.5 bg-gradient-to-br from-indigo-500 to-blue-500 rounded-lg">
                                <MessageSquare className="h-4 w-4 text-white" />
                              </div>
                              <h4 className="text-sm font-bold text-slate-900">Additional Notes / Recommendations</h4>
                            </div>
                            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                              {request.adminResponse}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Notes - Only show if there are notes and no follow-up messages to avoid duplication */}
                  {request.notes && !request.notes.includes("--- Follow-up") && (
                    <div className="mt-5 rounded-2xl border border-slate-200/70 bg-white shadow-sm">
                      <div className="flex items-center gap-2 border-b border-slate-200/70 px-4 py-3">
                        <FileText className="h-4 w-4 text-[#02665e]" />
                        <div className="text-xs font-semibold text-slate-700">Notes</div>
                      </div>
                      <div className="px-4 py-3">
                        <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{request.notes}</p>
                      </div>
                    </div>
                  )}

                  {/* Follow-up Message Section */}
                  <FollowUpMessageSection requestId={request.id} notes={request.notes} adminResponse={request.adminResponse} respondedAt={request.respondedAt} onMessageSent={loadPlanRequests} />
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

type ConversationMessage = {
  type: string;
  message: string;
  timestamp: Date;
  formattedDate: string;
  sender: 'user' | 'admin';
};

function FollowUpMessageSection({ requestId, notes: _notes, adminResponse: _adminResponse, respondedAt: _respondedAt, onMessageSent }: { requestId: number; notes: string | null; adminResponse: string | null; respondedAt: string | null; onMessageSent: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messageType, setMessageType] = useState("Ask for Feedback");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [conversationMessages, setConversationMessages] = useState<ConversationMessage[]>([]);
  
  // Fetch messages from API instead of parsing from notes
  const loadMessages = useCallback(async () => {
    setMessagesLoading(true);
    try {
      const response = await api.get(`/api/customer/plan-requests/${requestId}/messages`);
      if (response.data.success && response.data.messages) {
        const formattedMessages: ConversationMessage[] = response.data.messages.map((m: any) => ({
          type: m.messageType || 'General',
          message: m.message,
          timestamp: new Date(m.createdAt),
          formattedDate: new Date(m.createdAt).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }),
          sender: m.senderRole === 'ADMIN' ? 'admin' : 'user',
        }));
        setConversationMessages(formattedMessages);
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
      // Fallback: if API fails, return empty array (messages will be empty)
      setConversationMessages([]);
    } finally {
      setMessagesLoading(false);
    }
  }, [requestId]);
  
  // Load messages on mount and when requestId changes
  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  const messageTypes = [
    "Ask for Feedback",
    "Ask for Clarification",
    "Ask for Appointment",
    "Request Status Update",
    "Provide Additional Information",
    "Other",
  ];

  // Auto-fill messages based on message type
  const getMessageTemplate = (type: string): string => {
    const templates: Record<string, string> = {
      "Ask for Feedback": "Hello,\n\nI would appreciate your feedback on my event plan request. Please let me know if you need any additional information or if there are any concerns I should address.\n\nThank you.",
      "Ask for Clarification": "Hello,\n\nI would like to request some clarification regarding my event plan request. Could you please provide more details on the following:\n\n[Please specify what you need clarification on]\n\nThank you for your assistance.",
      "Ask for Appointment": "Hello,\n\nI would like to schedule an appointment to discuss my event plan in more detail. Please let me know your availability and preferred method of communication (phone call, video call, or in-person meeting).\n\nThank you.",
      "Request Status Update": "Hello,\n\nI would like to request an update on the status of my event plan request. Could you please let me know the current progress and expected timeline?\n\nThank you.",
      "Provide Additional Information": "Hello,\n\nI would like to provide some additional information regarding my event plan request:\n\n[Please add your additional information here]\n\nPlease let me know if you need anything else.\n\nThank you.",
      "Other": "",
    };
    return templates[type] || "";
  };

  const handleMessageTypeChange = (newType: string) => {
    setMessageType(newType);
    // Always auto-fill message based on selected type
    const template = getMessageTemplate(newType);
    setMessage(template);
  };

  const handleSend = async () => {
    if (!message.trim()) {
      alert("Please enter a message");
      return;
    }

    setSending(true);
    try {
      const response = await api.post(`/api/customer/plan-requests/${requestId}/follow-up`, {
        messageType,
        message: message.trim(),
      });

      if (response.data.success) {
        setSent(true);
        setMessage("");
        // Reload messages to show the new message
        await loadMessages();
        // Also reload the plan requests list
        onMessageSent();
        setTimeout(() => {
          setIsOpen(false);
          setSent(false);
        }, 2000);
        
        window.dispatchEvent(
          new CustomEvent("nols:toast", {
            detail: { type: "success", title: "Message Sent", message: "Your follow-up message has been sent to the admin.", duration: 3000 },
          })
        );
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error || "Failed to send message";
      window.dispatchEvent(
        new CustomEvent("nols:toast", {
          detail: { type: "error", title: "Error", message: msg, duration: 4000 },
        })
      );
    } finally {
      setSending(false);
    }
  };

  // Show loading state while fetching messages
  if (messagesLoading && conversationMessages.length === 0) {
    return (
      <div className="mt-4 flex items-center justify-center p-4">
        <LogoSpinner size="sm" ariaLabel="Loading messages" />
      </div>
    );
  }
  
  // Show conversation history if messages exist, or just the button if no messages
  if (!isOpen && conversationMessages.length === 0) {
    return (
      <div className="mt-4">
        <button
          onClick={() => {
            setIsOpen(true);
            // Auto-fill with default message template when opening
            setMessage(getMessageTemplate(messageType));
          }}
          className="group w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_-18px_rgba(2,102,94,0.55)] ring-1 ring-inset ring-white/20 hover:from-emerald-600 hover:to-cyan-600 hover:shadow-[0_16px_40px_-18px_rgba(2,102,94,0.6)] active:scale-[0.99] transition-all duration-200"
        >
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white/12 ring-1 ring-inset ring-white/20">
            <MessageSquare className="h-4 w-4" />
          </span>
          <span className="tracking-tight">Send Follow-up Message</span>
        </button>
      </div>
    );
  }

  if (!isOpen && conversationMessages.length > 0) {
    return (
      <div className="mt-4 space-y-4">
        {/* Conversation History */}
        <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <MessageSquare className="h-4 w-4 text-[#02665e]" />
              Conversation History
            </h4>
            <button
              onClick={() => {
                setIsOpen(true);
                setMessage(getMessageTemplate(messageType));
              }}
              className="text-xs font-medium text-[#02665e] hover:text-[#014d47] transition-colors"
            >
              Send Message
            </button>
          </div>
          
          {/* Messages List - Chat Style */}
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {messagesLoading ? (
              <div className="flex items-center justify-center p-4">
                <LogoSpinner size="sm" ariaLabel="Loading messages" />
              </div>
            ) : conversationMessages.map((msg, index) => (
              <div
                key={index}
                className={`flex ${msg.sender === 'user' ? 'justify-start' : 'justify-end'}`}
              >
                <div className={`flex flex-col ${msg.sender === 'user' ? 'items-start max-w-[80%] sm:max-w-[70%]' : 'items-end max-w-[80%] sm:max-w-[70%]'}`}>
                  <div className={`flex items-center gap-2 mb-1.5 ${msg.sender === 'user' ? '' : 'flex-row-reverse'}`}>
                    {msg.sender === 'user' && (
                      <span className="text-[10px] font-medium text-[#02665e] px-2 py-0.5 rounded-md bg-[#02665e]/10">
                        {msg.type}
                      </span>
                    )}
                    {msg.sender === 'admin' && (
                      <span className="text-[10px] font-semibold text-[#02665e] px-2 py-0.5 rounded-md bg-[#02665e]/10 border border-[#02665e]/20">
                        Admin
                      </span>
                    )}
                    <span className="text-[10px] text-slate-400">{msg.formattedDate}</span>
                  </div>
                  <div
                    className={`rounded-xl px-3 py-2 shadow-sm ${
                      msg.sender === 'user'
                        ? 'bg-[#02665e] text-white rounded-tl-sm'
                        : 'bg-white border-2 border-[#02665e]/20 rounded-tr-sm'
                    }`}
                  >
                    <p className={`text-xs sm:text-sm whitespace-pre-wrap leading-relaxed ${msg.sender === 'user' ? 'text-white' : 'text-[#02665e] font-medium'}`}>
                      {msg.message}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Send New Message Button */}
          <button
            onClick={() => {
              setIsOpen(true);
              setMessage(getMessageTemplate(messageType));
            }}
            className="group mt-4 w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_-18px_rgba(2,102,94,0.55)] ring-1 ring-inset ring-white/20 hover:from-emerald-600 hover:to-cyan-600 hover:shadow-[0_16px_40px_-18px_rgba(2,102,94,0.6)] active:scale-[0.99] transition-all duration-200"
          >
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white/12 ring-1 ring-inset ring-white/20">
              <MessageSquare className="h-4 w-4" />
            </span>
            <span className="tracking-tight">Send Follow-up Message</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-4">
      {/* Conversation History (if messages exist) */}
      {conversationMessages.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 sm:p-5">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-900 mb-4">
            <MessageSquare className="h-4 w-4 text-[#02665e]" />
            Conversation History
          </h4>
          
          {/* Messages List - Chat Style */}
          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {messagesLoading ? (
              <div className="flex items-center justify-center p-4">
                <LogoSpinner size="sm" ariaLabel="Loading messages" />
              </div>
            ) : conversationMessages.map((msg, index) => (
              <div
                key={index}
                className={`flex ${msg.sender === 'user' ? 'justify-start' : 'justify-end'}`}
              >
                <div className={`flex flex-col ${msg.sender === 'user' ? 'items-start max-w-[80%] sm:max-w-[70%]' : 'items-end max-w-[80%] sm:max-w-[70%]'}`}>
                  <div className={`flex items-center gap-2 mb-1.5 ${msg.sender === 'user' ? '' : 'flex-row-reverse'}`}>
                    {msg.sender === 'user' && (
                      <span className="text-[10px] font-medium text-[#02665e] px-2 py-0.5 rounded-md bg-[#02665e]/10">
                        {msg.type}
                      </span>
                    )}
                    {msg.sender === 'admin' && (
                      <span className="text-[10px] font-semibold text-[#02665e] px-2 py-0.5 rounded-md bg-[#02665e]/10 border border-[#02665e]/20">
                        Admin
                      </span>
                    )}
                    <span className="text-[10px] text-slate-400">{msg.formattedDate}</span>
                  </div>
                  <div
                    className={`rounded-xl px-3 py-2 shadow-sm ${
                      msg.sender === 'user'
                        ? 'bg-[#02665e] text-white rounded-tl-sm'
                        : 'bg-white border-2 border-[#02665e]/20 rounded-tr-sm'
                    }`}
                  >
                    <p className={`text-xs sm:text-sm whitespace-pre-wrap leading-relaxed ${msg.sender === 'user' ? 'text-white' : 'text-[#02665e] font-medium'}`}>
                      {msg.message}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Send Message Form */}
      <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 sm:p-5">
        <div className="flex items-center justify-between mb-4">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <MessageSquare className="h-4 w-4 text-[#02665e]" />
            Send Follow-up Message
          </h4>
          <button
            onClick={() => setIsOpen(false)}
            className="text-slate-400 hover:text-slate-600 transition-colors"
            aria-label="Close"
          >
            <XCircle className="h-4 w-4" />
          </button>
        </div>

        {sent ? (
          <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
            <CheckCircle className="h-4 w-4" />
            <span>Message sent successfully!</span>
          </div>
        ) : (
        <>
          {/* Message Type Dropdown */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-slate-600 mb-2">
              Message Type
            </label>
            <div className="relative">
              <select
                value={messageType}
                onChange={(e) => handleMessageTypeChange(e.target.value)}
                className="w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 py-2.5 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-[#02665e]/20 focus:border-[#02665e] transition-all"
              >
                {messageTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Message Textarea */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-slate-600 mb-2">
              Your Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message here..."
              rows={4}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#02665e]/20 focus:border-[#02665e] transition-all resize-none"
            />
            {/* Helper text for bracketed placeholders */}
            {(message.includes("[") && message.includes("]")) && (
              <p className="mt-2 text-xs text-red-600 font-medium flex items-center gap-1.5">
                <span className="text-red-500">⚠️</span>
                <span>Please replace the text in <span className="font-bold text-red-700 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">[brackets]</span> with your specific information.</span>
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleSend}
              disabled={sending || !message.trim()}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#02665e] text-white font-semibold px-4 py-2.5 text-sm hover:bg-[#014d47] hover:shadow-md active:scale-[0.98] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-[#02665e]"
            >
              {sending ? (
                <>
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Send Message
                </>
              )}
            </button>
            <button
              onClick={() => {
                setIsOpen(false);
                setMessage("");
                setMessageType("Ask for Feedback");
              }}
              className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 font-medium text-sm hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </>
        )}
      </div>
    </div>
  );
}

