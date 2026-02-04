"use client";

import React, { useEffect, useId, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  BarChart2,
  Briefcase,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  LifeBuoy,
  LayoutDashboard,
  LineChart,
  MapPin,
  MessagesSquare,
  Settings as SettingsIcon,
  Shield,
  Sparkles,
  Truck,
  Users,
} from "lucide-react";

import { useAdminHomeKpis, useAdminMonitoring, useAdminPerformanceHighlights, useAdminRecentActivities } from "./adminHomeHooks";

const Chart = dynamic(() => import("../../../../components/Chart"), { ssr: false });

type RevenueChartDataset = {
  label: string;
  data: number[];
  borderColor: string;
  backgroundColor: string;
  tension: number;
  borderWidth: number;
  pointRadius: number;
};

type RevenueChartData = {
  labels: string[];
  datasets: [RevenueChartDataset, RevenueChartDataset];
};

function MiniSparkline({
  values,
  stroke,
  width = 120,
  height = 36,
  className,
}: {
  values: number[];
  stroke: string;
  width?: number;
  height?: number;
  className?: string;
}) {
  const safe = Array.isArray(values) ? values.filter((v) => Number.isFinite(Number(v))).map((v) => Number(v)) : [];
  const points = safe.length >= 2 ? safe.slice(-24) : [];
  if (points.length < 2) return null;

  const min = Math.min(...points);
  const max = Math.max(...points);
  const w = width;
  const h = height;
  const pad = 3;
  const range = Math.max(1e-6, max - min);
  const toX = (i: number) => pad + (i * (w - pad * 2)) / (points.length - 1);
  const toY = (v: number) => pad + (1 - (v - min) / range) * (h - pad * 2);
  const d = points
    .map((v, i) => {
      const x = toX(i);
      const y = toY(v);
      return `${i === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className={"overflow-visible " + (className ?? "")}>
      <path d={d} fill="none" stroke={stroke} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function MiniBars({
  values,
  color,
  width = 140,
  height = 66,
  className,
}: {
  values: number[];
  color: string;
  width?: number;
  height?: number;
  className?: string;
}) {
  const uid = useId();
  const gradientId = `miniBarsGlow-${uid}`;
  const safe = Array.isArray(values) ? values.filter((v) => Number.isFinite(Number(v))).map((v) => Number(v)) : [];
  const points = safe.length >= 2 ? safe.slice(-14) : [];
  if (points.length < 2) return null;

  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = Math.max(1e-6, max - min);
  const w = width;
  const h = height;
  const gap = 4;
  const barW = Math.max(2, Math.floor((w - gap * (points.length - 1)) / points.length));

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className={"overflow-visible " + (className ?? "")} aria-hidden>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.95} />
          <stop offset="100%" stopColor={color} stopOpacity={0.25} />
        </linearGradient>
      </defs>
      {points.map((v, i) => {
        const t = (v - min) / range;
        const barH = 6 + t * (h - 10);
        const x = i * (barW + gap);
        const y = h - barH;
        return <rect key={i} x={x} y={y} width={barW} height={barH} rx={barW / 2} fill={`url(#${gradientId})`} />;
      })}
    </svg>
  );
}

function MiniRing({
  percent,
  color,
  size = 84,
  className,
}: {
  percent: number;
  color: string;
  size?: number;
  className?: string;
}) {
  const p = Math.max(0, Math.min(100, Number.isFinite(percent) ? percent : 0));
  const r = 30;
  const cx = size / 2;
  const cy = size / 2;
  const c = 2 * Math.PI * r;
  const dash = (p / 100) * c;
  const gap = c - dash;

  return (
    <div className={"relative " + (className ?? "")} style={{ width: size, height: size }} aria-hidden>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={r} stroke="rgba(255,255,255,0.22)" strokeWidth={8} fill="none" />
        <circle
          cx={cx}
          cy={cy}
          r={r}
          stroke={color}
          strokeWidth={8}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${gap}`}
          transform={`rotate(-90 ${cx} ${cy})`}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-extrabold text-white tabular-nums">{Math.round(p)}%</div>
        </div>
      </div>
    </div>
  );
}

function MiniMeter({
  percent,
  color,
  className,
}: {
  percent: number;
  color: string;
  className?: string;
}) {
  const p = Math.max(0, Math.min(100, Number.isFinite(percent) ? percent : 0));
  return (
    <div className={"w-[152px] " + (className ?? "")} aria-hidden>
      <div className="h-2.5 rounded-full bg-white/10 border border-white/10 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${p}%`, background: color }} />
      </div>
      <div className="mt-2 flex items-center justify-between">
        <div className="text-[11px] text-white/60">Performance</div>
        <div className="text-[11px] font-semibold tabular-nums text-white/80">{Math.round(p)}%</div>
      </div>
    </div>
  );
}

function MiniDotTrend({
  values,
  color,
  width = 156,
  height = 58,
  className,
}: {
  values: number[];
  color: string;
  width?: number;
  height?: number;
  className?: string;
}) {
  const safe = Array.isArray(values) ? values.filter((v) => Number.isFinite(Number(v))).map((v) => Number(v)) : [];
  const points = safe.length >= 2 ? safe.slice(-16) : [];
  if (points.length < 2) return null;

  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = Math.max(1e-6, max - min);

  const w = width;
  const h = height;
  const pad = 6;
  const innerW = w - pad * 2;
  const innerH = h - pad * 2;

  const coords = points.map((v, i) => {
    const x = pad + (i / (points.length - 1)) * innerW;
    const t = (v - min) / range;
    const y = pad + (1 - t) * innerH;
    return { x, y };
  });
  const d = coords.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ");

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className={"overflow-visible " + (className ?? "")} aria-hidden>
      <path d={d} stroke={color} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={0.9} />
      {coords.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={2.3} fill={color} opacity={i === coords.length - 1 ? 1 : 0.75} />
      ))}
    </svg>
  );
}

export default function AdminHomePage() {
  const router = useRouter();

  const { monitoring } = useAdminMonitoring();
  const { recentActivities } = useAdminRecentActivities();
  const { driversPending, usersNew, revenueDelta, paymentsWaiting } = useAdminHomeKpis();
  const { highlights } = useAdminPerformanceHighlights(30);

  const [nowIso] = useState<string>(() => new Date().toISOString());

  const [reduceMotion, setReduceMotion] = useState<boolean>(false);
  const [tilesInView, setTilesInView] = useState<boolean>(false);

  const [hoursWindow, setHoursWindow] = useState<number>(24);
  const [monthsWindow, setMonthsWindow] = useState<number>(1);
  const [rangeType, setRangeType] = useState<"hours" | "months" | "properties">("hours");
  const propertiesCount = 5;

  const [chartData, setChartData] = useState<RevenueChartData | null>(null);

  useEffect(() => {
    try {
      const media = window.matchMedia("(prefers-reduced-motion: reduce)");
      const update = () => setReduceMotion(Boolean(media.matches));
      update();
      if (typeof media.addEventListener === "function") media.addEventListener("change", update);
      else (media as any).addListener?.(update);
      return () => {
        if (typeof media.removeEventListener === "function") media.removeEventListener("change", update);
        else (media as any).removeListener?.(update);
      };
    } catch {
      setReduceMotion(false);
    }
  }, []);

  function ClientTime({ iso }: { iso?: string | null }) {
    const [label, setLabel] = useState<string | null>(null);
    useEffect(() => {
      if (!iso) return;
      try {
        setLabel(new Date(iso).toLocaleString());
      } catch {
        setLabel(iso || null);
      }
    }, [iso]);

    if (!label) return <span className="text-xs text-slate-400">&nbsp;</span>;
    return <span className="text-xs text-slate-400 whitespace-nowrap">{label}</span>;
  }

  function useCountUp(value: number, enabled: boolean, durationMs = 650) {
    const [display, setDisplay] = useState<number>(value);

    useEffect(() => {
      if (!enabled || reduceMotion) {
        setDisplay(value);
        return;
      }

      let raf = 0;
      const start = performance.now();
      const from = display;
      const delta = value - from;

      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / durationMs);
        const eased = 1 - Math.pow(1 - t, 3);
        setDisplay(from + delta * eased);
        if (t < 1) raf = requestAnimationFrame(tick);
      };

      raf = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(raf);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value, enabled, durationMs, reduceMotion]);

    return display;
  }

  const pendingApprovalsValue = monitoring?.pendingApprovals ?? 0;
  const bookingsValue = monitoring?.bookings ?? 0;
  const paymentsWaitingValue = Number(paymentsWaiting ?? 0) || 0;
  const driversPendingValue = Number(driversPending ?? 0) || 0;
  const usersNewValue = Number(usersNew ?? 0) || 0;

  const pendingApprovalsAnimated = useCountUp(pendingApprovalsValue, Boolean(monitoring));
  const bookingsAnimated = useCountUp(bookingsValue, Boolean(monitoring));
  const paymentsWaitingAnimated = useCountUp(paymentsWaitingValue, paymentsWaiting !== null && paymentsWaiting !== undefined);

  const opsSnapshot = useMemo(() => {
    const labels = ["Approvals", "Payments", "Bookings", "Drivers", "New users"];
    const values = [pendingApprovalsValue, paymentsWaitingValue, bookingsValue, driversPendingValue, usersNewValue].map((n) =>
      Number.isFinite(n) ? Math.max(0, Number(n)) : 0
    );
    const total = values.reduce((s, v) => s + v, 0);
    const colors = [
      "rgba(2,102,94,0.92)",
      "rgba(6,182,212,0.88)",
      "rgba(56,189,248,0.88)",
      "rgba(16,185,129,0.88)",
      "rgba(148,163,184,0.70)",
    ];

    return { labels, values, total, colors };
  }, [bookingsValue, driversPendingValue, paymentsWaitingValue, pendingApprovalsValue, usersNewValue]);

  const opsPercent = (value: number) => {
    const total = opsSnapshot.total;
    if (!total) return 0;
    return Math.max(0, Math.min(100, (value / total) * 100));
  };

  const formatTsh = (v: number) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return "Tsh 0";
    return `Tsh ${Math.round(n).toLocaleString()}`;
  };

  type NavItem = {
    href: string;
    title: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    gradient: string;
    iconWrap: string;
    badge?: number | string | null;
    seriesValues?: number[];
    seriesStroke?: string;
    className?: string;
    featured?: boolean;
  };

  function NavTile({
    href,
    title,
    description,
    icon: Icon,
    gradient,
    iconWrap,
    badge,
    seriesValues,
    seriesStroke,
    className,
    featured,
    index,
  }: NavItem & { index: number }) {
    const numericBadge = typeof badge === "number" && Number.isFinite(badge) ? badge : null;
    const badgeDisplay = useCountUp(numericBadge ?? 0, tilesInView && numericBadge !== null);
    const badgeLabel = numericBadge !== null ? Math.round(badgeDisplay).toLocaleString() : badge;
    const progressPct =
      numericBadge !== null ? Math.max(0, Math.min(100, Math.round(100 * (1 - Math.exp(-numericBadge / 8))))) : null;
    const showBadge = featured && badge !== undefined && badge !== null;
    const showSparkline = !featured && Array.isArray(seriesValues) && seriesValues.length >= 2;

    return (
      <Link
        href={href}
        className={
          "group relative block no-underline " +
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30 " +
          "motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-out hover:-translate-y-0.5 active:translate-y-0 " +
          (className ? className : "")
        }
        onMouseMove={(e) => {
          const target = e.currentTarget as HTMLElement;
          const rect = target.getBoundingClientRect();
          const x = ((e.clientX - rect.left) / rect.width) * 100;
          const y = ((e.clientY - rect.top) / rect.height) * 100;
          target.style.setProperty("--x", `${x}%`);
          target.style.setProperty("--y", `${y}%`);
        }}
        onMouseLeave={(e) => {
          const target = e.currentTarget as HTMLElement;
          target.style.removeProperty("--x");
          target.style.removeProperty("--y");
        }}
        style={
          reduceMotion
            ? undefined
            : {
                opacity: tilesInView ? 1 : 0,
                transform: tilesInView ? "translateY(0px)" : "translateY(10px)",
                transitionProperty: "opacity, transform, box-shadow",
                transitionDuration: "520ms",
                transitionTimingFunction: "cubic-bezier(0.2, 0.8, 0.2, 1)",
                transitionDelay: `${110 + index * 55}ms`,
              }
        }
      >
        <div
          className={
            "relative overflow-hidden rounded-[24px] bg-gradient-to-br " +
            gradient +
            " shadow-[0_28px_80px_-56px_rgba(0,0,0,0.92)] motion-safe:transition motion-safe:duration-300 motion-safe:ease-out " +
            "group-hover:shadow-[0_36px_100px_-60px_rgba(0,0,0,0.96)] group-hover:saturate-[1.06] group-hover:brightness-[1.02]"
          }
        >
          <div className="pointer-events-none absolute inset-0 bg-black/10" aria-hidden />
          <div
            className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            aria-hidden
            style={{
              background:
                "radial-gradient(900px circle at var(--x,50%) var(--y,40%), rgba(255,255,255,0.22), transparent 42%), radial-gradient(700px circle at 95% 55%, rgba(255,255,255,0.14), transparent 55%)",
            }}
          />

          <div className={"relative " + (featured ? "p-5 sm:p-5 min-h-[150px]" : "p-4 min-h-[128px]")}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0">
                <div
                  className={
                    "shrink-0 border border-white/15 bg-white/10 text-white/95 flex items-center justify-center " +
                    (featured ? "h-10 w-10 rounded-2xl" : "h-9 w-9 rounded-2xl") +
                    " " +
                    iconWrap +
                    " backdrop-blur-sm motion-safe:transition-transform motion-safe:duration-300 group-hover:scale-[1.03]"
                  }
                >
                  <Icon className={featured ? "h-5 w-5" : "h-[18px] w-[18px]"} aria-hidden />
                </div>

                <div className="min-w-0">
                  <div
                    className={
                      (featured ? "text-lg sm:text-xl" : "text-base") +
                      " font-extrabold tracking-tight text-white leading-tight min-w-0 " +
                      "[display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] overflow-hidden"
                    }
                  >
                    {title}
                  </div>
                  <div
                    className={
                      "mt-1 " +
                      (featured ? "text-sm" : "text-xs") +
                      " text-white/75 leading-snug min-w-0 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] overflow-hidden"
                    }
                  >
                    {description}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {showBadge ? (
                  <div className="shrink-0 h-7 w-7 rounded-full bg-white/12 border border-white/15 text-white/90 text-[11px] font-extrabold flex items-center justify-center tabular-nums">
                    {badgeLabel}
                  </div>
                ) : null}

                <ChevronRight
                  className={
                    "h-4 w-4 text-white/70 opacity-70 motion-safe:transition motion-safe:duration-300 " +
                    "group-hover:opacity-100 group-hover:translate-x-0.5"
                  }
                  aria-hidden
                />
              </div>
            </div>

            {progressPct !== null ? (
              <div className="mt-5 flex items-center gap-4">
                <div className="flex items-center gap-2 text-[12px] text-white/75">
                  <span className="h-2 w-2 rounded-full bg-black/20 border border-white/15" aria-hidden />
                  <span className="font-medium">Activity</span>
                </div>
                <div className="flex-1">
                  <div className="h-2 rounded-full bg-white/20 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-300 transition-[width] duration-700"
                      style={{ width: `${tilesInView ? progressPct : 0}%` }}
                      aria-hidden
                    />
                  </div>
                </div>
                <div className="text-[12px] font-semibold tabular-nums text-white/90">{progressPct}%</div>
              </div>
            ) : null}

            {showSparkline ? (
              <div className="mt-4 flex items-center justify-between gap-3">
                <div className="text-[11px] text-white/70">Trend</div>
                <div className="opacity-85">
                  <MiniSparkline
                    values={seriesValues!}
                    stroke={seriesStroke ?? "rgba(255,255,255,0.88)"}
                    width={84}
                    height={24}
                  />
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </Link>
    );
  }

  function makeSpark(seed: number, len = 18) {
    const s = Number.isFinite(seed) ? Number(seed) : 0;
    const base = Math.max(1, Math.min(9999, Math.abs(s)));
    return Array.from({ length: len }).map((_, i) => {
      const w1 = Math.sin((i + 1) * 0.82 + base / 19);
      const w2 = Math.cos((i + 1) * 0.37 + base / 31);
      const drift = i * 0.12;
      return base * (0.75 + 0.08 * w1 + 0.06 * w2) + drift;
    });
  }

  useEffect(() => {
    (async () => {
      try {
        const now = new Date();
        let placeholderLabels: string[] = [];
        if (rangeType === "properties") {
          placeholderLabels = Array.from({ length: propertiesCount }).map((_, i) =>
            `Property ${String.fromCharCode(65 + (i % 26))}${i >= 26 ? i : ""}`
          );
        } else if (rangeType === "hours") {
          placeholderLabels = Array.from({ length: hoursWindow }).map((_, i) => {
            const d = new Date(now.getTime() - (hoursWindow - 1 - i) * 60 * 60 * 1000);
            return `${String(d.getHours()).padStart(2, "0")}:00`;
          });
        } else {
          placeholderLabels = Array.from({ length: monthsWindow }).map((_, i) => {
            const d = new Date(now.getFullYear(), now.getMonth() - (monthsWindow - 1 - i), 1);
            return d.toLocaleString(undefined, { month: "short", year: "numeric" });
          });
        }

        const zeros = placeholderLabels.map(() => 0);
        setChartData({
          labels: placeholderLabels,
          datasets: [
            {
              label: "Commission",
              data: zeros,
              borderColor: "rgba(56,189,248,0.95)",
              backgroundColor: "rgba(56,189,248,0.06)",
              tension: 0.4,
              borderWidth: 2,
              pointRadius: 0,
            },
            {
              label: "Subscription",
              data: zeros.slice(),
              borderColor: "rgba(34,197,94,0.95)",
              backgroundColor: "rgba(34,197,94,0.05)",
              tension: 0.4,
              borderWidth: 2,
              pointRadius: 0,
            },
          ],
        });
      } catch {
        // ignore placeholder failures
      }

      try {
        if (rangeType === "properties") {
          const res = await fetch(`/api/admin/revenue/properties?top=${encodeURIComponent(String(propertiesCount))}`);
          if (!res.ok) throw new Error("no properties");
          const json = await res.json();
          const labels = Array.isArray(json) ? json.map((it: any) => it.name ?? it.title ?? `Property ${it.id ?? ""}`) : [];
          const commission = Array.isArray(json)
            ? json.map((it: any) => Number(it.commission ?? it.commission_total ?? it.commissionAmount ?? 0))
            : [];
          const subscription = Array.isArray(json)
            ? json.map((it: any) => Number(it.subscription ?? it.subscription_total ?? it.subscriptionAmount ?? 0))
            : [];

          setChartData({
            labels,
            datasets: [
              {
                label: "Commission",
                data: commission,
                borderColor: "rgba(56,189,248,0.95)",
                backgroundColor: "rgba(56,189,248,0.06)",
                tension: 0.4,
                borderWidth: 2,
                pointRadius: 0,
              },
              {
                label: "Subscription",
                data: subscription,
                borderColor: "rgba(34,197,94,0.95)",
                backgroundColor: "rgba(34,197,94,0.05)",
                tension: 0.4,
                borderWidth: 2,
                pointRadius: 0,
              },
            ],
          });
          return;
        }

        const res = await fetch(
          `/api/admin/revenue/series?type=${encodeURIComponent(rangeType)}&hours=${encodeURIComponent(String(hoursWindow))}&months=${encodeURIComponent(String(monthsWindow))}`
        );
        if (!res.ok) throw new Error("no series");
        const json = await res.json();

        const labels = Array.isArray(json?.labels) ? json.labels : [];
        const commission = Array.isArray(json?.commission) ? json.commission.map((n: any) => Number(n || 0)) : [];
        const subscription = Array.isArray(json?.subscription) ? json.subscription.map((n: any) => Number(n || 0)) : [];

        setChartData({
          labels,
          datasets: [
            {
              label: "Commission",
              data: commission,
              borderColor: "rgba(56,189,248,0.95)",
              backgroundColor: "rgba(56,189,248,0.06)",
              tension: 0.4,
              borderWidth: 2,
              pointRadius: 0,
            },
            {
              label: "Subscription",
              data: subscription,
              borderColor: "rgba(34,197,94,0.95)",
              backgroundColor: "rgba(34,197,94,0.05)",
              tension: 0.4,
              borderWidth: 2,
              pointRadius: 0,
            },
          ],
        });
      } catch {
        // keep placeholders on failure
      }
    })();
  }, [hoursWindow, monthsWindow, propertiesCount, rangeType]);

  const totalCommission = chartData ? chartData.datasets[0].data.reduce((s, v) => s + Number(v || 0), 0) : 0;
  const totalSubscription = chartData ? chartData.datasets[1].data.reduce((s, v) => s + Number(v || 0), 0) : 0;

  return (
    <div className="relative min-h-screen bg-[#070B1C] text-slate-100 overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background:
            "radial-gradient(900px circle at 18% 20%, rgba(59,130,246,0.16), transparent 45%), radial-gradient(900px circle at 75% 18%, rgba(236,72,153,0.14), transparent 44%), radial-gradient(900px circle at 55% 85%, rgba(16,185,129,0.12), transparent 46%), linear-gradient(to bottom, rgba(2,6,23,0.00), rgba(2,6,23,0.60))",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.14] [background-image:linear-gradient(to_right,rgba(255,255,255,0.09)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.09)_1px,transparent_1px)] [background-size:42px_42px]"
        aria-hidden
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <div className="grid grid-cols-12 gap-6">
          <main className="col-span-12 rounded-[32px] border border-white/10 bg-white/[0.02] backdrop-blur-xl shadow-[0_26px_110px_-70px_rgba(0,0,0,0.95)] p-5 sm:p-6 lg:p-8">
            <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
              <div>
                <div className="text-xs text-slate-300">Welcome back • <ClientTime iso={nowIso} /></div>
                <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-white">Dashboard</h1>
                <div className="mt-1 text-sm text-slate-300">A modern overview of approvals, payments, bookings, and revenue.</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => router.push("/admin/revenue")}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-white/10 transition"
                >
                  <BarChart2 className="h-4 w-4 text-sky-200" aria-hidden />
                  Revenue
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/admin/properties/previews")}
                  className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-100 hover:bg-emerald-500/15 transition"
                >
                  <CheckCircle2 className="h-4 w-4 text-emerald-200" aria-hidden />
                  Approvals
                </button>
              </div>
            </div>

            <div className="grid grid-cols-12 gap-6">
              <section className="col-span-12">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className="group relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/8 via-white/5 to-white/2 backdrop-blur-xl p-5 shadow-[0_22px_80px_-60px_rgba(0,0,0,0.95)] motion-safe:transition hover:-translate-y-0.5 hover:shadow-[0_28px_95px_-60px_rgba(0,0,0,0.98)]">
                    <div
                      className="pointer-events-none absolute inset-0 opacity-75"
                      aria-hidden
                      style={{
                        background:
                          "radial-gradient(520px circle at 15% 20%, rgba(2,102,94,0.26), transparent 55%), radial-gradient(520px circle at 90% 30%, rgba(34,197,94,0.16), transparent 60%)",
                      }}
                    />
                    <div className="relative flex items-start justify-between gap-3">
                      <div className="text-sm font-medium text-slate-200">Pending approvals</div>
                      <div className="h-9 w-9 rounded-2xl border border-white/10 bg-white/10 flex items-center justify-center">
                        <CheckCircle2 className="h-4 w-4 text-white/90" aria-hidden />
                      </div>
                    </div>
                    <div className="relative mt-4 text-4xl font-extrabold tracking-tight text-white tabular-nums">
                      {monitoring ? Math.round(pendingApprovalsAnimated).toLocaleString() : "—"}
                    </div>
                    <div className="relative mt-2 text-sm text-slate-400">Listings to review</div>
                    <div className="relative mt-4 h-16 flex items-end justify-between gap-3">
                      <div className="text-xs text-slate-400">
                        Share <span className="text-slate-200 font-semibold">{opsPercent(pendingApprovalsValue).toFixed(0)}%</span>
                      </div>
                      <MiniBars values={makeSpark(pendingApprovalsValue + 11, 14)} color="rgba(34,197,94,0.95)" width={138} height={64} className="opacity-95" />
                    </div>
                  </div>

                  <div className="group relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/8 via-white/5 to-white/2 backdrop-blur-xl p-5 shadow-[0_22px_80px_-60px_rgba(0,0,0,0.95)] motion-safe:transition hover:-translate-y-0.5 hover:shadow-[0_28px_95px_-60px_rgba(0,0,0,0.98)]">
                    <div
                      className="pointer-events-none absolute inset-0 opacity-75"
                      aria-hidden
                      style={{
                        background:
                          "radial-gradient(520px circle at 15% 25%, rgba(6,182,212,0.22), transparent 56%), radial-gradient(520px circle at 90% 22%, rgba(56,189,248,0.16), transparent 60%)",
                      }}
                    />
                    <div className="relative flex items-start justify-between gap-3">
                      <div className="text-sm font-medium text-slate-200">Payments waiting</div>
                      <div className="h-9 w-9 rounded-2xl border border-white/10 bg-white/10 flex items-center justify-center">
                        <CreditCard className="h-4 w-4 text-white/90" aria-hidden />
                      </div>
                    </div>
                    <div className="relative mt-4 text-4xl font-extrabold tracking-tight text-white tabular-nums">
                      {paymentsWaiting === null || paymentsWaiting === undefined
                        ? "—"
                        : Math.round(paymentsWaitingAnimated).toLocaleString()}
                    </div>
                    <div className="relative mt-2 text-sm text-slate-400">Payouts & settlements</div>
                    <div className="relative mt-4 h-16 flex items-end justify-between gap-3">
                      <div className="text-xs text-slate-400">
                        Share <span className="text-slate-200 font-semibold">{opsPercent(paymentsWaitingValue).toFixed(0)}%</span>
                      </div>
                      <MiniRing percent={opsPercent(paymentsWaitingValue)} color="rgba(56,189,248,0.95)" size={76} className="opacity-95" />
                    </div>
                  </div>

                  <div className="group relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/8 via-white/5 to-white/2 backdrop-blur-xl p-5 shadow-[0_22px_80px_-60px_rgba(0,0,0,0.95)] motion-safe:transition hover:-translate-y-0.5 hover:shadow-[0_28px_95px_-60px_rgba(0,0,0,0.98)]">
                    <div
                      className="pointer-events-none absolute inset-0 opacity-75"
                      aria-hidden
                      style={{
                        background:
                          "radial-gradient(520px circle at 18% 22%, rgba(56,189,248,0.22), transparent 56%), radial-gradient(520px circle at 92% 35%, rgba(2,102,94,0.14), transparent 62%)",
                      }}
                    />
                    <div className="relative flex items-start justify-between gap-3">
                      <div className="text-sm font-medium text-slate-200">Bookings</div>
                      <div className="h-9 w-9 rounded-2xl border border-white/10 bg-white/10 flex items-center justify-center">
                        <CalendarDays className="h-4 w-4 text-white/90" aria-hidden />
                      </div>
                    </div>
                    <div className="relative mt-4 text-4xl font-extrabold tracking-tight text-white tabular-nums">
                      {monitoring ? Math.round(bookingsAnimated).toLocaleString() : "—"}
                    </div>
                    <div className="relative mt-2 text-sm text-slate-400">In the current window</div>
                    <div className="relative mt-4 h-16 flex items-end justify-between gap-3">
                      <div className="text-xs text-slate-400">
                        Share <span className="text-slate-200 font-semibold">{opsPercent(bookingsValue).toFixed(0)}%</span>
                      </div>
                      <MiniSparkline values={makeSpark(bookingsValue + 17, 24)} stroke="rgba(34,211,238,0.95)" width={140} height={56} className="opacity-95" />
                    </div>
                  </div>

                  <div className="group relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/8 via-white/5 to-white/2 backdrop-blur-xl p-5 shadow-[0_22px_80px_-60px_rgba(0,0,0,0.95)] motion-safe:transition hover:-translate-y-0.5 hover:shadow-[0_28px_95px_-60px_rgba(0,0,0,0.98)]">
                    <div
                      className="pointer-events-none absolute inset-0 opacity-75"
                      aria-hidden
                      style={{
                        background:
                          "radial-gradient(520px circle at 18% 26%, rgba(2,102,94,0.24), transparent 56%), radial-gradient(520px circle at 92% 30%, rgba(148,163,184,0.14), transparent 62%)",
                      }}
                    />
                    <div className="relative flex items-start justify-between gap-3">
                      <div className="text-sm font-medium text-slate-200">Drivers pending</div>
                      <div className="h-9 w-9 rounded-2xl border border-white/10 bg-white/10 flex items-center justify-center">
                        <Truck className="h-4 w-4 text-white/90" aria-hidden />
                      </div>
                    </div>
                    <div className="relative mt-4 text-4xl font-extrabold tracking-tight text-white tabular-nums">
                      {driversPending ?? "—"}
                    </div>
                    <div className="relative mt-2 text-sm text-slate-400">Awaiting verification</div>
                    <div className="relative mt-4 h-16 flex items-end justify-between gap-3">
                      <div className="text-xs text-slate-400">
                        Share <span className="text-slate-200 font-semibold">{opsPercent(driversPendingValue).toFixed(0)}%</span>
                      </div>
                      <MiniBars values={makeSpark(driversPendingValue + 23, 14)} color="rgba(2,102,94,0.95)" width={138} height={64} className="opacity-95" />
                    </div>
                  </div>

                  <div className="group relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/8 via-white/5 to-white/2 backdrop-blur-xl p-5 shadow-[0_22px_80px_-60px_rgba(0,0,0,0.95)] motion-safe:transition hover:-translate-y-0.5 hover:shadow-[0_28px_95px_-60px_rgba(0,0,0,0.98)]">
                    <div
                      className="pointer-events-none absolute inset-0 opacity-75"
                      aria-hidden
                      style={{
                        background:
                          "radial-gradient(520px circle at 18% 20%, rgba(16,185,129,0.20), transparent 56%), radial-gradient(520px circle at 92% 35%, rgba(2,102,94,0.18), transparent 62%)",
                      }}
                    />
                    <div className="relative flex items-start justify-between gap-3">
                      <div className="text-sm font-medium text-slate-200">New users</div>
                      <div className="h-9 w-9 rounded-2xl border border-white/10 bg-white/10 flex items-center justify-center">
                        <Users className="h-4 w-4 text-white/90" aria-hidden />
                      </div>
                    </div>
                    <div className="relative mt-4 text-4xl font-extrabold tracking-tight text-white tabular-nums">
                      {usersNew ?? "—"}
                    </div>
                    <div className="relative mt-2 text-sm text-slate-400">Recently joined</div>
                    <div className="relative mt-4 h-16 flex items-end justify-between gap-3">
                      <div className="text-xs text-slate-400">
                        Share <span className="text-slate-200 font-semibold">{opsPercent(usersNewValue).toFixed(0)}%</span>
                      </div>
                      <MiniRing percent={opsPercent(usersNewValue)} color="rgba(16,185,129,0.95)" size={76} className="opacity-95" />
                    </div>
                  </div>
                </div>
              </section>

              <section className="col-span-12">
                <div className="flex items-end justify-between gap-3 flex-wrap">
                  <div>
                    <div className="text-sm font-semibold text-white">Performance highlights</div>
                    <div className="text-xs text-slate-400">Top performers in the last {highlights?.windowDays ?? 30} days</div>
                  </div>
                  <div className="inline-flex items-center gap-2 text-xs text-slate-400">
                    <Sparkles className="h-4 w-4 text-emerald-200" aria-hidden />
                    Best of NoLSAF
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  <Link
                    href="/admin/properties/previews"
                    className="group relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/8 via-white/5 to-white/2 backdrop-blur-xl p-5 shadow-[0_22px_80px_-60px_rgba(0,0,0,0.95)] motion-safe:transition hover:-translate-y-0.5 hover:bg-white/10 no-underline hover:no-underline"
                  >
                    <div
                      className="pointer-events-none absolute inset-0 opacity-75"
                      aria-hidden
                      style={{
                        background:
                          "radial-gradient(520px circle at 20% 25%, rgba(2,102,94,0.22), transparent 56%), radial-gradient(520px circle at 92% 35%, rgba(34,197,94,0.14), transparent 62%)",
                      }}
                    />
                    <div className="relative flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-xs text-slate-400">Best property type</div>
                        <div className="mt-1 text-lg font-extrabold text-white tracking-tight truncate">
                          {highlights?.bestPropertyType?.type ?? "—"}
                        </div>
                      </div>
                      <div className="h-9 w-9 rounded-2xl border border-white/10 bg-white/10 flex items-center justify-center">
                        <Building2 className="h-4 w-4 text-white/90" aria-hidden />
                      </div>
                    </div>
                    <div className="relative mt-3 flex items-end justify-between gap-3">
                      <div className="text-sm text-slate-300">
                        <span className="font-semibold text-white tabular-nums">{(highlights?.bestPropertyType?.bookings ?? 0).toLocaleString()}</span> bookings
                        <div className="mt-1 text-xs text-slate-400">
                          {(highlights?.bestPropertyType?.interactions ?? 0).toLocaleString()} interactions
                        </div>
                      </div>
                      <MiniDotTrend
                        values={makeSpark((highlights?.bestPropertyType?.bookings ?? 0) + (highlights?.bestPropertyType?.interactions ?? 0) + 17, 16)}
                        color="rgba(34,197,94,0.95)"
                        width={156}
                        height={58}
                        className="opacity-95"
                      />
                    </div>
                    <div className="relative mt-3 text-xs text-slate-500">Bookings + saves/reviews</div>
                  </Link>

                  <Link
                    href={highlights?.bestDriver?.driverId ? `/admin/drivers/audit/${highlights.bestDriver.driverId}` : "/admin/drivers"}
                    className="group relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/8 via-white/5 to-white/2 backdrop-blur-xl p-5 shadow-[0_22px_80px_-60px_rgba(0,0,0,0.95)] motion-safe:transition hover:-translate-y-0.5 hover:bg-white/10 no-underline hover:no-underline"
                  >
                    <div
                      className="pointer-events-none absolute inset-0 opacity-75"
                      aria-hidden
                      style={{
                        background:
                          "radial-gradient(520px circle at 20% 25%, rgba(56,189,248,0.20), transparent 56%), radial-gradient(520px circle at 90% 30%, rgba(2,102,94,0.14), transparent 62%)",
                      }}
                    />
                    <div className="relative flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-xs text-slate-400">Best driver (NoLSAF revenue)</div>
                        <div className="mt-1 text-lg font-extrabold text-white tracking-tight truncate">
                          {highlights?.bestDriver?.name ?? "—"}
                        </div>
                      </div>
                      <div className="h-9 w-9 rounded-2xl border border-white/10 bg-white/10 flex items-center justify-center">
                        <Truck className="h-4 w-4 text-white/90" aria-hidden />
                      </div>
                    </div>
                    <div className="relative mt-3 flex items-end justify-between gap-3">
                      <div className="text-sm text-slate-300">
                        <div className="text-base font-extrabold text-white tabular-nums">
                          {formatTsh(highlights?.bestDriver?.nolsRevenue ?? 0)}
                        </div>
                        <div className="mt-1 text-xs text-slate-400">
                          {(highlights?.bestDriver?.bookings ?? 0).toLocaleString()} bookings
                        </div>
                      </div>
                      <MiniMeter
                        percent={Math.max(
                          0,
                          Math.min(100, Math.round(100 * (1 - Math.exp(-(highlights?.bestDriver?.nolsRevenue ?? 0) / 500000))))
                        )}
                        color="linear-gradient(90deg, rgba(56,189,248,0.95), rgba(34,211,238,0.95))"
                        className="opacity-95"
                      />
                    </div>
                    <div className="relative mt-3 text-xs text-slate-500">Commission from approved/paid invoices</div>
                  </Link>

                  <Link
                    href={highlights?.bestOwner?.ownerId ? `/admin/owners/${highlights.bestOwner.ownerId}` : "/admin/owners"}
                    className="group relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/8 via-white/5 to-white/2 backdrop-blur-xl p-5 shadow-[0_22px_80px_-60px_rgba(0,0,0,0.95)] motion-safe:transition hover:-translate-y-0.5 hover:bg-white/10 no-underline hover:no-underline"
                  >
                    <div
                      className="pointer-events-none absolute inset-0 opacity-75"
                      aria-hidden
                      style={{
                        background:
                          "radial-gradient(520px circle at 20% 25%, rgba(16,185,129,0.18), transparent 56%), radial-gradient(520px circle at 92% 35%, rgba(2,102,94,0.16), transparent 62%)",
                      }}
                    />
                    <div className="relative flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-xs text-slate-400">Best owner (revenue + bookings)</div>
                        <div className="mt-1 text-lg font-extrabold text-white tracking-tight truncate">
                          {highlights?.bestOwner?.name ?? "—"}
                        </div>
                      </div>
                      <div className="h-9 w-9 rounded-2xl border border-white/10 bg-white/10 flex items-center justify-center">
                        <Briefcase className="h-4 w-4 text-white/90" aria-hidden />
                      </div>
                    </div>
                    <div className="relative mt-3 flex items-end justify-between gap-3">
                      <div className="text-sm text-slate-300">
                        <div className="text-base font-extrabold text-white tabular-nums">
                          {formatTsh(highlights?.bestOwner?.nolsRevenue ?? 0)}
                        </div>
                        <div className="mt-1 text-xs text-slate-400">
                          {(highlights?.bestOwner?.bookings ?? 0).toLocaleString()} bookings
                        </div>
                      </div>
                      <MiniDotTrend
                        values={makeSpark((highlights?.bestOwner?.bookings ?? 0) + (highlights?.bestOwner?.nolsRevenue ?? 0) / 10000 + 31, 16)}
                        color="rgba(16,185,129,0.95)"
                        width={156}
                        height={58}
                        className="opacity-95"
                      />
                    </div>
                    <div className="relative mt-3 text-xs text-slate-500">Owner whose bookings earned most commission</div>
                  </Link>

                  <Link
                    href="/admin/bookings"
                    className="group relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/8 via-white/5 to-white/2 backdrop-blur-xl p-5 shadow-[0_22px_80px_-60px_rgba(0,0,0,0.95)] motion-safe:transition hover:-translate-y-0.5 hover:bg-white/10 no-underline hover:no-underline"
                  >
                    <div
                      className="pointer-events-none absolute inset-0 opacity-75"
                      aria-hidden
                      style={{
                        background:
                          "radial-gradient(520px circle at 20% 25%, rgba(148,163,184,0.18), transparent 56%), radial-gradient(520px circle at 92% 35%, rgba(56,189,248,0.14), transparent 62%)",
                      }}
                    />
                    <div className="relative flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-xs text-slate-400">Most booked region</div>
                        <div className="mt-1 text-lg font-extrabold text-white tracking-tight truncate">
                          {highlights?.mostBookedRegion?.regionName ?? "—"}
                        </div>
                      </div>
                      <div className="h-9 w-9 rounded-2xl border border-white/10 bg-white/10 flex items-center justify-center">
                        <MapPin className="h-4 w-4 text-white/90" aria-hidden />
                      </div>
                    </div>
                    <div className="relative mt-3 flex items-end justify-between gap-3">
                      <div className="text-sm text-slate-300">
                        <span className="text-base font-extrabold text-white tabular-nums">{(highlights?.mostBookedRegion?.bookings ?? 0).toLocaleString()}</span>
                        <div className="mt-1 text-xs text-slate-400">bookings</div>
                      </div>
                      <MiniMeter
                        percent={Math.max(
                          0,
                          Math.min(100, Math.round(100 * (1 - Math.exp(-(highlights?.mostBookedRegion?.bookings ?? 0) / 25))))
                        )}
                        color="linear-gradient(90deg, rgba(148,163,184,0.95), rgba(56,189,248,0.80))"
                        className="opacity-95"
                      />
                    </div>
                    <div className="relative mt-3 text-xs text-slate-500">Region with highest check-ins</div>
                  </Link>

                  <Link
                    href={
                      highlights?.topProperty?.propertyId
                        ? `/admin/properties/previews?previewId=${highlights.topProperty.propertyId}`
                        : "/admin/properties/previews"
                    }
                    className="group relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/8 via-white/5 to-white/2 backdrop-blur-xl p-5 shadow-[0_22px_80px_-60px_rgba(0,0,0,0.95)] motion-safe:transition hover:-translate-y-0.5 hover:bg-white/10 md:col-span-2 xl:col-span-1 no-underline hover:no-underline"
                  >
                    <div
                      className="pointer-events-none absolute inset-0 opacity-75"
                      aria-hidden
                      style={{
                        background:
                          "radial-gradient(520px circle at 20% 25%, rgba(2,102,94,0.18), transparent 56%), radial-gradient(520px circle at 92% 35%, rgba(34,211,238,0.12), transparent 62%)",
                      }}
                    />
                    <div className="relative flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-xs text-slate-400">Top property (bookings + interactions)</div>
                        <div className="mt-1 text-lg font-extrabold text-white tracking-tight truncate">
                          {highlights?.topProperty?.title ?? "—"}
                        </div>
                      </div>
                      <div className="h-9 w-9 rounded-2xl border border-white/10 bg-white/10 flex items-center justify-center">
                        <LayoutDashboard className="h-4 w-4 text-white/90" aria-hidden />
                      </div>
                    </div>
                    <div className="relative mt-2 text-xs text-slate-400 truncate">
                      {highlights?.topProperty ? `${highlights.topProperty.type} • ${highlights.topProperty.regionName}` : ""}
                    </div>
                    <div className="relative mt-3 flex items-end justify-between gap-3">
                      <div className="text-sm text-slate-300">
                        <span className="font-semibold text-white tabular-nums">{(highlights?.topProperty?.bookings ?? 0).toLocaleString()}</span> bookings
                        <div className="mt-1 text-xs text-slate-400">
                          {(highlights?.topProperty?.interactions ?? 0).toLocaleString()} interactions
                        </div>
                      </div>
                      <MiniDotTrend
                        values={makeSpark((highlights?.topProperty?.bookings ?? 0) + (highlights?.topProperty?.interactions ?? 0) + 19, 16)}
                        color="rgba(2,102,94,0.95)"
                        width={156}
                        height={58}
                        className="opacity-95"
                      />
                    </div>
                    <div className="relative mt-3 text-xs text-slate-500">Signals: check-ins, saves & reviews</div>
                  </Link>
                </div>
              </section>

              <section className="col-span-12 lg:col-span-7 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-[0_20px_80px_-60px_rgba(0,0,0,0.9)] overflow-hidden">
                <div className="p-5 sm:p-6 border-b border-white/10 flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <div className="text-sm font-semibold text-white">Revenue analytics</div>
                    <div className="text-xs text-slate-400">Commission & subscription series</div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="inline-flex rounded-2xl bg-white/5 p-1 border border-white/10">
                      <button
                        type="button"
                        onClick={() => setRangeType("hours")}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${rangeType === "hours" ? "bg-white/10 border-white/10 text-white" : "bg-transparent border-transparent text-slate-300 hover:bg-white/10 hover:border-white/10"}`}
                      >
                        Hours
                      </button>
                      <button
                        type="button"
                        onClick={() => setRangeType("months")}
                        className={`mx-1 px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${rangeType === "months" ? "bg-white/10 border-white/10 text-white" : "bg-transparent border-transparent text-slate-300 hover:bg-white/10 hover:border-white/10"}`}
                      >
                        Months
                      </button>
                      <button
                        type="button"
                        onClick={() => setRangeType("properties")}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${rangeType === "properties" ? "bg-white/10 border-white/10 text-white" : "bg-transparent border-transparent text-slate-300 hover:bg-white/10 hover:border-white/10"}`}
                      >
                        Properties
                      </button>
                    </div>

                    {rangeType === "hours" && (
                      <select
                        title="Hours range"
                        aria-label="Hours range"
                        className="border border-white/10 rounded-2xl px-3 py-2 bg-white/5 text-xs text-slate-100"
                        value={hoursWindow}
                        onChange={(e) => setHoursWindow(Number(e.target.value))}
                      >
                        <option value={6}>Last 6 hours</option>
                        <option value={12}>Last 12 hours</option>
                        <option value={24}>Last 24 hours</option>
                        <option value={48}>Last 48 hours</option>
                      </select>
                    )}
                    {rangeType === "months" && (
                      <select
                        title="Months range"
                        aria-label="Months range"
                        className="border border-white/10 rounded-2xl px-3 py-2 bg-white/5 text-xs text-slate-100"
                        value={monthsWindow}
                        onChange={(e) => setMonthsWindow(Number(e.target.value))}
                      >
                        <option value={1}>Last 1 month</option>
                        <option value={2}>Last 2 months</option>
                        <option value={3}>Last 3 months</option>
                        <option value={6}>Last 6 months</option>
                        <option value={9}>Last 9 months</option>
                        <option value={12}>Last 12 months</option>
                      </select>
                    )}
                  </div>
                </div>

                <div className="p-5 sm:p-6">
                  {chartData === null ? (
                    <div className="py-10 text-center text-sm text-slate-400">Loading revenue data…</div>
                  ) : (
                    (() => {
                      const commissionArr = chartData.datasets[0].data;
                      const subscriptionArr = chartData.datasets[1].data;
                      const totalC = commissionArr.reduce((s, v) => s + Number(v || 0), 0);
                      const totalS = subscriptionArr.reduce((s, v) => s + Number(v || 0), 0);
                      const totalT = totalC + totalS;
                      const hasPoints = (chartData?.labels?.length || 0) > 0;

                      return (
                        <>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                            <div className="p-4 rounded-2xl border border-white/10 bg-white/5">
                              <div className="text-xs text-slate-400 font-medium">Commission</div>
                              <div className="mt-1 text-lg font-extrabold text-white">Tsh {totalC.toLocaleString()}</div>
                            </div>
                            <div className="p-4 rounded-2xl border border-white/10 bg-white/5">
                              <div className="text-xs text-slate-400 font-medium">Subscription</div>
                              <div className="mt-1 text-lg font-extrabold text-white">Tsh {totalS.toLocaleString()}</div>
                            </div>
                            <div className="p-4 rounded-2xl border border-emerald-400/15 bg-emerald-500/10">
                              <div className="text-xs text-emerald-200 font-semibold">Total revenue</div>
                              <div className="mt-1 text-lg font-extrabold text-white">Tsh {totalT.toLocaleString()}</div>
                            </div>
                          </div>

                          <div className="h-72">
                            {hasPoints ? (
                              <Chart
                                type="line"
                                data={chartData}
                                options={{
                                  responsive: true,
                                  maintainAspectRatio: false,
                                  interaction: { mode: "index", intersect: false },
                                  plugins: {
                                    legend: { labels: { color: "rgba(226,232,240,0.9)" } },
                                  },
                                  scales: {
                                    y: {
                                      grid: { color: "rgba(255,255,255,0.06)" },
                                      ticks: { color: "rgba(226,232,240,0.8)" },
                                    },
                                    x: {
                                      grid: { color: "rgba(255,255,255,0.04)" },
                                      ticks: {
                                        color: "rgba(226,232,240,0.75)",
                                        autoSkip: rangeType !== "properties",
                                        maxRotation: 45,
                                        minRotation: 0,
                                      },
                                    },
                                  },
                                }}
                              />
                            ) : (
                              <div className="h-full flex items-center justify-center text-sm text-slate-400">
                                No revenue data for the selected range.
                              </div>
                            )}
                          </div>
                        </>
                      );
                    })()
                  )}
                </div>
              </section>

              <section className="col-span-12 lg:col-span-5 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-[0_20px_80px_-60px_rgba(0,0,0,0.9)] overflow-hidden">
                <div className="p-5 sm:p-6 border-b border-white/10 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-white">Recent activities</div>
                    <div className="text-xs text-slate-400">Latest changes</div>
                  </div>
                </div>
                <div className="p-3">
                  {(() => {
                    const loading = recentActivities === null;
                    const hasItems = Array.isArray(recentActivities) && recentActivities.length > 0;

                    if (loading) {
                      return (
                        <ul className="divide-y divide-white/10 rounded-2xl border border-white/10 bg-white/0 p-2">
                          {Array.from({ length: 6 }).map((_, i) => (
                            <li key={i} className="py-3 px-3">
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex-1">
                                  <div className="h-3 bg-white/10 rounded w-40 animate-pulse mb-2" />
                                  <div className="h-2 bg-white/10 rounded w-56 animate-pulse" />
                                </div>
                                <div className="h-3 bg-white/10 rounded w-20 animate-pulse" />
                              </div>
                            </li>
                          ))}
                        </ul>
                      );
                    }

                    if (!hasItems) {
                      return <div className="px-3 py-4 text-sm text-slate-400">No recent activities</div>;
                    }

                    return (
                      <ul className="divide-y divide-white/10 rounded-2xl border border-white/10 bg-white/0 p-2">
                        {recentActivities!.slice(0, 10).map((a: any) => {
                          let detailsText = "";
                          try {
                            if (typeof a.details === "string") {
                              const parsed = JSON.parse(a.details);
                              if (parsed && typeof parsed === "object") {
                                if ((parsed as any).propertyId)
                                  detailsText = `Property ${(parsed as any).propertyId} — ${(parsed as any).status ?? (parsed as any).result ?? ""}`;
                                else if ((parsed as any).bookingId)
                                  detailsText = `Booking ${(parsed as any).bookingId} — ${(parsed as any).status ?? ""}`;
                                else detailsText = Object.entries(parsed as any)
                                  .map(([k, v]) => `${k}: ${v}`)
                                  .join(", ");
                              } else {
                                detailsText = String(parsed);
                              }
                            } else if (a.details && typeof a.details === "object") {
                              const d = a.details;
                              if (d.propertyId) detailsText = `Property ${d.propertyId} — ${d.status ?? d.result ?? ""}`;
                              else if (d.bookingId) detailsText = `Booking ${d.bookingId} — ${d.status ?? ""}`;
                              else detailsText = Object.entries(d)
                                .map(([k, v]) => `${k}: ${v}`)
                                .join(", ");
                            } else {
                              detailsText = String(a.details ?? "");
                            }
                          } catch {
                            detailsText = String(a.details ?? "");
                          }

                          return (
                            <li key={a.id ?? `${a.action}-${a.createdAt ?? ""}`} className="py-3 px-3">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="text-sm font-semibold text-white truncate">{String(a.action ?? "Activity")}</div>
                                  <div className="text-xs text-slate-400 truncate mt-0.5">{detailsText}</div>
                                </div>
                                <ClientTime iso={a.createdAt} />
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    );
                  })()}
                </div>
              </section>

              <section className="col-span-12 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-[0_20px_80px_-60px_rgba(0,0,0,0.9)] overflow-hidden">
                <div className="p-5 sm:p-6 border-b border-white/10 flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <div className="text-sm font-semibold text-white">Operations snapshot</div>
                    <div className="text-xs text-slate-400">Live distribution (totals)</div>
                  </div>
                  <div className="text-xs text-slate-300">
                    Total: <span className="font-semibold text-white tabular-nums">{opsSnapshot.total.toLocaleString()}</span>
                  </div>
                </div>

                <div className="p-5 sm:p-6 grid grid-cols-12 gap-6 items-center">
                  <div className="col-span-12 sm:col-span-5 lg:col-span-4">
                    <div className="relative rounded-3xl border border-white/10 bg-[#050A18]/40 p-4">
                      {opsSnapshot.total > 0 ? (
                        <div className="relative">
                          <Chart
                            type="doughnut"
                            height={210}
                            data={{
                              labels: opsSnapshot.labels,
                              datasets: [
                                {
                                  data: opsSnapshot.values,
                                  backgroundColor: opsSnapshot.colors,
                                  borderColor: "rgba(255,255,255,0.14)",
                                  borderWidth: 1.5,
                                  hoverOffset: 6,
                                },
                              ],
                            } as any}
                            options={{
                              responsive: true,
                              maintainAspectRatio: false,
                              cutout: "70%",
                              animation: reduceMotion ? { duration: 0 } : { duration: 650, easing: "easeOutQuart" },
                              plugins: {
                                legend: { display: false },
                                tooltip: {
                                  enabled: true,
                                  backgroundColor: "rgba(2,6,23,0.92)",
                                  titleColor: "rgba(255,255,255,0.92)",
                                  bodyColor: "rgba(226,232,240,0.9)",
                                  borderColor: "rgba(255,255,255,0.14)",
                                  borderWidth: 1,
                                },
                              },
                            } as any}
                          />

                          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                            <div className="text-center">
                              <div className="text-[11px] uppercase tracking-widest text-slate-300">Total</div>
                              <div className="mt-1 text-2xl font-extrabold text-white tabular-nums">
                                {opsSnapshot.total.toLocaleString()}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="h-[210px] flex items-center justify-center text-sm text-slate-400">No snapshot data yet.</div>
                      )}
                    </div>
                  </div>

                  <div className="col-span-12 sm:col-span-7 lg:col-span-8">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {opsSnapshot.labels.map((label, i) => {
                        const value = opsSnapshot.values[i] ?? 0;
                        const pct = opsSnapshot.total > 0 ? Math.round((value / opsSnapshot.total) * 100) : 0;
                        return (
                          <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2 min-w-0">
                                <span
                                  className="h-2.5 w-2.5 rounded-full"
                                  style={{ backgroundColor: opsSnapshot.colors[i] }}
                                  aria-hidden
                                />
                                <div className="text-sm font-semibold text-white truncate">{label}</div>
                              </div>
                              <div className="text-xs text-slate-200 tabular-nums">
                                {value.toLocaleString()} <span className="text-slate-400">({pct}%)</span>
                              </div>
                            </div>
                            <div className="mt-3 h-2 rounded-full bg-white/10 overflow-hidden">
                              <div
                                className="h-full rounded-full transition-[width] duration-700"
                                style={{ width: `${tilesInView ? pct : 0}%`, backgroundColor: opsSnapshot.colors[i] }}
                                aria-hidden
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </section>

              <section className="col-span-12 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-[0_20px_80px_-60px_rgba(0,0,0,0.9)] overflow-hidden">
                <div className="p-5 sm:p-6 border-b border-white/10 flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <div className="text-sm font-semibold text-white">Quick navigation</div>
                    <div className="text-xs text-slate-400">Tap a card for deep sections</div>
                  </div>
                </div>

                <div
                  className="p-4 sm:p-5 grid grid-cols-12 gap-3"
                  ref={(node) => {
                    if (!node) return;
                    if (tilesInView) return;
                    if (typeof window === "undefined") return;
                    try {
                      const obs = new IntersectionObserver(
                        (entries) => {
                          if (entries.some((e) => e.isIntersecting)) {
                            setTilesInView(true);
                            obs.disconnect();
                          }
                        },
                        { threshold: 0.12 }
                      );
                      obs.observe(node);
                    } catch {
                      setTilesInView(true);
                    }
                  }}
                >
                  <NavTile
                    href="/admin/properties/previews"
                    title="Approvals"
                    description="Review new properties"
                    icon={CheckCircle2}
                    gradient="from-brand-700 via-emerald-500 to-lime-300"
                    iconWrap="bg-brand-500/15 border-brand-300/20 text-white"
                    badge={monitoring ? monitoring.pendingApprovals : null}
                    className="col-span-12 sm:col-span-6 lg:col-span-4"
                    featured
                    index={0}
                  />

                  <NavTile
                    href="/admin/payments"
                    title="Payments"
                    description="Payouts & settlements"
                    icon={CreditCard}
                    gradient="from-brand-700 via-cyan-500 to-sky-300"
                    iconWrap="bg-cyan-500/15 border-cyan-200/20 text-white"
                    badge={paymentsWaiting ?? null}
                    className="col-span-12 sm:col-span-6 lg:col-span-4"
                    featured
                    index={1}
                  />

                  <NavTile
                    href="/admin/bookings"
                    title="Bookings"
                    description="Trips, status, issues"
                    icon={CalendarDays}
                    gradient="from-brand-800 via-sky-500 to-cyan-300"
                    iconWrap="bg-sky-500/15 border-sky-200/20 text-white"
                    badge={monitoring ? Math.round(bookingsAnimated) : null}
                    className="col-span-12 sm:col-span-6 lg:col-span-4"
                    featured
                    index={2}
                  />

                  <NavTile
                    href="/admin/revenue"
                    title="Revenue"
                    description="Reports & breakdown"
                    icon={BarChart2}
                    gradient="from-brand-700 via-sky-500 to-cyan-300"
                    iconWrap="bg-brand-500/15 border-brand-200/20 text-white"
                    seriesValues={makeSpark(totalCommission + totalSubscription)}
                    seriesStroke="rgba(255,255,255,0.88)"
                    className="col-span-12 sm:col-span-6 lg:col-span-3"
                    index={3}
                  />

                  <NavTile
                    href="/admin/properties"
                    title="Properties"
                    description="Manage listings"
                    icon={Building2}
                    gradient="from-brand-800 via-emerald-500 to-teal-300"
                    iconWrap="bg-emerald-500/15 border-emerald-200/20 text-white"
                    seriesValues={makeSpark((monitoring?.activeSessions ?? 0) + 7)}
                    seriesStroke="rgba(255,255,255,0.88)"
                    className="col-span-12 sm:col-span-6 lg:col-span-3"
                    index={4}
                  />

                  <NavTile
                    href="/admin/analytics"
                    title="Analytics"
                    description="Trends & performance"
                    icon={LineChart}
                    gradient="from-slate-600 via-brand-400 to-slate-200"
                    iconWrap="bg-white/10 border-white/15 text-white"
                    seriesValues={makeSpark(bookingsValue + pendingApprovalsValue)}
                    seriesStroke="rgba(255,255,255,0.86)"
                    className="col-span-12 sm:col-span-6 lg:col-span-3"
                    index={5}
                  />

                  <NavTile
                    href="/admin/messages"
                    title="Messages"
                    description="Inbox & communication"
                    icon={MessagesSquare}
                    gradient="from-brand-800 via-blue-500 to-cyan-300"
                    iconWrap="bg-blue-500/15 border-blue-200/20 text-white"
                    seriesValues={makeSpark(usersNewValue + 3)}
                    seriesStroke="rgba(255,255,255,0.88)"
                    className="col-span-12 sm:col-span-6 lg:col-span-3"
                    index={6}
                  />
                </div>
              </section>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
