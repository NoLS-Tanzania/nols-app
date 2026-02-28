"use client";
import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { ClipboardList, Calendar, Users, DollarSign, CheckCircle, XCircle, Clock, ArrowRight, Truck, FileText, MessageSquare, Send, ChevronDown, MapPin, Eye, Printer } from "lucide-react";
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
  const [reportModalRequest, setReportModalRequest] = useState<PlanRequest | null>(null);

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
      <div className="relative overflow-hidden rounded-2xl shadow-lg" style={{ background: "linear-gradient(135deg,#0e2a7a 0%,#0a5c82 42%,#02665e 100%)" }}>
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 900 120" fill="none" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <circle cx="820" cy="10" r="120" stroke="white" strokeOpacity="0.06" strokeWidth="1" fill="none"/>
          <polyline points="0,90 160,72 320,80 480,52 640,62 800,36 900,48" stroke="white" strokeOpacity="0.10" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
          <polygon points="0,90 160,72 320,80 480,52 640,62 800,36 900,48 900,120 0,120" fill="white" fillOpacity="0.03"/>
        </svg>
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent"/>
        <div className="relative flex flex-col items-center text-center px-8 py-8">
          <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center mb-4 shadow-lg">
            <ClipboardList className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">My Plan Requests</h1>
          <p className="text-teal-300/80 text-sm mt-1 font-medium">Track progress for your “Plan with Us” requests</p>
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
                className="relative overflow-hidden rounded-3xl bg-white border border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.05)] transition-all duration-300 hover:shadow-[0_8px_32px_rgba(2,102,94,0.10)] hover:-translate-y-0.5"
              >
                {/* Left brand accent bar */}
                <div className="absolute left-0 inset-y-0 w-[3px] rounded-l-3xl" style={{ background: "linear-gradient(180deg,#0e2a7a 0%,#0a5c82 50%,#02665e 100%)" }} />
                {/* Ambient glow */}
                <div className="pointer-events-none absolute -right-16 -top-12 h-40 w-40 rounded-full bg-teal-50/60 blur-3xl" />
                <div className="pointer-events-none absolute -left-12 -bottom-12 h-36 w-36 rounded-full bg-emerald-50/40 blur-3xl" />

                <div className="pl-6 pr-5 pt-5 pb-5 sm:pl-7 sm:pr-6 sm:pt-6 sm:pb-6">
                  {/* ─── Top: icon + title + status ─── */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3.5 min-w-0">
                      <div
                        className="mt-0.5 flex-shrink-0 w-11 h-11 rounded-2xl shadow-md flex items-center justify-center"
                        style={{ background: "linear-gradient(135deg,#0e2a7a 0%,#02665e 100%)" }}
                      >
                        <ClipboardList className="h-5 w-5 text-white" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-baseline gap-2">
                          <h3 className="text-[17px] sm:text-[18px] font-extrabold text-slate-900 tracking-tight leading-tight">
                            {request.role}&nbsp;<span className="text-slate-300 font-light">•</span>&nbsp;{request.tripType}
                          </h3>
                          <span className="text-[10px] font-black text-slate-400 bg-slate-100 border border-slate-200 rounded-full px-2 py-0.5 tracking-wide">
                            #{request.id}
                          </span>
                        </div>
                        {request.destinations && (
                          <div className="mt-[3px] flex items-center gap-1.5 text-[13px] text-slate-500 font-medium">
                            <MapPin className="h-3 w-3 flex-shrink-0 text-teal-500" />
                            <span className="line-clamp-1">{request.destinations}</span>
                          </div>
                        )}
                        <div className="mt-[3px] text-[11px] text-slate-400 font-medium">Updated {formatDate(request.updatedAt)}</div>
                      </div>
                    </div>

                    {/* Status pill */}
                    <div
                      className={[
                        "flex-shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold shadow-sm",
                        getStatusColor(request),
                      ].join(" ")}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      {request.isValid ? <Clock className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                      {getStatusLabel(request)}
                    </div>
                  </div>

                  {/* ─── Timeline ─── */}
                  <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
                    <div className="inline-flex items-center bg-slate-50 border border-slate-200/80 rounded-2xl px-3 py-1.5 shadow-sm">
                      {timeline.steps.map((step, idx) => (
                        <div key={step.key} className="inline-flex items-center gap-1.5">
                          <div
                            className={[
                              "h-[7px] w-[7px] rounded-full flex-shrink-0",
                              step.done
                                ? "bg-teal-500 shadow-[0_0_0_3px_rgba(20,184,166,0.18)]"
                                : "bg-slate-300",
                            ].join(" ")}
                          />
                          <span className={step.done ? "text-[11px] font-semibold text-slate-700" : "text-[11px] font-semibold text-slate-400"}>
                            {step.label}
                          </span>
                          {idx !== timeline.steps.length - 1 && (
                            <div className="mx-1.5 h-px w-4 bg-slate-200 flex-shrink-0" />
                          )}
                        </div>
                      ))}
                    </div>
                    {request.createdAt && (
                      <span className="text-[11px] text-slate-400 font-medium">Submitted {formatDate(request.createdAt)}</span>
                    )}
                  </div>

                  {/* ─── Info chips ─── */}
                  {(request.dateFrom || request.dateTo || request.groupSize || request.budget || request.transportRequired) && (
                    <div className="mt-3.5 flex flex-wrap gap-2">
                      {(request.dateFrom || request.dateTo) && (
                        <span className="inline-flex items-center gap-1.5 rounded-xl bg-teal-50 border border-teal-100 px-3 py-1.5 text-[11px] font-semibold text-teal-800">
                          <Calendar className="h-3 w-3 text-teal-500 flex-shrink-0" />
                          {request.dateFrom && request.dateTo
                            ? `${formatDate(request.dateFrom)} – ${formatDate(request.dateTo)}`
                            : request.dateFrom
                            ? `From ${formatDate(request.dateFrom)}`
                            : `Until ${formatDate(request.dateTo!)}`}
                        </span>
                      )}
                      {request.groupSize && (
                        <span className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-50 border border-indigo-100 px-3 py-1.5 text-[11px] font-semibold text-indigo-800">
                          <Users className="h-3 w-3 text-indigo-400 flex-shrink-0" />
                          {request.groupSize} {request.groupSize === 1 ? "person" : "people"}
                        </span>
                      )}
                      {request.budget && (
                        <span className="inline-flex items-center gap-1.5 rounded-xl bg-amber-50 border border-amber-100 px-3 py-1.5 text-[11px] font-semibold text-amber-800">
                          <DollarSign className="h-3 w-3 text-amber-500 flex-shrink-0" />
                          {Number(request.budget).toLocaleString("en-US")} TZS
                        </span>
                      )}
                      {request.transportRequired && (
                        <span className="inline-flex items-center gap-1.5 rounded-xl bg-sky-50 border border-sky-100 px-3 py-1.5 text-[11px] font-semibold text-sky-800">
                          <Truck className="h-3 w-3 text-sky-400 flex-shrink-0" />
                          {request.vehicleType || "Transport required"}{request.vehiclesNeeded ? ` · ${request.vehiclesNeeded}×` : ""}
                        </span>
                      )}
                    </div>
                  )}

                  {/* ── Trip Proposal ── */}
                  {(request.suggestedItineraries || request.requiredPermits || request.estimatedTimeline || request.assignedAgent || request.adminResponse) && (
                    request.status === "COMPLETED" ? (
                      /* Premium "View Report" button — opens modal */
                      <button
                        type="button"
                        onClick={() => setReportModalRequest(request)}
                        className="group mt-5 w-full relative overflow-hidden rounded-2xl border border-teal-200/60 bg-gradient-to-br from-teal-50 via-white to-emerald-50 px-5 py-4 text-left shadow-sm transition-all duration-200 hover:shadow-md hover:border-teal-300 hover:-translate-y-0.5 active:scale-[0.99]"
                      >
                        <div className="absolute inset-y-0 left-0 w-[3px] rounded-l-2xl bg-gradient-to-b from-teal-500 to-emerald-500" />
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center shadow-sm" style={{ background: "linear-gradient(135deg,#0e2a7a 0%,#02665e 100%)" }}>
                              <FileText className="h-4.5 w-4.5 text-white" style={{ width: 18, height: 18 }} />
                            </div>
                            <div className="min-w-0">
                              <div className="text-[13px] font-extrabold text-slate-800 tracking-tight">Your Feedback Report is ready</div>
                              <div className="text-[11px] text-slate-500 mt-0.5">
                                {request.respondedAt ? `Sent ${formatDate(request.respondedAt)}` : "Trip proposal prepared by NoLSAF"}
                              </div>
                            </div>
                          </div>
                          <div className="flex-shrink-0 inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[12px] font-bold text-white shadow-sm transition-all duration-200 group-hover:shadow-md" style={{ background: "linear-gradient(135deg,#0a5c82,#02665e)" }}>
                            <Eye className="w-3.5 h-3.5" />
                            View Report
                          </div>
                        </div>
                      </button>
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

                  {/* Notes */}
                  {request.notes && !request.notes.includes("--- Follow-up") && (
                    <div className="mt-5 rounded-2xl border border-slate-200/60 bg-slate-50/60 overflow-hidden shadow-sm">
                      <div className="flex items-center gap-2 px-4 py-2.5 bg-white border-b border-slate-200/60">
                        <FileText className="h-3.5 w-3.5 text-teal-600" />
                        <span className="text-[11px] font-bold text-slate-600 uppercase tracking-widest">Notes</span>
                      </div>
                      <div className="px-4 py-3">
                        <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">{request.notes}</p>
                      </div>
                    </div>
                  )}

                  {/* Follow-up Message Section */}
                  <FollowUpMessageSection requestId={request.id} notes={request.notes} adminResponse={request.adminResponse} respondedAt={request.respondedAt} onMessageSent={loadPlanRequests} />
                </div>
              </div>
            );
          })}
        </div>
      )}
      {/* ── Report Modal ── */}
      {reportModalRequest && (() => {
        const req = reportModalRequest;
        const sentDate = req.respondedAt ? new Date(req.respondedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "";
        const sentTime = req.respondedAt ? new Date(req.respondedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "";
        const handlePrint = () => {
          const el = document.getElementById("customer-report-print-area");
          if (!el) return;
          const win = window.open("", "_blank", "width=960,height=800,scrollbars=yes");
          if (!win) return;
          const styles = Array.from(document.styleSheets)
            .map(s => { try { return Array.from(s.cssRules).map(r => r.cssText).join("\n"); } catch { return ""; } })
            .join("\n");
          win.document.write(`<!DOCTYPE html><html><head><title>Trip Report — NLS-${String(req.id).padStart(5,"0")}</title><style>${styles}</style></head><body style="margin:0;background:#f3f4f6">${el.innerHTML}</body></html>`);
          win.document.close();
          win.focus();
          setTimeout(() => { win.print(); }, 400);
        };
        return (
          <>
            <div className="fixed inset-0 bg-black/65 backdrop-blur-sm z-50" onClick={() => setReportModalRequest(null)} />
            <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[4vh] overflow-y-auto">
              <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full my-6 flex flex-col overflow-hidden">
                {/* Modal header */}
                <div className="sticky top-0 z-10 flex-shrink-0 rounded-t-2xl overflow-hidden" style={{ background: "linear-gradient(135deg,#0e2a7a 0%,#0a5c82 50%,#02665e 100%)" }}>
                  <div className="flex items-center justify-between px-6 py-4 gap-3">
                    <div className="min-w-0">
                      <div className="text-white font-black text-[15px] truncate">Trip Proposal — NLS-{String(req.id).padStart(5, "0")}</div>
                      <div className="text-teal-300 text-[10px] mt-0.5 flex items-center gap-2">
                        <span className="truncate">{req.fullName || "Valued Customer"}</span>
                        {sentDate && <><span className="opacity-40">·</span><Clock className="w-3 h-3 flex-shrink-0" /><span>Sent {sentDate}{sentTime ? ` at ${sentTime}` : ""}</span></>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={handlePrint}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 px-3 py-1.5 text-white text-[11px] font-bold transition-colors"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        Print
                      </button>
                      <button onClick={() => setReportModalRequest(null)} className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors">
                        <XCircle className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
                {/* A4 Report */}
                <div id="customer-report-print-area" className="overflow-y-auto max-h-[82vh] bg-gray-100 p-4">
                  <TripProposalReport
                    request={{
                      ...req,
                      destinations: req.destinations || "",
                      notes: req.notes || "",
                      budget: req.budget?.toString() ?? null,
                      customer: { name: req.fullName || "Valued Customer", email: req.email || "", phone: req.phone },
                    }}
                    label={false}
                  />
                </div>
              </div>
            </div>
          </>
        );
      })()}
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
  const [historyOpen, setHistoryOpen] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [messageType, setMessageType] = useState("Ask for Feedback");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [conversationMessages, setConversationMessages] = useState<ConversationMessage[]>([]);

  const loadMessages = useCallback(async () => {
    setMessagesLoading(true);
    try {
      const response = await api.get(`/api/customer/plan-requests/${requestId}/messages`);
      if (response.data.success && response.data.messages) {
        setConversationMessages(response.data.messages.map((m: any) => ({
          type: m.messageType || 'General',
          message: m.message,
          timestamp: new Date(m.createdAt),
          formattedDate: new Date(m.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
          sender: m.senderRole === 'ADMIN' ? 'admin' : 'user',
        })));
      }
    } catch { setConversationMessages([]); }
    finally { setMessagesLoading(false); }
  }, [requestId]);

  useEffect(() => { loadMessages(); }, [loadMessages]);

  const messageTypes = ["Ask for Feedback","Ask for Clarification","Ask for Appointment","Request Status Update","Provide Additional Information","Other"];

  const getMessageTemplate = (type: string): string => ({
    "Ask for Feedback": "Hello,\n\nI would appreciate your feedback on my event plan request. Please let me know if you need any additional information or if there are any concerns I should address.\n\nThank you.",
    "Ask for Clarification": "Hello,\n\nI would like to request some clarification regarding my event plan request. Could you please provide more details on the following:\n\n[Please specify what you need clarification on]\n\nThank you for your assistance.",
    "Ask for Appointment": "Hello,\n\nI would like to schedule an appointment to discuss my event plan in more detail. Please let me know your availability and preferred method of communication (phone call, video call, or in-person meeting).\n\nThank you.",
    "Request Status Update": "Hello,\n\nI would like to request an update on the status of my event plan request. Could you please let me know the current progress and expected timeline?\n\nThank you.",
    "Provide Additional Information": "Hello,\n\nI would like to provide some additional information regarding my event plan request:\n\n[Please add your additional information here]\n\nPlease let me know if you need anything else.\n\nThank you.",
    "Other": "",
  } as Record<string,string>)[type] ?? "";

  const handleSend = async () => {
    if (!message.trim()) { alert("Please enter a message"); return; }
    setSending(true);
    try {
      const response = await api.post(`/api/customer/plan-requests/${requestId}/follow-up`, { messageType, message: message.trim() });
      if (response.data.success) {
        setSent(true);
        setMessage("");
        await loadMessages();
        onMessageSent();
        setTimeout(() => { setComposeOpen(false); setSent(false); }, 2000);
        window.dispatchEvent(new CustomEvent("nols:toast", { detail: { type: "success", title: "Message Sent", message: "Your follow-up message has been sent to the admin.", duration: 3000 } }));
      }
    } catch (err: any) {
      window.dispatchEvent(new CustomEvent("nols:toast", { detail: { type: "error", title: "Error", message: err?.response?.data?.error || "Failed to send message", duration: 4000 } }));
    } finally { setSending(false); }
  };

  const lastMsg = conversationMessages[conversationMessages.length - 1];

  return (
    <div className="mt-5 rounded-2xl border border-slate-200/60 overflow-hidden shadow-sm">
      {/* ── Compact header bar (always visible) ── */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200/60">
        <button
          type="button"
          onClick={() => setHistoryOpen(v => !v)}
          className="flex items-center gap-2.5 min-w-0 flex-1 text-left group"
        >
          <MessageSquare className="h-3.5 w-3.5 text-teal-600 flex-shrink-0" />
          <span className="text-[11px] font-bold text-slate-600 uppercase tracking-widest">Messages</span>
          {messagesLoading ? (
            <LogoSpinner size="sm" ariaLabel="Loading" />
          ) : conversationMessages.length > 0 ? (
            <>
              <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-teal-600 text-white text-[10px] font-black px-1">{conversationMessages.length}</span>
              {lastMsg && (
                <span className="text-[10px] text-slate-400 truncate hidden sm:block">
                  Last: {lastMsg.formattedDate}
                </span>
              )}
            </>
          ) : (
            <span className="text-[10px] text-slate-400">No messages yet</span>
          )}
          <ChevronDown className={`ml-auto h-3.5 w-3.5 text-slate-400 transition-transform duration-200 flex-shrink-0 ${historyOpen ? "rotate-180" : ""}`} />
        </button>
        <button
          type="button"
          onClick={() => { setComposeOpen(v => !v); if (!composeOpen) setMessage(getMessageTemplate(messageType)); }}
          className="flex-shrink-0 ml-3 inline-flex items-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 text-[11px] font-bold text-teal-700 transition-colors"
        >
          {composeOpen ? <XCircle className="h-3.5 w-3.5" /> : <Send className="h-3.5 w-3.5" />}
          {composeOpen ? "Cancel" : "New Message"}
        </button>
      </div>

      {/* ── Collapsible conversation history ── */}
      {historyOpen && (
        <div className="bg-slate-50/60 px-4 py-4 border-b border-slate-200/60">
          {messagesLoading ? (
            <div className="flex justify-center py-4"><LogoSpinner size="sm" ariaLabel="Loading messages" /></div>
          ) : conversationMessages.length === 0 ? (
            <p className="text-[12px] text-slate-400 text-center py-3">No messages yet. Send your first follow-up below.</p>
          ) : (
            <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
              {conversationMessages.map((msg, index) => (
                <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-start' : 'justify-end'}`}>
                  <div className={`flex flex-col ${msg.sender === 'user' ? 'items-start max-w-[82%]' : 'items-end max-w-[82%]'}`}>
                    <div className={`flex items-center gap-2 mb-1 ${msg.sender === 'user' ? '' : 'flex-row-reverse'}`}>
                      {msg.sender === 'user' && (
                        <span className="text-[9px] font-semibold text-teal-700 px-1.5 py-0.5 rounded bg-teal-50 border border-teal-100">{msg.type}</span>
                      )}
                      {msg.sender === 'admin' && (
                        <span className="text-[9px] font-black text-teal-700 px-1.5 py-0.5 rounded bg-teal-50 border border-teal-200">Admin</span>
                      )}
                      <span className="text-[9px] text-slate-400">{msg.formattedDate}</span>
                    </div>
                    <div className={`rounded-xl px-3 py-2 text-[12px] leading-relaxed whitespace-pre-wrap shadow-sm ${
                      msg.sender === 'user'
                        ? 'bg-[#02665e] text-white rounded-tl-sm'
                        : 'bg-white border border-teal-100 text-[#02665e] font-medium rounded-tr-sm'
                    }`}>
                      {msg.message}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Inline compose form ── */}
      {composeOpen && (
        <div className="bg-white px-4 py-4">
          {sent ? (
            <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
              <CheckCircle className="h-4 w-4 flex-shrink-0" />
              <span>Message sent successfully!</span>
            </div>
          ) : (
            <>
              {/* Message Type */}
              <div className="mb-3">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Message Type</label>
                <div className="relative">
                  <select
                    value={messageType}
                    onChange={(e) => { setMessageType(e.target.value); setMessage(getMessageTemplate(e.target.value)); }}
                    className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400/30 focus:border-teal-400 transition-all"
                  >
                    {messageTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
              {/* Textarea */}
              <div className="mb-3">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Your Message</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type your message here..."
                  rows={4}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400/30 focus:border-teal-400 transition-all resize-none"
                />
                {(message.includes("[") && message.includes("]")) && (
                  <p className="mt-1.5 text-[11px] text-red-600 font-medium flex items-center gap-1.5">
                    <span>⚠️</span>
                    <span>Replace <span className="font-bold bg-red-50 px-1 rounded border border-red-200">[brackets]</span> with your info.</span>
                  </p>
                )}
              </div>
              {/* Send button */}
              <button
                onClick={handleSend}
                disabled={sending || !message.trim()}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#02665e] text-white font-bold px-4 py-2.5 text-sm hover:bg-[#014d47] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? <><div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Sending...</> : <><Send className="h-4 w-4" />Send Message</>}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}