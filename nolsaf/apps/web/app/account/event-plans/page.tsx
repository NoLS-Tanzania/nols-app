"use client";
import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { ClipboardList, Calendar, Users, DollarSign, CheckCircle, XCircle, Clock, ArrowRight, Truck, FileText, MessageSquare, Send, ChevronDown, Building2, Utensils, Car, Target, Ticket, Star, MapPin, User, Plane, Gift, BarChart3, Eye } from "lucide-react";
import Link from "next/link";
import LogoSpinner from "@/components/LogoSpinner";

const api = axios.create({ baseURL: "", withCredentials: true });

// ── Itinerary text parser (mirrors admin report) ───────────────────────────
type ParsedOption = { name: string; pricingLines: string[]; inclCats: { label: string; items: string; details: string[] }[]; itineraryLines: string[] };
function parseOptions(raw: string): ParsedOption[] {
  const blocks = raw.split(/(?=^===\s)/m).filter(s => s.trim());
  return blocks.map(block => {
    const lines = block.split("\n");
    const name = (lines[0] ?? "").replace(/^===\s*/, "").replace(/\s*===\s*$/, "").trim();
    const pricingLines: string[] = [];
    const inclusionLines: string[] = [];
    const itineraryLines: string[] = [];
    let section: "pricing" | "inclusions" | "itinerary" = "pricing";
    for (let i = 1; i < lines.length; i++) {
      const l = lines[i];
      if (/^---\s*WHAT[''&#x27;]?S INCLUDED/i.test(l) || /^---\s*WHAT/i.test(l)) { section = "inclusions"; continue; }
      if (/^Itinerary:/i.test(l)) { section = "itinerary"; continue; }
      if (section === "pricing" && l.trim()) pricingLines.push(l.trim());
      if (section === "inclusions") inclusionLines.push(l);
      if (section === "itinerary") itineraryLines.push(l);
    }
    const inclCats: { label: string; items: string; details: string[] }[] = [];
    let currentCat: { label: string; items: string; details: string[] } | null = null;
    for (const l of inclusionLines) {
      if (!l.trim()) continue;
      if (/^\s{2,}/.test(l)) { currentCat?.details.push(l.trim()); }
      else {
        const m = l.match(/^(.+?):\s*(.*)$/);
        if (m) { currentCat = { label: m[1].trim(), items: m[2].trim(), details: [] }; inclCats.push(currentCat); }
      }
    }
    return { name, pricingLines, inclCats, itineraryLines: itineraryLines.filter(l => l.trim()) };
  });
}
// ─────────────────────────────────────────────────────────────────────────────

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
                    request.status === "COMPLETED" ? (() => {
                      const options = parseOptions(request.suggestedItineraries || "");
                      const permits = (request.requiredPermits || "").split("\n").map((l:string) => l.replace(/^\d+\.\s*/, "").trim()).filter(Boolean);
                      const sentDate = request.respondedAt
                        ? new Date(request.respondedAt).toLocaleDateString("en-GB", { day:"numeric", month:"long", year:"numeric" })
                        : new Date().toLocaleDateString("en-GB", { day:"numeric", month:"long", year:"numeric" });
                      // Destination stop parser
                      const destStops = (() => {
                        const raw = request.destinations || "";
                        if (!raw.trim()) return [];
                        const parts = raw.split(/(?=\d+\))/);
                        return parts.map(p => {
                          const nm = p.match(/^(\d+\))\s*(.+?)(?:\s*[\u2014\u2013-]+\s*(\d+)\s*nights?)?\s*$/i);
                          return nm ? { name: nm[2].trim(), nights: nm[3] ? Number(nm[3]) : null } : { name: p.replace(/^\d+\)\s*/, "").trim(), nights: null };
                        }).filter(s => s.name);
                      })();
                      return (
                        <div className="mt-6 space-y-3">
                          <div className="flex items-center gap-2 px-1">
                            <Eye className="w-4 h-4 text-emerald-600" />
                            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Your Trip Proposal — prepared {sentDate}</span>
                          </div>
                          {/* ════ A4 PAPER ════ */}
                          <div className="mx-auto bg-white shadow-2xl border border-gray-200 rounded-sm overflow-hidden" style={{ maxWidth:"794px", fontFamily:"'Inter','Helvetica Neue',Arial,sans-serif", fontSize:"13px", lineHeight:"1.5" }}>

                            {/* ── Company header — visa card ── */}
                            <div className="relative overflow-hidden" style={{ background:"linear-gradient(135deg,#0e2a7a 0%,#0a5c82 38%,#02665e 100%)" }}>
                              <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 794 120" fill="none" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
                                <circle cx="740" cy="20" r="130" stroke="white" strokeOpacity="0.06" strokeWidth="1" fill="none"/>
                                <circle cx="740" cy="20" r="90" stroke="white" strokeOpacity="0.05" strokeWidth="1" fill="none"/>
                                <circle cx="740" cy="20" r="55" stroke="white" strokeOpacity="0.04" strokeWidth="1" fill="none"/>
                                <polyline points="0,100 130,80 260,88 390,60 520,70 650,40 794,52" stroke="white" strokeOpacity="0.12" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                                <polygon points="0,100 130,80 260,88 390,60 520,70 650,40 794,52 794,120 0,120" fill="white" fillOpacity="0.03"/>
                              </svg>
                              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent"/>
                              <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent"/>
                              <div className="relative px-8 py-6 flex items-center justify-between gap-6">
                                <div className="flex items-center gap-5">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src="/assets/NoLS2025-04.png" alt="NoLSAF" className="h-14 w-auto object-contain drop-shadow-md" />
                                  <div>
                                    <div className="text-white font-black text-xl tracking-tight leading-none">NoLS Africa</div>
                                    <div className="text-teal-300 text-[10px] font-bold uppercase tracking-[0.2em] mt-1">Quality Stay For Every Wallet</div>
                                    <div className="flex items-center gap-3 mt-2">
                                      <span className="flex items-center gap-1 text-[9px] text-white/60"><MapPin className="w-2.5 h-2.5"/>Dar es Salaam, TZ</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right hidden sm:block">
                                  <div className="text-[9px] text-white/50 uppercase tracking-widest font-bold">Trip Proposal</div>
                                  <div className="text-white font-black text-lg mt-0.5">NLS-{String(request.id).padStart(5,"0")}</div>
                                  <div className="text-teal-300/80 text-[9px] mt-1">{sentDate}</div>
                                </div>
                              </div>
                            </div>

                            {/* ── Body ── */}
                            <div className="px-8 py-6 space-y-6 bg-gray-50/40">

                              {/* Intro message */}
                              <div className="bg-white rounded-2xl border border-gray-200 px-6 py-5 shadow-sm">
                                <div className="flex items-center gap-2 mb-3">
                                  <span className="w-5 h-0.5 bg-teal-500 inline-block rounded"/>
                                  <span className="text-[9px] font-black uppercase tracking-widest text-teal-700">A Message from NoLSAF</span>
                                </div>
                                <p className="text-[12px] text-gray-700 leading-relaxed italic">&ldquo;Every journey you take is a story waiting to be told. At <strong>NoLSAF</strong>, we don&apos;t just plan trips &mdash; we craft experiences that stay with you long after you return home.&rdquo;</p>
                                <p className="text-[12px] text-gray-700 leading-relaxed italic mt-2">&ldquo;This proposal was built around <strong>you</strong>. Review it, dream about it &mdash; then let&apos;s make it real.&rdquo;</p>
                              </div>

                              {/* ── Section 1: Request Summary ── */}
                              <div>
                                <div className="flex items-center gap-2 mb-3">
                                  <div className="w-5 h-5 rounded-md flex items-center justify-center text-white text-[9px] font-black flex-shrink-0" style={{ background:"linear-gradient(135deg,#0e2a7a,#02665e)" }}>1</div>
                                  <span className="text-[11px] font-black uppercase tracking-widest text-gray-700">Request Summary</span>
                                  <div className="flex-1 h-px bg-gray-200"/>
                                </div>
                                <div className="space-y-2">
                                  <div className="grid grid-cols-3 gap-2">
                                    {/* Trip Type */}
                                    <div className="bg-white rounded-xl border border-blue-100 p-3 flex items-start gap-2.5 shadow-sm">
                                      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background:"linear-gradient(135deg,#eff6ff,#fff)", border:"1px solid #bfdbfe" }}>
                                        <Plane className="w-3.5 h-3.5 text-blue-500"/>
                                      </div>
                                      <div><div className="text-[8px] font-black uppercase tracking-wider text-blue-600">Trip Type</div><div className="text-[11px] font-bold text-gray-900 mt-0.5">{request.tripType}</div></div>
                                    </div>
                                    {/* Group Size */}
                                    <div className="bg-white rounded-xl border border-cyan-100 p-3 flex items-start gap-2.5 shadow-sm">
                                      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background:"linear-gradient(135deg,#ecfeff,#fff)", border:"1px solid #a5f3fc" }}>
                                        <Users className="w-3.5 h-3.5 text-cyan-600"/>
                                      </div>
                                      <div><div className="text-[8px] font-black uppercase tracking-wider text-cyan-700">Group Size</div><div className="text-[11px] font-bold text-gray-900 mt-0.5">{request.groupSize ?? "—"} {request.groupSize === 1 ? "person" : "people"}</div></div>
                                    </div>
                                    {/* Budget */}
                                    <div className="bg-white rounded-xl border border-emerald-100 p-3 flex items-start gap-2.5 shadow-sm">
                                      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background:"linear-gradient(135deg,#ecfdf5,#fff)", border:"1px solid #a7f3d0" }}>
                                        <Target className="w-3.5 h-3.5 text-emerald-600"/>
                                      </div>
                                      <div><div className="text-[8px] font-black uppercase tracking-wider text-emerald-700">Budget</div><div className="text-[11px] font-bold text-gray-900 mt-0.5">{request.budget ? `TZS ${Number(request.budget).toLocaleString()}` : "Flexible"}</div></div>
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2">
                                    {/* Transport */}
                                    <div className="bg-white rounded-xl border border-orange-100 p-3 flex items-start gap-2.5 shadow-sm">
                                      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background:"linear-gradient(135deg,#fff7ed,#fff)", border:"1px solid #fed7aa" }}>
                                        <Car className="w-3.5 h-3.5 text-orange-500"/>
                                      </div>
                                      <div><div className="text-[8px] font-black uppercase tracking-wider text-orange-600">Transport</div><div className="text-[11px] font-bold text-gray-900 mt-0.5">{request.transportRequired ? (request.vehicleType || "Required") : "Not required"}</div></div>
                                    </div>
                                    {/* Travel Window */}
                                    <div className="bg-white rounded-xl border border-violet-100 p-3 flex items-start gap-2.5 shadow-sm">
                                      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background:"linear-gradient(135deg,#f5f3ff,#fff)", border:"1px solid #ddd6fe" }}>
                                        <Calendar className="w-3.5 h-3.5 text-violet-600"/>
                                      </div>
                                      <div><div className="text-[8px] font-black uppercase tracking-wider text-violet-700">Travel Window</div><div className="text-[11px] font-bold text-gray-900 mt-0.5">{request.dateFrom && request.dateTo ? `${new Date(request.dateFrom).toLocaleDateString("en-GB",{day:"numeric",month:"short"})} – ${new Date(request.dateTo).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})}` : request.dateFrom ? new Date(request.dateFrom).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"}) : "Flexible"}</div></div>
                                    </div>
                                  </div>
                                  {/* Destinations */}
                                  {request.destinations && (
                                    <div className="bg-white rounded-xl border border-teal-200 overflow-hidden shadow-sm">
                                      <div className="px-4 py-2.5 flex items-center gap-2" style={{ background:"linear-gradient(90deg,#0f172a,#0e2a7a)" }}>
                                        <MapPin className="w-3 h-3 text-teal-400 flex-shrink-0"/>
                                        <span className="text-[9px] font-black uppercase tracking-widest text-teal-300">Destinations{destStops.length > 1 ? ` · ${destStops.length} Stops` : ""}</span>
                                      </div>
                                      {destStops.length > 0 ? (
                                        <div className="divide-y divide-gray-50">
                                          {destStops.map((s,si) => (
                                            <div key={si} className="flex items-center justify-between px-4 py-2.5">
                                              <div className="flex items-center gap-2.5">
                                                <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[8px] font-black flex-shrink-0" style={{ background:"linear-gradient(135deg,#0e2a7a,#02665e)" }}>{si+1}</div>
                                                <span className="text-[12px] font-bold text-gray-800">{s.name}</span>
                                              </div>
                                              {s.nights && (
                                                <span className="flex items-center gap-1 bg-teal-50 border border-teal-200 rounded-full px-2 py-0.5 text-[9px] font-bold text-teal-700">
                                                  <Clock className="w-2.5 h-2.5"/>{s.nights} nights
                                                </span>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      ) : (
                                        <p className="px-4 py-3 text-[12px] font-semibold text-gray-700">{request.destinations}</p>
                                      )}
                                    </div>
                                  )}
                                  {/* Notes */}
                                  {request.notes && (
                                    <div className="bg-white rounded-xl border border-amber-200 overflow-hidden shadow-sm">
                                      <div className="px-4 py-2 flex items-center gap-2" style={{ background:"linear-gradient(90deg,#78350f,#d97706)" }}>
                                        <MessageSquare className="w-3 h-3 text-amber-200 flex-shrink-0"/>
                                        <span className="text-[9px] font-black uppercase tracking-widest text-amber-100">Your Notes</span>
                                      </div>
                                      <p className="px-4 py-3 text-[11px] text-gray-600 italic leading-relaxed">&ldquo;{request.notes}&rdquo;</p>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* ── Section 2: Itinerary Options ── */}
                              {options.length > 0 && (
                                <div>
                                  <div className="flex items-center gap-2 mb-3">
                                    <div className="w-5 h-5 rounded-md flex items-center justify-center text-white text-[9px] font-black flex-shrink-0" style={{ background:"linear-gradient(135deg,#0e2a7a,#02665e)" }}>2</div>
                                    <span className="text-[11px] font-black uppercase tracking-widest text-gray-700">Your Itinerary Options</span>
                                    <div className="flex-1 h-px bg-gray-200"/>
                                  </div>
                                  <div className="space-y-5">
                                    {options.map((opt, oi) => (
                                      <div key={oi} className="rounded-2xl border border-gray-200 overflow-hidden shadow-md">
                                        {/* Option header */}
                                        <div className="relative overflow-hidden flex items-center justify-between px-5 py-4" style={{ background:"linear-gradient(135deg,#0e2a7a 0%,#0a5c82 50%,#02665e 100%)" }}>
                                          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 700 60" fill="none" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
                                            <circle cx="660" cy="10" r="80" stroke="white" strokeOpacity="0.07" strokeWidth="1" fill="none"/>
                                            <polyline points="0,50 120,38 240,44 360,28 480,34 600,16 700,22" stroke="white" strokeOpacity="0.10" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
                                          </svg>
                                          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent"/>
                                          <div className="relative flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl bg-white/15 border border-white/30 flex items-center justify-center text-white font-black text-base flex-shrink-0">{String.fromCharCode(65+oi)}</div>
                                            <div>
                                              <div className="text-white font-black text-[15px] leading-tight">{opt.name || `Option ${String.fromCharCode(65+oi)}`}</div>
                                              {options.length > 1 && <div className="text-[9px] text-white/55 font-bold uppercase tracking-[0.2em] mt-0.5">Option {oi+1} of {options.length}</div>}
                                            </div>
                                          </div>
                                          <div className="relative hidden sm:flex -space-x-3 flex-shrink-0">
                                            <div className="w-7 h-7 rounded-full" style={{ background:"radial-gradient(circle at 38% 38%,#2563eb,#0e2a7a)", opacity:0.85 }}/>
                                            <div className="w-7 h-7 rounded-full" style={{ background:"radial-gradient(circle at 62% 38%,#02665e,#013f3a)", opacity:0.75 }}/>
                                          </div>
                                        </div>
                                        <div className="bg-gray-50/60 p-4 space-y-4">
                                          {/* Pricing card */}
                                          {opt.pricingLines.length > 0 && (() => {
                                            const rows = opt.pricingLines.map(l => {
                                              const ci = l.lastIndexOf(":");
                                              const isTotal = /total for group/i.test(l);
                                              return { label: ci > -1 ? l.slice(0,ci).trim() : l.trim(), value: ci > -1 ? l.slice(ci+1).trim() : "", isTotal };
                                            });
                                            return (
                                              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                                                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100">
                                                  <BarChart3 className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0"/>
                                                  <span className="text-[9px] font-black uppercase tracking-widest text-indigo-600">Pricing Breakdown</span>
                                                </div>
                                                <div className="divide-y divide-gray-50">
                                                  {rows.map((row,ri) => row.isTotal ? (
                                                    <div key={ri} className="flex items-center justify-between px-4 py-3" style={{ background:"linear-gradient(90deg,#ecfdf5,#d1fae5)" }}>
                                                      <span className="flex items-center gap-2 text-[12px] font-black text-emerald-800"><span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0"/>{row.label}</span>
                                                      <span className="text-[14px] font-black text-emerald-700 tabular-nums">{row.value}</span>
                                                    </div>
                                                  ) : (
                                                    <div key={ri} className="flex items-center justify-between px-4 py-2.5">
                                                      <span className="text-[11px] text-gray-500">{row.label}</span>
                                                      <span className="text-[12px] font-bold text-gray-800 tabular-nums">{row.value}</span>
                                                    </div>
                                                  ))}
                                                </div>
                                              </div>
                                            );
                                          })()}
                                          {/* Inclusions grid */}
                                          {opt.inclCats.length > 0 && (() => {
                                            type CatCfg2 = { Icon: typeof Building2; bg: string; border: string; iconColor: string; labelColor: string };
                                            const catCfg2: Record<string,CatCfg2> = {
                                              accommodation: { Icon:Building2, bg:"#eff6ff", border:"#bfdbfe", iconColor:"#3b82f6", labelColor:"#1d4ed8" },
                                              meal:          { Icon:Utensils,  bg:"#fef9c3", border:"#fde047", iconColor:"#ca8a04", labelColor:"#a16207" },
                                              food:          { Icon:Utensils,  bg:"#fef9c3", border:"#fde047", iconColor:"#ca8a04", labelColor:"#a16207" },
                                              transport:     { Icon:Car,       bg:"#fff7ed", border:"#fed7aa", iconColor:"#f97316", labelColor:"#c2410c" },
                                              guide:         { Icon:User,      bg:"#f0fdf4", border:"#bbf7d0", iconColor:"#22c55e", labelColor:"#15803d" },
                                              park:          { Icon:MapPin,    bg:"#f0fdfa", border:"#99f6e4", iconColor:"#14b8a6", labelColor:"#0f766e" },
                                              permit:        { Icon:FileText,  bg:"#fdf4ff", border:"#e9d5ff", iconColor:"#a855f7", labelColor:"#7e22ce" },
                                              activity:      { Icon:Target,    bg:"#fefce8", border:"#fef08a", iconColor:"#eab308", labelColor:"#a16207" },
                                              ticket:        { Icon:Ticket,    bg:"#fefce8", border:"#fef08a", iconColor:"#eab308", labelColor:"#a16207" },
                                            };
                                            const fallback2: CatCfg2 = { Icon:Star, bg:"#f8fafc", border:"#e2e8f0", iconColor:"#94a3b8", labelColor:"#475569" };
                                            const getCfg2 = (lbl:string) => { const k = Object.keys(catCfg2).find(k2 => lbl.toLowerCase().includes(k2)); return k ? catCfg2[k] : fallback2; };
                                            return (
                                              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                                                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100">
                                                  <Gift className="w-3.5 h-3.5 text-teal-600 flex-shrink-0"/>
                                                  <span className="text-[9px] font-black uppercase tracking-widest text-teal-700">What&apos;s Included</span>
                                                </div>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-gray-100">
                                                  {opt.inclCats.map((cat,ci) => {
                                                    const cfg2 = getCfg2(cat.label);
                                                    const CatIcon2 = cfg2.Icon;
                                                    const catName2 = cat.label.replace(/^[\p{Emoji}\s]+/u,"").split(":")[0].trim();
                                                    const linked2 = cat.details.find(d => /linked listings:/i.test(d));
                                                    const other2 = cat.details.filter(d => !/linked listings:/i.test(d));
                                                    return (
                                                      <div key={ci} className="bg-white p-3.5 flex items-start gap-3">
                                                        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background:`linear-gradient(135deg,${cfg2.bg},#fff)`, border:`1px solid ${cfg2.border}` }}>
                                                          <CatIcon2 className="w-4 h-4" style={{ color:cfg2.iconColor }}/>
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                          <div className="text-[9px] font-black uppercase tracking-widest mb-0.5" style={{ color:cfg2.labelColor }}>{catName2}</div>
                                                          <div className="text-[12px] font-bold text-gray-900 leading-snug">{cat.items}</div>
                                                          {other2.map((d,di) => <p key={di} className="text-[10px] text-gray-400 italic mt-0.5 leading-snug">{d}</p>)}
                                                          {linked2 && (
                                                            <div className="mt-1.5 inline-flex items-center gap-1.5 bg-teal-50 border border-teal-200 rounded-full px-2 py-0.5">
                                                              <span className="text-[9px]">🔗</span>
                                                              <span className="text-[10px] font-bold text-teal-700 truncate">{linked2.replace(/linked listings:\s*/i,"")}</span>
                                                            </div>
                                                          )}
                                                        </div>
                                                      </div>
                                                    );
                                                  })}
                                                </div>
                                              </div>
                                            );
                                          })()}
                                          {/* Day timeline */}
                                          {opt.itineraryLines.length > 0 && (() => {
                                            type DayBlock2 = { day:string; desc:string; notes:string[] };
                                            const days2: DayBlock2[] = [];
                                            opt.itineraryLines.forEach(l => {
                                              const m2 = l.match(/^(Day\s+\d+[:\-\s]?)/i);
                                              if (m2) { days2.push({ day:m2[1].trim().replace(/[:–-]+$/,""), desc:l.replace(m2[0],"").trim(), notes:[] }); }
                                              else if (days2.length > 0) { days2[days2.length-1].notes.push(l); }
                                              else { days2.push({ day:"", desc:l, notes:[] }); }
                                            });
                                            return (
                                              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                                                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100">
                                                  <Calendar className="w-3.5 h-3.5 text-violet-600 flex-shrink-0"/>
                                                  <span className="text-[9px] font-black uppercase tracking-widest text-violet-700">Day-by-Day Itinerary</span>
                                                </div>
                                                <div className="px-4 py-3 space-y-0">
                                                  {days2.map((d2,di) => (
                                                    <div key={di} className="flex gap-3 relative">
                                                      {di < days2.length-1 && <div className="absolute left-[14px] top-7 bottom-0 w-px bg-gradient-to-b from-indigo-200 to-transparent z-0"/>}
                                                      <div className="flex-shrink-0 z-10 mt-1">
                                                        {d2.day ? (
                                                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[9px] font-black" style={{ background:"linear-gradient(135deg,#4f46e5,#6366f1)" }}>{d2.day.replace(/Day\s*/i,"").trim()||(di+1)}</div>
                                                        ) : (
                                                          <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background:"#f3f4f6" }}><span className="text-gray-400 text-[10px]">↳</span></div>
                                                        )}
                                                      </div>
                                                      <div className="flex-1 pb-3.5">
                                                        {d2.day && <div className="text-[9px] font-black uppercase tracking-widest text-indigo-500 mb-0.5">{d2.day}</div>}
                                                        <p className="text-[12px] font-semibold text-gray-800 leading-snug">{d2.desc}</p>
                                                        {d2.notes.map((n,ni) => <p key={ni} className="text-[10px] text-gray-400 italic mt-0.5 leading-snug">{n}</p>)}
                                                      </div>
                                                    </div>
                                                  ))}
                                                </div>
                                              </div>
                                            );
                                          })()}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* ── Section 3: Permits ── */}
                              {permits.length > 0 && (
                                <div>
                                  <div className="flex items-center gap-2 mb-3">
                                    <div className="w-5 h-5 rounded-md flex items-center justify-center text-white text-[9px] font-black flex-shrink-0" style={{ background:"linear-gradient(135deg,#0e2a7a,#02665e)" }}>3</div>
                                    <span className="text-[11px] font-black uppercase tracking-widest text-gray-700">Permits &amp; Documents Required</span>
                                    <div className="flex-1 h-px bg-gray-200"/>
                                  </div>
                                  <div className="bg-white rounded-xl border border-amber-200 overflow-hidden shadow-sm">
                                    <div className="divide-y divide-amber-50">
                                      {permits.map((p,pi) => (
                                        <div key={pi} className="flex items-center gap-3 px-4 py-2.5">
                                          <div className="w-5 h-5 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center flex-shrink-0">
                                            <CheckCircle className="w-3 h-3 text-amber-600"/>
                                          </div>
                                          <span className="text-[12px] text-gray-700 font-medium">{p}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* ── Section 4: Timeline ── */}
                              {request.estimatedTimeline && (
                                <div>
                                  <div className="flex items-center gap-2 mb-3">
                                    <div className="w-5 h-5 rounded-md flex items-center justify-center text-white text-[9px] font-black flex-shrink-0" style={{ background:"linear-gradient(135deg,#0e2a7a,#02665e)" }}>4</div>
                                    <span className="text-[11px] font-black uppercase tracking-widest text-gray-700">Booking Timeline</span>
                                    <div className="flex-1 h-px bg-gray-200"/>
                                  </div>
                                  <div className="bg-white rounded-xl border border-violet-200 p-4 shadow-sm">
                                    <p className="text-[12px] text-gray-700 leading-relaxed whitespace-pre-wrap">{request.estimatedTimeline}</p>
                                  </div>
                                </div>
                              )}

                              {/* ── Assigned Agent ── */}
                              {request.assignedAgent && (
                                <div className="bg-white rounded-2xl border border-indigo-200 p-5 shadow-sm">
                                  <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-100 to-blue-100 border border-indigo-200 flex items-center justify-center text-indigo-600 font-black text-base flex-shrink-0">
                                      {request.assignedAgent.split(" ").map((w:string)=>w[0]).join("").slice(0,2).toUpperCase()}
                                    </div>
                                    <div>
                                      <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">Your Dedicated Travel Agent</div>
                                      <div className="text-sm font-bold text-indigo-900">{request.assignedAgent}</div>
                                      <div className="flex items-center gap-1.5 mt-0.5">
                                        <span className="inline-flex items-center gap-1 bg-indigo-50 border border-indigo-200 text-indigo-700 text-[9px] font-black uppercase tracking-widest rounded-full px-2 py-0.5">✦ Top-Rated</span>
                                        <span className="text-[10px] text-indigo-500 font-semibold">Ranked by NoLSAF Intelligence Score™</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}

                            </div>{/* end body */}

                            {/* ── Footer ── */}
                            <div className="relative overflow-hidden px-8 py-4" style={{ background:"linear-gradient(135deg,#0e2a7a 0%,#0a5c82 38%,#02665e 100%)" }}>
                              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none"/>
                              <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40" viewBox="0 0 794 72" fill="none" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
                                <polyline points="0,60 160,48 320,52 480,36 640,42 794,28" stroke="white" strokeOpacity="0.10" strokeWidth="1.4" fill="none" strokeLinecap="round"/>
                              </svg>
                              <div className="relative flex items-center justify-between gap-4">
                                <div>
                                  <div className="text-white font-black text-sm tracking-tight">NoLS Africa Inc</div>
                                  <div className="text-teal-300 text-[10px] mt-0.5">Authorised Trip Planning Report · Ref NLS-{String(request.id).padStart(5,"0")}</div>
                                </div>
                                <div className="text-center">
                                  <span className="text-teal-300/80 text-[10px] italic font-semibold tracking-wide">&ldquo;Quality Stay For Every Wallet&rdquo;</span>
                                </div>
                                <div className="text-right">
                                  <div className="text-white/60 text-[10px]">Issued: {sentDate}</div>
                                  <div className="text-white/35 text-[9px] mt-0.5">Confidential · For named recipient only</div>
                                </div>
                              </div>
                              <div className="relative mt-2 pt-2 border-t border-white/10 flex flex-wrap gap-3 text-[9px] text-white/35">
                                <span>sales@nolsaf.com</span>
                                <span>Dar es Salaam, Tanzania</span>
                                <span className="ml-auto">© {new Date().getFullYear()} NoLS Africa Inc. · NoLSAF TripEngine™ · Precision-Crafted Travel Technology</span>
                              </div>
                            </div>
                          </div>{/* end A4 paper */}
                        </div>
                      );
                    })() : (
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

