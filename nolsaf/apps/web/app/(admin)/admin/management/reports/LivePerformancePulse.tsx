"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, Building2, CalendarCheck, RefreshCw, TrendingUp, Wallet } from "lucide-react";
import apiClient from "@/lib/apiClient";

type SeriesResponse = { labels: string[]; data: number[] };
type OverviewResponse = {
  propertiesCount?: number;
  ownerPayouts?: number;
  companyRevenue?: number;
  /** Tour commission, reported separately in its own currency (USD). */
  companyRevenueTour?: number;
  companyRevenueTourCurrency?: string;
  lastUpdated?: string;
};
type SummaryResponse = {
  activeSessions?: number;
  pendingApprovals?: number;
  bookings?: number;
};
type Point = { label: string; value: number; x: number; y: number };

function smoothPath(pts: Array<{ x: number; y: number }>) {
  if (pts.length < 2) return "";
  let d = `M ${pts[0]!.x.toFixed(2)} ${pts[0]!.y.toFixed(2)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)]!;
    const p1 = pts[i]!;
    const p2 = pts[i + 1]!;
    const p3 = pts[Math.min(pts.length - 1, i + 2)]!;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)},${cp2x.toFixed(2)} ${cp2y.toFixed(2)},${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return d;
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function toNumber(value: unknown) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat().format(value);
}

function formatShortDate(label: string) {
  const date = new Date(label);
  if (Number.isNaN(date.getTime())) return label;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function LivePerformancePulse() {
  const [series, setSeries] = useState<SeriesResponse>({ labels: [], data: [] });
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const range = useMemo(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - 29);
    return { from: isoDate(from), to: isoDate(to) };
  }, []);

  async function load(quiet = false) {
    if (quiet) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const [seriesRes, overviewRes, summaryRes] = await Promise.all([
        apiClient.get(`/api/admin/stats/revenue-series?from=${range.from}&to=${range.to}`),
        apiClient.get("/api/admin/stats/overview"),
        apiClient.get("/api/admin/summary"),
      ]);

      setSeries({
        labels: Array.isArray(seriesRes.data?.labels) ? seriesRes.data.labels : [],
        data: Array.isArray(seriesRes.data?.data) ? seriesRes.data.data.map(toNumber) : [],
      });
      setOverview(overviewRes.data ?? null);
      setSummary(summaryRes.data ?? null);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.response?.data?.error || err?.message || "Unable to load live performance data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
    const id = window.setInterval(() => load(true), 60_000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const chart = useMemo(() => {
    const labels = series.labels.slice(-30);
    const values = series.data.slice(-30);
    const items = labels.map((label, index) => ({ label, value: toNumber(values[index]) }));
    const W = 900;
    const H = 260;
    const padL = 52;
    const padR = 24;
    const padT = 24;
    const padB = 44;
    const max = Math.max(1, ...items.map((item) => item.value));
    const toX = (i: number) => padL + (i / Math.max(1, items.length - 1)) * (W - padL - padR);
    const toY = (v: number) => H - padB - (v / max) * (H - padT - padB);
    const points: Point[] = items.map((item, i) => ({ ...item, x: toX(i), y: toY(item.value) }));
    const linePath = smoothPath(points);
    const latest = points[points.length - 1] ?? null;
    const areaPath = latest && points[0] ? `${linePath} L ${latest.x.toFixed(2)} ${(H - padB).toFixed(2)} L ${points[0].x.toFixed(2)} ${(H - padB).toFixed(2)} Z` : "";
    const yGrid = [0.25, 0.5, 0.75, 1].map((p) => Math.round(max * p));
    return { W, H, padL, padR, padB, points, latest, linePath, areaPath, yGrid, toY };
  }, [series]);

  const totalRevenue = series.data.reduce((sum, value) => sum + toNumber(value), 0);
  const latestRevenue = chart.latest?.value ?? 0;
  const previousRevenue = chart.points.length > 1 ? chart.points[chart.points.length - 2]!.value : 0;
  const revenueChange = previousRevenue > 0 ? ((latestRevenue - previousRevenue) / previousRevenue) * 100 : 0;
  const lastUpdated = overview?.lastUpdated ? new Date(overview.lastUpdated) : null;

  return (
    <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_18px_60px_-36px_rgba(15,23,42,0.35)]">
      <div className="flex flex-col gap-5 border-b border-slate-200 px-6 py-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.28em] text-slate-400">Live Performance</div>
          <div className="mt-1.5 text-lg font-black text-slate-950">Revenue and operations pulse</div>
          <div className="mt-1 text-sm text-slate-500">
            Company revenue trend, booking movement, pending approvals, and active sessions.
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
            <TrendingUp className="h-3.5 w-3.5" aria-hidden />
            {previousRevenue > 0 ? `${revenueChange >= 0 ? "+" : ""}${revenueChange.toFixed(1)}% vs yesterday` : "Live data"}
          </div>
          <button
            type="button"
            onClick={() => load(true)}
            disabled={refreshing}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} aria-hidden />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid gap-0 lg:grid-cols-[1fr_18rem]">
        <div className="min-w-0 px-4 py-4 sm:px-5">
          {error ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
              {error}
            </div>
          ) : null}

          <svg viewBox={`0 0 ${chart.W} ${chart.H}`} className="w-full" style={{ height: 260 }} role="img" aria-label="Live company revenue trend">
            <defs>
              <linearGradient id="live-revenue-line" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#0284c7" />
                <stop offset="55%" stopColor="#02665e" />
                <stop offset="100%" stopColor="#059669" />
              </linearGradient>
              <linearGradient id="live-revenue-area" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(2,102,94,0.20)" />
                <stop offset="85%" stopColor="rgba(2,102,94,0.03)" />
                <stop offset="100%" stopColor="rgba(2,102,94,0)" />
              </linearGradient>
            </defs>

            {chart.yGrid.map((v, index) => {
              const y = chart.toY(v);
              return (
                <g key={`y-grid-${index}-${v}`}>
                  <line x1={chart.padL} x2={chart.W - chart.padR} y1={y} y2={y} stroke="rgba(100,116,139,0.16)" strokeDasharray="5 10" />
                  <text x={chart.padL - 10} y={y + 4} textAnchor="end" fill="rgba(100,116,139,0.70)" fontSize="11" fontFamily="ui-sans-serif,system-ui,sans-serif">
                    {formatMoney(v)}
                  </text>
                </g>
              );
            })}

            {chart.points.map((pt, index) => {
              const show = index === 0 || index === chart.points.length - 1 || index % 5 === 0;
              if (!show) return null;
              return (
                <text key={pt.label} x={pt.x} y={chart.H - 12} textAnchor="middle" fill="rgba(100,116,139,0.72)" fontSize="11" fontFamily="ui-sans-serif,system-ui,sans-serif">
                  {formatShortDate(pt.label)}
                </text>
              );
            })}

            {chart.areaPath ? <path d={chart.areaPath} fill="url(#live-revenue-area)" /> : null}
            {chart.linePath ? <path d={chart.linePath} fill="none" stroke="url(#live-revenue-line)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /> : null}

            {chart.points.map((pt, i) => {
              const isLatest = i === chart.points.length - 1;
              return (
                <circle
                  key={`${pt.label}-${i}`}
                  cx={pt.x}
                  cy={pt.y}
                  r={isLatest ? 5 : 3}
                  fill={isLatest ? "#02665e" : "#ffffff"}
                  stroke={isLatest ? "#99f6e4" : "rgba(2,102,94,0.35)"}
                  strokeWidth="2"
                />
              );
            })}
          </svg>

          <div className="flex flex-wrap items-center gap-4 border-t border-slate-100 px-1 pt-4 text-xs text-slate-500">
            <span>{range.from} to {range.to}</span>
            <span>Total revenue: <strong className="font-bold text-slate-800">{formatMoney(totalRevenue)} TZS</strong></span>
            {lastUpdated ? <span>Updated {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span> : null}
          </div>
        </div>

        <div className="grid border-t border-slate-200 bg-slate-50/70 lg:border-l lg:border-t-0">
          <PulseKpi icon={Wallet} label="Company revenue (TZS)" value={`${formatMoney(toNumber(overview?.companyRevenue))} TZS`} helper="Property + transport commission" />
          <PulseKpi icon={TrendingUp} label={`Tour commission (${overview?.companyRevenueTourCurrency || "USD"})`} value={`${overview?.companyRevenueTourCurrency || "USD"} ${formatMoney(toNumber(overview?.companyRevenueTour))}`} helper="USD. Reported separately, never summed with TZS" />
          <PulseKpi icon={CalendarCheck} label="Bookings 24h" value={formatNumber(toNumber(summary?.bookings))} helper="Real booking movement" />
          <PulseKpi icon={Building2} label="Pending approvals" value={formatNumber(toNumber(summary?.pendingApprovals))} helper="Owner/property workload" />
          <PulseKpi icon={Activity} label="Active sessions" value={formatNumber(toNumber(summary?.activeSessions))} helper="Last active window" />
        </div>
      </div>

      {loading ? (
        <div className="border-t border-slate-200 bg-white px-6 py-3 text-xs font-medium text-slate-500">
          Loading live performance data...
        </div>
      ) : null}
    </div>
  );
}

function PulseKpi({
  icon: Icon,
  label,
  value,
  helper,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="border-b border-slate-200 px-5 py-4 last:border-b-0">
      <div className="flex items-start gap-3">
        <div className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg border border-slate-200 bg-white text-[#02665e]">
          <Icon className="h-4 w-4" aria-hidden />
        </div>
        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">{label}</div>
          <div className="mt-1 text-base font-black text-slate-950">{value}</div>
          <div className="mt-0.5 text-xs text-slate-500">{helper}</div>
        </div>
      </div>
    </div>
  );
}
