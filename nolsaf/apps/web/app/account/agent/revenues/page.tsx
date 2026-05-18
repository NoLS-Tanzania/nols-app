"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, TrendingUp, DollarSign, CalendarDays, Package, Clock, Info } from "lucide-react";
import apiClient from "@/lib/apiClient";
import LogoSpinner from "@/components/LogoSpinner";

const api = apiClient;

type RevenueItem = {
  id: string | number;
  title: string;
  tripType: string;
  status: string;
  isCompleted: boolean;
  budget: number;
  commissionPercent: number;
  commissionAmount: number;
  agentEarning: number;
  currency: string;
  dateFrom?: string | null;
  dateTo?: string | null;
  createdAt?: string;
  completedAt?: string | null;
  client: string;
  nationality?: string | null;
};

type RevenueSummary = {
  totalTrips: number;
  completedTrips: number;
  totalRevenue: number;
  pendingRevenue: number;
  totalCommissionPaid: number;
  commissionPercent: number;
  currency: string;
  lifetimeRevenue: number;
};

function StatCard({ icon, label, value, sub, accent }: { icon: React.ReactNode; label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className={`group relative overflow-hidden rounded-xl border bg-white p-4 shadow-sm transition-all duration-200 hover:shadow-md ${accent ?? "border-slate-200"}`}>
      <div className="absolute inset-0 bg-gradient-to-br from-[#02665e]/5 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
      <div className={`relative z-10 mb-3 flex h-9 w-9 items-center justify-center rounded-lg ${accent ? "bg-amber-100 text-amber-700" : "bg-[#02665e]/10 text-[#02665e]"}`}>
        {icon}
      </div>
      <div className="relative z-10 text-xl font-extrabold text-slate-900">{value}</div>
      <div className="relative z-10 mt-0.5 text-xs font-semibold text-slate-500">{label}</div>
      {sub && <div className="relative z-10 mt-1 text-[11px] text-slate-400">{sub}</div>}
    </div>
  );
}

export default function AgentRevenuesPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<RevenueItem[]>([]);
  const [summary, setSummary] = useState<RevenueSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [claimingIds, setClaimingIds] = useState<Set<string | number>>(new Set());
  const [claimSuccess, setClaimSuccess] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/api/agent/revenues");
        const data = (res as any)?.data;
        setItems(Array.isArray(data?.items) ? data.items : []);
        setSummary(data?.summary ?? null);
      } catch {
        setError("Could not load revenue data.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleClaimPayout = async (itemId: string | number) => {
    setClaimingIds((prev) => new Set(prev).add(itemId));
    try {
      const res = await api.post("/api/agent/revenues/claim", { planRequestId: itemId });
      const data = (res as any)?.data;
      if (data?.ok) {
        setClaimSuccess(`Payout request submitted (${data.invoiceNumber || "Invoice created"})`);
        setTimeout(() => setClaimSuccess(null), 4000);
        setItems((prev) => prev.filter((i) => i.id !== itemId));
        if (summary) {
          const claimedItem = items.find((i) => i.id === itemId);
          if (claimedItem) {
            setSummary((prev) =>
              prev
                ? {
                    ...prev,
                    pendingRevenue: Math.max(0, prev.pendingRevenue - claimedItem.agentEarning),
                  }
                : prev
            );
          }
        }
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.response?.data?.error || "Failed to claim payout";
      setError(String(msg));
      setTimeout(() => setError(null), 4000);
    } finally {
      setClaimingIds((prev) => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }
  };

  const trend = useMemo(() => {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const now = new Date();
    const buckets = Array.from({ length: 6 }, (_, idx) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - idx), 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      return {
        key,
        label: `${monthNames[d.getMonth()]} ${String(d.getFullYear()).slice(-2)}`,
        paid: 0,
        pending: 0,
      };
    });

    const byKey = new Map(buckets.map((b) => [b.key, b]));

    for (const item of items) {
      const raw = item.completedAt || item.createdAt || item.dateFrom || item.dateTo;
      if (!raw) continue;
      const d = new Date(raw);
      if (Number.isNaN(d.getTime())) continue;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const bucket = byKey.get(key);
      if (!bucket) continue;
      if (item.isCompleted) bucket.paid += Number(item.agentEarning || 0);
      else bucket.pending += Number(item.agentEarning || 0);
    }

    const maxY = Math.max(1, ...buckets.map((b) => Math.max(b.paid, b.pending)));
    const pointsFor = (field: "paid" | "pending") =>
      buckets
        .map((b, i) => {
          const x = (i / Math.max(1, buckets.length - 1)) * 100;
          const y = 100 - (b[field] / maxY) * 100;
          return `${x},${Number.isFinite(y) ? y : 100}`;
        })
        .join(" ");

    return {
      buckets,
      maxY,
      paidPoints: pointsFor("paid"),
      pendingPoints: pointsFor("pending"),
    };
  }, [items]);

  const operationRows = useMemo(() => {
    return [...items].sort((a, b) => {
      const da = new Date(a.completedAt || a.createdAt || a.dateFrom || 0).getTime();
      const db = new Date(b.completedAt || b.createdAt || b.dateFrom || 0).getTime();
      return db - da;
    });
  }, [items]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LogoSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur-sm">
        <div className="relative mx-auto flex max-w-6xl items-center px-4 py-3">
          <Link
            href="/account/agent"
            className="inline-flex items-center gap-2 rounded-full px-2 py-1.5 text-sm font-semibold text-slate-500 no-underline transition hover:bg-slate-100 hover:text-[#02665e]"
            aria-label="Back to dashboard"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="hidden sm:inline">Back</span>
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6 space-y-6">
        <section
          className="relative rounded-2xl overflow-hidden shadow-2xl"
          style={{ background: "linear-gradient(135deg, #171437 0%, #123d52 42%, #0c6457 100%)", boxShadow: "0 28px 65px -15px rgba(12,100,87,0.42), 0 8px 22px -8px rgba(23,20,55,0.50)" }}
        >
          <svg
            aria-hidden
            className="absolute inset-0 h-full w-full pointer-events-none select-none"
            preserveAspectRatio="xMidYMid slice"
            viewBox="0 0 900 220"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="800" cy="42" r="185" stroke="white" strokeOpacity="0.055" strokeWidth="1" fill="none" />
            <circle cx="110" cy="190" r="120" stroke="white" strokeOpacity="0.045" strokeWidth="1" fill="none" />
            {[50, 96, 142, 188].map((y) => (
              <line key={y} x1="0" y1={y} x2="900" y2={y} stroke="rgba(255,255,255,0.028)" strokeWidth="1" />
            ))}
            <polyline
              points="0,170 100,145 210,156 330,118 460,138 590,94 710,116 830,78 900,88"
              fill="none"
              stroke="white"
              strokeOpacity="0.15"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <polygon
              points="0,170 100,145 210,156 330,118 460,138 590,94 710,116 830,78 900,88 900,220 0,220"
              fill="white"
              fillOpacity="0.024"
            />
            <radialGradient id="agentRevenueHeaderGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(45,212,191,0.22)" />
              <stop offset="100%" stopColor="rgba(45,212,191,0)" />
            </radialGradient>
            <ellipse cx="455" cy="112" rx="320" ry="145" fill="url(#agentRevenueHeaderGlow)" />
          </svg>

          <div className="relative z-10 flex flex-col items-center text-center px-6 py-10 sm:py-14">
            <div
              className="mb-5 inline-flex items-center justify-center rounded-full"
              style={{
                width: 64,
                height: 64,
                background: "rgba(255,255,255,0.10)",
                border: "1.5px solid rgba(255,255,255,0.18)",
                boxShadow: "0 0 0 8px rgba(255,255,255,0.05), 0 8px 32px rgba(0,0,0,0.35)",
              }}
            >
              <DollarSign className="h-7 w-7" style={{ color: "rgba(255,255,255,0.92)" }} aria-hidden />
            </div>
            <div className="text-xs font-black uppercase tracking-widest text-teal-100">Operator Earnings</div>
            <h1
              className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight"
              style={{ color: "#ffffff", textShadow: "0 2px 12px rgba(0,0,0,0.4)" }}
            >
              My Revenues
            </h1>
            <p className="mt-2 max-w-2xl text-sm sm:text-base" style={{ color: "rgba(255,255,255,0.60)" }}>
              Earnings, payout claims and commission history from completed bookings.
            </p>

            <div className="mt-4 relative group/tooltip inline-flex">
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-all duration-150 focus:outline-none"
                style={{ background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.70)" }}
                aria-label="Revenue information"
                onClick={(e) => {
                  e.preventDefault();
                  try {
                    (e.currentTarget as HTMLButtonElement).focus();
                  } catch {
                    // ignore
                  }
                }}
              >
                <Info className="h-3.5 w-3.5" aria-hidden />
                <span>Revenue flow</span>
              </button>
              <div
                role="tooltip"
                className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 z-50 mb-2 w-72 max-w-[calc(100vw-1rem)] whitespace-normal break-words rounded-xl px-3 py-2.5 text-left text-xs opacity-0 shadow-2xl transition-opacity duration-150 group-hover/tooltip:opacity-100 group-focus-within/tooltip:opacity-100"
                style={{ background: "#0b2a38", border: "1px solid rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.85)" }}
              >
                <div className="font-semibold mb-1" style={{ color: "#fff" }}>Revenue flow</div>
                <div className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.60)" }}>
                  Track completed-trip earnings, pending payout claims and commission retained by the platform.
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            icon={<DollarSign className="h-4 w-4" />}
            label="My Earnings"
            value={`TZS ${(summary?.totalRevenue ?? 0).toLocaleString()}`}
            sub="Your cut from paid trips"
          />
          <StatCard
            icon={<Clock className="h-4 w-4" />}
            label="Pending Payout"
            value={`TZS ${(summary?.pendingRevenue ?? 0).toLocaleString()}`}
            sub="Trips not yet paid out"
            accent="border-amber-200"
          />
          <StatCard
            icon={<TrendingUp className="h-4 w-4" />}
            label="Trips Done"
            value={`${summary?.completedTrips ?? 0} / ${summary?.totalTrips ?? 0}`}
            sub="Completed out of assigned"
          />
          <StatCard
            icon={<Package className="h-4 w-4" />}
            label="Commission Paid"
            value={`TZS ${(summary?.totalCommissionPaid ?? 0).toLocaleString()}`}
            sub={`${summary?.commissionPercent ?? 0}% operator rate`}
          />
        </div>

        {/* Error & Success Messages */}
        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}
        {claimSuccess && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            ✓ {claimSuccess}
          </div>
        )}

        {/* Trend chart */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-white px-4 py-4">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-widest text-slate-700">Operations trend</p>
              <p className="text-xs text-slate-500">Paid vs pending earnings (last 6 months)</p>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-semibold">
              <span className="inline-flex items-center gap-1 text-emerald-600">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> Paid
              </span>
              <span className="inline-flex items-center gap-1 text-amber-600">
                <span className="h-2 w-2 rounded-full bg-amber-500" /> Pending
              </span>
            </div>
          </div>

          <div className="relative m-4 h-52 rounded-xl border border-slate-100 bg-slate-50/60 p-3">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
              <line x1="0" y1="100" x2="100" y2="100" stroke="#cbd5e1" strokeWidth="0.7" />
              <line x1="0" y1="66" x2="100" y2="66" stroke="#e2e8f0" strokeWidth="0.5" />
              <line x1="0" y1="33" x2="100" y2="33" stroke="#e2e8f0" strokeWidth="0.5" />
              <polyline fill="none" stroke="#10b981" strokeWidth="2.4" points={trend.paidPoints} />
              <polyline fill="none" stroke="#f59e0b" strokeWidth="2.4" points={trend.pendingPoints} />
            </svg>
          </div>

          <div className="grid grid-cols-6 px-4 pb-4 text-center text-[10px] font-semibold text-slate-500">
            {trend.buckets.map((b) => (
              <span key={b.key}>{b.label}</span>
            ))}
          </div>
        </div>

        {/* Operations details */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="text-xs font-extrabold uppercase tracking-widest text-slate-500">Operations details</p>
            <p className="mt-1 text-xs text-slate-400">Live breakdown per trip: status, budget, commission, earnings, and payout action.</p>
          </div>

          {operationRows.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                <TrendingUp className="h-6 w-6 text-slate-400" />
              </div>
              <p className="text-sm font-semibold text-slate-500">No operations found</p>
              <p className="text-xs text-slate-400">Assigned and completed trips will appear here automatically.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[1100px] divide-y divide-slate-100 text-sm">
                <thead className="bg-slate-50">
                  <tr className="text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3 whitespace-nowrap">Operation</th>
                    <th className="px-4 py-3 whitespace-nowrap">Trip Status</th>
                    <th className="px-4 py-3 whitespace-nowrap">Budget</th>
                    <th className="px-4 py-3 whitespace-nowrap">Commission</th>
                    <th className="px-4 py-3 whitespace-nowrap">My Earning</th>
                    <th className="px-4 py-3 whitespace-nowrap">Dates</th>
                    <th className="px-4 py-3 whitespace-nowrap">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
              {operationRows.map((item) => {
                const isClaiming = claimingIds.has(item.id);
                return (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors align-top">
                    <td className="px-4 py-3 min-w-[220px]">
                      <div className="flex items-start gap-2.5">
                        <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${item.isCompleted ? "bg-[#02665e]/8 text-[#02665e]" : "bg-amber-50 text-amber-600"}`}>
                          {item.isCompleted ? <DollarSign className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-900">{item.title}</p>
                          <p className="text-xs text-slate-500">{item.client}{item.nationality ? ` • ${item.nationality}` : ""}</p>
                          <p className="text-[11px] text-slate-400">{item.tripType}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-bold uppercase ${item.isCompleted ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                        {item.isCompleted ? "Completed" : "Pending"}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-semibold text-slate-800">
                      TZS {item.budget.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-semibold text-slate-700">{item.commissionPercent}%</div>
                      <div className="text-xs text-slate-400">TZS {item.commissionAmount.toLocaleString()}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className={`font-bold ${item.isCompleted ? "text-[#02665e]" : "text-amber-600"}`}>
                        TZS {item.agentEarning.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-500">
                      <div className="flex items-center gap-1">
                        <CalendarDays className="h-3 w-3 shrink-0" />
                        {item.createdAt ? new Date(item.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "-"}
                      </div>
                      <div className="mt-1 text-[11px] text-slate-400">
                        {item.completedAt ? `Done: ${new Date(item.completedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}` : "In progress"}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {!item.isCompleted ? (
                        <button
                          onClick={() => handleClaimPayout(item.id)}
                          disabled={isClaiming}
                          className="px-3 py-1 text-xs font-semibold rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                        >
                          {isClaiming ? "..." : "Claim Payout"}
                        </button>
                      ) : (
                        <span className="text-[11px] font-semibold text-emerald-600">Settled</span>
                      )}
                    </td>
                  </tr>
                );
              })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
