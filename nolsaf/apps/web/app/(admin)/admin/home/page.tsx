"use client";
export { default } from "./page.new";
/*
import React, { useState, useEffect } from "react";
import Link from "next/link";
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
  MessagesSquare,
  Settings as SettingsIcon,
  Shield,
  Sparkles,
  Truck,
  Users,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useAdminHomeKpis, useAdminMonitoring, useAdminRecentActivities } from "./adminHomeHooks";

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

export default function AdminHomePage() {
  const router = useRouter();
  const [hoursWindow, setHoursWindow] = useState<number>(24);
  const [rangeType, setRangeType] = useState<'hours' | 'months' | 'properties'>('hours');
  const [monthsWindow, setMonthsWindow] = useState<number>(1);
  const propertiesCount = 5;
  const [chartData, setChartData] = useState<RevenueChartData | null>(null);
  const { monitoring } = useAdminMonitoring();
  const { recentActivities } = useAdminRecentActivities();
  const { driversPending, usersNew, revenueDelta, paymentsWaiting } = useAdminHomeKpis();
  const [nowIso] = useState<string>(() => new Date().toISOString());
  

  function ClientTime({ iso }: { iso?: string | null }) {
    const [label, setLabel] = useState<string | null>(null);
    useEffect(() => {
      if (!iso) return;
      try {
        setLabel(new Date(iso).toLocaleString());
      } catch (e) {
        setLabel(iso || null);
      }
    }, [iso]);
    if (!label) return <span className="text-xs text-slate-400">&nbsp;</span>;
    return <span className="text-xs text-slate-400 whitespace-nowrap">{label}</span>;
  }

  // Metrics polling is handled by hooks.

  const [tilesInView, setTilesInView] = useState<boolean>(false);
  const [reduceMotion, setReduceMotion] = useState<boolean>(false);

  useEffect(() => {
    try {
      const media = window.matchMedia('(prefers-reduced-motion: reduce)');
      const update = () => setReduceMotion(Boolean(media.matches));
      update();
      if (typeof media.addEventListener === 'function') media.addEventListener('change', update);
      else (media as any).addListener?.(update);
      return () => {
        if (typeof media.removeEventListener === 'function') media.removeEventListener('change', update);
        else (media as any).removeListener?.(update);
      };
    } catch {
      setReduceMotion(false);
    }
  }, []);

  function useCountUp(value: number, enabled: boolean, durationMs = 650) {
    const [display, setDisplay] = useState<number>(value);

    useEffect(() => {
      if (!enabled) {
        setDisplay(value);
        return;
      }
      if (reduceMotion) {
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
  const driversPendingAnimated = useCountUp(driversPendingValue, driversPending !== null && driversPending !== undefined);
  const usersNewAnimated = useCountUp(usersNewValue, usersNew !== null && usersNew !== undefined);

  type NavItem = {
    href: string;
    title: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    gradient: string;
    iconWrap: string;
    badge?: number | string | null;
    className?: string;
    featured?: boolean;
  };

  function NavTile({ href, title, description, icon: Icon, gradient, iconWrap, badge, className, featured, index }: NavItem & { index: number }) {
    const numericBadge = typeof badge === 'number' && Number.isFinite(badge) ? badge : null;
    const badgeDisplay = useCountUp(numericBadge ?? 0, tilesInView && numericBadge !== null);
    const badgeLabel = numericBadge !== null ? Math.round(badgeDisplay).toLocaleString() : badge;
    const progressPct =
      numericBadge !== null
        ? Math.max(0, Math.min(100, Math.round(100 * (1 - Math.exp(-numericBadge / 8)))))
        : null;

    return (
      <Link
        href={href}
        className={
          "group relative block no-underline " +
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30 " +
          "motion-safe:transition motion-safe:duration-300 hover:-translate-y-0.5 " +
          (className ? className : "")
        }
        onMouseMove={(e) => {
          const target = e.currentTarget as HTMLElement;
          const rect = target.getBoundingClientRect();
          const x = ((e.clientX - rect.left) / rect.width) * 100;
          const y = ((e.clientY - rect.top) / rect.height) * 100;
          target.style.setProperty('--x', `${x}%`);
          target.style.setProperty('--y', `${y}%`);
        }}
        onMouseLeave={(e) => {
          const target = e.currentTarget as HTMLElement;
          target.style.removeProperty('--x');
          target.style.removeProperty('--y');
        }}
        style={
          reduceMotion
            ? undefined
            : {
                opacity: tilesInView ? 1 : 0,
                transform: tilesInView ? 'translateY(0px)' : 'translateY(10px)',
                transitionProperty: 'opacity, transform, box-shadow',
                transitionDuration: '520ms',
                transitionTimingFunction: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
                transitionDelay: `${110 + index * 55}ms`,
              }
        }
      >
        <div className={`rounded-2xl p-[1px] bg-gradient-to-r ${gradient} shadow-sm group-hover:shadow-md transition-shadow duration-300`}>
          <div
            className={
              `relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl ` +
              `${featured ? 'p-5 sm:p-6 min-h-[132px]' : 'p-5 min-h-[112px]'}`
            }
          >
            <div
              className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              aria-hidden
              style={{
                background:
                  'radial-gradient(700px circle at var(--x,50%) var(--y,30%), rgba(16,185,129,0.10), transparent 42%), radial-gradient(520px circle at 90% 65%, rgba(14,165,233,0.08), transparent 50%)',
              }}
            />

            <div
              className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full opacity-70 blur-2xl"
              aria-hidden
              style={{
                background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.9), rgba(255,255,255,0) 60%)',
              }}
            />

            <div className="relative flex flex-col gap-3">
              <div className="flex items-center gap-4">
              <div
                className={
                  `relative h-10 w-10 rounded-2xl border flex items-center justify-center ${iconWrap} ` +
                  'transition-transform duration-300 group-hover:scale-[1.03]'
                }
              >
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" aria-hidden>
                  <div className="absolute inset-0 bg-gradient-to-br from-white/35 to-transparent" />
                </div>
                <Icon className="relative h-[18px] w-[18px]" aria-hidden />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div
                      className={
                        `font-semibold text-white ${featured ? 'text-base sm:text-lg' : 'text-base'} leading-snug ` +
                        `min-w-0 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:1] overflow-hidden ` +
                        `group-hover:[-webkit-line-clamp:5] group-focus-visible:[-webkit-line-clamp:5] group-active:[-webkit-line-clamp:5] break-words`
                      }
                    >
                      {title}
                    </div>
                    <div
                      className={
                        `mt-0.5 text-sm text-slate-300 leading-snug min-w-0 ` +
                        `[display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] overflow-hidden ` +
                        `group-hover:[-webkit-line-clamp:6] group-focus-visible:[-webkit-line-clamp:6] group-active:[-webkit-line-clamp:6] break-words`
                      }
                    >
                      {description}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {badge !== undefined && badge !== null ? (
                      <div className="shrink-0 rounded-full bg-rose-500/10 text-rose-200 border border-rose-400/20 px-2 py-0.5 text-xs font-semibold">
                        {badgeLabel}
                      </div>
                    ) : null}
                    <ChevronRight className="h-4 w-4 text-slate-300/70 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition" aria-hidden />
                  </div>
                </div>
              </div>
            </div>

              {progressPct !== null ? (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-[11px] text-slate-300">
                    <span className="relative inline-flex h-2 w-2">
                      <span className="absolute inset-0 rounded-full bg-emerald-500/40 motion-safe:animate-pulse" aria-hidden />
                      <span className="relative rounded-full bg-emerald-600" aria-hidden />
                    </span>
                    <span className="font-medium">Activity</span>
                  </div>
                  <div className="flex-1">
                    <div className="h-2 rounded-full bg-white/10 border border-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-sky-400 transition-[width] duration-700"
                        style={{ width: `${tilesInView ? progressPct : 0}%` }}
                        aria-hidden
                      />
                    </div>
                  </div>
                  <div className="text-[11px] font-semibold tabular-nums text-slate-200">{progressPct}%</div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </Link>
    );
  }

  // Auto-fetch/generate chart data whenever the selected hours range changes
  // Auto-generate chart data for Hours/Months/Properties whenever selection changes
  useEffect(() => {
    // set zero-filled placeholders immediately, then fetch real data to replace
    (async () => {
      try {
        // build placeholder labels and zero arrays
        const now = new Date();
        let placeholderLabels: string[] = [];
        if (rangeType === 'properties') {
          placeholderLabels = Array.from({ length: propertiesCount }).map((_, i) => `Property ${String.fromCharCode(65 + (i % 26))}${i >= 26 ? i : ''}`);
        } else if (rangeType === 'hours') {
          placeholderLabels = Array.from({ length: hoursWindow }).map((_, i) => {
            const d = new Date(now.getTime() - (hoursWindow - 1 - i) * 60 * 60 * 1000);
            return `${String(d.getHours()).padStart(2, '0')}:00`;
          });
        } else {
          placeholderLabels = Array.from({ length: monthsWindow }).map((_, i) => {
            const d = new Date(now.getFullYear(), now.getMonth() - (monthsWindow - 1 - i), 1);
            return d.toLocaleString(undefined, { month: 'short', year: 'numeric' });
          });
        }
        const zeros = placeholderLabels.map(() => 0);
        setChartData({
          labels: placeholderLabels,
          datasets: [
            {
              label: 'Commission',
              data: zeros,
              borderColor: 'rgba(2,102,94,0.95)',
              backgroundColor: 'rgba(2,102,94,0.06)',
              tension: 0.4,
              borderWidth: 2,
              pointRadius: 0,
            },
            {
              label: 'Subscription',
              data: zeros.slice(),
              borderColor: 'rgba(34,197,94,0.9)',
              backgroundColor: 'rgba(34,197,94,0.04)',
              tension: 0.4,
              borderWidth: 2,
              pointRadius: 0,
            },
          ],
        });

      } catch (err) {
        // ignore placeholder build errors — we'll still attempt fetch below
      }

      // fetch real data from backend series endpoint
      try {
        if (rangeType === 'properties') {
          const res = await fetch(`/api/admin/revenue/properties?top=${encodeURIComponent(String(propertiesCount))}`);
          if (!res.ok) throw new Error('no properties');
          const json = await res.json();
          const labels = Array.isArray(json) ? json.map((it: any) => it.name ?? it.title ?? `Property ${it.id ?? ''}`) : [];
          const commission = Array.isArray(json) ? json.map((it: any) => Number(it.commission ?? it.commission_total ?? it.commissionAmount ?? 0)) : [];
          const subscription = Array.isArray(json) ? json.map((it: any) => Number(it.subscription ?? it.subscription_total ?? it.subscriptionAmount ?? 0)) : [];
          setChartData({
            labels,
            datasets: [
              {
                label: 'Commission',
                data: commission,
                borderColor: 'rgba(2,102,94,0.95)',
                backgroundColor: 'rgba(2,102,94,0.06)',
                tension: 0.2,
                borderWidth: 2,
                pointRadius: 3,
              },
              {
                label: 'Subscription',
                data: subscription,
                borderColor: 'rgba(34,197,94,0.9)',
                backgroundColor: 'rgba(34,197,94,0.04)',
                tension: 0.2,
                borderWidth: 2,
                pointRadius: 3,
              },
            ],
          });
          return;
        }

        // build from/to for series endpoint
        const now = new Date();
        let from: string | undefined;
        let interval: string = 'day';
        if (rangeType === 'hours') {
          interval = 'hour';
          const fromDate = new Date(now.getTime() - (hoursWindow - 1) * 60 * 60 * 1000);
          from = fromDate.toISOString();
        } else if (rangeType === 'months') {
          interval = 'month';
          const fromDate = new Date(now.getFullYear(), now.getMonth() - (monthsWindow - 1), 1);
          from = fromDate.toISOString();
        }

        const q = new URLSearchParams();
        if (from) q.set('from', from);
        q.set('to', new Date().toISOString());
        q.set('interval', interval);

        const res = await fetch(`/api/admin/revenue/series?${q.toString()}`);
        if (!res.ok) throw new Error('no series');
        const rows = await res.json();
        // rows: [{ label, commission, subscription }, ...]
        const labels = Array.isArray(rows) ? rows.map((r: any) => String(r.label)) : [];
        const commission = Array.isArray(rows) ? rows.map((r: any) => Number(r.commission ?? 0)) : [];
        const subscription = Array.isArray(rows) ? rows.map((r: any) => Number(r.subscription ?? 0)) : [];
        setChartData({
          labels,
          datasets: [
            {
              label: 'Commission',
              data: commission,
              borderColor: 'rgba(2,102,94,0.95)',
              backgroundColor: 'rgba(2,102,94,0.06)',
              tension: 0.4,
              borderWidth: 2,
              pointRadius: 0,
            },
            {
              label: 'Subscription',
              data: subscription,
              borderColor: 'rgba(34,197,94,0.9)',
              backgroundColor: 'rgba(34,197,94,0.04)',
              tension: 0.4,
              borderWidth: 2,
              pointRadius: 0,
            },
          ],
        });
      } catch (e) {
        // If fetching fails we keep the zero placeholders set above.
      }
    })();
  }, [hoursWindow, monthsWindow, propertiesCount, rangeType]);

  function MiniSparkline({ values, stroke }: { values: number[]; stroke: string }) {
    const safe = Array.isArray(values) ? values.filter((v) => Number.isFinite(Number(v))).map((v) => Number(v)) : [];
    const points = safe.length >= 2 ? safe.slice(-24) : [];
    if (points.length < 2) return null;
    const min = Math.min(...points);
    const max = Math.max(...points);
    const w = 120;
    const h = 36;
    const pad = 3;
    const range = Math.max(1e-6, max - min);
    const toX = (i: number) => pad + (i * (w - pad * 2)) / (points.length - 1);
    const toY = (v: number) => pad + (1 - (v - min) / range) * (h - pad * 2);
    const d = points
      .map((v, i) => {
        const x = toX(i);
        const y = toY(v);
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(' ');
    return (
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
        <path d={d} fill="none" stroke={stroke} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-emerald-50/40">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
        <header className="relative overflow-hidden rounded-3xl border border-slate-200/70 bg-white/70 backdrop-blur-xl shadow-[0_18px_80px_-45px_rgba(2,102,94,0.45)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(16,185,129,0.16),transparent_40%),radial-gradient(circle_at_88%_30%,rgba(14,165,233,0.12),transparent_45%),radial-gradient(circle_at_60%_120%,rgba(2,102,94,0.10),transparent_50%)]" aria-hidden />
          <div className="absolute inset-0 opacity-[0.16] [background-image:linear-gradient(to_right,rgba(2,6,23,0.10)_1px,transparent_1px),linear-gradient(to_bottom,rgba(2,6,23,0.10)_1px,transparent_1px)] [background-size:28px_28px]" aria-hidden />

          <div className="relative p-6 sm:p-8 lg:p-10">
            <div className="mx-auto max-w-4xl text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200/70 bg-emerald-50/70 px-3 py-1 text-xs font-semibold text-emerald-800">
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                NoLSAF Admin
              </div>

              <h1 className="mt-4 text-[clamp(2.1rem,5vw,3.4rem)] font-black tracking-tight text-slate-900 leading-[1.02]">
                <div className="min-h-screen bg-[#070B1C] text-slate-100">
                  <div
                    className="pointer-events-none fixed inset-0"
                    aria-hidden
                    style={{
                      background:
                        'radial-gradient(900px circle at 18% 20%, rgba(59,130,246,0.16), transparent 45%), radial-gradient(900px circle at 75% 18%, rgba(236,72,153,0.14), transparent 44%), radial-gradient(900px circle at 55% 85%, rgba(16,185,129,0.12), transparent 46%), linear-gradient(to bottom, rgba(2,6,23,0.00), rgba(2,6,23,0.60))',
                    }}
                  />
                  <div className="pointer-events-none fixed inset-0 opacity-[0.14] [background-image:linear-gradient(to_right,rgba(255,255,255,0.09)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.09)_1px,transparent_1px)] [background-size:42px_42px]" aria-hidden />

                  <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
                    <div className="grid grid-cols-12 gap-6">
                      <aside className="col-span-12 lg:col-span-3">
                        <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-[0_18px_70px_-45px_rgba(0,0,0,0.8)] overflow-hidden">
                          <div className="p-5 border-b border-white/10">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-sky-500/25 to-emerald-500/20 border border-white/10 flex items-center justify-center">
                                <Sparkles className="h-5 w-5 text-sky-200" aria-hidden />
                              </div>
                              <div className="min-w-0">
                                <div className="text-sm font-semibold text-white truncate">NoLSAF Admin</div>
                                <div className="text-xs text-slate-300">Control center</div>
                              </div>
                            </div>
                          </div>

                          <nav className="p-3">
                            <div className="px-2 py-2 text-[11px] uppercase tracking-widest text-slate-400">Operations</div>
                            <div className="space-y-1">
                              <Link href="/admin/dashboard" className="group flex items-center gap-3 rounded-2xl px-3 py-2.5 border border-transparent hover:border-white/10 hover:bg-white/5 transition">
                                <LayoutDashboard className="h-4 w-4 text-slate-200" aria-hidden />
                                <span className="text-sm text-slate-100">Dashboard</span>
                              </Link>
                              <Link href="/admin/properties/previews" className="group flex items-center justify-between gap-3 rounded-2xl px-3 py-2.5 border border-transparent hover:border-white/10 hover:bg-white/5 transition">
                                <span className="flex items-center gap-3 min-w-0">
                                  <CheckCircle2 className="h-4 w-4 text-rose-200" aria-hidden />
                                  <span className="text-sm text-slate-100 truncate">Approvals</span>
                                </span>
                                <span className="text-[11px] font-semibold text-rose-200 rounded-full border border-rose-400/20 bg-rose-500/10 px-2 py-0.5">
                                  {monitoring ? monitoring.pendingApprovals : '—'}
                                </span>
                              </Link>
                              <Link href="/admin/payments" className="group flex items-center justify-between gap-3 rounded-2xl px-3 py-2.5 border border-transparent hover:border-white/10 hover:bg-white/5 transition">
                                <span className="flex items-center gap-3 min-w-0">
                                  <CreditCard className="h-4 w-4 text-fuchsia-200" aria-hidden />
                                  <span className="text-sm text-slate-100 truncate">Payments</span>
                                </span>
                                <span className="text-[11px] font-semibold text-fuchsia-200 rounded-full border border-fuchsia-400/20 bg-fuchsia-500/10 px-2 py-0.5">
                                  {paymentsWaiting ?? '—'}
                                </span>
                              </Link>
                              <Link href="/admin/bookings" className="group flex items-center justify-between gap-3 rounded-2xl px-3 py-2.5 border border-transparent hover:border-white/10 hover:bg-white/5 transition">
                                <span className="flex items-center gap-3 min-w-0">
                                  <CalendarDays className="h-4 w-4 text-indigo-200" aria-hidden />
                                  <span className="text-sm text-slate-100 truncate">Bookings</span>
                                </span>
                                <span className="text-[11px] font-semibold text-indigo-200 rounded-full border border-indigo-400/20 bg-indigo-500/10 px-2 py-0.5">
                                  {monitoring ? monitoring.bookings : '—'}
                                </span>
                              </Link>
                            </div>

                            <div className="mt-4 px-2 py-2 text-[11px] uppercase tracking-widest text-slate-400">People</div>
                            <div className="space-y-1">
                              <Link href="/admin/owners" className="group flex items-center gap-3 rounded-2xl px-3 py-2.5 border border-transparent hover:border-white/10 hover:bg-white/5 transition">
                                <Briefcase className="h-4 w-4 text-emerald-200" aria-hidden />
                                <span className="text-sm text-slate-100">Owners</span>
                              </Link>
                              <Link href="/admin/drivers" className="group flex items-center justify-between gap-3 rounded-2xl px-3 py-2.5 border border-transparent hover:border-white/10 hover:bg-white/5 transition">
                                <span className="flex items-center gap-3 min-w-0">
                                  <Truck className="h-4 w-4 text-amber-200" aria-hidden />
                                  <span className="text-sm text-slate-100 truncate">Drivers</span>
                                </span>
                                <span className="text-[11px] font-semibold text-amber-200 rounded-full border border-amber-400/20 bg-amber-500/10 px-2 py-0.5">
                                  {driversPending ?? '—'}
                                </span>
                              </Link>
                              <Link href="/admin/users" className="group flex items-center justify-between gap-3 rounded-2xl px-3 py-2.5 border border-transparent hover:border-white/10 hover:bg-white/5 transition">
                                <span className="flex items-center gap-3 min-w-0">
                                  <Users className="h-4 w-4 text-emerald-200" aria-hidden />
                                  <span className="text-sm text-slate-100 truncate">Users</span>
                                </span>
                                <span className="text-[11px] font-semibold text-emerald-200 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2 py-0.5">
                                  {usersNew ?? '—'}
                                </span>
                              </Link>
                            </div>

                            <div className="mt-4 px-2 py-2 text-[11px] uppercase tracking-widest text-slate-400">Tools</div>
                            <div className="space-y-1">
                              <Link href="/admin/messages" className="group flex items-center gap-3 rounded-2xl px-3 py-2.5 border border-transparent hover:border-white/10 hover:bg-white/5 transition">
                                <MessagesSquare className="h-4 w-4 text-violet-200" aria-hidden />
                                <span className="text-sm text-slate-100">Messages</span>
                              </Link>
                              <Link href="/admin/support" className="group flex items-center gap-3 rounded-2xl px-3 py-2.5 border border-transparent hover:border-white/10 hover:bg-white/5 transition">
                                <LifeBuoy className="h-4 w-4 text-cyan-200" aria-hidden />
                                <span className="text-sm text-slate-100">Support</span>
                              </Link>
                              <Link href="/admin/management/settings" className="group flex items-center gap-3 rounded-2xl px-3 py-2.5 border border-transparent hover:border-white/10 hover:bg-white/5 transition">
                                <Shield className="h-4 w-4 text-slate-200" aria-hidden />
                                <span className="text-sm text-slate-100">Security</span>
                              </Link>
                              <Link href="/admin/management/settings" className="group flex items-center gap-3 rounded-2xl px-3 py-2.5 border border-transparent hover:border-white/10 hover:bg-white/5 transition">
                                <SettingsIcon className="h-4 w-4 text-slate-200" aria-hidden />
                                <span className="text-sm text-slate-100">Settings</span>
                              </Link>
                            </div>
                          </nav>
                        </div>
                      </aside>

                      <main className="col-span-12 lg:col-span-9">
                        <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
                          <div>
                            <div className="text-xs text-slate-300">Welcome back • <ClientTime iso={nowIso} /></div>
                            <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-white">NoLSAF Admin Dashboard</h1>
                            <div className="mt-1 text-sm text-slate-300">A modern overview of approvals, payments, bookings, and revenue.</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => router.push('/admin/revenue')}
                              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-white/10 transition"
                            >
                              <BarChart2 className="h-4 w-4 text-sky-200" aria-hidden />
                              Revenue
                            </button>
                            <button
                              type="button"
                              onClick={() => router.push('/admin/properties/previews')}
                              className="inline-flex items-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-100 hover:bg-emerald-500/15 transition"
                            >
                              <CheckCircle2 className="h-4 w-4 text-emerald-200" aria-hidden />
                              Approvals
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-12 gap-6">
                          <section className="col-span-12 xl:col-span-8 rounded-3xl border border-white/10 bg-gradient-to-br from-white/7 via-white/5 to-white/2 backdrop-blur-xl shadow-[0_20px_80px_-55px_rgba(0,0,0,0.9)] overflow-hidden">
                            <div className="p-6 sm:p-7 relative">
                              <div className="absolute inset-0 opacity-70" aria-hidden style={{ background: 'radial-gradient(700px circle at 20% 15%, rgba(59,130,246,0.22), transparent 45%), radial-gradient(700px circle at 75% 30%, rgba(236,72,153,0.16), transparent 45%)' }} />
                              <div className="relative flex items-start justify-between gap-6 flex-wrap">
                                <div className="min-w-[240px]">
                                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-200">
                                    <Sparkles className="h-3.5 w-3.5 text-sky-200" aria-hidden />
                                    Control Center
                                  </div>
                                  <div className="mt-3 text-xl sm:text-2xl font-extrabold text-white">Today’s focus</div>
                                  <div className="mt-1 text-sm text-slate-300">Keep operations moving with fast approvals and clean payouts.</div>
                                  <div className="mt-4 grid grid-cols-2 gap-3">
                                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                                      <div className="text-xs text-slate-300">Revenue change</div>
                                      <div className="mt-1 text-2xl font-extrabold text-white">{revenueDelta ?? '0%'}</div>
                                    </div>
                                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                                      <div className="text-xs text-slate-300">Active sessions</div>
                                      <div className="mt-1 text-2xl font-extrabold text-white">{monitoring ? monitoring.activeSessions : '—'}</div>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex-1 min-w-[240px]">
                                  <div className="rounded-3xl border border-white/10 bg-[#050A18]/50 p-5">
                                    <div className="flex items-center justify-between">
                                      <div className="text-sm font-semibold text-slate-100">Revenue pulse</div>
                                      <div className="text-xs text-slate-400">Live series</div>
                                    </div>
                                    <div className="mt-3 flex items-end justify-between gap-3">
                                      <div>
                                        <div className="text-xs text-slate-400">Commission</div>
                                        <div className="mt-1 text-lg font-extrabold text-white">
                                          {chartData ? `Tsh ${chartData.datasets[0].data.reduce((s, v) => s + Number(v || 0), 0).toLocaleString()}` : '—'}
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <div className="text-xs text-slate-400">Subscription</div>
                                        <div className="mt-1 text-lg font-extrabold text-white">
                                          {chartData ? `Tsh ${chartData.datasets[1].data.reduce((s, v) => s + Number(v || 0), 0).toLocaleString()}` : '—'}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="mt-4 flex items-center justify-between gap-4">
                                      <div className="opacity-90">
                                        <MiniSparkline values={chartData?.datasets?.[0]?.data ?? []} stroke="rgba(56,189,248,0.95)" />
                                      </div>
                                      <div className="opacity-90">
                                        <MiniSparkline values={chartData?.datasets?.[1]?.data ?? []} stroke="rgba(34,197,94,0.95)" />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </section>

                          <section className="col-span-12 sm:col-span-6 xl:col-span-2 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-5 shadow-[0_18px_70px_-55px_rgba(0,0,0,0.85)]">
                            <div className="text-xs text-slate-300">Pending approvals</div>
                            <div className="mt-1 text-3xl font-extrabold text-white">{monitoring ? Math.round(pendingApprovalsAnimated).toLocaleString() : '—'}</div>
                            <div className="mt-3 text-xs text-slate-400">Review and approve listings</div>
                          </section>

                          <section className="col-span-12 sm:col-span-6 xl:col-span-2 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-5 shadow-[0_18px_70px_-55px_rgba(0,0,0,0.85)]">
                            <div className="text-xs text-slate-300">Payments waiting</div>
                            <div className="mt-1 text-3xl font-extrabold text-white">
                              {paymentsWaiting === null || paymentsWaiting === undefined ? '—' : Math.round(paymentsWaitingAnimated).toLocaleString()}
                            </div>
                            <div className="mt-3 text-xs text-slate-400">Payouts & settlements</div>
                          </section>

                          <section className="col-span-12 xl:col-span-7 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-[0_20px_80px_-60px_rgba(0,0,0,0.9)] overflow-hidden">
                            <div className="p-5 sm:p-6 border-b border-white/10 flex items-center justify-between gap-3 flex-wrap">
                              <div>
                                <div className="text-sm font-semibold text-white">Revenue analytics</div>
                                <div className="text-xs text-slate-400">Commission & subscription series</div>
                              </div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <div className="inline-flex rounded-2xl bg-white/5 p-1 border border-white/10">
                                  <button
                                    type="button"
                                    onClick={() => setRangeType('hours')}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${rangeType === 'hours' ? 'bg-white/10 border-white/10 text-white' : 'bg-transparent border-transparent text-slate-300 hover:bg-white/10 hover:border-white/10'}`}
                                  >
                                    Hours
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setRangeType('months')}
                                    className={`mx-1 px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${rangeType === 'months' ? 'bg-white/10 border-white/10 text-white' : 'bg-transparent border-transparent text-slate-300 hover:bg-white/10 hover:border-white/10'}`}
                                  >
                                    Months
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setRangeType('properties')}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${rangeType === 'properties' ? 'bg-white/10 border-white/10 text-white' : 'bg-transparent border-transparent text-slate-300 hover:bg-white/10 hover:border-white/10'}`}
                                  >
                                    Properties
                                  </button>
                                </div>

                                {rangeType === 'hours' && (
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
                                {rangeType === 'months' && (
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
                                  const totalCommission = commissionArr.reduce((s, v) => s + Number(v || 0), 0);
                                  const totalSubscription = subscriptionArr.reduce((s, v) => s + Number(v || 0), 0);
                                  const totalCombined = totalCommission + totalSubscription;
                                  const hasPoints = (chartData?.labels?.length || 0) > 0;
                                  return (
                                    <>
                                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                                        <div className="p-4 rounded-2xl border border-white/10 bg-white/5">
                                          <div className="text-xs text-slate-400 font-medium">Commission</div>
                                          <div className="mt-1 text-lg font-extrabold text-white">Tsh {totalCommission.toLocaleString()}</div>
                                        </div>
                                        <div className="p-4 rounded-2xl border border-white/10 bg-white/5">
                                          <div className="text-xs text-slate-400 font-medium">Subscription</div>
                                          <div className="mt-1 text-lg font-extrabold text-white">Tsh {totalSubscription.toLocaleString()}</div>
                                        </div>
                                        <div className="p-4 rounded-2xl border border-emerald-400/15 bg-emerald-500/10">
                                          <div className="text-xs text-emerald-200 font-semibold">Total revenue</div>
                                          <div className="mt-1 text-lg font-extrabold text-white">Tsh {totalCombined.toLocaleString()}</div>
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
                                              interaction: { mode: 'index', intersect: false },
                                              plugins: {
                                                legend: { labels: { color: 'rgba(226,232,240,0.9)' } },
                                              },
                                              scales: {
                                                y: {
                                                  grid: { color: 'rgba(255,255,255,0.06)' },
                                                  ticks: {
                                                    color: 'rgba(226,232,240,0.8)',
                                                    callback: (value: any) => {
                                                      try {
                                                        const n = Number(value);
                                                        return rangeType === 'properties' && !Number.isNaN(n) ? `Tsh ${n.toLocaleString()}` : String(value);
                                                      } catch {
                                                        return String(value);
                                                      }
                                                    },
                                                  },
                                                },
                                                x: {
                                                  grid: { color: 'rgba(255,255,255,0.04)' },
                                                  ticks: {
                                                    color: 'rgba(226,232,240,0.75)',
                                                    autoSkip: rangeType !== 'properties',
                                                    maxRotation: 45,
                                                    minRotation: 0,
                                                  },
                                                },
                                              },
                                            }}
                                          />
                                        ) : (
                                          <div className="h-full flex items-center justify-center text-sm text-slate-400">No revenue data for the selected range.</div>
                                        )}
                                      </div>
                                    </>
                                  );
                                })()
                              )}
                            </div>
                          </section>

                          <section className="col-span-12 xl:col-span-5 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-[0_20px_80px_-60px_rgba(0,0,0,0.9)] overflow-hidden">
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
                                      {Array.from({ length: 5 }).map((_, i) => (
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
                                    {recentActivities!.slice(0, 5).map((a: any) => {
                                      let detailsText = '';
                                      try {
                                        if (typeof a.details === 'string') {
                                          const parsed = JSON.parse(a.details);
                                          if (parsed && typeof parsed === 'object') {
                                            if ((parsed as any).propertyId) detailsText = `Property ${(parsed as any).propertyId} — ${(parsed as any).status ?? (parsed as any).result ?? ''}`;
                                            else if ((parsed as any).bookingId) detailsText = `Booking ${(parsed as any).bookingId} — ${(parsed as any).status ?? ''}`;
                                            else detailsText = Object.entries(parsed as any).map(([k, v]) => `${k}: ${v}`).join(', ');
                                          } else {
                                            detailsText = String(parsed);
                                          }
                                        } else if (a.details && typeof a.details === 'object') {
                                          const d = a.details;
                                          if (d.propertyId) detailsText = `Property ${d.propertyId} — ${d.status ?? d.result ?? ''}`;
                                          else if (d.bookingId) detailsText = `Booking ${d.bookingId} — ${d.status ?? ''}`;
                                          else detailsText = Object.entries(d).map(([k, v]) => `${k}: ${v}`).join(', ');
                                        } else {
                                          detailsText = String(a.details ?? '');
                                        }
                                      } catch {
                                        detailsText = String(a.details ?? '');
                                      }
                                      return (
                                        <li key={a.id ?? `${a.action}-${a.createdAt ?? ''}`} className="py-3 px-3">
                                          <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                              <div className="text-sm font-semibold text-white truncate">{String(a.action ?? 'Activity')}</div>
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
                                <div className="text-sm font-semibold text-white">Quick navigation</div>
                                <div className="text-xs text-slate-400">Tap a card for deep sections</div>
                              </div>
                            </div>
                            <div
                              className="p-5 sm:p-6 grid grid-cols-12 gap-4"
                              ref={(node) => {
                                if (!node) return;
                                if (tilesInView) return;
                                if (typeof window === 'undefined') return;
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
                                gradient="from-rose-500 to-amber-300"
                                iconWrap="bg-rose-500/10 border-rose-400/20 text-rose-100"
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
                                gradient="from-fuchsia-500 to-pink-300"
                                iconWrap="bg-fuchsia-500/10 border-fuchsia-400/20 text-fuchsia-100"
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
                                gradient="from-indigo-500 to-sky-300"
                                iconWrap="bg-indigo-500/10 border-indigo-400/20 text-indigo-100"
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
                                gradient="from-sky-500 to-cyan-300"
                                iconWrap="bg-sky-500/10 border-sky-400/20 text-sky-100"
                                className="col-span-12 sm:col-span-6 lg:col-span-3"
                                index={3}
                              />

                              <NavTile
                                href="/admin/properties"
                                title="Properties"
                                description="Manage listings"
                                icon={Building2}
                                gradient="from-emerald-500 to-emerald-300"
                                iconWrap="bg-emerald-500/10 border-emerald-400/20 text-emerald-100"
                                className="col-span-12 sm:col-span-6 lg:col-span-3"
                                index={4}
                              />

                              <NavTile
                                href="/admin/analytics"
                                title="Analytics"
                                description="Trends & performance"
                                icon={LineChart}
                                gradient="from-slate-400 to-slate-200"
                                iconWrap="bg-white/5 border-white/10 text-slate-100"
                                className="col-span-12 sm:col-span-6 lg:col-span-3"
                                index={5}
                              />

                              <NavTile
                                href="/admin/messages"
                                title="Messages"
                                description="Inbox & communication"
                                icon={MessagesSquare}
                                gradient="from-violet-600 to-fuchsia-300"
                                iconWrap="bg-violet-500/10 border-violet-400/20 text-violet-100"
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

*/
