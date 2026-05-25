"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  RefreshCw,
  Share2,
  Star,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import apiClient from "@/lib/apiClient";

const api = apiClient;

type EventPoint = {
  key: string;
  axisLabel: string;
  day: number;
  time?: string;
  title: string;
  vibe?: string;
  average: number;
  ratingCount: number;
  label: string;
};

type ExperienceItem = {
  id: number;
  bookingCode: string;
  title: string;
  destination?: string | null;
  operatorName: string;
  customerName: string;
  travelerCount: number;
  status: string;
  paymentStatus: string;
  lifecycleStatus: "WAITING_MEETUP" | "ACTIVE_TIMELINE" | "RATED" | string;
  meetup: { validated: boolean; validatedAt?: string | null };
  sharing: {
    generated: boolean;
    generatedAt?: string | null;
    joined: number;
    capacity: number;
    participants: Array<{ userId: number; name: string; acceptedAt?: string | null }>;
  };
  rating: {
    totalEvents: number;
    totalRatings: number;
    averageRating: number;
    topFeeling: string;
    completedTravellers: number;
    highest?: EventPoint | null;
    lowest?: EventPoint | null;
    eventPoints: EventPoint[];
    userCompletion: Array<{ userId: number; name: string; role: string; ratedEvents: number; totalEvents: number; complete: boolean }>;
  };
  updatedAt: string;
};

type OverviewPayload = {
  ok: boolean;
  summary: {
    total: number;
    meetupValidated: number;
    inviteGenerated: number;
    joinedTravellers: number;
    totalRatings: number;
    averageRating: number;
    completedTravellers: number;
  };
  items: ExperienceItem[];
};

function statusLabel(value: string) {
  if (value === "WAITING_MEETUP") return "Waiting meetup";
  if (value === "ACTIVE_TIMELINE") return "Active timeline";
  if (value === "RATED") return "Rated";
  return value || "Unknown";
}

function statusClass(value: string) {
  if (value === "RATED") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (value === "ACTIVE_TIMELINE") return "border-sky-200 bg-sky-50 text-sky-700";
  return "border-amber-200 bg-amber-50 text-amber-700";
}

function dateText(value?: string | null) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return date.toLocaleString();
}

function StatCard({ label, value, Icon, tone = "teal" }: { label: string; value: string | number; Icon: any; tone?: "teal" | "blue" | "amber" | "emerald" }) {
  const toneClass = {
    teal: {
      color: "#7dd3fc",
      bg: "rgba(14,165,233,0.16)",
      border: "rgba(14,165,233,0.35)",
    },
    blue: {
      color: "#6ee7b7",
      bg: "rgba(16,185,129,0.16)",
      border: "rgba(16,185,129,0.35)",
    },
    amber: {
      color: "#c4b5fd",
      bg: "rgba(147,51,234,0.16)",
      border: "rgba(196,181,253,0.35)",
    },
    emerald: {
      color: "#fcd34d",
      bg: "rgba(245,158,11,0.16)",
      border: "rgba(245,158,11,0.35)",
    },
  }[tone];

  return (
    <div
      className="transition-all hover:scale-[1.015]"
      style={{
        borderRadius: "1rem",
        border: `1px solid ${toneClass.border}`,
        boxShadow: "0 8px 32px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.06)",
        background: "linear-gradient(135deg, #0a1a19 0%, #0d2320 60%, #0a1f2e 100%)",
        padding: "1.05rem",
      }}
    >
      <div className="flex items-center gap-3">
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: "999px",
            background: toneClass.bg,
            border: `1px solid ${toneClass.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon className="h-4.5 w-4.5" style={{ color: toneClass.color }} />
        </div>
        <div className="min-w-0">
          <div className="truncate text-[0.72rem] font-medium text-white/55">{label}</div>
          <div className="mt-0.5 text-[1.65rem] font-extrabold leading-none tabular-nums tracking-tight sm:text-[1.5rem]" style={{ color: toneClass.color }}>
            {value}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminTourExperiencePage() {
  const [payload, setPayload] = useState<OverviewPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("ALL");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<OverviewPayload>("/api/admin/tour-experience/overview", {
        params: { status },
      });
      setPayload(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to load tour experience intelligence.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void load();
    }, 250);
    return () => window.clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const items = useMemo(() => payload?.items || [], [payload]);
  const summary = payload?.summary;
  const topIssues = useMemo(
    () => items
      .flatMap((item) => item.rating.lowest ? [{ ...item.rating.lowest, bookingCode: item.bookingCode, operatorName: item.operatorName }] : [])
      .filter((point) => point.ratingCount > 0)
      .sort((a, b) => a.average - b.average)
      .slice(0, 4),
    [items]
  );

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <section
          className="relative overflow-hidden rounded-3xl border border-[#02665e]/30 px-5 py-7 text-white shadow-sm"
          style={{ background: "linear-gradient(135deg, #0e2a7a 0%, #0a5c82 38%, #02665e 100%)" }}
        >
          <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 900 180" preserveAspectRatio="xMidYMid slice" aria-hidden>
            <circle cx="840" cy="25" r="120" fill="none" stroke="white" strokeWidth="1" strokeOpacity="0.14" />
            <circle cx="840" cy="25" r="78" fill="none" stroke="white" strokeWidth="1" strokeOpacity="0.08" />
            <circle cx="72" cy="168" r="78" fill="none" stroke="white" strokeWidth="1" strokeOpacity="0.12" />
            <line x1="0" y1="44" x2="900" y2="44" stroke="white" strokeWidth="0.6" strokeOpacity="0.12" />
            <line x1="0" y1="84" x2="900" y2="84" stroke="white" strokeWidth="0.6" strokeOpacity="0.12" />
            <line x1="0" y1="124" x2="900" y2="124" stroke="white" strokeWidth="0.6" strokeOpacity="0.12" />
            <polyline points="0,132 96,112 192,95 288,80 384,66 480,86 576,56 672,72 768,44 864,56 900,50" fill="none" stroke="white" strokeWidth="3" strokeOpacity="0.18" strokeLinecap="round" strokeLinejoin="round" />
            <polyline points="0,149 96,135 192,120 288,132 384,115 480,128 576,104 672,118 768,96 864,108 900,100" fill="none" stroke="white" strokeWidth="1.4" strokeOpacity="0.18" strokeDasharray="6 4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>

          <button
            type="button"
            onClick={() => load()}
            aria-label="Refresh"
            title="Refresh"
            className="absolute right-4 top-4 z-20 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white transition hover:bg-white/20"
          >
            <RefreshCw className="h-4 w-4" />
          </button>

          <div className="relative z-10 flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/25 bg-white/10 shadow-[0_0_0_8px_rgba(255,255,255,0.05)]">
              <BarChart3 className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="text-xl font-bold leading-tight tracking-tight text-white sm:text-2xl">Tour Experience Intelligence</div>
              <h1 className="mt-1 text-base font-semibold leading-tight tracking-tight text-white/95 sm:text-lg">Timeline validation, sharing, and rating oversight</h1>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: "rgba(186,230,253,0.80)" }}>Track the full journey from meetup validation to shared traveller participation and event rating trends.</p>
            </div>
          </div>

        </section>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <StatCard label="Timelines" value={summary?.total ?? 0} Icon={ClipboardList} />
          <StatCard label="Validated" value={summary?.meetupValidated ?? 0} Icon={CheckCircle2} tone="emerald" />
          <StatCard label="Shared" value={summary?.inviteGenerated ?? 0} Icon={Share2} tone="blue" />
          <StatCard label="Joined" value={summary?.joinedTravellers ?? 0} Icon={Users} tone="blue" />
          <StatCard label="Ratings" value={summary?.totalRatings ?? 0} Icon={Star} tone="amber" />
          <StatCard label="Average" value={`${Number(summary?.averageRating || 0).toFixed(1)}/5`} Icon={TrendingUp} tone="emerald" />
        </section>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-950">Timeline Activity</h2>
                <p className="mt-1 text-sm text-slate-500">Admin audit across meetup, invite usage, traveller completion, and ratings.</p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-[#02665e]"
                >
                  <option value="ALL">All</option>
                  <option value="WAITING_MEETUP">Waiting meetup</option>
                  <option value="ACTIVE_TIMELINE">Active timeline</option>
                  <option value="RATED">Rated</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm font-semibold text-slate-500">Loading experience timelines...</div>
            ) : error ? (
              <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div>
            ) : items.length ? (
              <div className="mt-4 space-y-3">
                {items.map((item) => {
                  const open = expandedId === item.id;
                  return (
                    <article key={item.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                      <button
                        type="button"
                        onClick={() => setExpandedId(open ? null : item.id)}
                        className="block w-full p-4 text-left transition hover:bg-slate-50"
                      >
                        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${statusClass(item.lifecycleStatus)}`}>
                                {statusLabel(item.lifecycleStatus)}
                              </span>
                              <span className="font-mono text-xs font-semibold text-slate-500">{item.bookingCode}</span>
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500">ID #{item.id}</span>
                            </div>
                            <h3 className="mt-2 truncate text-base font-black text-slate-950">{item.title}</h3>
                            <div className="mt-1 text-sm text-slate-500">
                              {item.operatorName} · {item.customerName}{item.destination ? ` · ${item.destination}` : ""}
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-right sm:grid-cols-4">
                            <div className="rounded-xl bg-slate-50 px-3 py-2">
                              <div className="text-[10px] font-bold uppercase text-slate-400">Meetup</div>
                              <div className="text-xs font-black text-slate-900">{item.meetup.validated ? "Validated" : "Waiting"}</div>
                            </div>
                            <div className="rounded-xl bg-slate-50 px-3 py-2">
                              <div className="text-[10px] font-bold uppercase text-slate-400">Team</div>
                              <div className="text-xs font-black text-slate-900">{item.sharing.joined}/{item.sharing.capacity}</div>
                            </div>
                            <div className="rounded-xl bg-slate-50 px-3 py-2">
                              <div className="text-[10px] font-bold uppercase text-slate-400">Ratings</div>
                              <div className="text-xs font-black text-slate-900">{item.rating.totalRatings}</div>
                            </div>
                            <div className="rounded-xl bg-slate-50 px-3 py-2">
                              <div className="text-[10px] font-bold uppercase text-slate-400">Avg</div>
                              <div className="text-xs font-black text-slate-900">{item.rating.averageRating.toFixed(1)}/5</div>
                            </div>
                          </div>
                        </div>
                      </button>

                      {open ? (
                        <div className="border-t border-slate-100 p-4">
                          <div className="grid gap-3 lg:grid-cols-3">
                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                              <div className="flex items-center gap-2 text-xs font-bold uppercase text-slate-500">
                                <CalendarDays className="h-4 w-4 text-[#02665e]" />
                                Meetup Validation
                              </div>
                              <div className="mt-2 text-sm font-bold text-slate-900">{item.meetup.validated ? "Validated" : "Not validated"}</div>
                              <div className="mt-1 text-xs text-slate-500">{dateText(item.meetup.validatedAt)}</div>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                              <div className="flex items-center gap-2 text-xs font-bold uppercase text-slate-500">
                                <Share2 className="h-4 w-4 text-[#02665e]" />
                                Shared Timeline
                              </div>
                              <div className="mt-2 text-sm font-bold text-slate-900">{item.sharing.generated ? "Invite generated" : "No invite yet"}</div>
                              <div className="mt-1 text-xs text-slate-500">{item.sharing.joined} of {item.sharing.capacity} invited travellers joined</div>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                              <div className="flex items-center gap-2 text-xs font-bold uppercase text-slate-500">
                                <Star className="h-4 w-4 text-[#02665e]" />
                                Rating Signal
                              </div>
                              <div className="mt-2 text-sm font-bold text-slate-900">{item.rating.topFeeling}</div>
                              <div className="mt-1 text-xs text-slate-500">{item.rating.completedTravellers} traveller timelines completed</div>
                            </div>
                          </div>

                          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
                            <div className="rounded-xl border border-slate-200 bg-white p-3">
                              <div className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">Event Rating Graph</div>
                              <div className="space-y-2">
                                {item.rating.eventPoints.length ? item.rating.eventPoints.map((point) => (
                                  <div key={point.key} className="grid grid-cols-[92px_minmax(0,1fr)_48px] items-center gap-2 text-xs">
                                    <div className="font-semibold text-slate-500">{point.axisLabel}</div>
                                    <div className="min-w-0">
                                      <div className="truncate font-semibold text-slate-800">{point.title}</div>
                                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                                        <div className="h-full rounded-full bg-[#02665e]" style={{ width: `${Math.max(0, Math.min(100, (point.average / 5) * 100))}%` }} />
                                      </div>
                                    </div>
                                    <div className="text-right font-black text-[#02665e]">{point.ratingCount ? point.average.toFixed(1) : "-"}</div>
                                  </div>
                                )) : (
                                  <div className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">No timetable events found.</div>
                                )}
                              </div>
                            </div>

                            <div className="space-y-3">
                              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                                <div className="flex items-center gap-2 text-xs font-bold uppercase text-emerald-700">
                                  <TrendingUp className="h-4 w-4" />
                                  Highest Event
                                </div>
                                <div className="mt-2 text-sm font-black text-slate-950">{item.rating.highest?.title || "Waiting"}</div>
                                <div className="mt-1 text-xs text-emerald-700">{item.rating.highest ? `${item.rating.highest.average}/5 - ${item.rating.highest.label}` : "No ratings yet"}</div>
                              </div>
                              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                                <div className="flex items-center gap-2 text-xs font-bold uppercase text-amber-700">
                                  <TrendingDown className="h-4 w-4" />
                                  Improvement Watch
                                </div>
                                <div className="mt-2 text-sm font-black text-slate-950">{item.rating.lowest?.title || "Waiting"}</div>
                                <div className="mt-1 text-xs text-amber-700">{item.rating.lowest ? `${item.rating.lowest.average}/5 - ${item.rating.lowest.label}` : "No ratings yet"}</div>
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 grid gap-4 lg:grid-cols-2">
                            <div className="rounded-xl border border-slate-200 bg-white p-3">
                              <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Traveller Completion</div>
                              <div className="mt-3 space-y-2">
                                {item.rating.userCompletion.map((user) => (
                                  <div key={user.userId} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                                    <div className="min-w-0">
                                      <div className="truncate font-bold text-slate-900">{user.name}</div>
                                      <div className="text-xs text-slate-500">{user.role}</div>
                                    </div>
                                    <div className={`rounded-full px-2.5 py-1 text-xs font-bold ${user.complete ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                                      {user.ratedEvents}/{user.totalEvents}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="rounded-xl border border-slate-200 bg-white p-3">
                              <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Joined From Shared Link</div>
                              <div className="mt-3 space-y-2">
                                {item.sharing.participants.length ? item.sharing.participants.map((participant) => (
                                  <div key={participant.userId} className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
                                    <div className="font-bold text-slate-900">{participant.name}</div>
                                    <div className="text-xs text-slate-500">Joined {dateText(participant.acceptedAt)}</div>
                                  </div>
                                )) : (
                                  <div className="rounded-lg border border-dashed border-slate-200 px-3 py-5 text-center text-sm text-slate-500">
                                    No invited travellers joined yet.
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 flex justify-end">
                            <Link href={`/admin/agents/tour-bookings?booking=${encodeURIComponent(item.bookingCode)}`} className="rounded-xl border border-[#02665e]/20 bg-[#02665e]/7 px-4 py-2 text-sm font-bold text-[#02665e] no-underline">
                              Open Booking Context
                            </Link>
                          </div>
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm font-semibold text-slate-500">
                No timeline intelligence found for this filter.
              </div>
            )}
          </div>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-base font-black text-slate-950">Improvement Watch</h2>
              <p className="mt-1 text-sm text-slate-500">Lowest rated moments admin can use when consulting operators.</p>
              <div className="mt-3 space-y-2">
                {topIssues.length ? topIssues.map((point) => (
                  <div key={`${point.bookingCode}-${point.key}`} className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2">
                    <div className="text-xs font-bold uppercase text-amber-700">{point.bookingCode}</div>
                    <div className="mt-1 text-sm font-black text-slate-950">{point.title}</div>
                    <div className="mt-1 text-xs text-amber-700">{point.average}/5 · {point.operatorName}</div>
                  </div>
                )) : (
                  <div className="rounded-xl border border-dashed border-slate-200 px-3 py-6 text-center text-sm text-slate-500">No low-rated events yet.</div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-[#02665e]/20 bg-[#02665e]/7 p-4">
              <h2 className="text-base font-black text-[#02665e]">Admin Policy</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                This page shows aggregate and audit-safe details. It does not expose invite tokens, session tokens, or private timeline links.
              </p>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
