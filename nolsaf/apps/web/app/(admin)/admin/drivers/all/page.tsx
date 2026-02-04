"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import axios from "axios";
import {
  Search,
  Truck,
  ShieldOff,
  Ban,
  WifiOff,
  Star,
  Route,
  Calendar,
  Eye,
  X,
  Activity,
  Award,
  Trophy,
  UserPlus,
  BarChart3,
  Bell,
} from "lucide-react";

// Use same-origin for HTTP calls so Next.js rewrites proxy to the API
const api = axios.create({ baseURL: "", withCredentials: true });

function authify() {
  if (typeof window === "undefined") return;

  const lsToken =
    window.localStorage.getItem("token") ||
    window.localStorage.getItem("nolsaf_token") ||
    window.localStorage.getItem("__Host-nolsaf_token");

  if (lsToken) {
    api.defaults.headers.common["Authorization"] = `Bearer ${lsToken}`;
    return;
  }

  const m = String(document.cookie || "").match(/(?:^|;\s*)(?:nolsaf_token|__Host-nolsaf_token)=([^;]+)/);
  const cookieToken = m?.[1] ? decodeURIComponent(m[1]) : "";
  if (cookieToken) {
    api.defaults.headers.common["Authorization"] = `Bearer ${cookieToken}`;
  }
}

type DriverRow = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  createdAt: string;
  region: string | null;
  operationArea: string | null;
  vehicleType: string | null;
  plateNumber: string | null;
  isVipDriver: boolean;
  suspendedAt: string | null;
  isDisabled: boolean;
  available: boolean | null;
  isAvailable: boolean | null;
  rating: number | null;
  performance?: {
    totalTrips: number;
    completedTrips: number;
    canceledTrips: number;
    avgRating: number | null;
    lastTripAt: string | null;
  };
};

type DriversResponse = {
  total: number;
  page: number;
  pageSize: number;
  items: DriverRow[];
};

type DriverStatsData = {
  driver: { id: number; name: string; email: string } | null;
  date: string;
  todaysRides: number;
  earnings: number;
  rating: number;
};

type DriverReferralsData = {
  driver: { id: number; name: string; email: string; region?: string | null; district?: string | null } | null;
  referralCode: string;
  referralLink: string;
  totalReferrals: number;
  activeReferrals: number;
  totalCredits: number;
  pendingCredits: number;
  referrals: Array<{ id: string; name: string; email: string; status: string; joinedAt?: string; creditsEarned?: number; spend?: number }>;
};

type DriverBonusesData = {
  driver: { id: number; name: string; email: string } | null;
  total: number;
  page: number;
  pageSize: number;
  items: Array<{ id: string; date: string; amount: number; status?: string; period?: string; reason?: string | null }>;
};

function statusLabel(d: DriverRow) {
  if (d.isDisabled) return "Disabled";
  if (d.suspendedAt) return "Suspended";
  const isAvail = (d.available ?? d.isAvailable ?? true) === true;
  if (!isAvail) return "Unavailable";
  return "Active";
}

function StatusIcon({ driver }: { driver: DriverRow }) {
  const label = statusLabel(driver);

  if (label === "Disabled") {
    return (
      <span className="inline-flex items-center" title={label} aria-label={label}>
        <ShieldOff className="h-4 w-4 text-gray-600" aria-hidden />
        <span className="sr-only">{label}</span>
      </span>
    );
  }

  if (label === "Suspended") {
    return (
      <span className="inline-flex items-center" title={label} aria-label={label}>
        <Ban className="h-4 w-4 text-amber-600" aria-hidden />
        <span className="sr-only">{label}</span>
      </span>
    );
  }

  if (label === "Unavailable") {
    return (
      <span className="inline-flex items-center" title={label} aria-label={label}>
        <WifiOff className="h-4 w-4 text-slate-600" aria-hidden />
        <span className="sr-only">{label}</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center" title={label} aria-label={label}>
      <Truck className="h-4 w-4 text-emerald-600" aria-hidden />
      <span className="sr-only">{label}</span>
    </span>
  );
}

function formatDateShort(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}

function initials(name: string) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const first = parts[0]?.[0] || "?";
  const second = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
  return (first + second).toUpperCase();
}

export default function AdminAllDriversPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<DriverRow[]>([]);
  const [total, setTotal] = useState(0);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"" | "ACTIVE" | "SUSPENDED" | "DISABLED" | "UNAVAILABLE">("");

  const [overviewOpen, setOverviewOpen] = useState(false);
  const [overviewDriver, setOverviewDriver] = useState<DriverRow | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [overviewStats, setOverviewStats] = useState<DriverStatsData | null>(null);
  const [overviewReferrals, setOverviewReferrals] = useState<DriverReferralsData | null>(null);
  const [overviewBonuses, setOverviewBonuses] = useState<DriverBonusesData | null>(null);

  useEffect(() => {
    authify();
  }, []);

  useEffect(() => {
    if (!overviewOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOverviewOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [overviewOpen]);

  async function openOverview(driver: DriverRow) {
    setOverviewDriver(driver);
    setOverviewOpen(true);
    setOverviewLoading(true);
    setOverviewError(null);
    setOverviewStats(null);
    setOverviewReferrals(null);
    setOverviewBonuses(null);

    try {
      const today = new Date().toISOString().split("T")[0];
      const [statsR, referralsR, bonusesR] = await Promise.allSettled([
        api.get<DriverStatsData>(`/api/admin/drivers/${driver.id}/stats`, { params: { date: today } }),
        api.get<DriverReferralsData>(`/api/admin/drivers/${driver.id}/referrals`),
        api.get<DriverBonusesData>(`/api/admin/drivers/${driver.id}/bonuses`, { params: { page: 1, pageSize: 5 } }),
      ]);

      if (statsR.status === "fulfilled") setOverviewStats(statsR.value.data);
      if (referralsR.status === "fulfilled") setOverviewReferrals(referralsR.value.data);
      if (bonusesR.status === "fulfilled") setOverviewBonuses(bonusesR.value.data);

      if (statsR.status === "rejected" && referralsR.status === "rejected" && bonusesR.status === "rejected") {
        setOverviewError("Failed to load driver overview");
      }
    } catch (e: any) {
      const msg = e?.response?.data?.error || e?.message || "Failed to load driver overview";
      setOverviewError(String(msg));
    } finally {
      setOverviewLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const r = await api.get<DriversResponse>("/api/admin/drivers", {
          params: {
            page: 1,
            pageSize: 100,
            q: q || undefined,
            status: status || undefined,
          },
        });
        if (cancelled) return;
        setItems(r.data?.items ?? []);
        setTotal(r.data?.total ?? 0);
      } catch (e: any) {
        if (cancelled) return;
        const msg = e?.response?.data?.error || e?.message || "Failed to load drivers";
        setError(String(msg));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [q, status]);

  const rows = useMemo(() => items, [items]);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center mb-3">
            <Truck className="h-6 w-6 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">All Drivers</h1>
          <p className="text-sm text-gray-500 mt-1">Manage platform drivers: performance, status, and details</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" aria-hidden />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search drivers by name, email, phone…"
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-600">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="border border-gray-300 rounded-lg text-sm px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="">All</option>
              <option value="ACTIVE">Active</option>
              <option value="UNAVAILABLE">Unavailable</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="DISABLED">Disabled</option>
            </select>
          </div>

          <div className="text-xs text-gray-500 whitespace-nowrap">{loading ? "Loading…" : `${total.toLocaleString()} total`}</div>
        </div>

        {error ? (
          <div className="p-6 text-sm text-red-600">{error}</div>
        ) : loading ? (
          <div className="p-6 text-sm text-gray-600">Loading drivers…</div>
        ) : rows.length === 0 ? (
          <div className="p-6 text-sm text-gray-600">No drivers found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left font-semibold px-4 py-3">Driver</th>
                  <th className="text-left font-semibold px-4 py-3">Status</th>
                  <th className="text-left font-semibold px-4 py-3">Vehicle</th>
                  <th className="text-left font-semibold px-4 py-3">Area</th>
                  <th className="text-left font-semibold px-4 py-3">Trips</th>
                  <th className="text-left font-semibold px-4 py-3">Rating</th>
                  <th className="text-left font-semibold px-4 py-3">Joined</th>
                  <th className="text-left font-semibold px-4 py-3">Activities</th>
                  <th className="text-right font-semibold px-4 py-3">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {rows.map((d) => {
                  const trips = d.performance?.totalTrips ?? 0;
                  const completed = d.performance?.completedTrips ?? 0;
                  const canceled = d.performance?.canceledTrips ?? 0;
                  const avg = d.performance?.avgRating ?? d.rating;

                  return (
                    <tr key={d.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900 truncate max-w-[280px]" title={d.name}>
                          {d.name}
                          {d.isVipDriver ? <span className="ml-2 text-xs font-semibold text-violet-700 bg-violet-50 px-2 py-0.5 rounded-full">VIP</span> : null}
                        </div>
                        <div className="text-xs text-gray-500 truncate max-w-[320px]" title={d.email}>{d.email || "—"}</div>
                        <div className="text-xs text-gray-500 truncate max-w-[320px]" title={d.phone || ""}>{d.phone || "—"}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <StatusIcon driver={d} />
                          <span className="text-xs text-gray-700">{statusLabel(d)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-gray-900 truncate max-w-[200px]" title={d.vehicleType || ""}>{d.vehicleType || "—"}</div>
                        <div className="text-xs text-gray-500 truncate max-w-[200px]" title={d.plateNumber || ""}>{d.plateNumber || ""}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-gray-900 truncate max-w-[220px]" title={d.region || ""}>{d.region || "—"}</div>
                        <div className="text-xs text-gray-500 truncate max-w-[220px]" title={d.operationArea || ""}>{d.operationArea || ""}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 text-gray-900">
                          <Route className="h-4 w-4 text-gray-400" aria-hidden />
                          <span className="tabular-nums">{trips}</span>
                        </div>
                        <div className="text-xs text-gray-500 tabular-nums">{completed} completed · {canceled} canceled</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Star className="h-4 w-4 text-amber-500" aria-hidden />
                          <span className="tabular-nums text-gray-900">{avg != null ? Number(avg).toFixed(1) : "—"}</span>
                        </div>
                        <div className="text-xs text-gray-500">
                          Last trip: {formatDateShort(d.performance?.lastTripAt || null)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 text-gray-900">
                          <Calendar className="h-4 w-4 text-gray-400" aria-hidden />
                          <span className="tabular-nums">{formatDateShort(d.createdAt)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/admin/drivers/activities?driverId=${d.id}`}
                            className="inline-flex items-center text-gray-600 hover:text-emerald-700 no-underline"
                            title="Activities"
                            aria-label="Open activities"
                          >
                            <Activity className="h-4 w-4" aria-hidden />
                          </Link>
                          <Link
                            href={`/admin/drivers/stats?driverId=${d.id}`}
                            className="inline-flex items-center text-gray-600 hover:text-green-700 no-underline"
                            title="Stats"
                            aria-label="Open stats"
                          >
                            <BarChart3 className="h-4 w-4" aria-hidden />
                          </Link>
                          <Link
                            href={`/admin/drivers/referrals?driverId=${d.id}`}
                            className="inline-flex items-center text-gray-600 hover:text-blue-700 no-underline"
                            title="Referrals"
                            aria-label="Open referrals"
                          >
                            <UserPlus className="h-4 w-4" aria-hidden />
                          </Link>
                          <Link
                            href={`/admin/drivers/bonuses?driverId=${d.id}`}
                            className="inline-flex items-center text-gray-600 hover:text-amber-700 no-underline"
                            title="Bonuses"
                            aria-label="Open bonuses"
                          >
                            <Award className="h-4 w-4" aria-hidden />
                          </Link>
                          <Link
                            href={`/admin/drivers/levels?driverId=${d.id}`}
                            className="inline-flex items-center text-gray-600 hover:text-violet-700 no-underline"
                            title="Levels"
                            aria-label="Open levels"
                          >
                            <Trophy className="h-4 w-4" aria-hidden />
                          </Link>
                          <Link
                            href={`/admin/drivers/trips?driverId=${d.id}`}
                            className="inline-flex items-center text-gray-600 hover:text-sky-700 no-underline"
                            title="Trips"
                            aria-label="Open trips"
                          >
                            <Route className="h-4 w-4" aria-hidden />
                          </Link>
                          <Link
                            href={`/admin/drivers/reminders?driverId=${d.id}`}
                            className="inline-flex items-center text-gray-600 hover:text-rose-700 no-underline"
                            title="Reminders"
                            aria-label="Open reminders"
                          >
                            <Bell className="h-4 w-4" aria-hidden />
                          </Link>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => openOverview(d)}
                            className="inline-flex items-center justify-center h-9 w-9 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                            aria-label="Open quick driver overview"
                            title="Quick overview"
                          >
                            <Activity className="h-4 w-4" aria-hidden />
                            <span className="sr-only">Overview</span>
                          </button>
                          <Link
                            href={`/admin/drivers/audit/${d.id}`}
                            className="inline-flex items-center gap-2 text-sm text-blue-700 hover:text-blue-800 no-underline"
                            title="View driver details"
                          >
                            <Eye className="h-4 w-4" aria-hidden />
                            <span className="sr-only">Details</span>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {overviewOpen && overviewDriver ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]" onClick={() => setOverviewOpen(false)} aria-hidden />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Driver overview"
            className="relative w-full max-w-3xl max-h-[90vh] overflow-hidden bg-white rounded-2xl shadow-2xl ring-1 ring-black/5 flex flex-col"
          >
            <div className="px-5 sm:px-6 py-4 sm:py-5 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex items-start gap-4">
                  <div className="h-12 w-12 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold tracking-wide flex-shrink-0">
                    {initials(overviewDriver.name)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-xl font-bold text-slate-900 truncate" title={overviewDriver.name}>
                        {overviewDriver.name}
                      </h2>
                      {overviewDriver.isVipDriver ? (
                        <span className="text-[11px] font-semibold text-violet-700 bg-violet-100/70 px-2 py-0.5 rounded-full">
                          VIP
                        </span>
                      ) : null}
                      <span className="text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full">
                        {statusLabel(overviewDriver)}
                      </span>
                    </div>
                    <div className="text-sm text-slate-600 truncate" title={overviewDriver.email}>
                      {overviewDriver.email || "—"}
                    </div>
                    <div className="mt-1 text-xs text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="inline-flex items-center gap-1">
                        <Route className="h-3.5 w-3.5 text-slate-400" aria-hidden />
                        Trips: <span className="font-semibold text-slate-700">{overviewDriver.performance?.totalTrips ?? 0}</span>
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" aria-hidden />
                        Last trip: <span className="font-semibold text-slate-700">{formatDateShort(overviewDriver.performance?.lastTripAt || null)}</span>
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setOverviewOpen(false)}
                  className="p-2 rounded-xl hover:bg-slate-100 text-slate-600 ring-1 ring-slate-200"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" aria-hidden />
                </button>
              </div>
            </div>

            <div className="px-5 sm:px-6 py-5 overflow-y-auto flex-1 space-y-6">
              {overviewError ? <div className="text-sm text-red-600">{overviewError}</div> : null}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-xl border border-slate-200 p-4 bg-white">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs font-medium text-slate-500">Today’s rides</div>
                    <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                      <Route className="h-4 w-4 text-emerald-700" aria-hidden />
                    </div>
                  </div>
                  <div className="mt-2 text-2xl font-bold text-slate-900 tabular-nums">
                    {overviewStats ? overviewStats.todaysRides : overviewLoading ? "…" : "—"}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 p-4 bg-white">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs font-medium text-slate-500">Today’s earnings</div>
                    <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center">
                      <BarChart3 className="h-4 w-4 text-blue-700" aria-hidden />
                    </div>
                  </div>
                  <div className="mt-2 text-2xl font-bold text-slate-900 tabular-nums">
                    {overviewStats ? overviewStats.earnings.toLocaleString() : overviewLoading ? "…" : "—"}
                    {overviewStats ? <span className="ml-1 text-xs font-semibold text-slate-500">TZS</span> : null}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 p-4 bg-white">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs font-medium text-slate-500">Rating</div>
                    <div className="h-8 w-8 rounded-lg bg-amber-50 flex items-center justify-center">
                      <Star className="h-4 w-4 text-amber-700" aria-hidden />
                    </div>
                  </div>
                  <div className="mt-2 text-2xl font-bold text-slate-900 tabular-nums">
                    {overviewStats ? overviewStats.rating.toFixed(1) : overviewLoading ? "…" : overviewDriver.rating != null ? Number(overviewDriver.rating).toFixed(1) : "—"}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <div className="inline-flex items-center gap-2 font-semibold text-slate-900">
                      <UserPlus className="h-4 w-4 text-slate-500" aria-hidden />
                      Referrals
                    </div>
                    <Link
                      href={`/admin/drivers/referrals?driverId=${overviewDriver.id}`}
                      className="text-xs font-semibold text-blue-700 hover:text-blue-800 no-underline"
                    >
                      Open
                    </Link>
                  </div>
                  <div className="p-4">
                    {overviewReferrals ? (
                      <div className="space-y-2">
                        <div className="text-sm text-slate-700">
                          <span className="font-semibold">{overviewReferrals.totalReferrals}</span> total ·{" "}
                          <span className="font-semibold">{overviewReferrals.activeReferrals}</span> active ·{" "}
                          <span className="font-semibold">{overviewReferrals.totalCredits.toLocaleString()}</span> credits
                        </div>
                        {overviewReferrals.referralLink ? (
                          <div className="text-xs text-slate-500 break-all">
                            Link:{" "}
                            <a className="text-blue-700 hover:text-blue-800" href={overviewReferrals.referralLink} target="_blank" rel="noreferrer">
                              {overviewReferrals.referralLink}
                            </a>
                          </div>
                        ) : null}
                        {overviewReferrals.referrals?.length ? (
                          <div className="text-xs text-slate-600">
                            Recent: {overviewReferrals.referrals.slice(0, 3).map((r) => r.name).filter(Boolean).join(", ")}
                          </div>
                        ) : (
                          <div className="text-xs text-slate-500">No referrals found.</div>
                        )}
                      </div>
                    ) : overviewLoading ? (
                      <div className="text-sm text-slate-600">Loading referrals…</div>
                    ) : (
                      <div className="text-sm text-slate-600">Referrals unavailable.</div>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <div className="inline-flex items-center gap-2 font-semibold text-slate-900">
                      <Trophy className="h-4 w-4 text-slate-500" aria-hidden />
                      Bonuses
                    </div>
                    <Link
                      href={`/admin/drivers/bonuses?driverId=${overviewDriver.id}`}
                      className="text-xs font-semibold text-blue-700 hover:text-blue-800 no-underline"
                    >
                      Open
                    </Link>
                  </div>
                  <div className="p-4">
                    {overviewBonuses ? (
                      <div className="space-y-3">
                        <div className="text-sm text-slate-700">
                          <span className="font-semibold">{overviewBonuses.total}</span> total bonuses
                        </div>
                        {overviewBonuses.items?.length ? (
                          <div className="space-y-2">
                            {overviewBonuses.items.slice(0, 5).map((b) => (
                              <div key={b.id} className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="text-xs font-medium text-slate-800 truncate" title={b.reason || ""}>
                                    {b.reason || b.period || "Bonus"}
                                  </div>
                                  <div className="text-[11px] text-slate-500 tabular-nums">{formatDateShort(b.date)}</div>
                                </div>
                                <div className="text-xs font-semibold text-slate-900 tabular-nums">{Number(b.amount || 0).toLocaleString()}</div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-xs text-slate-500">No bonus history found.</div>
                        )}
                      </div>
                    ) : overviewLoading ? (
                      <div className="text-sm text-slate-600">Loading bonuses…</div>
                    ) : (
                      <div className="text-sm text-slate-600">Bonuses unavailable.</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                  <div className="font-semibold text-slate-900">Quick links</div>
                </div>
                <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <Link href={`/admin/drivers/activities?driverId=${overviewDriver.id}`} className="text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl no-underline inline-flex items-center justify-center">Activities</Link>
                  <Link href={`/admin/drivers/stats?driverId=${overviewDriver.id}`} className="text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl no-underline inline-flex items-center justify-center">Stats</Link>
                  <Link href={`/admin/drivers/referrals?driverId=${overviewDriver.id}`} className="text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl no-underline inline-flex items-center justify-center">Referrals</Link>
                  <Link href={`/admin/drivers/bonuses?driverId=${overviewDriver.id}`} className="text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl no-underline inline-flex items-center justify-center">Bonuses</Link>
                  <Link href={`/admin/drivers/levels?driverId=${overviewDriver.id}`} className="text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl no-underline inline-flex items-center justify-center">Levels</Link>
                  <Link href={`/admin/drivers/trips?driverId=${overviewDriver.id}`} className="text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl no-underline inline-flex items-center justify-center">Trips</Link>
                  <Link href={`/admin/drivers/reminders?driverId=${overviewDriver.id}`} className="text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl no-underline inline-flex items-center justify-center">Reminders</Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
