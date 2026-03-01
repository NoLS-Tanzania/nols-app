"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { ArrowRight, BadgeCheck, CheckCircle, ClipboardList, Clock, Eye, Star, ToggleRight, ShieldAlert } from "lucide-react";
import LogoSpinner from "@/components/LogoSpinner";

const api = axios.create({ baseURL: "", withCredentials: true });

type AssignmentStats = {
  total: number;
  completed: number;
  inProgress: number;
};

type AssignmentPreview = {
  id: string | number;
  title?: string;
  description?: string | null;
  status?: string;
  createdAt?: string;
};

type AccountMe = {
  name?: string | null;
  fullName?: string | null;
};

type AgentMe = {
  agent?: {
    level?: string | null;
    performanceMetrics?: {
      overallRating?: number | null;
      totalReviews?: number | null;
    } | null;
  } | null;
};

type TrendTone = "brand" | "success" | "info";
type TrendVariant = "area" | "line" | "dots" | "step";

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function Sparkline({ values, variant }: { values: number[]; variant: TrendVariant }) {
  const geom = useMemo(() => {
    const n = values.length;
    if (!n) {
      return {
        points: [] as Array<{ x: number; y: number }>,
        polyPoints: "",
        lineD: "",
        stepD: "",
        areaD: "",
      };
    }

    const w = 120;
    const h = 44;
    const paddingX = 3;
    const paddingY = 6;
    const baselineY = h - paddingY;

    const max = Math.max(...values);
    const min = Math.min(...values);
    const range = Math.max(1, max - min);
    const step = n === 1 ? 0 : (w - paddingX * 2) / (n - 1);

    const pts = values.map((v, i) => {
      const x = paddingX + step * i;
      const t = (v - min) / range;
      const y = paddingY + (1 - t) * (h - paddingY * 2);
      return { x, y };
    });

    const polyPoints = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
    const lineD = `M ${pts.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" L ")}`;

    const stepParts: string[] = [];
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      if (i === 0) {
        stepParts.push(`M ${p.x.toFixed(1)} ${p.y.toFixed(1)}`);
        continue;
      }
      const prev = pts[i - 1];
      stepParts.push(`L ${p.x.toFixed(1)} ${prev.y.toFixed(1)}`);
      stepParts.push(`L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`);
    }
    const stepD = stepParts.join(" ");

    const first = pts[0];
    const last = pts[pts.length - 1];
    const areaD = `${lineD} L ${last.x.toFixed(1)} ${baselineY.toFixed(1)} L ${first.x.toFixed(
      1
    )} ${baselineY.toFixed(1)} Z`;

    return { points: pts, polyPoints, lineD, stepD, areaD };
  }, [values]);

  if (!values.length) return null;

  return (
    <svg
      viewBox="0 0 120 44"
      className="absolute inset-x-3 bottom-3 h-11 w-[calc(100%-1.5rem)] pointer-events-none"
      aria-hidden
    >
      {variant === "area" ? (
        <>
          <path d={geom.areaD} fill="currentColor" opacity="0.10" />
          <path
            d={geom.lineD}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.25"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.95"
          />
        </>
      ) : variant === "line" ? (
        <>
          <path
            d={geom.lineD}
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.10"
          />
          <path
            d={geom.lineD}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.25"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.95"
          />
        </>
      ) : variant === "dots" ? (
        <>
          <path
            d={geom.lineD}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="3 4"
            opacity="0.8"
          />
          {geom.points.map((p, idx) => {
            const isLast = idx === geom.points.length - 1;
            return (
              <circle
                key={idx}
                cx={p.x}
                cy={p.y}
                r={isLast ? 3.2 : 2.1}
                fill="currentColor"
                opacity={isLast ? 0.95 : 0.35}
              />
            );
          })}
        </>
      ) : (
        <>
          <path
            d={geom.stepD}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.25"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.95"
          />
          <path
            d={geom.stepD}
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.08"
          />
        </>
      )}
    </svg>
  );
}

function DecorativeBusinessTrendBackdrop() {
  // Purely decorative (no real data) — gives a premium “business trend” feel.
  const line = [11, 11, 26, 21, 16, 16];
  const line2 = [9, 14, 18, 19, 14, 18];
  const line3 = [13, 10, 15, 12, 17, 12];
  const barsA = [3, 7, 6, 2, 5, 4, 6, 5, 4, 6, 7, 6];
  const barsB = [5, 4, 8, 3, 10, 4, 8, 3, 9, 4, 7, 5];
  const barsC = [2, 3, 4, 2, 5, 3, 4, 2, 5, 3, 4, 3];

  const w = 520;
  const h = 180;
  const padX = 14;
  const padY = 18;

  const allLineValues = [...line, ...line2, ...line3];
  const lineMax = Math.max(...allLineValues);
  const lineMin = Math.min(...allLineValues);
  const lineRange = Math.max(1, lineMax - lineMin);
  const lineStep = (w - padX * 2) / (line.length - 1);
  const lineTop = padY + 12;
  const lineBottom = 86;

  const mapLine = (values: number[]) =>
    values.map((v, i) => {
      const x = padX + i * lineStep;
      const t = (v - lineMin) / lineRange;
      const y = lineTop + (1 - t) * (lineBottom - lineTop);
      return { x, y, v };
    });

  const pts = mapLine(line);
  const pts2 = mapLine(line2);
  const pts3 = mapLine(line3);

  const lineD = `M ${pts.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" L ")}`;
  const lineD2 = `M ${pts2.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" L ")}`;
  const lineD3 = `M ${pts3.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" L ")}`;

  const avg = allLineValues.reduce((a, b) => a + b, 0) / Math.max(1, allLineValues.length);
  const avgT = (avg - lineMin) / lineRange;
  const avgY = lineTop + (1 - avgT) * (lineBottom - lineTop);

  const bars = (() => {
    const series = [barsA, barsB, barsC];
    const max = Math.max(...series.flat());
    const baseY = h - padY;
    const chartTop = 98;
    const span = baseY - chartTop;

    const groups = barsA.length;
    const groupGap = 10;
    const groupW = (w - padX * 2 - groupGap * (groups - 1)) / groups;
    const barGap = 5;
    const barW = (groupW - barGap * 2) / 3;

    return { max, baseY, chartTop, span, groups, groupGap, groupW, barGap, barW, series };
  })();

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-full w-full" aria-hidden>
      <defs>
        <linearGradient id="trendLine" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.26" />
          <stop offset="55%" stopColor="currentColor" stopOpacity="0.82" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.38" />
        </linearGradient>
        <linearGradient id="trendArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.14" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Subtle grid */}
      <g className="text-white/10">
        {[0, 1, 2, 3].map((i) => {
          const y = 28 + i * 28;
          return <path key={i} d={`M ${padX} ${y} H ${w - padX}`} stroke="currentColor" strokeWidth="1" />;
        })}
        {[0, 1, 2, 3, 4, 5, 6].map((i) => {
          const x = padX + i * ((w - padX * 2) / 6);
          return (
            <path
              key={`v-${i}`}
              d={`M ${x.toFixed(1)} ${padY} V ${(h - padY).toFixed(1)}`}
              stroke="currentColor"
              strokeWidth="1"
              opacity={0.55}
            />
          );
        })}
      </g>

      {/* Diagonal crossing strokes */}
      <g className="text-white/10" opacity={0.7}>
        <path d={`M ${padX} ${(h - padY).toFixed(1)} L ${(w - padX).toFixed(1)} ${(padY + 8).toFixed(1)}`} stroke="currentColor" />
        <path d={`M ${padX} ${(padY + 16).toFixed(1)} L ${(w - padX).toFixed(1)} ${(h - padY - 14).toFixed(1)}`} stroke="currentColor" />
      </g>

      {/* Bars */}
      <g>
        {Array.from({ length: bars.groups }).map((_, gi) => {
          const x0 = padX + gi * (bars.groupW + bars.groupGap);
          return (
            <g key={gi}>
              {[0, 1, 2].map((si) => {
                const v = bars.series[si][gi] ?? 0;
                const t = v / Math.max(1, bars.max);
                const bh = Math.max(2, t * bars.span);
                const y = bars.baseY - bh;
                const x = x0 + si * (bars.barW + bars.barGap);

                const colorClass =
                  si === 0 ? "text-brand/35" : si === 1 ? "text-white/20" : "text-success/25";

                return (
                  <rect
                    key={si}
                    x={x}
                    y={y}
                    width={bars.barW}
                    height={bh}
                    rx={6}
                    className={colorClass}
                    fill="currentColor"
                  />
                );
              })}
            </g>
          );
        })}
      </g>

      {/* Baseline */}
      <g className="text-white/15">
        <path
          d={`M ${padX} ${avgY.toFixed(1)} H ${(w - padX).toFixed(1)}`}
          stroke="currentColor"
          strokeDasharray="6 8"
          strokeWidth="1.2"
          opacity={0.8}
        />
      </g>

      {/* Intersecting lines */}
      <g className="text-brand/55">
        <path d={lineD2} fill="none" stroke="currentColor" strokeWidth="2.25" strokeDasharray="5 6" opacity={0.78} />
      </g>
      <g className="text-success/45">
        <path d={lineD3} fill="none" stroke="currentColor" strokeWidth="2.05" opacity={0.7} />
      </g>

      {/* Primary line + points */}
      <g className="text-info/60">
        <path d={lineD} fill="none" stroke="url(#trendLine)" strokeWidth="3.75" strokeLinecap="round" />
        {pts.map((p, idx) => (
          <g key={idx}>
            <circle cx={p.x} cy={p.y} r={4.6} fill="currentColor" opacity={0.2} />
            <circle cx={p.x} cy={p.y} r={2.6} fill="currentColor" opacity={0.9} />
            <text
              x={p.x}
              y={p.y - 10}
              textAnchor="middle"
              fontSize={12}
              fontWeight={700}
              fill="currentColor"
              opacity={0.38}
            >
              {p.v}
            </text>
          </g>
        ))}
      </g>
    </svg>
  );
}

function StatusPill({ status }: { status: string }) {
  const s = status.toLowerCase();
  const style =
    s.includes("complete") || s === "done"
      ? "bg-success/5 text-success border-success/20"
      : s.includes("progress")
      ? "bg-info/5 text-info border-info/20"
      : s.includes("cancel")
      ? "bg-danger/5 text-danger border-danger/20"
      : "bg-slate-50 text-slate-700 border-slate-200";

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${style}`}>
      {status}
    </span>
  );
}

function StatCard({
  label,
  value,
  icon,
  trend,
  tone = "brand",
  variant,
  className,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  trend: number[];
  tone?: TrendTone;
  variant: TrendVariant;
  className?: string;
}) {
  const toneTextClass =
    tone === "success" ? "text-success" : tone === "info" ? "text-info" : "text-brand";
  const iconBgClass =
    tone === "success"
      ? "bg-success/10 border-success/15"
      : tone === "info"
      ? "bg-info/10 border-info/15"
      : "bg-brand/10 border-brand/15";

  return (
    <div
      className={classNames(
        "relative rounded-2xl border border-slate-200 bg-white/70 backdrop-blur shadow-card p-5 overflow-hidden",
        className
      )}
    >
      <div
        className={classNames(
          "absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t to-transparent",
          tone === "success" ? "from-success/8" : tone === "info" ? "from-info/8" : "from-brand/8"
        )}
        aria-hidden
      />

      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div
            className={classNames(
              "h-12 w-12 rounded-2xl border flex items-center justify-center",
              iconBgClass,
              toneTextClass
            )}
          >
            {icon}
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-700">{label}</div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight mt-1">{value}</div>
          </div>
        </div>
      </div>

      <div className={classNames("relative mt-2 h-12", toneTextClass)} aria-hidden>
        <Sparkline values={trend} variant={variant} />
      </div>
    </div>
  );
}

function TaskTrendsChart({
  total,
  completed,
  inProgress,
}: {
  total: number[];
  completed: number[];
  inProgress: number[];
}) {
  const geom = useMemo(() => {
    const values = [...total, ...completed, ...inProgress].map((n) => (Number.isFinite(Number(n)) ? Number(n) : 0));
    const maxY = Math.max(1, ...values);

    const w = 560;
    const h = 196;
    const padL = 36;
    const padR = 18;
    const padT = 14;
    const padB = 26;

    const innerW = w - padL - padR;
    const innerH = h - padT - padB;
    const n = Math.max(1, total.length, completed.length, inProgress.length);
    const stepX = n <= 1 ? 0 : innerW / (n - 1);

    const yFor = (v: number) => {
      const t = (Number(v) || 0) / maxY;
      return padT + (1 - t) * innerH;
    };

    const pathFor = (series: number[]) => {
      const pts = Array.from({ length: n }, (_, i) => {
        const x = padL + stepX * i;
        const v = Number(series[i] ?? 0) || 0;
        const y = yFor(v);
        return { x, y };
      });
      if (!pts.length) return "";
      return `M ${pts.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" L ")}`;
    };

    const areaFor = (series: number[]) => {
      const line = pathFor(series);
      if (!line) return "";
      const lastX = padL + stepX * (n - 1);
      const baseY = padT + innerH;
      return `${line} L ${lastX.toFixed(1)} ${baseY.toFixed(1)} L ${padL.toFixed(1)} ${baseY.toFixed(1)} Z`;
    };

    const grid = Array.from({ length: 4 }, (_, i) => {
      const t = (i + 1) / 4;
      const y = padT + t * innerH;
      return { y, label: Math.round((1 - t) * maxY) };
    });

    return {
      viewBox: `0 0 ${w} ${h}`,
      grid,
      totalLine: pathFor(total),
      completedLine: pathFor(completed),
      inProgressLine: pathFor(inProgress),
      totalArea: areaFor(total),
    };
  }, [completed, inProgress, total]);

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/60 text-white overflow-hidden">
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-br from-brand/20 via-transparent to-slate-900/30" aria-hidden />
        <div className="absolute -top-10 -right-12 h-44 w-44 rounded-full bg-brand/15 blur-3xl" aria-hidden />
        <div className="absolute -bottom-16 -left-12 h-56 w-56 rounded-full bg-info/10 blur-3xl" aria-hidden />

        <div className="relative p-2.5 sm:p-3">
          <div className="text-xs font-semibold text-white/70">Last 14 days</div>

          <svg viewBox={geom.viewBox} className="mt-2.5 h-44 w-full" role="img" aria-label="Task trends line chart">
            {geom.grid.map((g, idx) => (
              <g key={idx}>
                <line x1={16} y1={g.y} x2={544} y2={g.y} stroke="currentColor" opacity={0.10} />
                <text x={8} y={g.y + 4} className="fill-white/45 text-[10px] font-semibold" textAnchor="start">
                  {g.label}
                </text>
              </g>
            ))}

            <g className="text-brand">
              <path d={geom.totalArea} fill="currentColor" opacity={0.10} />
              <path d={geom.totalLine} fill="none" stroke="currentColor" strokeWidth={6} opacity={0.10} strokeLinecap="round" />
              <path d={geom.totalLine} fill="none" stroke="currentColor" strokeWidth={2.6} opacity={0.95} strokeLinecap="round" />
            </g>

            <g className="text-success">
              <path d={geom.completedLine} fill="none" stroke="currentColor" strokeWidth={5.5} opacity={0.10} strokeLinecap="round" />
              <path d={geom.completedLine} fill="none" stroke="currentColor" strokeWidth={2.4} opacity={0.92} strokeLinecap="round" />
            </g>

            <g className="text-info">
              <path d={geom.inProgressLine} fill="none" stroke="currentColor" strokeWidth={5.5} opacity={0.10} strokeLinecap="round" />
              <path d={geom.inProgressLine} fill="none" stroke="currentColor" strokeWidth={2.4} opacity={0.92} strokeLinecap="round" />
            </g>
          </svg>

          <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px]">
            <div className="inline-flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-brand" aria-hidden />
              <span className="text-white/80 font-semibold">Total</span>
            </div>
            <div className="inline-flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-success" aria-hidden />
              <span className="text-white/80 font-semibold">Completed</span>
            </div>
            <div className="inline-flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-info" aria-hidden />
              <span className="text-white/80 font-semibold">In progress</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AgentPortalHomePage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AssignmentStats>({ total: 0, completed: 0, inProgress: 0 });
  const [recent, setRecent] = useState<AssignmentPreview[]>([]);
  const [authRequired, setAuthRequired] = useState(false);
  const [isSuspended, setIsSuspended] = useState(false);
  const [account, setAccount] = useState<AccountMe | null>(null);
  const [agentMe, setAgentMe] = useState<AgentMe | null>(null);
  const [trendItems, setTrendItems] = useState<AssignmentPreview[]>([]);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setAuthRequired(false);

        // Ensure user is authenticated + load agent context for level/ratings.
        const [meRes, agentRes, res] = await Promise.all([
          api.get("/api/account/me"),
          api.get("/api/agent/me").catch((e: any) => {
            if (e?.response?.status === 403 && e?.response?.data?.error === "AGENT_SUSPENDED") {
              if (alive) setIsSuspended(true);
            }
            return { data: null };
          }),
          // Best-effort stats + a small preview list (safe fallback if API not ready yet).
          api.get("/api/agent/assignments?page=1&pageSize=60").catch(() => ({
            data: { total: 0, completed: 0, inProgress: 0, items: [] },
          })),
        ]);

        if (!alive) return;

        setAccount(meRes.data || null);
        setAgentMe((agentRes as any)?.data || null);

        const total = Number(res.data?.total ?? 0);
        const completed = Number(res.data?.completed ?? 0);
        const inProgress = Number(res.data?.inProgress ?? 0);

        const list: any[] = res.data?.items ?? [];

        setStats({
          total: Number.isFinite(total) ? total : 0,
          completed: Number.isFinite(completed) ? completed : 0,
          inProgress: Number.isFinite(inProgress) ? inProgress : 0,
        });

        const mapped: AssignmentPreview[] = Array.isArray(list)
          ? list.map((x) => ({
              id: x?.id,
              title: x?.title,
              description: x?.description ?? null,
              status: x?.status,
              createdAt: x?.createdAt,
            }))
          : [];

        setTrendItems(mapped);
        setRecent(mapped.slice(0, 3));
      } catch {
        // Allow UI preview even when not logged in.
        // (In production you will typically be redirected by the account flows anyway.)
        if (!alive) return;
        setAuthRequired(true);
        setRecent([]);
        setTrendItems([]);
        setAccount(null);
        setAgentMe(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const displayName = useMemo(() => {
    const name = (account?.fullName || account?.name || "").trim();
    return name;
  }, [account]);

  const agentLevel = useMemo(() => {
    const raw = (agentMe as any)?.agent?.level;
    return typeof raw === "string" && raw.trim() ? raw.trim() : "—";
  }, [agentMe]);

  const agentRating = useMemo(() => {
    const rating = (agentMe as any)?.agent?.performanceMetrics?.overallRating;
    const totalReviews = (agentMe as any)?.agent?.performanceMetrics?.totalReviews;
    const r = typeof rating === "number" && Number.isFinite(rating) ? rating : null;
    const c = typeof totalReviews === "number" && Number.isFinite(totalReviews) ? totalReviews : 0;
    return { rating: r, totalReviews: c };
  }, [agentMe]);

  const trends = useMemo(() => {
    const days = 14;
    const end = new Date();
    end.setHours(0, 0, 0, 0);

    const start = new Date(end);
    start.setDate(start.getDate() - (days - 1));

    const buckets = Array.from({ length: days }, () => ({ total: 0, completed: 0, inProgress: 0 }));

    const normalizeStatus = (s: string) => s.toLowerCase();

    for (const item of trendItems) {
      if (!item?.createdAt) continue;
      const d = new Date(item.createdAt);
      if (Number.isNaN(d.getTime())) continue;
      d.setHours(0, 0, 0, 0);
      if (d < start || d > end) continue;

      const idx = Math.round((d.getTime() - start.getTime()) / 86400000);
      if (idx < 0 || idx >= buckets.length) continue;

      buckets[idx].total += 1;
      const s = normalizeStatus(String(item.status || ""));
      if (s.includes("complete") || s === "done") buckets[idx].completed += 1;
      else if (s.includes("progress") || s.includes("active")) buckets[idx].inProgress += 1;
    }

    return {
      total: buckets.map((b) => b.total),
      completed: buckets.map((b) => b.completed),
      inProgress: buckets.map((b) => b.inProgress),
    };
  }, [trendItems]);

  const trendSummary = useMemo(() => {
    const sum = (arr: number[]) => arr.reduce((a, b) => a + (Number(b) || 0), 0);
    const last14Total = sum(trends.total);
    const last14Completed = sum(trends.completed);
    const last14InProgress = sum(trends.inProgress);

    const avgPerDay = last14Total / 14;
    const completionRate14 = last14Completed / Math.max(1, last14Total);
    const completionRateAll = stats.completed / Math.max(1, stats.total);

    return {
      last14Total,
      last14Completed,
      last14InProgress,
      avgPerDay,
      completionRate14,
      completionRateAll,
    };
  }, [stats.completed, stats.total, trends.completed, trends.inProgress, trends.total]);

  return (
    <div className="w-full py-2 sm:py-4">
      <div className="relative rounded-3xl border border-white/10 bg-slate-950/60 text-white backdrop-blur shadow-card overflow-hidden mb-6">
        <div className="absolute inset-0 bg-gradient-to-br from-brand/20 via-slate-950/40 to-slate-950/70" aria-hidden />
        <div className="absolute -top-24 -right-20 h-72 w-72 rounded-full bg-brand/15 blur-3xl" aria-hidden />
        <div className="absolute -bottom-28 -left-24 h-80 w-80 rounded-full bg-white/5 blur-3xl" aria-hidden />

        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-[68%] sm:w-[62%] translate-x-8 opacity-55 mix-blend-screen"
          style={{ maskImage: "linear-gradient(to left, rgba(0,0,0,1), rgba(0,0,0,0))" }}
          aria-hidden
        >
          <div className="h-full w-full flex items-center">
            <div className="w-full h-[78%] blur-[0.2px]">
              <DecorativeBusinessTrendBackdrop />
            </div>
          </div>
        </div>

        <div className="relative p-4 sm:p-7">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
            <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-white/5 backdrop-blur px-5 py-4 sm:px-6 sm:py-5 shadow-card ring-1 ring-white/10">
              <div
                className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-brand/10"
                aria-hidden
              />
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/20" aria-hidden />
              <div className="relative">
                <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">Dashboard</h1>
                <p className="text-xs sm:text-base text-white/75 mt-1.5 sm:mt-2 leading-relaxed">
                  {displayName ? `${greeting} ${displayName}.` : `${greeting}.`} Track your assignments, status, and daily workload.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/account/agent/assignments"
                aria-label="Assignments"
                className="inline-flex items-center justify-center h-10 px-3 rounded-full bg-brand/90 text-white font-semibold no-underline hover:bg-brand shadow-card transition-colors border border-white/10"
              >
                <span
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-2.5 py-1"
                  title={`Active assignments: ${stats.inProgress}`}
                >
                  <span className="min-w-5 text-center text-xs font-extrabold tabular-nums leading-none">
                    {stats.inProgress}
                  </span>
                  <span className="h-5 w-px bg-white/15" aria-hidden />
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/10" aria-hidden>
                    <ToggleRight className="w-4 h-4 text-white/90" />
                  </span>
                </span>
                <span className="sr-only">Open assignments</span>
              </Link>
            </div>
          </div>

          {authRequired && !loading && (
            <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-bold text-white">Sign in required</div>
                  <div className="text-sm text-white/70 mt-1">
                    Preview mode is enabled. Sign in to load your real assignments.
                  </div>
                </div>
                <Link
                  href="/account/login"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand/90 text-white font-semibold no-underline hover:bg-brand shadow-card transition-colors border border-white/10"
                >
                  Sign in
                  <ArrowRight className="w-4 h-4" aria-hidden />
                </Link>
              </div>
            </div>
          )}

          {isSuspended && !loading && (
            <div className="mt-5 rounded-2xl border border-amber-400/30 bg-amber-500/10 backdrop-blur p-5">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-xl bg-amber-400/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <ShieldAlert className="text-amber-300" size={20} />
                </div>
                <div>
                  <div className="text-sm font-bold text-amber-100">Account Temporarily Suspended</div>
                  <div className="text-sm text-amber-200/80 mt-1 leading-relaxed">
                    Your agent account has been suspended pending an internal review. You cannot accept or manage assignments during this period.
                  </div>
                  <div className="mt-3 text-xs text-amber-300/70 leading-relaxed">
                    If you believe this is an error, please contact{" "}
                    <a href="mailto:security@nolsaf.com" className="underline hover:text-amber-200">security@nolsaf.com</a>.
                    {" "}For general enquiries, reach us at{" "}
                    <a href="mailto:hr@nolsaf.com" className="underline hover:text-amber-200">hr@nolsaf.com</a>.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <LogoSpinner size="lg" className="mb-4" ariaLabel="Loading agent portal" />
          <p className="text-sm text-slate-600">Loading your portal...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-5 mb-8">
            <StatCard
              label="Total assignments"
              value={stats.total}
              icon={<ClipboardList className="w-5 h-5" aria-hidden />}
              trend={trends.total}
              tone="brand"
              variant="area"
            />
            <StatCard
              label="Completed"
              value={stats.completed}
              icon={<CheckCircle className="w-5 h-5" aria-hidden />}
              trend={trends.completed}
              tone="success"
              variant="line"
            />
            <StatCard
              className="col-span-2 sm:col-span-1"
              label="In progress"
              value={stats.inProgress}
              icon={<Clock className="w-5 h-5" aria-hidden />}
              trend={trends.inProgress}
              tone="info"
              variant="step"
            />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white/70 backdrop-blur shadow-card overflow-hidden mb-8">
            <div className="p-3 sm:p-4 border-b border-slate-200 bg-gradient-to-br from-slate-50 to-white">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div>
                  <div className="text-sm font-bold text-slate-900">Task trends</div>
                  <div className="text-sm text-slate-600 mt-1">
                    Relationship between assignments, completed work, and in-progress load.
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5">
                    <div className="text-xs font-semibold text-slate-600">Completion (14d)</div>
                    <div className="text-xs font-extrabold text-slate-900 tabular-nums">
                      {Math.round(trendSummary.completionRate14 * 100)}%
                    </div>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5">
                    <div className="text-xs font-semibold text-slate-600">New (14d)</div>
                    <div className="text-xs font-extrabold text-slate-900 tabular-nums">
                      {trendSummary.last14Total}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-3 sm:p-4">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 items-stretch">
                <div className="lg:col-span-8">
                  <TaskTrendsChart total={trends.total} completed={trends.completed} inProgress={trends.inProgress} />
                </div>

                <div className="lg:col-span-4">
                  <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-bold text-slate-900">Highlights</div>
                      <div className="text-xs font-semibold text-slate-500">14d</div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3">
                        <div className="text-xs font-semibold text-slate-600">Avg / day (14d)</div>
                        <div className="mt-1 text-2xl font-extrabold tabular-nums tracking-tight text-info leading-none">
                          {trendSummary.avgPerDay.toFixed(1)}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3">
                        <div className="text-xs font-semibold text-slate-600">Completion (all)</div>
                        <div className="mt-1 text-2xl font-extrabold tabular-nums tracking-tight text-success leading-none">
                          {Math.round(trendSummary.completionRateAll * 100)}%
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3">
                        <div className="text-xs font-semibold text-slate-600">In progress (14d)</div>
                        <div className="mt-1 text-2xl font-extrabold tabular-nums tracking-tight text-brand leading-none">
                          {trendSummary.last14InProgress}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3">
                        <div className="text-xs font-semibold text-slate-600">Completed (14d)</div>
                        <div className="mt-1 text-2xl font-extrabold tabular-nums tracking-tight text-slate-900 leading-none">
                          {trendSummary.last14Completed}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white/70 backdrop-blur shadow-card overflow-hidden">
              <div className="p-5 sm:p-6 border-b border-slate-200 bg-gradient-to-br from-slate-50 to-white">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-bold text-slate-900">Recent assignments</div>
                    <div className="text-sm text-slate-600 mt-1">Your latest work items and current status.</div>
                  </div>
                  <Link
                    href="/account/agent/assignments"
                    aria-label="View all assignments"
                    className="group inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2.5 py-2 text-sm font-semibold text-brand hover:text-brand-700 shadow-card transition-colors"
                  >
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-50" aria-hidden>
                      <Eye className="h-4 w-4" aria-hidden />
                    </span>
                    <span
                      className="overflow-hidden max-w-0 opacity-0 whitespace-nowrap transition-all duration-200 group-hover:max-w-[6rem] group-hover:opacity-100"
                    >
                      View all
                    </span>
                  </Link>
                </div>
              </div>

              <div className="p-5 sm:p-6">
                {authRequired ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <div className="text-sm font-bold text-slate-900">Preview mode</div>
                    <div className="text-sm text-slate-600 mt-1">Sign in to load your real assignment queue.</div>
                  </div>
                ) : recent.length === 0 ? (
                  <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-gradient-to-br from-slate-50 to-white p-8 text-center">
                    <div className="text-sm font-bold text-slate-900">No assignments yet</div>
                    <div className="text-sm text-slate-600 mt-1">When you’re assigned work, it will show here.</div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recent.map((a) => {
                      const id = a.id;
                      const title = a.title || `Assignment #${String(id)}`;
                      const status = a.status || "Pending";
                      const date = a.createdAt
                        ? new Date(a.createdAt).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : "—";

                      return (
                        <Link
                          key={String(id)}
                          href={`/account/agent/assignments/${encodeURIComponent(String(id))}`}
                          className="block no-underline"
                        >
                          <div className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-card hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0">
                                <div className="text-sm font-bold text-slate-900 truncate">{title}</div>
                                <div className="text-xs text-slate-600 mt-1">Created {date}</div>
                              </div>
                              <StatusPill status={status} />
                            </div>
                            {a.description ? (
                              <div className="text-sm text-slate-600 mt-2 line-clamp-2">{a.description}</div>
                            ) : null}
                            <div className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-brand">
                              Open
                              <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden />
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-5 rounded-2xl border border-white/10 bg-slate-950/60 text-white shadow-card overflow-hidden">
              <div className="p-5 sm:p-6 border-b border-white/10 bg-gradient-to-br from-slate-950 via-slate-950/80 to-brand/10">
                <div className="text-sm font-bold text-white">Agent tools</div>
                <div className="text-sm text-white/70 mt-1">Quick navigation for daily support work.</div>
              </div>

              <div className="p-5 sm:p-6 space-y-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-bold text-white">Agent performance</div>
                      <div className="text-sm text-white/70 mt-1">Your current level and customer ratings.</div>
                    </div>
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-semibold text-white/80">
                      <BadgeCheck className="h-4 w-4 text-info opacity-95" aria-hidden />
                      Level {agentLevel}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                      <div className="text-xs font-semibold text-white/70">Level</div>
                      <div className="mt-1 text-lg font-extrabold text-white tabular-nums">{agentLevel}</div>
                      <div className="mt-1 text-xs font-semibold text-white/55">Promotion-based</div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-xs font-semibold text-white/70">Rating</div>
                        <Star className="h-4 w-4 text-success fill-success/20 opacity-95" strokeWidth={2.4} aria-hidden />
                      </div>
                      <div className="mt-1 text-lg font-extrabold text-white tabular-nums">
                        {agentRating.rating != null ? agentRating.rating.toFixed(1) : "—"}
                        <span className="text-sm font-bold text-white/55">/5</span>
                      </div>
                      <div className="mt-1 text-xs font-semibold text-white/55">
                        {agentRating.totalReviews ? `${agentRating.totalReviews} reviews` : "No reviews yet"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
