"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Building2, MessageCircle, CalendarCheck, Eye, ArrowUpRight, Sparkles, TrendingUp, Wallet } from "lucide-react";
import axios from "axios";
import { io } from "socket.io-client";
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
  const [lastOverviewUpdatedAt, setLastOverviewUpdatedAt] = useState<number | null>(null);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const aliveRef = useRef(true);

  useEffect(() => {
    const n = readOwnerName();
    if (n) setOwnerName(n);
  }, []);

  const fetchOverview = useCallback(async (opts?: { silent?: boolean }) => {
    const now = new Date();
    const from = new Date(now);
    from.setDate(now.getDate() - 13);

    if (!opts?.silent) setLoadingOverview(true);
    try {
      const r = await api.get("/api/owner/reports/overview", {
        params: {
          from: from.toISOString(),
          to: now.toISOString(),
          groupBy: "day",
        },
      })
      if (!aliveRef.current) return;
      setOverview(r.data);
      setLastOverviewUpdatedAt(Date.now());
    } catch {
      if (!aliveRef.current) return;
      if (!opts?.silent) setOverview(null);
    } finally {
      if (!aliveRef.current) return;
      if (!opts?.silent) setLoadingOverview(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
    return () => {
      aliveRef.current = false;
    };
  }, [fetchOverview]);

  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    const socket = io(socketUrl, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
    });

    const refresh = () => {
      fetchOverview({ silent: true });
    };

    (async () => {
      try {
        const meRes = await fetch("/api/account/me", { credentials: "include" });
        const meJson: any = meRes.ok ? await meRes.json() : null;
        const me = meJson?.data ?? meJson;
        const ownerId = Number(me?.id || 0);
        if (ownerId) socket.emit("join-owner-room", { ownerId });
      } catch {}
    })();

    socket.on("owner:bookings:updated", refresh);

    const onVis = () => {
      if (document.visibilityState === "visible") refresh();
    };
    const onOnline = () => refresh();
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("online", onOnline);
    const poll = window.setInterval(refresh, 60000);

    return () => {
      window.clearInterval(poll);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("online", onOnline);
      socket.off("owner:bookings:updated", refresh);
      socket.disconnect();
    };
  }, [fetchOverview]);

  useEffect(() => {
    const id = window.requestAnimationFrame(() => setMounted(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    const t = window.setInterval(() => setNowTick(Date.now()), 15000);
    return () => window.clearInterval(t);
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

  const liveAgeLabel = useMemo(() => {
    if (!lastOverviewUpdatedAt) return null;
    const diffSec = Math.max(0, Math.floor((nowTick - lastOverviewUpdatedAt) / 1000));
    return `${diffSec}s`;
  }, [lastOverviewUpdatedAt, nowTick]);

  const isFreshLiveUpdate = useMemo(() => {
    if (!lastOverviewUpdatedAt) return false;
    return nowTick - lastOverviewUpdatedAt < 15000;
  }, [lastOverviewUpdatedAt, nowTick]);

  return (
    <div className="w-full space-y-4 pb-4">

      {/* ══════════════════════════════════════════════════════════════
          PREMIUM HERO
      ══════════════════════════════════════════════════════════════ */}
      <section
        aria-label="Dashboard hero"
        className={`relative overflow-hidden rounded-3xl mx-1 transition-all duration-700 ease-out ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}
        style={{ background: "linear-gradient(135deg, #011f1c 0%, #013d38 35%, #02665e 70%, #027a6e 100%)" }}
      >
        {/* ── mesh texture overlay ── */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.035]"
          style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "20px 20px" }}
        />
        {/* ── ambient glows ── */}
        <div className="pointer-events-none absolute -top-20 -right-20 h-72 w-72 rounded-full bg-teal-300/10 blur-[80px]" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-emerald-400/10 blur-[60px]" />
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-[600px] rounded-full bg-white/[0.02] blur-[60px]" />
        {/* ── large decorative icon ── */}
        <Sparkles className="pointer-events-none absolute -bottom-4 -right-4 h-44 w-44 text-white/[0.04]" aria-hidden />

        <div className="relative px-5 sm:px-8 pt-8 pb-7">
          {/* top row: breadcrumb + live pulse */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <span className="inline-block h-[3px] w-4 rounded-full bg-white/25" />
              <span className="text-[10px] font-black uppercase tracking-[0.18em] text-white/35">Owner Portal</span>
            </div>
            {liveAgeLabel && (
              <div className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[10px] font-bold text-white/60">
                <span className={`h-1.5 w-1.5 rounded-full ${isFreshLiveUpdate ? "bg-emerald-400 animate-pulse" : "bg-white/30"}`} />
                Live · {liveAgeLabel}
              </div>
            )}
          </div>

          {/* main title */}
          <div className="mb-7">
            {ownerName && (
              <div className="text-[13px] font-medium text-white/40 mb-1">Good day,</div>
            )}
            <h1 className="text-[2.2rem] sm:text-[2.6rem] font-black leading-[1.05] tracking-tight text-white">
              {ownerName ? ownerName : "Your workspace"}
            </h1>
            <p className="mt-2 text-[13px] text-white/40 font-medium max-w-xs">
              Bookings, revenue, and insights — all in one place.
            </p>
          </div>

          {/* KPI row embedded in hero */}
          <div className="grid grid-cols-2 gap-3">
            {/* Bookings KPI */}
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.07] backdrop-blur-sm px-4 py-3.5">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-white/35 mb-1">Bookings</div>
                  <div className="text-[2rem] font-black text-white leading-none tabular-nums">
                    {loadingOverview ? <span className="text-white/30">—</span> : kpis.bookings}
                  </div>
                  <div className="text-[11px] text-white/35 mt-1.5">Last 14 days</div>
                </div>
                <div className="h-9 w-9 rounded-xl bg-sky-400/15 border border-sky-400/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CalendarCheck className="h-4 w-4 text-sky-300" />
                </div>
              </div>
            </div>

            {/* Revenue KPI */}
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.07] backdrop-blur-sm px-4 py-3.5">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[10px] font-black uppercase tracking-widest text-white/35 mb-1">Net Revenue</div>
                  <div className="text-[1.25rem] sm:text-[1.5rem] font-black text-white leading-none tabular-nums truncate">
                    {loadingOverview ? <span className="text-white/30">—</span> : `TZS ${fmtTZS(kpis.net)}`}
                  </div>
                  <div className="text-[11px] text-white/35 mt-1.5">Last 14 days</div>
                </div>
                <div className="h-9 w-9 rounded-xl bg-emerald-400/15 border border-emerald-400/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Wallet className="h-4 w-4 text-emerald-300" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          QUICK ACTIONS
      ══════════════════════════════════════════════════════════════ */}
      <div
        className={`grid grid-cols-2 md:grid-cols-4 gap-3 px-1 transition-all duration-700 ease-out delay-[80ms] ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}
      >
        {[
          { href: "/owner/properties/approved", icon: Building2,    label: "Manage listings",      sub: "Properties",   color: "text-sky-600",    bg: "bg-sky-50",      bar: "from-sky-500 to-blue-400"      },
          { href: "/owner/reports/overview",     icon: TrendingUp,  label: "Trends & insights",    sub: "Reports",      color: "text-emerald-600",bg: "bg-emerald-50",  bar: "from-emerald-500 to-teal-400"  },
          { href: "/owner/revenue/paid",         icon: Wallet,      label: "Payments & receipts",  sub: "Revenue",      color: "text-amber-600",  bg: "bg-amber-50",    bar: "from-amber-400 to-yellow-300"  },
          { href: "/owner/messages",             icon: MessageCircle,label: "Guest support",       sub: "Messages",     color: "text-violet-600", bg: "bg-violet-50",   bar: "from-violet-600 to-fuchsia-500"},
        ].map(({ href, icon: Icon, label, sub, color, bg, bar }) => (
          <Link
            key={href}
            href={href}
            className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white hover:bg-slate-50/80 px-4 py-4 shadow-sm hover:shadow-md transition-all duration-200 no-underline hover:no-underline block"
          >
            {/* left accent bar */}
            <div className={`absolute left-0 inset-y-0 w-1 rounded-r-full bg-gradient-to-b ${bar}`} aria-hidden />
            <div className="flex flex-col gap-2.5">
              <div className={`h-9 w-9 rounded-xl ${bg} flex items-center justify-center`}>
                <Icon className={`h-4.5 w-4.5 h-[18px] w-[18px] ${color}`} aria-hidden />
              </div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">{sub}</div>
                <div className="text-[13px] font-bold text-slate-800 mt-0.5 leading-tight">{label}</div>
              </div>
            </div>
            <ArrowUpRight className="absolute top-3 right-3 h-3.5 w-3.5 text-slate-200 group-hover:text-slate-400 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all duration-150" />
          </Link>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════
          CHARTS
      ══════════════════════════════════════════════════════════════ */}
      <div
        className={`grid gap-4 grid-cols-1 md:grid-cols-2 px-1 transition-all duration-700 ease-out delay-[140ms] ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}
      >
        {/* Revenue trend */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm p-5">
          <div className="absolute inset-x-0 top-0 h-[3px] rounded-t-2xl bg-gradient-to-r from-emerald-500 to-teal-400" />
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-emerald-50 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
              </div>
              <span className="text-[14px] font-bold text-slate-900">Net revenue trend</span>
            </div>
            <Link href="/owner/reports/overview" aria-label="View details"
              className="inline-flex items-center gap-1 text-[11px] font-bold text-[#02665e] hover:opacity-70 transition-opacity no-underline">
              View all <Eye className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="h-56">
            <ResponsiveContainer>
              <AreaChart data={series} margin={{ left: 8, right: 12, top: 6, bottom: 0 }}>
                <defs>
                  <linearGradient id="netFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#f1f5f9" strokeDasharray="4 4" />
                <XAxis dataKey="key" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${(v/1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px", boxShadow: "0 4px 16px rgba(0,0,0,0.08)", fontSize: 12 }}
                  labelStyle={{ color: "#1e293b", fontWeight: 700 }}
                  formatter={(value: number) => [`TZS ${fmtTZS(value)}`, "Net"]}
                />
                <Area type="monotone" dataKey="net" stroke="#10b981" strokeWidth={2.5} fill="url(#netFill)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bookings trend */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm p-5">
          <div className="absolute inset-x-0 top-0 h-[3px] rounded-t-2xl bg-gradient-to-r from-violet-600 to-fuchsia-500" />
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-violet-50 flex items-center justify-center">
                <CalendarCheck className="h-4 w-4 text-violet-600" />
              </div>
              <span className="text-[14px] font-bold text-slate-900">Bookings trend</span>
            </div>
            <Link href="/owner/reports/overview" aria-label="View details"
              className="inline-flex items-center gap-1 text-[11px] font-bold text-[#02665e] hover:opacity-70 transition-opacity no-underline">
              View all <Eye className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="h-56">
            <ResponsiveContainer>
              <BarChart data={series} margin={{ left: 8, right: 8, top: 6, bottom: 0 }}>
                <CartesianGrid stroke="#f1f5f9" strokeDasharray="4 4" />
                <XAxis dataKey="key" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px", boxShadow: "0 4px 16px rgba(0,0,0,0.08)", fontSize: 12 }}
                  labelStyle={{ color: "#1e293b", fontWeight: 700 }}
                  formatter={(value: number) => [value, "Bookings"]}
                />
                <Bar dataKey="bookings" fill="#7c3aed" radius={[6, 6, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
