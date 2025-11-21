"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { TrendingUp, AlertCircle, ArrowRight, FileText } from 'lucide-react';
import DriverAvailabilitySwitch from "@/components/DriverAvailabilitySwitch";
import StatCard from "./StatCard";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, BarChart, Bar } from "recharts";

const api = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_URL });

type DashboardStats = {
  todayGoal: number;
  todayEarnings: number;
  goalProgress: number; // percentage
  todaysRides: number;
  acceptanceRate: number;
  earningsBreakdown: {
    base: number;
    tips: number;
    bonus: number;
  };
  rating: number;
  totalReviews: number;
  onlineHours: number;
  peakHours: {
    active: boolean;
    start: string;
    end: string;
    multiplier: number;
    timeLeft: string;
  } | null;
  earningsChart: Array<{ day: string; amount: number }>;
  tripsChart: Array<{ hour: string; trips: number }>;
  demandZones: Array<{ name: string; level: 'high' | 'medium' | 'low' }>;
  recentTrips: Array<{
    id: string;
    time: string;
    from: string;
    to: string;
    distance: string;
    amount: number;
  }>;
  reminders: Array<{
    id: string;
    type: 'warning' | 'info';
    message: string;
    action?: string;
    actionLink?: string;
  }>;
};

export default function DriverDashboard({ className }: { className?: string }) {
  const [me, setMe] = useState<any | null | undefined>(undefined);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [reminders, setReminders] = useState<Array<DashboardStats['reminders'][number]>>([]);
  const [available, setAvailable] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem('driver_available');
      return raw === '1' || raw === 'true';
    } catch (e) {
      return false;
    }
  });

  // mapVisible state removed (was unused)

  

  const progressPct = stats ? Math.min(stats.goalProgress, 100) : 0;

  // Local goals stored in localStorage (optional override of server goal)
  const [goals, setGoals] = useState<{ trips?: number; money?: number; moneyUrgent?: boolean } | null>(null);
  const [showGoalsModal, setShowGoalsModal] = useState(false);

  // Form state for modal
  const [formTrips, setFormTrips] = useState<number | ''>('');
  const [formMoney, setFormMoney] = useState<number | ''>('');
  const [formMoneyUrgent, setFormMoneyUrgent] = useState(false);

  useEffect(() => {
    if (showGoalsModal) {
      setFormTrips(goals?.trips ?? '');
      setFormMoney(goals?.money ?? '');
      setFormMoneyUrgent(!!goals?.moneyUrgent);
    }
  }, [showGoalsModal, goals]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('driver_goals');
      if (raw) setGoals(JSON.parse(raw));
    } catch (e) {
      // ignore
    }
  }, []);

  const saveGoals = (g: { trips?: number; money?: number; moneyUrgent?: boolean } | null) => {
    try {
      if (g) {
        localStorage.setItem('driver_goals', JSON.stringify(g));
        setGoals(g);
      } else {
        localStorage.removeItem('driver_goals');
        setGoals(null);
      }
    } catch (e) {}
  };

    const handleSaveGoals = () => {
      const g: any = {};
      if (formTrips !== '' && formTrips != null) g.trips = Number(formTrips);
      if (formMoney !== '' && formMoney != null) g.money = Number(formMoney);
      if (formMoneyUrgent) g.moneyUrgent = true;
      // if nothing set, treat as clearing goals
      if (Object.keys(g).length === 0) {
        saveGoals(null);
      } else {
        saveGoals(g);
      }
      setShowGoalsModal(false);
    };

    const handleClearGoals = () => {
      saveGoals(null);
      setShowGoalsModal(false);
    };

  // Fetch user profile
  useEffect(() => {
    try {
      const t = localStorage.getItem("token");
      if (t) api.defaults.headers.common["Authorization"] = `Bearer ${t}`;
      api
        .get("/account/me")
        .then((r) => setMe(r.data))
        .catch(() => setMe(null));
    } catch (err) {
      setMe(null);
    }
  }, []);

  // Fetch dashboard stats
  useEffect(() => {
    const loadStats = async () => {
      const startTime = Date.now();
      setLoading(true);
      try {
        const t = localStorage.getItem("token");
        if (t) api.defaults.headers.common["Authorization"] = `Bearer ${t}`;
        
        const res = await api.get("/driver/dashboard");
        setStats(res.data);
        // attempt to load persisted reminders separately (prefer dedicated endpoint)
        try {
          const rr = await api.get('/driver/reminders');
          if (Array.isArray(rr.data)) {
            // merge server reminders with dashboard computed reminders (dedupe by id)
            const computed = Array.isArray(res.data?.reminders) ? res.data.reminders : [];
            const mergedMap: Record<string, any> = {};
            [...rr.data, ...computed].forEach((r: any) => {
              if (r && r.id) mergedMap[String(r.id)] = r;
            });
            let merged = Object.values(mergedMap);
            // if there are no reminders at all, include two example admin reminders
            if (merged.length === 0) {
              merged = [
                {
                  id: 'admin-expiring-doc',
                  type: 'warning',
                  message: 'Vehicle insurance will expire in 20 days (admin)',
                  action: 'Renew Now',
                  actionLink: '/driver/management?tab=documents',
                },
                {
                  id: 'admin-policy-update',
                  type: 'info',
                  message: 'New payment policy effective next week (admin)',
                  action: 'Read',
                  actionLink: '/driver/announcements',
                },
              ];
            }
            setReminders(merged as any);
          } else {
            // fallback to dashboard reminders
            setReminders(Array.isArray(res.data?.reminders) ? res.data.reminders : []);
          }
        } catch (e) {
          // endpoint may not exist; fallback to dashboard reminders
          setReminders(Array.isArray(res.data?.reminders) ? res.data.reminders : []);
        }

        // Attempt to derive today's earnings from payout records so the
        // Earnings stat reflects real payout amounts when available.
        try {
          const pr = await api.get('/driver/payouts');
          const pdata = pr.data;
          const items = Array.isArray(pdata) ? pdata : Array.isArray(pdata.items) ? pdata.items : [];
          if (items && items.length) {
            // Aggregate month-to-date payouts (same year and month)
            const today = new Date();
            const isSameMonth = (iso: any) => {
              if (!iso) return false;
              try {
                const d = new Date(iso);
                return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth();
              } catch {
                return false;
              }
            };

            const total = items.reduce((acc: number, p: any) => {
              if (!isSameMonth(p.paidAt || p.date || p.createdAt || p.settledAt)) return acc;
              const val = Number(p.netPaid ?? p.net ?? p.amountNet ?? p.amount ?? 0) || 0;
              return acc + val;
            }, 0);

            if (total > 0) {
              // update the Earnings stat to reflect month-to-date payouts
              setStats((s: any) => ({ ...(s || {}), todayEarnings: total }));
            }
          }
        } catch (e) {
          // ignore payout aggregation errors and keep original dashboard stats
          console.debug('DriverDashboard: payout aggregation failed', e);
        }
      } catch (error) {
        console.error("Failed to load dashboard stats:", error);
        // Set default stats (all zero/empty) if API fails — avoid showing sample numbers
        setStats({
          todayGoal: 0,
          todayEarnings: 0,
          goalProgress: 0,
          todaysRides: 0,
          acceptanceRate: 0,
          earningsBreakdown: { base: 0, tips: 0, bonus: 0 },
          rating: 0,
          totalReviews: 0,
          onlineHours: 0,
          peakHours: null,
          earningsChart: [],
          tripsChart: [],
          demandZones: [],
          recentTrips: [],
          reminders: [],
        });
      } finally {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, 1000 - elapsed);
        setTimeout(() => setLoading(false), remaining);
      }
    };

    loadStats();
  }, []);

  // Listen to availability changes
  useEffect(() => {
    const handler = (ev: Event) => {
      try {
        const detail = (ev as CustomEvent).detail || {};
        if (typeof detail.available === 'boolean') {
          setAvailable(detail.available);
        }
      } catch (e) {}
    };

    const storageHandler = (e: StorageEvent) => {
      if (e.key === 'driver_available') {
        const val = e.newValue;
        const avail = val === '1' || val === 'true';
        setAvailable(avail);
      }
    };

    window.addEventListener('nols:availability:changed', handler as EventListener);
    window.addEventListener('storage', storageHandler as any);
    return () => {
      window.removeEventListener('nols:availability:changed', handler as EventListener);
      window.removeEventListener('storage', storageHandler as any);
    };
  }, []);

  // Map initialization is centralized in DriverLiveMap to avoid duplicate instances.

  const name = me && (me.fullName || me.email) ? (me.fullName || me.email) : "Driver";
  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const fmtMoney = (n: number) => n.toLocaleString();

  

  if (loading) {
    return (
      <div className={`space-y-6 ${className || ""}`}>
        <div className="animate-pulse space-y-6">
          <div className="h-16 bg-gray-200 rounded-lg" />
          <div className="h-12 bg-gray-200 rounded-lg" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg" />
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded-lg" />
        </div>
      </div>
    );
  }

  if (!stats) return null;

  // Prepare trips chart data: prefer `name` (property) when available, otherwise fall back to `hour`.
  const rawTripsChart = stats.tripsChart || [];
  const tripsChartData = Array.isArray(rawTripsChart)
    ? rawTripsChart.map((entry: any) => ({
        name: entry?.name ?? entry?.hour ?? String(entry?.label ?? ''),
        trips: Number(entry?.trips ?? entry?.value ?? 0),
      }))
    : [];

  // Map known time buckets to property types and aggregate into property buckets
  const hourToProperty: Record<string, string> = {
    '6AM': 'Hotel',
    '9AM': 'Lodge',
    '12PM': 'Condo',
    '3PM': 'Villa',
    '6PM': 'Apartment',
    '9PM': 'Guest Houses',
  };

  // Known property types include common categories and some region-specific names
  const knownProperties = new Set([
    'Hotel',
    'Lodge',
    'Condo',
    'Villa',
    'Apartment',
    'Guest Houses',
    'House Town',
    'Resort',
    'Cottage',
  ]);

  const propMap: Record<string, number> = {};
  tripsChartData.forEach((e: any) => {
    const key = String(e.name).trim();
    const mapped = hourToProperty[key];
    const prop = mapped ?? (knownProperties.has(key) ? key : 'Others');
    propMap[prop] = (propMap[prop] || 0) + (Number(e.trips) || 0);
  });

  // create array sorted descending by trips
  const sorted = Object.keys(propMap).map((k) => ({ name: k, trips: propMap[k] })).sort((a, b) => (b.trips || 0) - (a.trips || 0));

  // center the largest item in the middle, alternate placing next items to right then left
  const centerArrange = (items: Array<any>) => {
    const n = items.length;
    if (n === 0) return items;
    const res = new Array(n).fill(null);
    const center = Math.floor((n - 1) / 2);
    let left = center - 1;
    let right = center + 1;
    let i = 0;
    res[center] = items[i++];
    while (i < items.length) {
      if (right < n) {
        res[right] = items[i++];
        right++;
      }
      if (i < items.length && left >= 0) {
        res[left] = items[i++];
        left--;
      }
    }
    return res.filter(Boolean);
  };

  const tripsByProperty = centerArrange(sorted);

  const chartHeight = Math.max(150, tripsByProperty.length * 40);

  // Custom tick renderer to display multi-line labels (split on spaces or '/').
  const MultiLineTick = ({ x, y, payload }: any) => {
    const raw = String(payload?.value ?? '');
    // split on spaces or slashes to create multiple lines
    const parts = raw.split(/\s+|\//).filter(Boolean);
    const lineHeight = 12;
    return (
      <g transform={`translate(${x},${y + 10})`}>
        <text x={0} y={0} textAnchor="end" fontSize={12} fill="#374151">
          {parts.map((line: string, i: number) => (
            <tspan key={i} x={0} dy={i === 0 ? 0 : lineHeight}>{line}</tspan>
          ))}
        </text>
      </g>
    );
  };

  // Mark reminder as read (optimistic)
  const markAsRead = async (id: string) => {
    try {
      const t = localStorage.getItem('token');
      if (t) api.defaults.headers.common['Authorization'] = `Bearer ${t}`;
      await api.post(`/driver/reminders/${encodeURIComponent(id)}/read`);
    } catch (e) {
      // ignore errors, continue to remove locally
    }
    setReminders((r) => r.filter((x) => String(x.id) !== String(id)));
  };

  return (
    <div className={`space-y-6 ${className || ""}`}>
      {/* Header with Greeting and Status Toggle */}
      <div className="bg-transparent rounded-lg p-6 greeting-accent">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900">{greeting()}, {name}</h1>
            <p className="mt-1">
              <span className={available ? 'text-emerald-600' : 'text-gray-600'}>
                {available ? "You're online and ready for rides" : "You're offline"}
              </span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right mr-3">
              <div className="text-sm text-gray-600">Status:</div>
              <div className="text-lg font-semibold flex items-center gap-2">
                <span className={`status-dot ${available ? 'online' : 'offline'}`} />
                {available ? 'Online' : 'Offline'}
              </div>
            </div>
            <DriverAvailabilitySwitch />
          </div>
        </div>
      </div>

      {/* Goal Progress Bar */}
      <div className="bg-white rounded-lg p-5 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            <span className="font-semibold text-gray-800">Week Goal</span>
            {goals?.moneyUrgent && (
              <span className="ml-2 inline-block text-xs px-2 py-0.5 rounded bg-red-100 text-red-700 font-medium">URGENT</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">{Math.round(
              goals && goals.money ? Math.min((stats.todayEarnings / goals.money) * 100, 100) : stats.goalProgress
            )}%</span>
            <button onClick={() => setShowGoalsModal(true)} className="text-sm px-3 py-1 rounded-lg border bg-white hover:bg-gray-50">Set Goals</button>
          </div>
        </div>

        <div className="mb-2">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-600">{fmtMoney(stats.todayEarnings)}/</span>
            <span className="text-sm font-medium text-red-600">{fmtMoney(goals && goals.money ? goals.money : stats.todayGoal)} TZS</span>
          </div>
        </div>

        {/* Money progress bar */}
        <div className="w-full bg-gray-200 rounded-full h-3 relative overflow-hidden mb-3">
          <div
            className={`bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500 absolute top-0 left-0 w-pct-${Math.round(goals && goals.money ? Math.min((stats.todayEarnings / goals.money) * 100, 100) : progressPct)}`}
          />
        </div>

        {/* Trips progress (when trips goal set) */}
        {goals && goals.trips ? (
          <div>
            <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
              <div>Trips: {stats.todaysRides}/{goals.trips}</div>
              <div>{Math.round(Math.min((stats.todaysRides / goals.trips) * 100, 100))}%</div>
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className={`bg-emerald-500 h-2 rounded-full w-pct-${Math.round(Math.min((stats.todaysRides / goals.trips) * 100, 100))}`}
              />
            </div>
            </div>
          </div>
        ) : null}

        {/* Goals Modal */}
        {showGoalsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black opacity-30" onClick={() => setShowGoalsModal(false)} />
            <div className="relative bg-white rounded-lg shadow-lg w-full max-w-md p-6 z-10">
              <h3 className="text-lg font-semibold mb-3">Set Your Goals</h3>
              <div className="space-y-3">
                <label htmlFor="formTrips" className="block text-sm text-gray-700">How many trips do you wish to accomplish this week?</label>
                <input
                  id="formTrips"
                  type="number"
                  placeholder="e.g. 20"
                  title="Number of trips goal"
                  value={formTrips as any}
                  onChange={(e) => setFormTrips(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full p-2 border rounded"
                />

                <label htmlFor="formMoney" className="block text-sm text-gray-700">How much money do you wish to have this week? (TZS)</label>
                <input
                  id="formMoney"
                  type="number"
                  placeholder="e.g. 100000"
                  title="Money goal in TZS"
                  value={formMoney as any}
                  onChange={(e) => setFormMoney(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full p-2 border rounded"
                />

                <label className="inline-flex items-center gap-2 mt-2">
                  <input type="checkbox" checked={formMoneyUrgent} onChange={(e) => setFormMoneyUrgent(e.target.checked)} />
                  <span className="text-sm text-gray-700">Is the money urgent?</span>
                </label>
              </div>

              <div className="mt-4 flex items-center justify-end gap-2">
                <button onClick={handleClearGoals} className="px-3 py-1 rounded border text-sm text-red-600">Clear</button>
                <button onClick={() => setShowGoalsModal(false)} className="px-3 py-1 rounded border text-sm">Cancel</button>
                <button onClick={handleSaveGoals} className="px-3 py-1 rounded bg-blue-600 text-white text-sm">Save</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Stats Grid (compact cards matching admin dimensions) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mt-6">
        <StatCard
          label="Rides"
          value={stats?.todaysRides ?? 0}
          hint={`Accept: ${stats?.acceptanceRate ?? 0}%`}
          color="blue"
          href="/driver/history"
          size="sm"
        />

        <StatCard
          label="Earnings"
          value={fmtMoney(stats?.todayEarnings ?? 0)}
          hint={`+${fmtMoney((stats?.earningsBreakdown?.tips ?? 0) + (stats?.earningsBreakdown?.bonus ?? 0))}`}
          color="emerald"
          href="/driver/payouts"
          size="sm"
        />

        <StatCard
          label="Rating"
          value={`${(stats?.rating ?? 0).toFixed(1)}★`}
          hint={`${stats?.totalReviews ?? 0} reviews`}
          color="amber"
          href="/driver/profile"
          size="sm"
        />

        <StatCard
          label="Online"
          value={`${Math.round(stats?.onlineHours ?? 0)} hrs`}
          hint="Active"
          color="purple"
          href="/driver/profile"
          size="sm"
        />
      </div>

      {/* Peak Hours Alert removed per request */}

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Earnings Chart */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="font-medium text-gray-800 mb-3">Earnings (7 days)</div>
          <ResponsiveContainer width="100%" height={150}>
            <LineChart data={stats.earningsChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value: any) => `${fmtMoney(value)} TZS`} />
              <Line 
                type="monotone" 
                dataKey="amount" 
                stroke="#2563eb" 
                strokeWidth={2}
                dot={{ fill: '#2563eb', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Trips by Properties */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="font-medium text-gray-800 mb-3">Trips by Properties</div>
          <ResponsiveContainer width="100%" height={Math.max(240, Math.min(420, chartHeight))}>
            <BarChart
              data={tripsByProperty}
              margin={{ top: 10, right: 20, left: 20, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" type="category" tick={<MultiLineTick />} interval={0} />
              <YAxis type="number" tick={{ fontSize: 12 }} />
              <Tooltip
                content={({ active, payload }: any) => {
                  if (!active || !payload || !payload.length) return null;
                  const p = payload[0];
                  const name = p?.payload?.name ?? p?.name ?? '';
                  const value = p?.value ?? 0;
                  return (
                    <div className="bg-white text-sm rounded shadow-md p-2">
                      <div className="font-medium text-gray-800">{name}</div>
                      <div className="text-xs text-gray-600">{value} trips</div>
                    </div>
                  );
                }}
              />
              <Bar dataKey="trips" barSize={24}>
                {tripsByProperty.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={["#7c3aed", "#059669", "#2563eb", "#e11d48", "#10b981", "#f97316"][index % 6]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* High Demand Zones moved to Live Map page */}

      {/* Recent Trips */}
      <div className="bg-white rounded-lg p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="font-semibold text-gray-800">RECENT TRIPS</div>
          <Link 
            href="/driver/history" 
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1 no-underline"
          >
            View All History <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="space-y-3">
          {stats.recentTrips.map((trip) => (
            <div 
              key={trip.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1">
                <div className="text-sm text-gray-600 w-16">{trip.time}</div>
                <ArrowRight className="h-4 w-4 text-gray-400" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">
                    {trip.from} → {trip.to}
                  </div>
                  <div className="text-xs text-gray-500">{trip.distance}</div>
                </div>
              </div>
              <div className="text-sm font-semibold text-gray-900">
                {fmtMoney(trip.amount)} TZS
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Reminders */}
      <div className="bg-white rounded-lg p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <AlertCircle className="h-5 w-5 text-amber-600" />
          <div className="font-semibold text-gray-800">REMINDERS</div>
        </div>
        <div className="space-y-3">
          {reminders.length === 0 ? (
            <div className="text-sm text-gray-600">You have no reminders right now.</div>
          ) : (
            reminders.map((reminder) => {
              const containerCls = reminder.type === 'warning' ? 'bg-amber-50 border border-amber-200' : 'bg-blue-50 border border-blue-200';
              return (
                <div key={reminder.id} className={`flex items-center justify-between p-3 rounded-lg ${containerCls}`}>
                  <div className="flex items-center gap-3 flex-1">
                    {reminder.type === 'warning' ? (
                      <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
                    ) : (
                      <FileText className="h-5 w-5 text-blue-600 flex-shrink-0" />
                    )}
                    <span className="text-sm text-gray-700">{reminder.message}</span>
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    {reminder.action && reminder.actionLink ? (
                      <Link href={reminder.actionLink} className="text-sm font-medium text-blue-600 hover:text-blue-700 no-underline whitespace-nowrap">
                        {reminder.action}
                      </Link>
                    ) : null}
                    <button onClick={() => markAsRead(String(reminder.id))} className="text-sm text-gray-600 hover:text-gray-800">Dismiss</button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
