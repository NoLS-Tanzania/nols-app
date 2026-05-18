"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import apiClient from "@/lib/apiClient";
import { ArrowLeft, CalendarDays, ClipboardList, CheckCircle2, Activity, Eye, Info } from "lucide-react";
import LogoSpinner from "@/components/LogoSpinner";
import TableRow from "@/components/TableRow";

const api = apiClient;

type BookingItem = {
  id: string | number;
  title?: string;
  description?: string | null;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  tripDate?: string;
  amountPaid?: number;
  tripType?: string;
  rating?: number | null;
  challenges?: string | null;
  completedAt?: string | null;
  requester?: {
    fullName?: string;
    nationality?: string;
  };
};

type BucketKey = "new" | "confirmed" | "progress" | "completed" | "cancelled" | "other";
type MainBucketKey = "new" | "confirmed" | "progress" | "completed";

// --- Activity helpers ---

const STORAGE_KEY = "agent_booking_activity_checks";

function getActivities(booking: BookingItem): string[] {
  if (booking.description) {
    const lines = booking.description
      .split(/[\n,;]/)
      .map((l) => l.trim())
      .filter((l) => l.length > 2 && l.length < 80);
    if (lines.length >= 2) return lines;
  }
  const t = String(booking.tripType || booking.title || "").toUpperCase();
  if (t.includes("SAFARI") || t.includes("GAME")) {
    return ["Game Drive (Morning)", "Breakfast at Camp", "Game Drive (Evening)", "Bush Walk", "Sundowners", "Campfire Dinner"];
  }
  if (t.includes("BEACH") || t.includes("ZANZIBAR") || t.includes("COAST")) {
    return ["Check-in & Welcome", "Beach Walk", "Snorkeling / Water Sports", "Lunch", "Sunset Cruise", "Dinner"];
  }
  if (t.includes("CULTURAL") || t.includes("VILLAGE")) {
    return ["Welcome Briefing", "Cultural Site Visit", "Local Market Tour", "Traditional Meal", "Wrap-up Session"];
  }
  if (t.includes("MOUNTAIN") || t.includes("KILIMANJARO") || t.includes("TREK") || t.includes("HIKE")) {
    return ["Base Camp Briefing", "Morning Trek", "Lunch Break", "Afternoon Trek", "Camp Setup", "Evening Debrief"];
  }
  return ["Welcome & Check-in", "Morning Activity", "Lunch / Meal", "Afternoon Activity", "Evening Activity", "Wrap-up & Debrief"];
}

function formatActivityTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    + " at "
    + d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function bucketForStatus(status?: string): BucketKey {
  const s = String(status || "").toUpperCase();
  if (!s || s.includes("NEW") || s.includes("PENDING") || s.includes("ASSIGN")) return "new";
  if (s.includes("CONFIRM") || s.includes("ACCEPT")) return "confirmed";
  if (s.includes("PROGRESS") || s.includes("ONGOING") || s.includes("ACTIVE")) return "progress";
  if (s.includes("COMPLETE") || s.includes("DONE") || s.includes("CLOSED")) return "completed";
  if (s.includes("CANCEL") || s.includes("REJECT")) return "cancelled";
  return "other";
}

function bucketLabel(key: BucketKey) {
  switch (key) {
    case "new":
      return "New";
    case "confirmed":
      return "Confirmed";
    case "progress":
      return "In Progress";
    case "completed":
      return "Completed";
    case "cancelled":
      return "Cancelled";
    default:
      return "Other";
  }
}

function bucketIcon(key: MainBucketKey) {
  switch (key) {
    case "new":
      return <ClipboardList className="h-4 w-4" />;
    case "confirmed":
      return <CheckCircle2 className="h-4 w-4" />;
    case "progress":
      return <Activity className="h-4 w-4" />;
    default:
      return <CheckCircle2 className="h-4 w-4" />;
  }
}

function tabClasses(key: MainBucketKey, isActive: boolean) {
  if (key === "new") {
    return isActive
      ? "flex items-center justify-between rounded-full border px-3 py-2 text-left text-sm font-bold shadow-sm"
      : "flex items-center justify-between rounded-full border px-3 py-2 text-left text-sm font-semibold transition-all hover:bg-white/10";
  }
  if (key === "confirmed") {
    return isActive
      ? "flex items-center justify-between rounded-full border px-3 py-2 text-left text-sm font-bold shadow-sm"
      : "flex items-center justify-between rounded-full border px-3 py-2 text-left text-sm font-semibold transition-all hover:bg-white/10";
  }
  if (key === "progress") {
    return isActive
      ? "flex items-center justify-between rounded-full border px-3 py-2 text-left text-sm font-bold shadow-sm"
      : "flex items-center justify-between rounded-full border px-3 py-2 text-left text-sm font-semibold transition-all hover:bg-white/10";
  }
  return isActive
    ? "flex items-center justify-between rounded-full border px-3 py-2 text-left text-sm font-bold shadow-sm"
    : "flex items-center justify-between rounded-full border px-3 py-2 text-left text-sm font-semibold transition-all hover:bg-white/10";
}

function tabCountPillClasses(key: MainBucketKey, isActive: boolean) {
  if (key === "new") {
    return isActive
      ? "rounded-full bg-sky-300 px-2 py-0.5 text-xs font-extrabold text-sky-900"
      : "rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600";
  }
  if (key === "confirmed") {
    return isActive
      ? "rounded-full bg-violet-300 px-2 py-0.5 text-xs font-extrabold text-violet-900"
      : "rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600";
  }
  if (key === "progress") {
    return isActive
      ? "rounded-full bg-amber-300 px-2 py-0.5 text-xs font-extrabold text-amber-900"
      : "rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600";
  }
  return isActive
    ? "rounded-full bg-emerald-300 px-2 py-0.5 text-xs font-extrabold text-emerald-900"
    : "rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600";
}

export default function AgentBookingsPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<BookingItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<MainBucketKey>("new");
  // checkedActivities: key = `{bookingId}__{activityName}`, value = ISO timestamp
  const [checkedActivities, setCheckedActivities] = useState<Record<string, string>>({});

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setCheckedActivities(JSON.parse(saved));
    } catch {}
  }, []);

  const toggleActivity = useCallback((bookingId: string, activity: string) => {
    setCheckedActivities((prev) => {
      const key = `${bookingId}__${activity}`;
      const next = { ...prev };
      if (next[key]) {
        delete next[key];
      } else {
        next[key] = new Date().toISOString();
      }
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await api.get("/api/agent/assignments");
        if (!alive) return;
        const list = (res as any)?.data?.items ?? [];
        setItems(Array.isArray(list) ? list : []);
      } catch (e: any) {
        if (!alive) return;
        setError(e?.response?.data?.message || e?.response?.data?.error || "Could not load bookings.");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const grouped = useMemo(() => {
    const base: Record<BucketKey, BookingItem[]> = {
      new: [], confirmed: [], progress: [], completed: [], cancelled: [], other: [],
    };
    for (const item of items) base[bucketForStatus(item.status)].push(item);
    return base;
  }, [items]);

  const tabs: MainBucketKey[] = ["new", "confirmed", "progress", "completed"];
  const activeItems = grouped[activeTab];
  const isConfirmedTab = activeTab === "confirmed";
  const isProgressTab = activeTab === "progress";
  const isCompletedTab = activeTab === "completed";

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LogoSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur-sm">
        <div className="relative mx-auto flex max-w-6xl items-center px-4 py-3">
          <Link
            href="/account/agent"
            className="inline-flex items-center gap-2 rounded-full px-2 py-1.5 text-sm font-semibold text-slate-500 no-underline transition hover:bg-slate-100 hover:text-[#02665e]"
            aria-label="Back to dashboard"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="hidden sm:inline">Back</span>
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        <section
          className="relative rounded-2xl overflow-hidden shadow-2xl"
          style={{ background: "linear-gradient(135deg, #171437 0%, #123d52 42%, #0c6457 100%)", boxShadow: "0 28px 65px -15px rgba(12,100,87,0.42), 0 8px 22px -8px rgba(23,20,55,0.50)" }}
        >
          <svg
            aria-hidden
            className="absolute inset-0 h-full w-full pointer-events-none select-none"
            preserveAspectRatio="xMidYMid slice"
            viewBox="0 0 900 220"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="800" cy="42" r="185" stroke="white" strokeOpacity="0.055" strokeWidth="1" fill="none" />
            <circle cx="110" cy="190" r="120" stroke="white" strokeOpacity="0.045" strokeWidth="1" fill="none" />
            {[50, 96, 142, 188].map((y) => (
              <line key={y} x1="0" y1={y} x2="900" y2={y} stroke="rgba(255,255,255,0.028)" strokeWidth="1" />
            ))}
            <polyline
              points="0,170 100,145 210,156 330,118 460,138 590,94 710,116 830,78 900,88"
              fill="none"
              stroke="white"
              strokeOpacity="0.15"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <polygon
              points="0,170 100,145 210,156 330,118 460,138 590,94 710,116 830,78 900,88 900,220 0,220"
              fill="white"
              fillOpacity="0.024"
            />
            <radialGradient id="agentBookingsHeaderGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(45,212,191,0.22)" />
              <stop offset="100%" stopColor="rgba(45,212,191,0)" />
            </radialGradient>
            <ellipse cx="455" cy="112" rx="320" ry="145" fill="url(#agentBookingsHeaderGlow)" />
          </svg>

          <div className="relative z-10 flex flex-col items-center text-center px-6 py-10 sm:py-14">
            <div
              className="mb-5 inline-flex items-center justify-center rounded-full"
              style={{
                width: 64,
                height: 64,
                background: "rgba(255,255,255,0.10)",
                border: "1.5px solid rgba(255,255,255,0.18)",
                boxShadow: "0 0 0 8px rgba(255,255,255,0.05), 0 8px 32px rgba(0,0,0,0.35)",
              }}
            >
              <ClipboardList className="h-7 w-7" style={{ color: "rgba(255,255,255,0.92)" }} aria-hidden />
            </div>
            <div className="text-xs font-black uppercase tracking-widest text-teal-100">Operator Workspace</div>
            <h1
              className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight"
              style={{ color: "#ffffff", textShadow: "0 2px 12px rgba(0,0,0,0.4)" }}
            >
              My Bookings
            </h1>
            <p className="mt-2 max-w-2xl text-sm sm:text-base" style={{ color: "rgba(255,255,255,0.60)" }}>
              Bookings assigned to your operator account, organized by trip stage.
            </p>

            <div className="mt-4 relative group/tooltip inline-flex">
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-all duration-150 focus:outline-none"
                style={{ background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.70)" }}
                aria-label="Booking stages information"
                onClick={(e) => {
                  e.preventDefault();
                  try {
                    (e.currentTarget as HTMLButtonElement).focus();
                  } catch {
                    // ignore
                  }
                }}
              >
                <Info className="h-3.5 w-3.5" aria-hidden />
                <span>Booking stages</span>
              </button>
              <div
                role="tooltip"
                className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 z-50 mb-2 w-72 max-w-[calc(100vw-1rem)] whitespace-normal break-words rounded-xl px-3 py-2.5 text-left text-xs opacity-0 shadow-2xl transition-opacity duration-150 group-hover/tooltip:opacity-100 group-focus-within/tooltip:opacity-100"
                style={{ background: "#0b2a38", border: "1px solid rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.85)" }}
              >
                <div className="font-semibold mb-1" style={{ color: "#fff" }}>Booking stages</div>
                <div className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.60)" }}>
                  Use these stages to move from new booking review to confirmed trips, live activity tracking and completed trip records.
                </div>
              </div>
            </div>
          </div>
        </section>

        {error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
        ) : null}

        <section className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div
            className="px-4 py-4"
            style={{ background: "linear-gradient(135deg, #10182e 0%, #143541 52%, #0f4f45 100%)" }}
          >
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {tabs.map((key) => {
                const isActive = activeTab === key;
                const count = grouped[key].length;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActiveTab(key)}
                    className={tabClasses(key, isActive)}
                    style={
                      isActive
                        ? { background: "rgba(255,255,255,0.18)", borderColor: "rgba(255,255,255,0.38)", color: "#fff" }
                        : { background: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.70)" }
                    }
                  >
                    <span className="inline-flex items-center gap-2">
                      {bucketIcon(key)}
                      {bucketLabel(key)}
                    </span>
                    <span
                      className={tabCountPillClasses(key, isActive)}
                      style={isActive ? { background: "rgba(255,255,255,0.20)", color: "#fff" } : undefined}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-3">
            {isProgressTab ? (
              activeItems.length === 0 ? (
                <div className="px-4 pb-6 pt-2 sm:px-6">
                  {/* Ghost card — shows the structure the operator will use when a trip is active */}
                  <div className="overflow-hidden rounded-2xl border border-dashed border-amber-300 bg-amber-50/40">
                    {/* Ghost header */}
                    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-amber-100 bg-amber-50/60 px-4 py-3">
                      <div className="space-y-1.5">
                        <div className="h-4 w-40 rounded-md bg-amber-200/70" />
                        <div className="h-3 w-28 rounded-md bg-amber-100" />
                      </div>
                      <div className="h-8 w-24 rounded-lg border border-amber-200 bg-white/60" />
                    </div>

                    {/* Ghost meta */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 px-4 py-3 sm:grid-cols-3">
                      {["Trip Date", "Amount", "Progress"].map((label) => (
                        <p key={label} className="flex items-center gap-2 text-sm">
                          <span className="font-semibold text-amber-700/60">{label}:</span>
                          <span className="h-3 w-20 rounded bg-amber-100 inline-block" />
                        </p>
                      ))}
                    </div>

                    {/* Ghost progress bar */}
                    <div className="mx-4 mb-1 h-2 overflow-hidden rounded-full bg-amber-100">
                      <div className="h-full w-0 rounded-full bg-gradient-to-r from-amber-300 to-orange-300" />
                    </div>

                    {/* Ghost activity rows */}
                    <ul className="divide-y divide-amber-100/60 px-4 pb-4 pt-3">
                      {["Game Drive (Morning)", "Breakfast at Camp", "Game Drive (Evening)", "Bush Walk", "Sundowners", "Campfire Dinner"].map((activity) => (
                        <li key={activity} className="flex items-start gap-3 py-2.5 opacity-50">
                          <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 border-slate-300 bg-white" />
                          <div className="flex-1 space-y-1">
                            <p className="text-sm font-semibold text-slate-600">{activity}</p>
                            <p className="text-xs text-slate-400">Tap to mark as accomplished</p>
                          </div>
                        </li>
                      ))}
                    </ul>

                    {/* Empty state label at bottom */}
                    <div className="flex items-center justify-center gap-2 border-t border-amber-100 bg-amber-50/80 px-4 py-3">
                      <Activity className="h-4 w-4 text-amber-500" />
                      <p className="text-sm font-semibold text-amber-700">No active trips. This is how activity tracking will look</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 px-4 pb-6 pt-2 sm:px-6">
                  {activeItems.map((booking) => {
                    const bid = String(booking.id);
                    const bookingBy = booking.requester?.fullName || "Guest";
                    const nationality = booking.requester?.nationality || "-";
                    const tripDateValue = booking.tripDate || booking.createdAt || "";
                    const dateOfTrip = tripDateValue
                      ? new Date(tripDateValue).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
                      : "-";
                    const amountPaid = typeof booking.amountPaid === "number"
                      ? `TZS ${booking.amountPaid.toLocaleString()}`
                      : "-";
                    const typeOfPackage = booking.tripType
                      || (booking.title ? String(booking.title).split(" • ")[0] : "Custom");
                    const activities = getActivities(booking);
                    const doneCount = activities.filter((a) => !!checkedActivities[`${bid}__${a}`]).length;
                    const progressPercent = activities.length > 0 ? Math.round((doneCount / activities.length) * 100) : 0;

                    return (
                      <article key={bid} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        {/* Card header */}
                        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 bg-amber-50/60 px-4 py-3">
                          <div>
                            <h3 className="text-base font-bold text-slate-900">{typeOfPackage}</h3>
                            <p className="mt-0.5 text-sm text-slate-600">{bookingBy} &bull; {nationality}</p>
                          </div>
                          <Link
                            href={`/account/agent/assignments/${encodeURIComponent(bid)}`}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 no-underline shadow-sm transition hover:border-[#02665e]/40 hover:text-[#02665e]"
                          >
                            <Eye className="h-4 w-4" />
                            Details
                          </Link>
                        </div>

                        {/* Meta row */}
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 px-4 py-3 text-sm sm:grid-cols-3">
                          <p><span className="font-semibold text-slate-900">Trip Date:</span> <span className="text-slate-600">{dateOfTrip}</span></p>
                          <p><span className="font-semibold text-slate-900">Amount:</span> <span className="text-slate-600">{amountPaid}</span></p>
                          <p className="col-span-2 sm:col-span-1"><span className="font-semibold text-slate-900">Progress:</span> <span className="font-bold text-amber-700">{doneCount}/{activities.length} done ({progressPercent}%)</span></p>
                        </div>

                        {/* Progress bar */}
                        <div className="mx-4 mb-1 h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-500"
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>

                        {/* Activity checklist */}
                        <ul className="divide-y divide-slate-100 px-4 pb-4 pt-3">
                          {activities.map((activity) => {
                            const key = `${bid}__${activity}`;
                            const timestamp = checkedActivities[key];
                            const done = !!timestamp;
                            return (
                              <li key={activity} className="flex items-start gap-3 py-2.5">
                                <button
                                  type="button"
                                  onClick={() => toggleActivity(bid, activity)}
                                  className={`mt-0.5 flex-shrink-0 rounded-full border-2 p-0.5 transition focus:outline-none focus:ring-2 focus:ring-amber-400 ${
                                    done
                                      ? "border-emerald-500 bg-emerald-500 text-white"
                                      : "border-slate-300 bg-white text-transparent hover:border-amber-400"
                                  }`}
                                  aria-label={done ? `Unmark ${activity}` : `Mark ${activity} as done`}
                                >
                                  <CheckCircle2 className="h-4 w-4" />
                                </button>
                                <div className="min-w-0 flex-1">
                                  <p className={done ? "text-sm font-semibold text-slate-900 line-through decoration-emerald-400" : "text-sm font-semibold text-slate-800"}>
                                    {activity}
                                  </p>
                                  {done && timestamp ? (
                                    <p className="mt-0.5 flex items-center gap-1 text-xs text-emerald-700">
                                      <CheckCircle2 className="h-3 w-3" />
                                      Accomplished at {formatActivityTime(timestamp)}
                                    </p>
                                  ) : (
                                    <p className="mt-0.5 text-xs text-slate-400">Tap to mark as accomplished</p>
                                  )}
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      </article>
                    );
                  })}
                </div>
              )
            ) : isCompletedTab ? (
              /* ── Completed tab: dedicated summary table ── */
              <div className="overflow-x-auto">
                <table className="min-w-[1200px] divide-y divide-slate-200">
                  <thead className="bg-emerald-50">
                    <tr>
                      <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-emerald-700">Booking By</th>
                      <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-emerald-700">Nationality</th>
                      <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-emerald-700">Type of Package</th>
                      <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-emerald-700">Completed At</th>
                      <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-emerald-700">Trip Rating</th>
                      <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-emerald-700">Challenge Witnessed</th>
                      <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-emerald-700">Amount Paid</th>
                      <th className="whitespace-nowrap px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-emerald-700">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {activeItems.length === 0 ? (
                      <TableRow hover={false}>
                        <td colSpan={8} className="px-4 py-10 text-center">
                          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-500">
                            <CheckCircle2 className="h-5 w-5" />
                          </div>
                          <p className="text-base font-semibold text-slate-700">No completed trips yet</p>
                          <p className="mt-1 text-sm text-slate-500">Completed bookings will appear here with ratings and trip notes.</p>
                        </td>
                      </TableRow>
                    ) : (
                      activeItems.map((booking) => {
                        const bookingBy = booking.requester?.fullName || "Guest";
                        const nationality = booking.requester?.nationality || "-";
                        const typeOfPackage = booking.tripType || (booking.title ? String(booking.title).split(" • ")[0] : "Custom");
                        const completedAt = booking.completedAt || booking.updatedAt || booking.createdAt;
                        const completedAtLabel = completedAt
                          ? new Date(completedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
                          : "-";
                        const rating = typeof booking.rating === "number" ? booking.rating : null;
                        const challenge = booking.challenges || booking.description || null;
                        const amountPaid = typeof booking.amountPaid === "number"
                          ? `TZS ${booking.amountPaid.toLocaleString()}`
                          : "-";

                        return (
                          <TableRow key={String(booking.id)} className="hover:bg-emerald-50/30">
                            <td className="px-4 py-3 text-sm font-semibold text-slate-900">{bookingBy}</td>
                            <td className="px-4 py-3 text-sm text-slate-600">{nationality}</td>
                            <td className="px-4 py-3 text-sm text-slate-700">{typeOfPackage}</td>
                            <td className="px-4 py-3 text-sm text-slate-600">
                              <span className="inline-flex items-center gap-1">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                {completedAtLabel}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {rating !== null ? (
                                <span className="inline-flex items-center gap-0.5">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <svg key={star} className={`h-4 w-4 ${star <= rating ? "text-amber-400" : "text-slate-200"}`} fill="currentColor" viewBox="0 0 20 20">
                                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                    </svg>
                                  ))}
                                  <span className="ml-1 text-xs font-semibold text-slate-600">{rating}/5</span>
                                </span>
                              ) : (
                                <span className="text-xs text-slate-400">Not rated</span>
                              )}
                            </td>
                            <td className="max-w-[180px] px-4 py-3 text-sm text-slate-600">
                              {challenge ? (
                                <span className="block truncate" title={challenge}>{challenge}</span>
                              ) : (
                                <span className="text-xs text-slate-400">None reported</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm font-semibold text-slate-700">{amountPaid}</td>
                            <td className="px-4 py-3 text-right">
                              <Link
                                href={`/account/agent/assignments/${encodeURIComponent(String(booking.id))}`}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 no-underline transition hover:border-[#02665e]/40 hover:text-[#02665e]"
                                aria-label={`View booking ${String(booking.id)}`}
                                title="View details"
                              >
                                <Eye className="h-4 w-4" />
                              </Link>
                            </td>
                          </TableRow>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              /* ── New / Confirmed tabs: standard table ── */
              <div className="overflow-x-auto">
                <table className="min-w-[980px] divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Booking By</th>
                      <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Nationality</th>
                      {isConfirmedTab ? (
                        <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Date Confirmed</th>
                      ) : (
                        <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Type of Package</th>
                      )}
                      <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Date of Trip</th>
                      <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Amount Paid</th>
                      <th className="whitespace-nowrap px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-500">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {activeItems.length === 0 ? (
                      <TableRow hover={false}>
                        <td colSpan={6} className="px-4 py-10 text-center">
                          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                            {bucketIcon(activeTab)}
                          </div>
                          <p className="text-base font-semibold text-slate-700">No {bucketLabel(activeTab).toLowerCase()} items yet</p>
                          <p className="mt-1 text-sm text-slate-500">Bookings in this category will appear here automatically.</p>
                        </td>
                      </TableRow>
                    ) : (
                      activeItems.map((booking) => {
                        const bookingBy = booking.requester?.fullName || "Guest";
                        const nationality = booking.requester?.nationality || "-";
                        const dateOfTrip = booking.tripDate
                          ? new Date(booking.tripDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
                          : booking.createdAt
                            ? new Date(booking.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
                            : "-";
                        const amountPaid = typeof booking.amountPaid === "number"
                          ? `TZS ${booking.amountPaid.toLocaleString()}`
                          : "-";
                        const dateConfirmed = booking.createdAt
                          ? new Date(booking.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
                          : "-";
                        const typeOfPackage = booking.tripType
                          || (booking.title ? String(booking.title).split(" • ")[0] : "Custom");

                        return (
                          <TableRow key={String(booking.id)} className="hover:bg-slate-50">
                            <td className="px-4 py-3 text-sm font-semibold text-slate-900">{bookingBy}</td>
                            <td className="px-4 py-3 text-sm text-slate-600">{nationality}</td>
                            {isConfirmedTab ? (
                              <td className="px-4 py-3 text-sm text-slate-600">{dateConfirmed}</td>
                            ) : (
                              <td className="px-4 py-3 text-sm text-slate-700">{typeOfPackage}</td>
                            )}
                            <td className="px-4 py-3 text-sm text-slate-600">
                              <span className="inline-flex items-center gap-1">
                                <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
                                {dateOfTrip}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm font-semibold text-slate-700">{amountPaid}</td>
                            <td className="px-4 py-3 text-right">
                              <Link
                                href={`/account/agent/assignments/${encodeURIComponent(String(booking.id))}`}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 no-underline transition hover:border-[#02665e]/40 hover:text-[#02665e]"
                                aria-label={`View booking ${String(booking.id)}`}
                                title="View details"
                              >
                                <Eye className="h-4 w-4" />
                              </Link>
                            </td>
                          </TableRow>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
