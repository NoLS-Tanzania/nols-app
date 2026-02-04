"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Building2, LineChart, FileText, MessageCircle, CalendarCheck, Eye } from "lucide-react";
import axios from "axios";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// Use same-origin requests to leverage Next.js rewrites and avoid CORS
const api = axios.create({ baseURL: "", withCredentials: true });

function readOwnerName(): string | null {
  if (typeof window === "undefined") return null;
  // Try several common localStorage keys that might store the owner's name
  const tryKeys = ["ownerName", "name", "fullName", "displayName", "userName", "user"];
  for (const k of tryKeys) {
    try {
      const v = localStorage.getItem(k);
      if (!v) continue;
      // if value looks like JSON, attempt to parse and extract a name field
      if (v.trim().startsWith("{") || v.trim().startsWith("[")) {
        try {
          const obj = JSON.parse(v);
          if (obj?.name) return String(obj.name);
          if (obj?.fullName) return String(obj.fullName);
          if (obj?.displayName) return String(obj.displayName);
          if (obj?.firstName || obj?.lastName) return `${obj.firstName ?? ""} ${obj.lastName ?? ""}`.trim();
        } catch (e) {
          // ignore parse error
        }
      } else {
        return v;
      }
    } catch (e) {
      // ignore
    }
  }
  return null;
}

export default function OwnerPage() {
  const [ownerName, setOwnerName] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [overview, setOverview] = useState<any>(null);
  const [loadingOverview, setLoadingOverview] = useState(false);

  useEffect(() => {
    const n = readOwnerName();
    if (n) setOwnerName(n);
  }, []);

  useEffect(() => {
    let mounted = true;
    const now = new Date();
    const from = new Date(now);
    from.setDate(now.getDate() - 13);

    setLoadingOverview(true);
    api
      .get("/api/owner/reports/overview", {
        params: {
          from: from.toISOString(),
          to: now.toISOString(),
          groupBy: "day",
        },
      })
      .then((r) => {
        if (!mounted) return;
        setOverview(r.data);
      })
      .catch(() => {
        if (!mounted) return;
        setOverview(null);
      })
      .finally(() => {
        if (!mounted) return;
        setLoadingOverview(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const id = window.requestAnimationFrame(() => setMounted(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  const series = useMemo(() => {
    const s = Array.isArray(overview?.series) ? overview.series : [];
    return s.map((p: any) => ({
      key: String(p.key ?? ""),
      gross: Number(p.gross ?? 0),
      net: Number(p.net ?? 0),
      bookings: Number(p.bookings ?? 0),
    }));
  }, [overview]);

  const kpis = useMemo(() => {
    const k = overview?.kpis;
    return {
      bookings: Number(k?.bookings ?? 0),
      net: Number(k?.net ?? 0),
    };
  }, [overview]);

  const fmtTZS = (n: number) => {
    const num = Number(n || 0);
    return num.toLocaleString(undefined, { maximumFractionDigits: 0 });
  };

  return (
    <div className="w-full">
      <div className="w-full space-y-6">
        {/* Premium hero wrapper */}
        <section
          aria-label="Dashboard hero"
          className={[
            "relative",
            "transition-all duration-700 ease-out",
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2",
          ].join(" ")}
        >
          {/* Premium gradient border */}
          <div className="rounded-3xl bg-gradient-to-r from-emerald-200/60 via-sky-200/50 to-teal-200/60 p-px shadow-[0_22px_70px_rgba(2,6,23,0.08)]">
            <div className="relative overflow-hidden rounded-3xl bg-white/75 backdrop-blur-md">
              {/* Soft glow */}
              <div className="absolute inset-x-0 -top-20 h-48 bg-gradient-to-r from-emerald-300/25 via-sky-300/20 to-teal-300/25 blur-3xl" aria-hidden />
              <div className="absolute -left-24 top-8 h-48 w-48 rounded-full bg-emerald-300/15 blur-3xl" aria-hidden />
              <div className="absolute -right-24 top-10 h-48 w-48 rounded-full bg-sky-300/15 blur-3xl" aria-hidden />

              <div className="relative px-6 py-7 sm:px-8 sm:py-8">
                <div className="mx-auto max-w-3xl text-center">
                  {ownerName && (
                    <div className="text-sm font-medium text-[#02665e]">Welcome back, {ownerName}</div>
                  )}
                  <h1 className="mt-1 text-3xl md:text-4xl font-extrabold tracking-tight">
                    <span className="bg-gradient-to-r from-[#02665e] to-teal-400 bg-clip-text text-transparent">
                      Your workspace
                    </span>
                  </h1>
                  <p className="mt-2 text-sm md:text-base text-slate-600">
                    Bookings, revenue, and insights — all in one place.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Soft premium quick-stats row */}
        <div
          className={[
            "grid grid-cols-1 sm:grid-cols-2 gap-4",
            "transition-all duration-700 ease-out delay-75",
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2",
          ].join(" ")}
        >
          <div className="group relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white/70 backdrop-blur-sm p-5 shadow-[0_10px_40px_rgba(2,6,23,0.05)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_60px_rgba(2,6,23,0.08)]">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-500/30 to-transparent" aria-hidden />
            <div className="flex items-center gap-4">
              <div className="h-11 w-11 rounded-2xl bg-gradient-to-b from-sky-50 to-white ring-1 ring-slate-200/70 flex items-center justify-center shadow-sm">
                <LineChart className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-500">Bookings</div>
                <div className="mt-1 text-xl font-semibold text-slate-900">{loadingOverview ? "…" : String(kpis.bookings || 0)}</div>
              </div>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white/70 backdrop-blur-sm p-5 shadow-[0_10px_40px_rgba(2,6,23,0.05)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_60px_rgba(2,6,23,0.08)]">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/25 to-transparent" aria-hidden />
            <div className="flex items-center gap-4">
              <div className="h-11 w-11 rounded-2xl bg-gradient-to-b from-emerald-50 to-white ring-1 ring-slate-200/70 flex items-center justify-center shadow-sm">
                <FileText className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-500">Net revenue</div>
                <div className="mt-1 text-xl font-semibold text-slate-900">{loadingOverview ? "…" : `TZS ${fmtTZS(kpis.net)}`}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Premium quick actions */}
        <div
          className={[
            "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4",
            "transition-all duration-700 ease-out delay-100",
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2",
          ].join(" ")}
        >
          <Link
            href="/owner/properties/approved"
            className="group relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white/70 backdrop-blur-sm px-5 py-4 shadow-[0_10px_40px_rgba(2,6,23,0.05)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_60px_rgba(2,6,23,0.08)] no-underline hover:no-underline"
          >
            <div className="absolute left-0 top-0 h-full w-1.5 bg-gradient-to-b from-blue-500 to-sky-400" aria-hidden />
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-white/80 ring-1 ring-slate-200/70 flex items-center justify-center shadow-sm">
                <Building2 className="h-5 w-5 text-blue-600" aria-hidden />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-900">Manage listings</div>
              </div>
            </div>
            <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-gradient-to-r from-transparent via-sky-100/40 to-transparent" aria-hidden />
          </Link>

          <Link
            href="/owner/reports/overview"
            className="group relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white/70 backdrop-blur-sm px-5 py-4 shadow-[0_10px_40px_rgba(2,6,23,0.05)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_60px_rgba(2,6,23,0.08)] no-underline hover:no-underline"
          >
            <div className="absolute left-0 top-0 h-full w-1.5 bg-gradient-to-b from-emerald-500 to-teal-400" aria-hidden />
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-white/80 ring-1 ring-slate-200/70 flex items-center justify-center shadow-sm">
                <LineChart className="h-5 w-5 text-emerald-600" aria-hidden />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-900">Trends & insights</div>
              </div>
            </div>
            <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-gradient-to-r from-transparent via-emerald-100/40 to-transparent" aria-hidden />
          </Link>

          <Link
            href="/owner/revenue/paid"
            className="group relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white/70 backdrop-blur-sm px-5 py-4 shadow-[0_10px_40px_rgba(2,6,23,0.05)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_60px_rgba(2,6,23,0.08)] no-underline hover:no-underline"
          >
            <div className="absolute left-0 top-0 h-full w-1.5 bg-gradient-to-b from-amber-400 to-yellow-300" aria-hidden />
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-white/80 ring-1 ring-slate-200/70 flex items-center justify-center shadow-sm">
                <FileText className="h-5 w-5 text-amber-500" aria-hidden />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-900">Payments & receipts</div>
              </div>
            </div>
            <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-gradient-to-r from-transparent via-amber-100/40 to-transparent" aria-hidden />
          </Link>

          <Link
            href="/owner/messages"
            className="group relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white/70 backdrop-blur-sm px-5 py-4 shadow-[0_10px_40px_rgba(2,6,23,0.05)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_60px_rgba(2,6,23,0.08)] no-underline hover:no-underline"
          >
            <div className="absolute left-0 top-0 h-full w-1.5 bg-gradient-to-b from-violet-600 to-fuchsia-500" aria-hidden />
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-white/80 ring-1 ring-slate-200/70 flex items-center justify-center shadow-sm">
                <MessageCircle className="h-5 w-5 text-violet-600" aria-hidden />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-900">Guest support</div>
              </div>
            </div>
            <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-gradient-to-r from-transparent via-violet-100/40 to-transparent" aria-hidden />
          </Link>
        </div>

        <div
          className={[
            "grid gap-5 grid-cols-1 md:grid-cols-2",
            "transition-all duration-700 ease-out delay-150",
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2",
          ].join(" ")}
        >
          {/* Revenue trend */}
          <div className="group relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white/70 backdrop-blur-sm p-5 shadow-[0_10px_40px_rgba(2,6,23,0.05)] transition-all duration-300 hover:shadow-[0_18px_60px_rgba(2,6,23,0.08)]">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-500/25 to-transparent" aria-hidden />
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-600" />
                <span className="font-semibold text-slate-900">Net revenue trend</span>
              </div>
              <Link
                href="/owner/reports/overview"
                aria-label="View details"
                className="text-[#02665e] hover:opacity-80 transition-opacity"
              >
                <Eye className="h-4 w-4" />
              </Link>
            </div>
            <div className="mt-3">
              <div className="h-64">
                <ResponsiveContainer>
                  <AreaChart data={series} margin={{ left: 8, right: 16, top: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="netFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                    <XAxis dataKey="key" tick={{ fill: "#6b7280", fontSize: 12 }} axisLine={{ stroke: "#e5e7eb" }} tickLine={false} />
                    <YAxis
                      tick={{ fill: "#6b7280", fontSize: 12 }}
                      axisLine={{ stroke: "#e5e7eb" }}
                      tickLine={false}
                      tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(255, 255, 255, 0.96)",
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                      }}
                      labelStyle={{ color: "#374151", fontWeight: 600 }}
                      formatter={(value: number) => [`TZS ${fmtTZS(value)}`, "Net"]}
                    />
                    <Area type="monotone" dataKey="net" stroke="#10b981" strokeWidth={2} fill="url(#netFill)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Bookings trend */}
          <div className="group relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white/70 backdrop-blur-sm p-5 shadow-[0_10px_40px_rgba(2,6,23,0.05)] transition-all duration-300 hover:shadow-[0_18px_60px_rgba(2,6,23,0.08)]">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-500/25 to-transparent" aria-hidden />
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <CalendarCheck className="h-5 w-5 text-violet-600" />
                <span className="font-semibold text-slate-900">Bookings trend</span>
              </div>
              <Link
                href="/owner/reports/overview"
                aria-label="View details"
                className="text-[#02665e] hover:opacity-80 transition-opacity"
              >
                <Eye className="h-4 w-4" />
              </Link>
            </div>
            <div className="mt-3">
              <div className="h-64">
                <ResponsiveContainer>
                  <BarChart data={series} margin={{ left: 8, right: 10, top: 10, bottom: 0 }}>
                    <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                    <XAxis dataKey="key" tick={{ fill: "#6b7280", fontSize: 12 }} axisLine={{ stroke: "#e5e7eb" }} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fill: "#6b7280", fontSize: 12 }} axisLine={{ stroke: "#e5e7eb" }} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(255, 255, 255, 0.96)",
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                      }}
                      labelStyle={{ color: "#374151", fontWeight: 600 }}
                      formatter={(value: number) => [value, "Bookings"]}
                    />
                    <Bar dataKey="bookings" fill="#7c3aed" radius={[8, 8, 0, 0]} maxBarSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
