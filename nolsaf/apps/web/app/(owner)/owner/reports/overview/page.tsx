"use client";
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import ReportsFilter, { ReportsFilters } from "@/components/ReportsFilter";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, BarChart3, BedDouble, CalendarDays, Coins, TrendingUp } from "lucide-react";

// Use same-origin requests to leverage Next.js rewrites and avoid CORS
const api = axios.create({ baseURL: "", withCredentials: true });

export default function Overview() {
  const [filters, setFilters] = useState<ReportsFilters | null>(null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!filters) return;
    let mounted = true;
    setLoading(true);
    setError(null);
    api
      .get("/api/owner/reports/overview", { params: filters })
      .then((r) => {
        if (!mounted) return;
        setData(r.data);
      })
      .catch((e: any) => {
        if (!mounted) return;
        setData(null);
        setError(e?.response?.data?.error ?? e?.message ?? "Failed to load reports overview");
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [filters]);

  const series = useMemo(() => {
    const s = Array.isArray(data?.series) ? data.series : [];
    return s.map((p: any) => ({
      key: String(p.key ?? ""),
      gross: Number(p.gross ?? 0),
      net: Number(p.net ?? 0),
      bookings: Number(p.bookings ?? 0),
    }));
  }, [data]);

  const status = useMemo(() => {
    const s = Array.isArray(data?.status) ? data.status : [];
    return s
      .map((p: any) => ({ status: String(p.status ?? ""), count: Number(p.count ?? 0) }))
      .sort((a: any, b: any) => b.count - a.count);
  }, [data]);

  const topProperties = useMemo(() => {
    const s = Array.isArray(data?.topProperties) ? data.topProperties : [];
    return s.map((p: any) => ({
      propertyId: Number(p.propertyId ?? 0),
      title: String(p.title ?? ""),
      net: Number(p.net ?? 0),
    }));
  }, [data]);

  const maxTopNet = useMemo(() => {
    return topProperties.reduce((m: number, p: any) => Math.max(m, Number(p.net ?? 0)), 0) || 1;
  }, [topProperties]);

  return (
    <div className="space-y-6">
      <ReportsFilter onChange={setFilters} />

      {error ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 mt-0.5" aria-hidden />
          <div className="min-w-0">
            <div className="font-semibold">Couldn’t load reports</div>
            <div className="text-amber-800/90 break-words">{error}</div>
          </div>
        </div>
      ) : null}

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        <Kpi icon={Coins} title="Gross Revenue" value={data ? `TZS ${fmt(data.kpis.gross)}` : "—"} loading={loading} accent="text-emerald-700" />
        <Kpi icon={TrendingUp} title="Net Revenue" value={data ? `TZS ${fmt(data.kpis.net)}` : "—"} loading={loading} accent="text-emerald-700" />
        <Kpi icon={BarChart3} title="Bookings" value={data ? String(data.kpis.bookings) : "—"} loading={loading} />
        <Kpi icon={BedDouble} title="Nights" value={data ? String(data.kpis.nights) : "—"} loading={loading} />
        <Kpi icon={CalendarDays} title="ADR" value={data ? `TZS ${fmt(data.kpis.adr)}` : "—"} loading={loading} />
        <Kpi icon={BarChart3} title="Occupancy (est.)" value="—" loading={loading} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200">
            <div className="text-sm font-semibold text-gray-900">Revenue & Net Trend</div>
            <div className="text-xs text-gray-500 mt-0.5">How gross and net change over the selected period</div>
          </div>
          <div className="p-4">
            <div className="h-72">
              <ResponsiveContainer>
                <AreaChart data={series} margin={{ left: 8, right: 16, top: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="grossFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.03} />
                    </linearGradient>
                    <linearGradient id="netFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0.03} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                  <XAxis dataKey="key" tick={{ fill: "#6b7280", fontSize: 12 }} axisLine={{ stroke: "#e5e7eb" }} tickLine={false} />
                  <YAxis
                    tick={{ fill: "#6b7280", fontSize: 12 }}
                    axisLine={{ stroke: "#e5e7eb" }}
                    tickLine={false}
                    tickFormatter={fmtCompact}
                  />
                  <Tooltip content={<MoneyTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Area type="monotone" dataKey="gross" name="Gross" stroke="#10b981" strokeWidth={2} fill="url(#grossFill)" />
                  <Area type="monotone" dataKey="net" name="Net" stroke="#2563eb" strokeWidth={2} fill="url(#netFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200">
            <div className="text-sm font-semibold text-gray-900">Bookings by Status</div>
            <div className="text-xs text-gray-500 mt-0.5">Status distribution for the selected period</div>
          </div>
          <div className="p-4">
            <div className="h-72">
              <ResponsiveContainer>
                <BarChart data={status} margin={{ left: 8, right: 10, top: 10, bottom: 10 }}>
                  <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                  <XAxis dataKey="status" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={{ stroke: "#e5e7eb" }} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fill: "#6b7280", fontSize: 12 }} axisLine={{ stroke: "#e5e7eb" }} tickLine={false} />
                  <Tooltip content={<CountTooltip />} />
                  <Bar dataKey="count" name="Count" radius={[8, 8, 0, 0]}>
                    {status.map((entry: any, idx: number) => (
                      <Cell
                        key={`cell-${entry.status ?? idx}`}
                        fill={getStatusColor(String(entry.status ?? ""))}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Top properties */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200">
          <div className="text-sm font-semibold text-gray-900">Top Properties</div>
          <div className="text-xs text-gray-500 mt-0.5">Highest net revenue within this range</div>
        </div>
        <div className="p-4">
          {topProperties.length === 0 ? (
            <div className="text-sm text-gray-600">No data for the selected filters.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {topProperties.map((p: any) => {
                const pct = Math.max(0, Math.min(100, (p.net / maxTopNet) * 100));
                return (
                  <div key={p.propertyId} className="rounded-lg border border-gray-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-gray-900 truncate">{p.title}</div>
                        <div className="text-xs text-gray-500 mt-0.5">Net</div>
                      </div>
                      <div className="text-sm font-bold text-emerald-700 whitespace-nowrap">TZS {fmt(p.net)}</div>
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function getStatusColor(status: string): string {
  // Brand-aligned palette (teal/green/amber/red/purple) to avoid a "uniform" look.
  switch (status) {
    case "NEW":
      return "#02665e"; // brand
    case "CONFIRMED":
      return "#0d9488"; // teal
    case "CHECKED_IN":
      return "#16a34a"; // green
    case "CHECKED_OUT":
      return "#f59e0b"; // amber
    case "CANCELED":
      return "#ef4444"; // red
    default:
      return "#64748b"; // slate
  }
}

function Kpi({
  icon: Icon,
  title,
  value,
  loading,
  accent,
}: {
  icon: any;
  title: string;
  value: string;
  loading: boolean;
  accent?: string;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
      <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
        <span className="inline-flex items-center justify-center h-8 w-8 rounded-md bg-gray-50 border border-gray-200">
          <Icon className="h-4 w-4 text-gray-600" aria-hidden />
        </span>
        {title}
      </div>
      <div className={"mt-2 text-xl font-bold text-gray-900 " + (accent ?? "")}>{loading ? <Skeleton widthClass="w-28" /> : value}</div>
    </div>
  );
}

function Skeleton({ widthClass }: { widthClass: string }) {
  return <div className={"h-6 rounded-md bg-gray-200/70 animate-pulse " + widthClass} />;
}

function fmt(n: number) {
  const num = Number(n);
  if (!Number.isFinite(num)) return "0";
  return Math.round(num).toLocaleString();
}

function fmtCompact(v: any) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "0";
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return `${Math.round(n)}`;
}

function MoneyTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const items = payload
    .filter((p: any) => p?.dataKey === "gross" || p?.dataKey === "net")
    .map((p: any) => ({
      name: p.name,
      value: p.value,
      color: p.color,
    }));

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-lg px-3 py-2">
      <div className="text-xs font-semibold text-gray-700">{label}</div>
      <div className="mt-1 space-y-1">
        {items.map((it: any) => (
          <div key={it.name} className="flex items-center justify-between gap-6 text-xs">
            <span className="inline-flex items-center gap-2 text-gray-600">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: it.color }} />
              {it.name}
            </span>
            <span className="font-semibold text-gray-900">TZS {fmt(it.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CountTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const v = payload?.[0]?.value;
  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-lg px-3 py-2">
      <div className="text-xs font-semibold text-gray-700">{label}</div>
      <div className="mt-1 text-xs text-gray-600">
        Count: <span className="font-semibold text-gray-900">{Number(v ?? 0)}</span>
      </div>
    </div>
  );
}
