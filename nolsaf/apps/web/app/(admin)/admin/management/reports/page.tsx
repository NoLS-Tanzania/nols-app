import Link from "next/link";
import { ArrowRight, BarChart3, Calendar, FileText, TrendingUp, Wallet } from "lucide-react";
import type { ComponentType, SVGProps } from "react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Smooth catmull-rom → cubic bezier
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

function PerformanceChart() {
  const series = [
    { label: "Apr", value: 42 },
    { label: "May", value: 47 },
    { label: "Jun", value: 45 },
    { label: "Jul", value: 54 },
    { label: "Aug", value: 58 },
    { label: "Sep", value: 61 },
    { label: "Oct", value: 59 },
    { label: "Nov", value: 67 },
    { label: "Dec", value: 72 },
    { label: "Jan", value: 75 },
    { label: "Feb", value: 79 },
    { label: "Mar", value: 86 },
  ];

  const W = 900;
  const H = 260;
  const padL = 48;
  const padR = 24;
  const padT = 24;
  const padB = 44;
  const dataMin = 32;
  const dataMax = 96;

  const toX = (i: number) => padL + (i / (series.length - 1)) * (W - padL - padR);
  const toY = (v: number) => H - padB - ((v - dataMin) / (dataMax - dataMin)) * (H - padT - padB);

  const points = series.map((item, i) => ({ ...item, x: toX(i), y: toY(item.value) }));
  const linePath = smoothPath(points);
  const latest = points[points.length - 1]!;
  const areaPath = `${linePath} L ${latest.x.toFixed(2)} ${(H - padB).toFixed(2)} L ${points[0]!.x.toFixed(2)} ${(H - padB).toFixed(2)} Z`;
  const yGrid = [40, 52, 64, 76, 88];

  return (
    <div className="overflow-hidden rounded-[28px] border border-[#111827]/10 bg-[linear-gradient(170deg,#0c1a2e_0%,#0a2236_52%,#0b1d2d_100%)] shadow-[0_32px_100px_-44px_rgba(5,12,26,0.55)]">
      {/* Chart header */}
      <div className="flex items-start justify-between gap-4 px-7 pt-6 sm:px-8">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/40">General Performance</div>
          <div className="mt-1.5 text-base font-bold text-white">NoLSAF blended performance index</div>
          <div className="mt-1 text-xs text-slate-400">
            Revenue efficiency · Booking movement · Operational throughput · Apr&nbsp;2025–Mar&nbsp;2026
          </div>
        </div>
        <div className="inline-flex shrink-0 items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/[0.12] px-4 py-2 text-xs font-bold text-emerald-200">
          <TrendingUp className="h-3.5 w-3.5" aria-hidden />
          +104.8% this cycle
        </div>
      </div>

      {/* SVG chart */}
      <div className="px-5 pb-2 pt-4 sm:px-6">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          style={{ height: 260 }}
          role="img"
          aria-label="NoLSAF 12-month platform performance index"
        >
          <defs>
            <linearGradient id="p-line" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#67e8f9" />
              <stop offset="48%" stopColor="#2dd4bf" />
              <stop offset="100%" stopColor="#34d399" />
            </linearGradient>
            <linearGradient id="p-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(45,212,191,0.26)" />
              <stop offset="82%" stopColor="rgba(45,212,191,0.03)" />
              <stop offset="100%" stopColor="rgba(45,212,191,0)" />
            </linearGradient>
            <filter id="p-glow" x="-10%" y="-80%" width="120%" height="260%">
              <feGaussianBlur stdDeviation="4.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {yGrid.map((v) => {
            const y = toY(v);
            return (
              <g key={v}>
                <line x1={padL} x2={W - padR} y1={y} y2={y} stroke="rgba(255,255,255,0.07)" strokeDasharray="5 11" />
                <text x={padL - 10} y={y + 4} textAnchor="end" fill="rgba(203,213,225,0.42)" fontSize="11" fontFamily="ui-sans-serif,system-ui,sans-serif">
                  {v}
                </text>
              </g>
            );
          })}

          {points.map((pt) => (
            <text
              key={pt.label}
              x={pt.x}
              y={H - 12}
              textAnchor="middle"
              fill="rgba(203,213,225,0.50)"
              fontSize="11"
              fontFamily="ui-sans-serif,system-ui,sans-serif"
            >
              {pt.label}
            </text>
          ))}

          <path d={areaPath} fill="url(#p-area)" />
          <path
            d={linePath}
            fill="none"
            stroke="url(#p-line)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#p-glow)"
          />

          {points.map((pt, i) => (
            <circle
              key={i}
              cx={pt.x}
              cy={pt.y}
              r={i === points.length - 1 ? 5.5 : 3.5}
              fill={i === points.length - 1 ? "#2dd4bf" : "#0c1a2c"}
              stroke={i === points.length - 1 ? "#99f6e4" : "rgba(103,232,249,0.45)"}
              strokeWidth="2"
            />
          ))}

          <rect
            x={latest.x - 44}
            y={latest.y - 52}
            width="88"
            height="28"
            rx="14"
            fill="rgba(10,18,30,0.95)"
            stroke="rgba(103,232,249,0.28)"
            strokeWidth="1.5"
          />
          <text
            x={latest.x}
            y={latest.y - 33}
            textAnchor="middle"
            fill="#ecfeff"
            fontSize="11"
            fontWeight="700"
            fontFamily="ui-sans-serif,system-ui,sans-serif"
          >
            Score: {latest.value} ↑
          </text>
        </svg>
      </div>

      {/* Chart legend */}
      <div className="flex flex-wrap items-center gap-5 border-t border-white/[0.07] px-7 py-4 text-xs text-slate-400 sm:px-8">
        {[
          { label: "Revenue efficiency",     opacity: "opacity-100" },
          { label: "Booking movement",        opacity: "opacity-70"  },
          { label: "Operational throughput",  opacity: "opacity-40"  },
        ].map((item) => (
          <span key={item.label} className="inline-flex items-center gap-2">
            <span className={`h-[3px] w-8 rounded-full bg-gradient-to-r from-cyan-300 to-emerald-300 ${item.opacity}`} />
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function Card({
  href,
  title,
  description,
  eyebrow,
  meta,
  Icon,
}: {
  href: string;
  title: string;
  description: string;
  eyebrow: string;
  meta: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-5 rounded-[24px] border border-slate-200 bg-white p-6 no-underline shadow-[0_2px_16px_-6px_rgba(15,23,42,0.10)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#02665e]/25 hover:shadow-[0_8px_32px_-8px_rgba(2,102,94,0.16)]"
    >
      <div className="flex items-center justify-between">
        <span className="grid h-12 w-12 place-items-center rounded-[18px] border border-slate-100 bg-slate-50">
          <Icon className="h-5 w-5 text-[#02665e]" aria-hidden />
        </span>
        <span className="text-[10px] font-bold uppercase tracking-[0.26em] text-slate-400">{eyebrow}</span>
      </div>

      <div>
        <div className="text-[15px] font-bold text-slate-900">{title}</div>
        <div className="mt-1.5 text-sm leading-6 text-slate-500">{description}</div>
      </div>

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <div className="text-[11px] text-slate-400">{meta}</div>
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#02665e] transition-transform duration-200 group-hover:translate-x-0.5">
          Open
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </span>
      </div>
    </Link>
  );
}

export default function ManagementReportsHubPage() {
  return (
    <div className="page-content bg-[#f4f5f6]">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="py-8 sm:py-10 space-y-6">

          {/* Page header */}
          <div className="flex items-center gap-4">
            <div className="grid h-11 w-11 place-items-center rounded-[16px] border border-slate-200 bg-white shadow-sm">
              <FileText className="h-5 w-5 text-[#02665e]" aria-hidden />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.28em] text-slate-400">Admin · Management</div>
              <h1 className="mt-0.5 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">Management Reports</h1>
            </div>
            <p className="ml-auto hidden max-w-xs text-sm leading-6 text-slate-500 lg:block">
              Performance overview, then the right report lane for the detail.
            </p>
          </div>

          {/* KPI strip */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {([
              { label: "12-Month Growth", value: "+104.8%", sub: "blended platform index",     color: "#059669" },
              { label: "Current Score",   value: "86",       sub: "highest point this cycle",   color: "#0284c7" },
              { label: "Report Lanes",    value: "3",        sub: "overview · revenue · bookings", color: "#7c3aed" },
              { label: "Period",          value: "12 mo",    sub: "Apr 2025 – Mar 2026",         color: "#b45309" },
            ] as const).map((kpi) => (
              <div key={kpi.label} className="rounded-[20px] border border-slate-200 bg-white px-5 py-4 shadow-[0_1px_8px_-2px_rgba(15,23,42,0.08)]">
                <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">{kpi.label}</div>
                <div className="mt-2 text-xl font-black tracking-tight sm:text-2xl" style={{ color: kpi.color }}>{kpi.value}</div>
                <div className="mt-0.5 text-[11px] text-slate-400">{kpi.sub}</div>
              </div>
            ))}
          </div>

          {/* Performance chart */}
          <PerformanceChart />

          {/* Report lane cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card
              href="/admin/management/reports/overview"
              title="Overview"
              eyebrow="Start Here"
              meta="Scope · Entry points · Quick links"
              description="Open this first when you want the reporting map before drilling into any specific export or management question."
              Icon={BarChart3}
            />
            <Card
              href="/admin/management/reports/revenue"
              title="Revenue"
              eyebrow="Finance"
              meta="Commission · Subscriptions · Platform revenue"
              description="Follow money movement across the platform with a dedicated finance lane for summaries and exports."
              Icon={Wallet}
            />
            <Card
              href="/admin/management/reports/bookings"
              title="Bookings"
              eyebrow="Operations"
              meta="Single bookings · Group stays · Plan With Us"
              description="Investigate booking flow, activity volume, and management follow-up without mixing in finance noise."
              Icon={Calendar}
            />
          </div>

        </div>
      </div>
    </div>
  );
}
