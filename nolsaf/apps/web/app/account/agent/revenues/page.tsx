"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, TrendingUp, DollarSign, CalendarDays, Clock, Info, XCircle } from "lucide-react";
import apiClient from "@/lib/apiClient";
import LogoSpinner from "@/components/LogoSpinner";
import TableRow from "@/components/TableRow";

const api = apiClient;

type RevenueItem = {
  source?: "PLAN_REQUEST" | "TOUR_BOOKING";
  id: string | number;
  bookingCode?: string | null;
  paymentRef?: string | null;
  invoiceNumber?: string | null;
  invoiceStatus?: string | null;
  title: string;
  tripType: string;
  status: string;
  paymentStatus?: string | null;
  payoutStatus?: string | null;
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
  payoutRequestedAt?: string | null;
  payoutApprovedAt?: string | null;
  payoutPaidAt?: string | null;
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

type SortField = "operation" | "stage" | "updatedAt";
type SortDirection = "asc" | "desc";
type TrackerFilter = "ALL" | "NEW" | "CLAIMED" | "VERIFIED" | "APPROVED" | "DISBURSED" | "REJECTED";
type TrendRange = "24H" | "7D" | "1M" | "3M";

type AgentPayoutProfile = {
  payoutPreferred?: string | null;
  bankAccountName?: string | null;
  bankName?: string | null;
  bankAccountNumber?: string | null;
  bankBranch?: string | null;
  mobileMoneyProvider?: string | null;
  mobileMoneyNumber?: string | null;
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
  const [sortField, setSortField] = useState<SortField>("updatedAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [trackerFilter, setTrackerFilter] = useState<TrackerFilter>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [payoutProfile, setPayoutProfile] = useState<AgentPayoutProfile | null>(null);
  const [claimLookupCode, setClaimLookupCode] = useState("");
  const [claimLookupError, setClaimLookupError] = useState<string | null>(null);
  const [claimLookupMatch, setClaimLookupMatch] = useState<RevenueItem | null>(null);
  const [claimConsent, setClaimConsent] = useState(false);
  const [claimSubmitting, setClaimSubmitting] = useState(false);
  const [claimSubmitSuccessCard, setClaimSubmitSuccessCard] = useState<string | null>(null);
  const [showClaimConfirm, setShowClaimConfirm] = useState(false);
  const [trendRange, setTrendRange] = useState<TrendRange>("7D");

  const pageSize = 10;

  useEffect(() => {
    (async () => {
      try {
        const [revenuesRes, meRes] = await Promise.all([
          api.get("/api/agent/revenues"),
          api.get("/api/account/me").catch(() => null),
        ]);

        const data = (revenuesRes as any)?.data;
        setItems(Array.isArray(data?.items) ? data.items : []);
        setSummary(data?.summary ?? null);

        const mePayload = (meRes as any)?.data;
        const me = mePayload?.data ?? mePayload ?? null;
        if (me && typeof me === "object") {
          setPayoutProfile({
            payoutPreferred: me.payoutPreferred ?? null,
            bankAccountName: me.bankAccountName ?? null,
            bankName: me.bankName ?? null,
            bankAccountNumber: me.bankAccountNumber ?? null,
            bankBranch: me.bankBranch ?? null,
            mobileMoneyProvider: me.mobileMoneyProvider ?? null,
            mobileMoneyNumber: me.mobileMoneyNumber ?? null,
          });
        }
      } catch {
        setError("Could not load revenue data.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const lookupTourCode = useCallback((rawCode: string) => {
    const lookup = String(rawCode || "").trim().toUpperCase();
    if (!lookup) {
      setClaimLookupMatch(null);
      setClaimLookupError(null);
      return;
    }

    const match = items.find((item) => String(item.bookingCode || "").trim().toUpperCase() === lookup) || null;
    if (!match) {
      setClaimLookupMatch(null);
      setClaimLookupError("Tour code not found in your operations list.");
      return;
    }

    setClaimLookupError(null);
    setClaimLookupMatch(match);
  }, [items]);

  useEffect(() => {
    setClaimSubmitSuccessCard(null);
    const timer = setTimeout(() => {
      lookupTourCode(claimLookupCode);
    }, 120);

    return () => clearTimeout(timer);
  }, [claimLookupCode, lookupTourCode]);

  const handleSubmitClaimInitiator = () => {
    if (!claimLookupMatch?.bookingCode) {
      setClaimLookupError("Please lookup and select a valid tour code first.");
      return;
    }
    if (!claimConsent) {
      setClaimLookupError("Please agree to the disbursement policy before submitting.");
      return;
    }
    setClaimLookupError(null);
    setShowClaimConfirm(true);
  };

  const confirmClaimSubmit = async () => {
    setShowClaimConfirm(false);
    setClaimSubmitting(true);
    try {
      const res = await api.post("/api/agent/revenues/claim-by-tour-code", {
        tourCode: claimLookupMatch!.bookingCode,
      });
      const data = (res as any)?.data;
      if (data?.ok) {
        const claimedAt = data?.claimedAt || new Date().toISOString();
        const status = data?.payoutStatus || "REQUESTED";
        setItems((prev) =>
          prev.map((item) =>
            String(item.bookingCode || "").trim().toUpperCase() === String(claimLookupMatch!.bookingCode || "").trim().toUpperCase()
              ? {
                  ...item,
                  payoutRequestedAt: claimedAt,
                  payoutStatus: status,
                  invoiceStatus: item.invoiceStatus || status,
                }
              : item
          )
        );
        setClaimSubmitSuccessCard("Thanks for submitting your claim. NoLSAF is processing it and you can track the status above.");
        setClaimConsent(false);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.response?.data?.error || "Failed to submit payout claim";
      setClaimLookupError(String(msg));
    } finally {
      setClaimSubmitting(false);
    }
  };

  const handleClaimPayout = async (itemId: string | number) => {
    if (typeof itemId !== "number") {
      setError("Payout claim is available for assigned legacy trips only.");
      setTimeout(() => setError(null), 3000);
      return;
    }
    setClaimingIds((prev) => new Set(prev).add(itemId));
    try {
      const res = await api.post("/api/agent/revenues/claim", { planRequestId: itemId });
      const data = (res as any)?.data;
      if (data?.ok) {
        setClaimSuccess(`Payout request submitted (${data.invoiceNumber || "Invoice created"})`);
        setTimeout(() => setClaimSuccess(null), 4000);
        setItems((prev) =>
          prev.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  invoiceNumber: data.invoiceNumber || item.invoiceNumber || null,
                  invoiceStatus: data.invoiceStatus || item.invoiceStatus || "DRAFT",
                  payoutRequestedAt: data.claimedAt || item.payoutRequestedAt || new Date().toISOString(),
                }
              : item
          )
        );
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
    const now = new Date();

    const config =
      trendRange === "24H"
        ? { count: 24, unit: "hour" as const }
        : trendRange === "7D"
          ? { count: 7, unit: "day" as const }
          : trendRange === "1M"
            ? { count: 30, unit: "day" as const }
            : { count: 12, unit: "week" as const }; // 3M

    const startAt = new Date(now);
    if (config.unit === "hour") {
      startAt.setMinutes(0, 0, 0);
      startAt.setHours(startAt.getHours() - (config.count - 1));
    } else if (config.unit === "day") {
      startAt.setHours(0, 0, 0, 0);
      startAt.setDate(startAt.getDate() - (config.count - 1));
    } else {
      startAt.setHours(0, 0, 0, 0);
      startAt.setDate(startAt.getDate() - ((config.count - 1) * 7));
    }

    const buckets = Array.from({ length: config.count }, (_, idx) => {
      const d = new Date(startAt);
      if (config.unit === "hour") d.setHours(d.getHours() + idx);
      else if (config.unit === "day") d.setDate(d.getDate() + idx);
      else d.setDate(d.getDate() + idx * 7);

      const key =
        config.unit === "hour"
          ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}-${String(d.getHours()).padStart(2, "0")}`
          : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

      const label =
        config.unit === "hour"
          ? d.toLocaleString(undefined, { hour: "2-digit" })
          : config.unit === "day"
            ? d.toLocaleString(undefined, { month: "short", day: "numeric" })
            : d.toLocaleString(undefined, { month: "short", day: "numeric" });

      return { key, label, paid: 0, pending: 0, time: d.getTime() };
    });

    const byKey = new Map(buckets.map((b) => [b.key, b]));

    for (const item of items) {
      const raw = item.completedAt || item.createdAt || item.dateFrom || item.dateTo;
      if (!raw) continue;
      const d = new Date(raw);
      if (Number.isNaN(d.getTime()) || d < startAt || d > now) continue;

      let key = "";
      if (config.unit === "hour") {
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}-${String(d.getHours()).padStart(2, "0")}`;
      } else if (config.unit === "day") {
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      } else {
        const weekStart = new Date(d);
        weekStart.setHours(0, 0, 0, 0);
        const diffDays = Math.floor((weekStart.getTime() - startAt.getTime()) / (24 * 60 * 60 * 1000));
        const bucketIndex = Math.min(config.count - 1, Math.max(0, Math.floor(diffDays / 7)));
        key = buckets[bucketIndex]?.key || "";
      }

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
  }, [items, trendRange]);

  const normalizedStage = useCallback((item: RevenueItem): "NEW" | "VERIFIED" | "APPROVED" | "DISBURSED" | "REJECTED" => {
    const payment = String(item.paymentStatus || "").toUpperCase();
    const payout = String(item.payoutStatus || "").toUpperCase();
    const invoice = String(item.invoiceStatus || "").toUpperCase();

    if (payment === "REJECTED" || payout === "REJECTED" || invoice === "REJECTED") return "REJECTED";
    if (item.payoutPaidAt || payment === "DISBURSED" || payout === "DISBURSED" || payout === "PAID") return "DISBURSED";
    if (item.payoutApprovedAt || payment === "APPROVED" || payout === "APPROVED" || invoice === "APPROVED") return "APPROVED";
    // VERIFIED is an explicit admin action on a submitted claim. A customer
    // payment of PAID does NOT verify the payout — the record stays NEW until
    // the operator sends a claim, then CLAIMED until NoLSAF verifies it.
    if (payout === "VERIFIED" || invoice === "VERIFIED" || payment === "VERIFIED") return "VERIFIED";
    return "NEW";
  }, []);

  const hasClaimStarted = useCallback((item: RevenueItem) => {
    const payout = String(item.payoutStatus || "").toUpperCase();
    return Boolean(item.invoiceNumber || item.invoiceStatus || item.payoutRequestedAt || payout === "CLAIMED" || payout === "REQUESTED");
  }, []);

  const trackerStage = useCallback((item: RevenueItem): Exclude<TrackerFilter, "ALL"> => {
    const stage = normalizedStage(item);
    if (stage === "REJECTED") return "REJECTED";
    if (stage === "DISBURSED") return "DISBURSED";
    if (stage === "APPROVED") return "APPROVED";
    if (stage === "VERIFIED") return "VERIFIED";
    if (hasClaimStarted(item)) return "CLAIMED";
    return "NEW";
  }, [hasClaimStarted, normalizedStage]);

  const trackerCounts = useMemo(() => {
    const counts: Record<TrackerFilter, number> = {
      ALL: items.length,
      NEW: 0,
      CLAIMED: 0,
      VERIFIED: 0,
      APPROVED: 0,
      DISBURSED: 0,
      REJECTED: 0,
    };
    for (const item of items) {
      counts[trackerStage(item)] += 1;
    }
    return counts;
  }, [items, trackerStage]);

  const operationRows = useMemo(() => {
    const filtered = trackerFilter === "ALL" ? [...items] : items.filter((item) => trackerStage(item) === trackerFilter);
    const sorted = filtered.sort((a, b) => {
      const latestA = new Date(a.payoutPaidAt || a.payoutApprovedAt || a.payoutRequestedAt || a.completedAt || a.createdAt || a.dateFrom || a.dateTo || 0).getTime();
      const latestB = new Date(b.payoutPaidAt || b.payoutApprovedAt || b.payoutRequestedAt || b.completedAt || b.createdAt || b.dateFrom || b.dateTo || 0).getTime();

      let cmp = 0;
      if (sortField === "operation") {
        cmp = String(a.title || "").localeCompare(String(b.title || ""), undefined, { sensitivity: "base" });
      } else if (sortField === "stage") {
        cmp = normalizedStage(a).localeCompare(normalizedStage(b), undefined, { sensitivity: "base" });
      } else {
        cmp = latestA - latestB;
      }

      return sortDirection === "asc" ? cmp : -cmp;
    });

    return sorted;
  }, [items, sortField, sortDirection, trackerFilter, trackerStage, normalizedStage]);

  const totalPages = Math.max(1, Math.ceil(operationRows.length / pageSize));

  const pagedOperationRows = useMemo(() => {
    const safePage = Math.min(currentPage, totalPages);
    const start = (safePage - 1) * pageSize;
    return operationRows.slice(start, start + pageSize);
  }, [operationRows, currentPage, totalPages]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const toggleSort = (field: SortField) => {
    setCurrentPage(1);
    setSortField((prevField) => {
      if (prevField === field) {
        setSortDirection((prevDir) => (prevDir === "asc" ? "desc" : "asc"));
        return prevField;
      }
      setSortDirection("asc");
      return field;
    });
  };

  const sortIndicator = (field: SortField) => {
    if (sortField !== field) return "";
    return sortDirection === "asc" ? " ↑" : " ↓";
  };

  const hasTourRows = useMemo(() => items.some((item) => item.source === "TOUR_BOOKING"), [items]);
  const displayCurrency = hasTourRows ? "USD" : (summary?.currency || "USD");
  const cancelledTrips = useMemo(
    () => items.filter((item) => /CANCEL|REJECT|REFUND/i.test(String(item.status || ""))).length,
    [items]
  );
  const trendLabelStep = useMemo(() => {
    const len = trend.buckets.length;
    if (len <= 8) return 1;
    if (len <= 16) return 2;
    return Math.ceil(len / 8);
  }, [trend.buckets.length]);
  const trendTotals = useMemo(() => {
    return trend.buckets.reduce(
      (acc, b) => {
        acc.paid += Number(b.paid || 0);
        acc.pending += Number(b.pending || 0);
        return acc;
      },
      { paid: 0, pending: 0 }
    );
  }, [trend.buckets]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LogoSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-clip bg-slate-50">
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

      <div className="mx-auto max-w-6xl min-w-0 px-4 py-6 space-y-6">
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
            value={`${displayCurrency} ${(summary?.totalRevenue ?? 0).toLocaleString()}`}
            sub="Your cut from paid trips"
          />
          <StatCard
            icon={<Clock className="h-4 w-4" />}
            label="Pending Payout"
            value={`${displayCurrency} ${(summary?.pendingRevenue ?? 0).toLocaleString()}`}
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
            icon={<XCircle className="h-4 w-4" />}
            label="Cancelled"
            value={String(cancelledTrips)}
            sub="Cancelled or rejected trips"
            accent="border-rose-200"
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

        {/* Payments tracker (moved to trend area) */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-100 bg-white px-4 py-4">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-widest text-slate-700">Payments tracker</p>
              <p className="text-xs text-slate-500">Click invoice-flow status to quickly filter and track disbursement progress.</p>
            </div>
          </div>

          <div className="mx-auto w-full max-w-5xl min-w-0 px-2 py-4 sm:px-4">
            <div className="overflow-x-auto pb-1 [scrollbar-width:thin]">
              <div className="flex min-w-max items-center gap-2 px-1 pr-4 sm:min-w-0 sm:justify-center sm:px-0 sm:pr-0">
              {([
                ["ALL", "All"],
                ["NEW", "New"],
                ["CLAIMED", "Claimed"],
                ["VERIFIED", "Verified"],
                ["APPROVED", "Approved"],
                ["DISBURSED", "Disbursed"],
                ["REJECTED", "Rejected"],
              ] as const).map(([key, label]) => {
                const active = trackerFilter === key;
                const tone =
                  key === "DISBURSED"
                    ? "border-emerald-200 text-emerald-700 bg-emerald-50"
                    : key === "APPROVED"
                      ? "border-cyan-200 text-cyan-700 bg-cyan-50"
                      : key === "VERIFIED"
                        ? "border-amber-200 text-amber-700 bg-amber-50"
                        : key === "REJECTED"
                          ? "border-rose-200 text-rose-700 bg-rose-50"
                          : key === "CLAIMED"
                            ? "border-indigo-200 text-indigo-700 bg-indigo-50"
                            : "border-slate-200 text-slate-700 bg-white";

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setTrackerFilter(key);
                      setCurrentPage(1);
                    }}
                    className={`inline-flex min-h-10 items-center justify-center whitespace-nowrap rounded-md border px-2.5 py-1.5 text-sm font-semibold transition ${active ? tone : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-800"}`}
                  >
                    <span className="inline-flex items-center gap-2 leading-none">
                      <span>{label}</span>
                      <span className={`inline-flex h-6 w-8 items-center justify-center rounded-md px-0 py-0.5 text-[11px] font-bold sm:h-auto sm:w-9 sm:rounded-full sm:text-xs ${active ? "bg-white/80" : "bg-slate-100"}`}>
                        {trackerCounts[key]}
                      </span>
                    </span>
                  </button>
                );
              })}
              </div>
            </div>
            <p className="mx-auto mt-2 max-w-3xl text-center text-xs leading-relaxed text-slate-500">
              Track invoice processing pipeline by status: New, Claimed, Verified, Approved, Disbursed, and Rejected.
            </p>

            <div className="mx-auto mt-4 w-full max-w-2xl min-w-0 overflow-visible rounded-xl border border-slate-200 bg-slate-50/60 p-3 sm:p-4">
              <p className="text-xs font-extrabold uppercase tracking-widest text-slate-700">Claim Payout Initiator</p>
              <p className="mt-1 text-xs text-slate-500">Enter the tour code to initiate an invoice claim and submit it to NoLSAF.</p>

              <div className="mx-auto w-full min-w-0">
                <div className="mt-3 flex w-full justify-center px-1">
                  <input
                    type="text"
                    value={claimLookupCode}
                    onChange={(e) => setClaimLookupCode(e.target.value.toUpperCase())}
                    placeholder="Enter Tour Code (e.g. TB-14)"
                    className="block h-10 w-full max-w-[17rem] min-w-0 box-border rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold tracking-wide text-slate-700 outline-none transition focus:border-[#02665e] sm:max-w-md"
                  />
                </div>

                {claimLookupError && (
                  <div className="mx-auto mt-3 w-full max-w-[17rem] rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 sm:max-w-md">
                    {claimLookupError}
                  </div>
                )}
              </div>

              {claimLookupMatch && (
                <div className="mt-4 min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/70 px-4 py-2.5">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-slate-600">Claim summary</p>
                    <span className="max-w-full truncate rounded-full border border-teal-200 bg-teal-50 px-2.5 py-0.5 text-[11px] font-bold text-teal-700">
                      {claimLookupMatch.bookingCode || claimLookupCode}
                    </span>
                  </div>

                  <dl className="grid grid-cols-1 gap-x-6 gap-y-3 px-4 py-4 sm:grid-cols-2">
                    {([
                      ["Operation", claimLookupMatch.title || "-"],
                      ["Client", claimLookupMatch.client || "-"],
                      ["Nationality", claimLookupMatch.nationality || "-"],
                      ["Total Paid", `${claimLookupMatch.currency} ${Number(claimLookupMatch.budget || 0).toLocaleString()}`],
                      ["Agent Revenue", `${claimLookupMatch.currency} ${Number(claimLookupMatch.agentEarning || 0).toLocaleString()}`],
                      ["NoLSAF Commission", `${claimLookupMatch.currency} ${Number(claimLookupMatch.commissionAmount || 0).toLocaleString()} (${Number(claimLookupMatch.commissionPercent || 0)}%)`],
                    ] as const).map(([label, value]) => (
                      <div key={label} className="min-w-0">
                        <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
                        <dd className="mt-0.5 break-words text-sm font-semibold text-slate-800">{value}</dd>
                      </div>
                    ))}
                  </dl>

                  <div className="mx-4 mb-4 min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Preferred payout destination</div>
                    <dl className="mt-2 grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
                      {(String(payoutProfile?.payoutPreferred || "").toUpperCase() === "BANK"
                        ? ([
                            ["Method", "Bank Account"],
                            ["Bank", payoutProfile?.bankName || "Not provided"],
                            ["Account Name", payoutProfile?.bankAccountName || "Not provided"],
                            ["Account Number", payoutProfile?.bankAccountNumber || "Not provided"],
                            ["Branch", payoutProfile?.bankBranch || "Not provided"],
                          ] as const)
                        : ([
                            ["Method", "Mobile Money"],
                            ["Provider", payoutProfile?.mobileMoneyProvider || "Not provided"],
                            ["Phone", payoutProfile?.mobileMoneyNumber || "Not provided"],
                          ] as const)
                      ).map(([label, value]) => (
                        <div key={label} className="min-w-0">
                          <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
                          <dd className={`mt-0.5 break-words text-xs font-semibold ${String(value) === "Not provided" ? "text-slate-400" : "text-slate-700"}`}>{value}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>

                  <label className="mx-4 flex items-start gap-2 text-xs text-slate-700">
                    <input
                      type="checkbox"
                      checked={claimConsent}
                      onChange={(e) => setClaimConsent(e.target.checked)}
                      className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300"
                    />
                    <span>I agree with NoLSAF Disbursement Policy and confirm the payout destination details are correct.</span>
                  </label>

                  {showClaimConfirm ? (
                    <div className="mx-4 mb-4 mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                      <p className="text-sm font-semibold text-slate-800">Are you sure you want to claim this payout?</p>
                      <p className="mt-1 text-xs text-slate-500">This will submit a payout request to NoLSAF for the selected tour. This action cannot be undone.</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={confirmClaimSubmit}
                          disabled={claimSubmitting}
                          className="rounded-lg border border-[#02665e] bg-[#02665e] px-4 py-2 text-sm font-bold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {claimSubmitting ? "Submitting..." : "Yes, claim payout"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowClaimConfirm(false)}
                          disabled={claimSubmitting}
                          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mx-4 mb-4 mt-3">
                      <button
                        type="button"
                        onClick={handleSubmitClaimInitiator}
                        disabled={claimSubmitting}
                        className="w-full rounded-lg border border-[#02665e] bg-[#02665e] px-4 py-2.5 text-sm font-bold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                      >
                        {claimSubmitting ? "Submitting..." : "Send claim to NoLSAF"}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {claimSubmitSuccessCard && (
                <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                  {claimSubmitSuccessCard}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Payout tracker */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="text-xs font-extrabold uppercase tracking-widest text-slate-500">Payout operations</p>
            <p className="mt-1 text-xs text-slate-400">Invoice and payout workflow per trip: NEW, CLAIMED, VERIFIED, APPROVED, DISBURSED.</p>
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
              <table className="min-w-[1320px] divide-y divide-slate-100 text-sm">
                <thead className="bg-slate-50">
                  <tr className="text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3 whitespace-nowrap">S/N</th>
                    <th className="px-4 py-3 whitespace-nowrap">Tour Code</th>
                    <th className="px-4 py-3 whitespace-nowrap">Receipt</th>
                    <th className="px-4 py-3 whitespace-nowrap">
                      <button type="button" onClick={() => toggleSort("stage")} className="appearance-none border-0 bg-transparent p-0 text-[11px] font-bold uppercase tracking-wide text-slate-500 hover:text-slate-700">
                        Invoice Stage{sortIndicator("stage")}
                      </button>
                    </th>
                    <th className="px-4 py-3 whitespace-nowrap">
                      Trip Workflow
                    </th>
                    <th className="px-4 py-3 whitespace-nowrap">
                      <button type="button" onClick={() => toggleSort("updatedAt")} className="appearance-none border-0 bg-transparent p-0 text-[11px] font-bold uppercase tracking-wide text-slate-500 hover:text-slate-700">
                        Last Updated{sortIndicator("updatedAt")}
                      </button>
                    </th>
                    <th className="px-4 py-3 whitespace-nowrap">My Earning</th>
                    <th className="px-4 py-3 whitespace-nowrap">Payout Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
              {pagedOperationRows.map((item, rowIndex) => {
                const isClaiming = claimingIds.has(item.id);
                const serialNumber = (currentPage - 1) * pageSize + rowIndex + 1;
                const earningCurrency = item.source === "TOUR_BOOKING" ? "USD" : (item.currency || displayCurrency);
                const stage = normalizedStage(item);
                const receiptRef = String(item.paymentRef || "").trim();
                const receiptAt = item.payoutPaidAt || item.payoutApprovedAt || item.payoutRequestedAt || item.completedAt || item.createdAt;
                const receiptTimestamp = receiptAt
                  ? new Date(receiptAt).toLocaleString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                      hour12: false,
                    })
                  : null;
                const canClaim = typeof item.id === "number" && item.isCompleted && !item.invoiceNumber;
                const claimStarted = hasClaimStarted(item);
                const stageTone =
                  stage === "DISBURSED"
                    ? "bg-emerald-50 text-emerald-700"
                    : stage === "APPROVED"
                      ? "bg-blue-50 text-blue-700"
                      : stage === "VERIFIED"
                        ? "bg-amber-50 text-amber-700"
                        : stage === "REJECTED"
                          ? "bg-rose-50 text-rose-700"
                          : "bg-slate-100 text-slate-700";
                const latestAt = item.payoutPaidAt || item.payoutApprovedAt || item.payoutRequestedAt || item.completedAt || item.createdAt;

                const workflowStage = trackerStage(item);
                const stepDone = (target: "NEW" | "CLAIMED" | "VERIFIED" | "APPROVED" | "DISBURSED" | "REJECTED") => {
                  const order = { NEW: 1, CLAIMED: 2, VERIFIED: 3, APPROVED: 4, DISBURSED: 5, REJECTED: 6 } as const;
                  if (workflowStage === "REJECTED") {
                    return target === "NEW" || target === "CLAIMED" || target === "REJECTED";
                  }
                  return order[workflowStage] >= order[target];
                };

                const workflowTone: Record<"NEW" | "CLAIMED" | "VERIFIED" | "APPROVED" | "DISBURSED" | "REJECTED", { active: string; inactive: string }> = {
                  NEW: {
                    active: "bg-teal-100 text-teal-800 ring-1 ring-teal-200",
                    inactive: "bg-slate-100 text-slate-400 ring-1 ring-slate-200",
                  },
                  CLAIMED: {
                    active: "bg-indigo-100 text-indigo-800 ring-1 ring-indigo-200",
                    inactive: "bg-slate-100 text-slate-400 ring-1 ring-slate-200",
                  },
                  VERIFIED: {
                    active: "bg-amber-100 text-amber-800 ring-1 ring-amber-200",
                    inactive: "bg-slate-100 text-slate-400 ring-1 ring-slate-200",
                  },
                  APPROVED: {
                    active: "bg-cyan-100 text-cyan-800 ring-1 ring-cyan-200",
                    inactive: "bg-slate-100 text-slate-400 ring-1 ring-slate-200",
                  },
                  DISBURSED: {
                    active: "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200",
                    inactive: "bg-slate-100 text-slate-400 ring-1 ring-slate-200",
                  },
                  REJECTED: {
                    active: "bg-rose-100 text-rose-800 ring-1 ring-rose-200",
                    inactive: "bg-slate-100 text-slate-400 ring-1 ring-slate-200",
                  },
                };

                return (
                  <TableRow key={item.id} className="align-top" hover>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-slate-700">
                      {serialNumber}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs font-semibold text-slate-700">
                      {item.bookingCode ? (
                        <span className="inline-block whitespace-nowrap rounded border border-teal-200 bg-teal-50 px-2 py-0.5 font-bold text-teal-700" title={item.bookingCode}>
                          {item.bookingCode}
                        </span>
                      ) : (
                        <span className="text-slate-400">Not assigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs">
                      {receiptRef ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="font-semibold text-emerald-700">{receiptRef}</span>
                          {receiptTimestamp ? <span className="text-[10px] text-slate-500">{receiptTimestamp}</span> : null}
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-bold uppercase ${stageTone}`}>
                        {stage}
                      </span>
                    </td>
                    <td className="px-4 py-3 min-w-[420px]">
                      <div className="grid grid-cols-6 gap-1 text-[10px] font-semibold uppercase tracking-wide">
                        {(["NEW", "CLAIMED", "VERIFIED", "APPROVED", "DISBURSED", "REJECTED"] as const).map((step) => (
                          <div
                            key={step}
                            className={`relative rounded px-2 py-1 text-center ${stepDone(step) ? workflowTone[step].active : workflowTone[step].inactive}`}
                          >
                            {stepDone(step) ? <span aria-hidden className="absolute left-1.5 top-1 text-[10px] leading-none">✓</span> : null}
                            <span>{step}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-500 min-w-[170px]">
                      <div className="flex items-center gap-1">
                        <CalendarDays className="h-3 w-3 shrink-0" />
                        {latestAt
                          ? new Date(latestAt).toLocaleString("en-GB", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: false,
                            })
                          : "-"}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-[#02665e]">
                      {earningCurrency} {Number(item.agentEarning || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {canClaim ? (
                        <button
                          onClick={() => handleClaimPayout(item.id)}
                          disabled={isClaiming}
                          className="px-3 py-1 text-xs font-semibold rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                        >
                          {isClaiming ? "..." : "Claim"}
                        </button>
                      ) : !item.isCompleted ? (
                        <span className="text-[11px] font-semibold text-slate-500">Awaiting completion</span>
                      ) : stage === "REJECTED" ? (
                        <span className="text-[11px] font-semibold text-rose-600">Rejected</span>
                      ) : stage === "DISBURSED" ? (
                        <span className="text-[11px] font-semibold text-emerald-600">Disbursed</span>
                      ) : stage === "APPROVED" ? (
                        <span className="text-[11px] font-semibold text-cyan-700">Approved</span>
                      ) : stage === "VERIFIED" ? (
                        <span className="text-[11px] font-semibold text-amber-700">Verified</span>
                      ) : claimStarted ? (
                        <span className="text-[11px] font-semibold text-blue-600">Submitted / In review</span>
                      ) : (
                        <span className="text-[11px] font-semibold text-slate-500">Not started</span>
                      )}
                    </td>
                  </TableRow>
                );
              })}
                </tbody>
              </table>
            </div>
          )}

          {operationRows.length > 0 && (
            <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between">
              <div>
                Showing {(Math.min((currentPage - 1) * pageSize + 1, operationRows.length)).toLocaleString()}-
                {(Math.min(currentPage * pageSize, operationRows.length)).toLocaleString()} of {operationRows.length.toLocaleString()} operations
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="rounded-md border border-slate-200 px-3 py-1 font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-slate-50"
                >
                  Prev
                </button>
                <span className="px-2 font-semibold text-slate-700">Page {currentPage} / {totalPages}</span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="rounded-md border border-slate-200 px-3 py-1 font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-slate-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Trend chart (pushed down) */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-white px-4 py-4">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-widest text-slate-700">Operations trend</p>
              <p className="text-xs text-slate-500">Paid vs pending earnings ({trendRange})</p>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2 text-[11px] font-semibold">
              {(["24H", "7D", "1M", "3M"] as const).map((range) => (
                <button
                  key={range}
                  type="button"
                  onClick={() => setTrendRange(range)}
                  className={`rounded-md border px-2 py-1 text-[10px] font-bold tracking-wide transition ${trendRange === range ? "border-[#02665e] bg-[#02665e]/10 text-[#02665e]" : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"}`}
                >
                  {range}
                </button>
              ))}
              <span className="inline-flex items-center gap-1 text-emerald-600">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> Paid
              </span>
              <span className="inline-flex items-center gap-1 text-amber-600">
                <span className="h-2 w-2 rounded-full bg-amber-500" /> Pending
              </span>
            </div>
          </div>

          <div className="mx-4 mt-4 rounded-xl border border-slate-100 bg-slate-50/60 p-3">
            <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-600">
              <span className="font-semibold">Range total:</span>
              <span className="font-bold text-emerald-700">Paid {displayCurrency} {trendTotals.paid.toLocaleString()}</span>
              <span className="font-bold text-amber-700">Pending {displayCurrency} {trendTotals.pending.toLocaleString()}</span>
            </div>

            <div className="relative overflow-x-auto pb-2">
              <div
                className="relative w-full"
                style={{ minWidth: `${Math.max(360, trend.buckets.length * 30)}px` }}
              >
                <div className="pointer-events-none absolute inset-0">
                  <div className="absolute inset-x-0 top-0 border-t border-slate-200" />
                  <div className="absolute inset-x-0 top-1/3 border-t border-slate-200/80" />
                  <div className="absolute inset-x-0 top-2/3 border-t border-slate-200/80" />
                  <div className="absolute inset-x-0 bottom-0 border-t border-slate-300" />
                </div>

                <div
                  className="relative grid h-52 items-end gap-1.5"
                  style={{ gridTemplateColumns: `repeat(${Math.max(1, trend.buckets.length)}, minmax(0, 1fr))` }}
                >
                  {trend.buckets.map((b, idx) => {
                    const paidH = trend.maxY > 0 ? (b.paid / trend.maxY) * 100 : 0;
                    const pendingH = trend.maxY > 0 ? (b.pending / trend.maxY) * 100 : 0;
                    const paidHeight = b.paid > 0 ? Math.max(6, paidH) : 0;
                    const pendingHeight = b.pending > 0 ? Math.max(6, pendingH) : 0;

                    return (
                      <div key={b.key} className="flex h-full min-w-0 flex-col justify-end">
                        <div className="flex h-[84%] items-end justify-center gap-1">
                          <div
                            className="w-3 rounded-t bg-emerald-500"
                            style={{ height: `${paidHeight}%` }}
                            title={`${b.label} - Paid: ${displayCurrency} ${Number(b.paid || 0).toLocaleString()}`}
                          />
                          <div
                            className="w-3 rounded-t bg-amber-500"
                            style={{ height: `${pendingHeight}%` }}
                            title={`${b.label} - Pending: ${displayCurrency} ${Number(b.pending || 0).toLocaleString()}`}
                          />
                        </div>
                        <span className="mt-2 block truncate text-center text-[10px] font-semibold text-slate-500" title={b.label}>
                          {trend.buckets.length <= 8 || idx % trendLabelStep === 0 || idx === trend.buckets.length - 1
                            ? b.label
                            : ""}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
