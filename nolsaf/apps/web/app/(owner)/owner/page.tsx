"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Building2, MessageCircle, CalendarCheck, Eye, TrendingUp, Wallet, LayoutDashboard, Star, ChevronRight } from "lucide-react";
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
    <div className="w-full pb-6 space-y-4">

      {/* ══════════════════════════════════════════════════════════════
          HERO — full-bleed prestige bar
      ══════════════════════════════════════════════════════════════ */}
      <section
        className={`relative overflow-hidden rounded-3xl transition-all duration-700 ease-out ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
        style={{ background: "linear-gradient(135deg,#010e0d 0%,#011a17 20%,#013630 45%,#025549 70%,#026b5e 88%,#028576 100%)" }}
      >
        {/* ── layered textures ── */}
        <div className="pointer-events-none absolute inset-0" style={{ backgroundImage: "radial-gradient(circle,rgba(255,255,255,0.055) 1px,transparent 1px)", backgroundSize: "22px 22px" }} />
        <div className="pointer-events-none absolute inset-0" style={{ background: "linear-gradient(to bottom,rgba(0,0,0,0.18) 0%,transparent 40%,rgba(0,0,0,0.28) 100%)" }} />

        {/* ── ambient light blobs ── */}
        <div className="pointer-events-none absolute -top-24 -right-24 h-80 w-80 rounded-full" style={{ background: "radial-gradient(circle,rgba(20,210,170,0.18) 0%,transparent 70%)" }} />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full" style={{ background: "radial-gradient(circle,rgba(0,255,190,0.10) 0%,transparent 70%)" }} />
        <div className="pointer-events-none absolute top-1/2 right-1/4 h-96 w-96 rounded-full" style={{ background: "radial-gradient(circle,rgba(2,150,130,0.10) 0%,transparent 65%)", transform: "translateY(-50%)" }} />

        {/* ── decorative watermark ── */}
        <div className="pointer-events-none absolute right-0 bottom-0 flex items-end justify-end overflow-hidden" style={{ width: 220, height: 220 }}>
          <LayoutDashboard style={{ width: 200, height: 200, color: "rgba(255,255,255,0.028)", transform: "translate(30%,30%)" }} />
        </div>

        {/* ── CONTENT ── */}
        <div className="relative px-5 sm:px-8 lg:px-10 pt-7 pb-0">

          {/* top chrome row */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.14)" }}>
                <Star className="h-3.5 w-3.5 text-white/70" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.22em] text-white/30">Owner Portal</span>
            </div>
            {liveAgeLabel && (
              <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold text-white/55" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}>
                <span className={`h-1.5 w-1.5 rounded-full ${isFreshLiveUpdate ? "bg-emerald-400 animate-pulse" : "bg-white/30"}`} />
                {isFreshLiveUpdate ? "Just updated" : `Updated ${liveAgeLabel} ago`}
              </div>
            )}
          </div>

          {/* greeting & title */}
          <div className="mb-7">
            {ownerName && (
              <p className="text-[12px] font-semibold text-white/35 mb-1.5 tracking-wide">Welcome back,</p>
            )}
            <h1 className="font-black text-white leading-[1.02] tracking-tight" style={{ fontSize: "clamp(2rem,5vw,3rem)" }}>
              {ownerName ?? "Your workspace"}
            </h1>
            <p className="mt-2.5 text-[13px] font-medium text-white/35 max-w-sm">
              Bookings, revenue & insights — all in one place.
            </p>
          </div>

          {/* KPI panels */}
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3 mb-0">

            {/* Bookings KPI */}
            <div className="relative overflow-hidden rounded-t-2xl px-4 pt-4 pb-5" style={{ background: "rgba(255,255,255,0.07)", borderTop: "1px solid rgba(255,255,255,0.12)", borderLeft: "1px solid rgba(255,255,255,0.08)", borderRight: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="absolute inset-x-0 top-0 h-px" style={{ background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.35),transparent)" }} />
              <div className="flex items-start justify-between gap-2 mb-3">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30">Bookings · 14 d</span>
                <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg" style={{ background: "rgba(56,189,248,0.18)", border: "1px solid rgba(56,189,248,0.25)" }}>
                  <CalendarCheck className="h-3 w-3 text-sky-300" />
                </div>
              </div>
              <div className="text-[2.6rem] font-black text-white leading-none tabular-nums">
                {loadingOverview ? <span className="text-white/20 text-[2rem]">—·—</span> : kpis.bookings}
              </div>
              <div className="mt-2 flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-emerald-400/70" />
                <span className="text-[10px] text-white/30 font-medium">active window</span>
              </div>
            </div>

            {/* Revenue KPI */}
            <div className="relative overflow-hidden rounded-t-2xl px-4 pt-4 pb-5" style={{ background: "rgba(255,255,255,0.07)", borderTop: "1px solid rgba(255,255,255,0.12)", borderLeft: "1px solid rgba(255,255,255,0.08)", borderRight: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="absolute inset-x-0 top-0 h-px" style={{ background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.35),transparent)" }} />
              <div className="flex items-start justify-between gap-2 mb-3">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30">Net Revenue · 14 d</span>
                <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg" style={{ background: "rgba(52,211,153,0.18)", border: "1px solid rgba(52,211,153,0.25)" }}>
                  <Wallet className="h-3 w-3 text-emerald-300" />
                </div>
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-black text-white/40 mb-0.5">TZS</div>
                <div className="text-[1.8rem] sm:text-[2rem] font-black text-white leading-none tabular-nums truncate">
                  {loadingOverview ? <span className="text-white/20">—·—</span> : fmtTZS(kpis.net)}
                </div>
              </div>
              <div className="mt-2 flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-emerald-400/70" />
                <span className="text-[10px] text-white/30 font-medium">active window</span>
              </div>
            </div>
          </div>
        </div>

        {/* bottom edge fade so KPI panels bleed into page */}
        <div className="h-5 w-full" />
      </section>

      {/* ══════════════════════════════════════════════════════════════
          QUICK ACTIONS
      ══════════════════════════════════════════════════════════════ */}
      <div
        className={`grid grid-cols-2 md:grid-cols-4 gap-3 transition-all duration-700 ease-out delay-100 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
      >
        {[
          { href: "/owner/properties/approved", icon: Building2,     label: "Manage listings",    sub: "Properties", topColor: "#0ea5e9", glowBg: "rgba(14,165,233,0.08)",  iconBg: "rgba(14,165,233,0.1)",  iconColor: "#0ea5e9" },
          { href: "/owner/reports/overview",    icon: TrendingUp,    label: "Trends & insights",  sub: "Reports",    topColor: "#10b981", glowBg: "rgba(16,185,129,0.08)",  iconBg: "rgba(16,185,129,0.1)",  iconColor: "#10b981" },
          { href: "/owner/revenue/paid",        icon: Wallet,        label: "Payments & receipts",sub: "Revenue",    topColor: "#f59e0b", glowBw: "rgba(245,158,11,0.08)",   iconBg: "rgba(245,158,11,0.1)",  iconColor: "#f59e0b" },
          { href: "/owner/messages",            icon: MessageCircle, label: "Guest support",      sub: "Messages",   topColor: "#8b5cf6", glowBg: "rgba(139,92,246,0.08)",   iconBg: "rgba(139,92,246,0.1)",  iconColor: "#8b5cf6" },
        ].map(({ href, icon: Icon, label, sub, topColor, iconBg, iconColor }) => (
          <Link
            key={href}
            href={href}
            className="group relative overflow-hidden rounded-2xl bg-white no-underline block transition-all duration-200 hover:-translate-y-0.5"
            style={{ border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 3px rgba(0,0,0,0.05),0 4px 12px rgba(0,0,0,0.04)" }}
          >
            {/* colored top bar */}
            <div className="absolute inset-x-0 top-0 h-[3px] rounded-t-2xl transition-all duration-200" style={{ background: topColor, opacity: 0.7 }} />
            {/* hover glow overlay */}
            <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-200" style={{ background: `linear-gradient(135deg,${topColor}08 0%,transparent 60%)` }} />

            <div className="relative px-4 py-4 flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: iconBg }}>
                  <Icon className="h-[18px] w-[18px]" style={{ color: iconColor }} />
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all duration-150" />
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.18em]" style={{ color: topColor, opacity: 0.8 }}>{sub}</p>
                <p className="text-[13px] font-bold text-slate-800 mt-0.5 leading-snug">{label}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════
          CHARTS
      ══════════════════════════════════════════════════════════════ */}
      <div
        className={`grid gap-4 grid-cols-1 md:grid-cols-2 transition-all duration-700 ease-out delay-200 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
      >
        {/* Revenue trend */}
        <div className="relative overflow-hidden rounded-2xl bg-white p-5" style={{ border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 3px rgba(0,0,0,0.05),0 4px 12px rgba(0,0,0,0.04)" }}>
          <div className="absolute inset-x-0 top-0 h-[3px] rounded-t-2xl" style={{ background: "linear-gradient(90deg,#10b981,#06b6d4)" }} />
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(16,185,129,0.1)" }}>
                <TrendingUp className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-[13px] font-bold text-slate-900 leading-none">Net revenue</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Last 14 days</p>
              </div>
            </div>
            <Link href="/owner/reports/overview"
              className="inline-flex items-center gap-1 text-[11px] font-bold no-underline transition-opacity hover:opacity-60" style={{ color: "#02665e" }}>
              View all <Eye className="h-3 w-3" />
            </Link>
          </div>
          <div className="h-52">
            <ResponsiveContainer>
              <AreaChart data={series} margin={{ left: 0, right: 8, top: 6, bottom: 0 }}>
                <defs>
                  <linearGradient id="netFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"  stopColor="#10b981" stopOpacity={0.30} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#f1f5f9" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="key" tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${(v/1000).toFixed(0)}k`} width={34} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, boxShadow: "0 4px 20px rgba(0,0,0,0.08)", fontSize: 12 }}
                  labelStyle={{ color: "#1e293b", fontWeight: 700 }}
                  formatter={(value: number) => [`TZS ${fmtTZS(value)}`, "Net"]}
                />
                <Area type="monotone" dataKey="net" stroke="#10b981" strokeWidth={2.5} fill="url(#netFill)" dot={false} activeDot={{ r: 5, fill: "#10b981" }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bookings trend */}
        <div className="relative overflow-hidden rounded-2xl bg-white p-5" style={{ border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 3px rgba(0,0,0,0.05),0 4px 12px rgba(0,0,0,0.04)" }}>
          <div className="absolute inset-x-0 top-0 h-[3px] rounded-t-2xl" style={{ background: "linear-gradient(90deg,#8b5cf6,#ec4899)" }} />
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(139,92,246,0.1)" }}>
                <CalendarCheck className="h-4 w-4 text-violet-600" />
              </div>
              <div>
                <p className="text-[13px] font-bold text-slate-900 leading-none">Bookings</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Last 14 days</p>
              </div>
            </div>
            <Link href="/owner/reports/overview"
              className="inline-flex items-center gap-1 text-[11px] font-bold no-underline transition-opacity hover:opacity-60" style={{ color: "#02665e" }}>
              View all <Eye className="h-3 w-3" />
            </Link>
          </div>
          <div className="h-52">
            <ResponsiveContainer>
              <BarChart data={series} margin={{ left: 0, right: 8, top: 6, bottom: 0 }}>
                <defs>
                  <linearGradient id="bookFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"  stopColor="#8b5cf6" stopOpacity={1} />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.6} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#f1f5f9" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="key" tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} width={24} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, boxShadow: "0 4px 20px rgba(0,0,0,0.08)", fontSize: 12 }}
                  labelStyle={{ color: "#1e293b", fontWeight: 700 }}
                  formatter={(value: number) => [value, "Bookings"]}
                />
                <Bar dataKey="bookings" fill="url(#bookFill)" radius={[5, 5, 0, 0]} maxBarSize={26} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
