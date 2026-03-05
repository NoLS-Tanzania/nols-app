"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { CheckCircle2, AlertCircle, Loader2, Gift, DollarSign, ShieldCheck, Ban, RefreshCw, Link as LinkIcon, TrendingUp, Clock, Wallet, ArrowDownCircle, ArrowLeft } from "lucide-react";

const api = axios.create({ baseURL: "", withCredentials: true });

type Earning = {
  id: number;
  driverId: number;
  referredUser?: { id: number; name?: string | null; email?: string | null } | null;
  amount: number;
  currency: string;
  status: string;
  bonusPaymentRef?: string | null;
  withdrawalId?: number | null;
  createdAt?: string;
};

type Withdrawal = {
  id: number;
  driver?: { id: number; name?: string | null; email?: string | null; phone?: string | null } | null;
  totalAmount: number;
  currency: string;
  status: string;
  paymentMethod?: string | null;
  paymentRef?: string | null;
  rejectionReason?: string | null;
  createdAt?: string;
};

function fmt(n: number) {
  return n.toLocaleString();
}

export default function AdminReferralsPage() {
  const router = useRouter();
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [allEarnings, setAllEarnings] = useState<Earning[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [err, setErr] = useState<string | null>(null);

  const [wLoading, setWLoading] = useState<boolean>(false);
  const [wErr, setWErr] = useState<string | null>(null);

  // Summary always computed from unfiltered allEarnings so cards never zero out
  const summary = useMemo(() => {
    const base = { total: 0, pending: 0, bonus: 0, available: 0, withdrawn: 0 };
    allEarnings.forEach((e) => {
      const amt = Number(e.amount || 0);
      base.total += amt;
      const st = (e.status || "").toUpperCase();
      if (st === "PENDING") base.pending += amt;
      if (st === "PAID_AS_BONUS") base.bonus += amt;
      if (st === "AVAILABLE_FOR_WITHDRAWAL") base.available += amt;
      if (st === "WITHDRAWN") base.withdrawn += amt;
    });
    return base;
  }, [allEarnings]);

  const loadAllEarnings = useCallback(async () => {
    try {
      const r = await api.get(`/api/admin/referral-earnings?pageSize=1000`);
      setAllEarnings(r.data.earnings || []);
    } catch { /* silent — summary degrades gracefully */ }
  }, []);

  const loadEarnings = useCallback(async (targetStatus?: string) => {
    setLoading(true);
    setErr(null);
    try {
      const status = typeof targetStatus === "string" ? targetStatus : statusFilter;
      const url = `/api/admin/referral-earnings${status ? `?status=${encodeURIComponent(status)}` : ""}`;
      const r = await api.get(url);
      setEarnings(r.data.earnings || []);
      // Refresh unfiltered summary whenever we do a full load
      if (!status) setAllEarnings(r.data.earnings || []);
    } catch (e: any) {
      const status = e?.response?.status;
      setErr(e?.response?.data?.error || `Failed to load (${status ?? e?.message})`);
      setEarnings([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  const loadWithdrawals = useCallback(async () => {
    setWLoading(true);
    setWErr(null);
    try {
      const r = await api.get(`/api/admin/referral-earnings/withdrawals`);
      setWithdrawals(r.data.withdrawals || []);
    } catch (e: any) {
      const status = e?.response?.status;
      setWErr(e?.response?.data?.error || `Failed to load (${status ?? e?.message})`);
      setWithdrawals([]);
    } finally {
      setWLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAllEarnings();
    void loadEarnings();
    void loadWithdrawals();
  }, [loadAllEarnings, loadEarnings, loadWithdrawals]);

  async function markAsBonus(earningId: number) {
    const ref = prompt("Bonus payment reference", `BONUS-${earningId}-${Date.now()}`);
    if (!ref) return;
    try {
      await api.post(`/api/admin/referral-earnings/mark-as-bonus`, { earningIds: [earningId], bonusPaymentRef: ref });
      await Promise.all([loadEarnings(), loadAllEarnings()]);
    } catch {
      alert("Failed to mark as bonus");
    }
  }

  async function approveWithdrawal(id: number) {
    try {
      await api.post(`/api/admin/referral-earnings/withdrawals/${id}/approve`);
      await loadWithdrawals();
      await loadEarnings();
    } catch {
      alert("Failed to approve");
    }
  }

  async function rejectWithdrawal(id: number) {
    const reason = prompt("Reason for rejection", "Not eligible");
    if (!reason) return;
    try {
      await api.post(`/api/admin/referral-earnings/withdrawals/${id}/reject`, { rejectionReason: reason });
      await loadWithdrawals();
      await loadEarnings();
    } catch {
      alert("Failed to reject");
    }
  }

  async function markPaid(id: number) {
    const ref = prompt("Payment reference", "");
    try {
      await api.post(`/api/admin/referral-earnings/withdrawals/${id}/mark-paid`, { paymentRef: ref });
      await loadWithdrawals();
      await loadEarnings();
    } catch {
      alert("Failed to mark paid");
    }
  }

  const statusBadge = (s: string) => {
    const v = (s || "").toUpperCase();
    if (v === "PAID_AS_BONUS")              return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
    if (v === "AVAILABLE_FOR_WITHDRAWAL")   return "bg-blue-50 text-blue-700 ring-1 ring-blue-200";
    if (v === "WITHDRAWN")                  return "bg-slate-100 text-slate-600 ring-1 ring-slate-200";
    if (v === "PENDING")                    return "bg-amber-50 text-amber-700 ring-1 ring-amber-200";
    if (v === "APPROVED")                   return "bg-teal-50 text-teal-700 ring-1 ring-teal-200";
    if (v === "REJECTED")                   return "bg-red-50 text-red-700 ring-1 ring-red-200";
    if (v === "PAID")                       return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
    return "bg-slate-50 text-slate-600 ring-1 ring-slate-200";
  };

  const statusLabel = (s: string) => {
    const v = (s || "").toUpperCase();
    if (v === "PAID_AS_BONUS")            return "Paid as Bonus";
    if (v === "AVAILABLE_FOR_WITHDRAWAL") return "Available";
    if (v === "WITHDRAWN")                return "Withdrawn";
    if (v === "PENDING")                  return "Pending";
    if (v === "APPROVED")                 return "Approved";
    if (v === "REJECTED")                 return "Rejected";
    if (v === "PAID")                     return "Paid";
    return s;
  };

  const showError = err && !err.toLowerCase().includes("networkerror");
  const showWithdrawalsError = wErr && !wErr.toLowerCase().includes("networkerror");

  function filterByStatus(s: string) {
    setStatusFilter(s);
    loadEarnings(s);
  }

  const statCards = [
    {
      label: "Total Credits",
      value: summary.total,
      icon: TrendingUp,
      color: "text-white",
      valueBg: "bg-white/20",
      iconBg: "bg-white/20",
      cardBg: "bg-[#02665e]",
      ring: "ring-white/20",
      onClick: () => filterByStatus(""),
      active: statusFilter === "",
    },
    {
      label: "Pending",
      value: summary.pending,
      icon: Clock,
      color: "text-amber-600",
      valueBg: "",
      iconBg: "bg-amber-100",
      cardBg: "bg-white",
      ring: "ring-amber-200",
      onClick: () => filterByStatus("PENDING"),
      active: statusFilter === "PENDING",
    },
    {
      label: "Available",
      value: summary.available,
      icon: Wallet,
      color: "text-blue-600",
      valueBg: "",
      iconBg: "bg-blue-100",
      cardBg: "bg-white",
      ring: "ring-blue-200",
      onClick: () => filterByStatus("AVAILABLE_FOR_WITHDRAWAL"),
      active: statusFilter === "AVAILABLE_FOR_WITHDRAWAL",
    },
    {
      label: "Paid as Bonus",
      value: summary.bonus,
      icon: Gift,
      color: "text-emerald-600",
      valueBg: "",
      iconBg: "bg-emerald-100",
      cardBg: "bg-white",
      ring: "ring-emerald-200",
      onClick: () => filterByStatus("PAID_AS_BONUS"),
      active: statusFilter === "PAID_AS_BONUS",
    },
    {
      label: "Withdrawn",
      value: summary.withdrawn,
      icon: ArrowDownCircle,
      color: "text-slate-500",
      valueBg: "",
      iconBg: "bg-slate-100",
      cardBg: "bg-white",
      ring: "ring-slate-200",
      onClick: () => filterByStatus("WITHDRAWN"),
      active: statusFilter === "WITHDRAWN",
    },
  ];

  return (
    <div className="space-y-6">

      {/* ── Section 1: Referral Credits ─────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">

        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="h-8 w-8 rounded-lg border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm flex-shrink-0"
              aria-label="Go back"
            >
              <ArrowLeft className="w-4 h-4 text-gray-500" />
            </button>
            <div className="h-9 w-9 rounded-xl bg-[#02665e]/10 flex items-center justify-center flex-shrink-0">
              <Gift className="w-[18px] h-[18px] text-[#02665e]" />
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-900 tracking-tight">Referral Credits</h1>
              <p className="text-xs text-gray-500 mt-0.5">Decide whether collected credits become bonuses or withdrawals.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => { void loadEarnings(); void loadAllEarnings(); }}
            className="h-8 w-8 rounded-lg border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm"
            aria-label="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-gray-500 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Summary stat cards — dark area */}
        <div className="bg-[#012e29] px-6 pt-5 pb-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {statCards.map((card) => {
            const Icon = card.icon;
            const isDark = card.cardBg === "bg-[#02665e]";
            return (
              <button
                key={card.label}
                type="button"
                onClick={card.onClick}
                className={`relative rounded-xl ring-1 ${card.ring} p-3.5 flex flex-col gap-1.5 cursor-pointer text-left transition-all hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] ${
                  card.active ? "shadow-lg scale-[1.02]" : "shadow-sm"
                } ${card.cardBg}`}
              >
                <div className={`h-7 w-7 rounded-lg ${card.iconBg} flex items-center justify-center`}>
                  <Icon className={`w-3.5 h-3.5 ${card.color}`} />
                </div>
                <div className={`text-lg font-extrabold tabular-nums tracking-tight ${card.color}`}>
                  {fmt(card.value)}
                  <span className={`ml-1 text-[10px] font-semibold tracking-wide ${isDark ? "text-white/50" : "text-gray-400"}`}>TZS</span>
                </div>
                <div className={`text-[11px] font-medium leading-none ${isDark ? "text-white/70" : "text-gray-500"}`}>{card.label}</div>
                {card.active && (
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-current opacity-50" />
                )}
              </button>
            );
          })}
        </div>

        {/* Filter bar */}
        <div className="px-6 pb-4 flex items-center gap-2 flex-wrap border-b border-gray-100">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Filter</span>
          <select
            value={statusFilter}
            onChange={(e) => filterByStatus(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 shadow-sm focus:border-[#02665e] focus:ring-1 focus:ring-[#02665e]/30 outline-none transition"
          >
            <option value="">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="AVAILABLE_FOR_WITHDRAWAL">Available for withdrawal</option>
            <option value="PAID_AS_BONUS">Paid as bonus</option>
            <option value="WITHDRAWN">Withdrawn</option>
          </select>
        </div>

        {/* Error */}
        {showError && (
          <div className="mx-6 mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{err}</span>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto border-t border-gray-100">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50/80">
                <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-500">ID</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-500">Driver</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-500">Referred User</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-500">Amount</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-500">Status</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-500">Refs</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-gray-400">
                    <span className="inline-flex items-center gap-2 text-sm">
                      <Loader2 className="w-4 h-4 animate-spin text-[#02665e]" />
                      Loading referral credits…
                    </span>
                  </td>
                </tr>
              ) : earnings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-gray-400 text-sm">
                    No referral credits found.
                  </td>
                </tr>
              ) : (
                earnings.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-3 text-xs font-mono text-gray-400">#{e.id}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700">
                        Driver #{e.driverId}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 font-medium">
                      {e.referredUser?.name || e.referredUser?.email || (e.referredUser ? `User #${e.referredUser.id}` : <span className="text-gray-300">—</span>)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-bold text-gray-900 tabular-nums">
                        {fmt(Number(e.amount || 0))}
                      </span>
                      <span className="ml-1 text-[11px] text-gray-400 font-semibold">{e.currency || "TZS"}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ${statusBadge(e.status)}`}>
                        {statusLabel(e.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 space-y-1">
                      {e.bonusPaymentRef && (
                        <div className="flex items-center gap-1 font-mono">
                          <Gift className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                          <span className="truncate max-w-[120px]" title={e.bonusPaymentRef}>{e.bonusPaymentRef}</span>
                        </div>
                      )}
                      {e.withdrawalId && (
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3 text-blue-500 flex-shrink-0" />
                          WD #{e.withdrawalId}
                        </div>
                      )}
                      {!e.bonusPaymentRef && !e.withdrawalId && <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {(e.status === "PENDING" || e.status === "AVAILABLE_FOR_WITHDRAWAL") && (
                        <button
                          onClick={() => markAsBonus(e.id)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100 transition-colors"
                        >
                          <CheckCircle2 className="w-3 h-3" /> Mark as Bonus
                        </button>
                      )}
                      {e.status === "PAID_AS_BONUS" && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                          <ShieldCheck className="w-3.5 h-3.5" /> Bonus paid
                        </span>
                      )}
                      {e.status === "WITHDRAWN" && (
                        <span className="text-xs text-gray-400 font-medium">Withdrawn</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Section 2: Withdrawal Requests ──────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">

        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
              <Wallet className="w-[18px] h-[18px] text-blue-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 tracking-tight">Withdrawal Requests</h2>
              <p className="text-xs text-gray-500 mt-0.5">Review and process driver payout requests.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => loadWithdrawals()}
            className="h-8 w-8 rounded-lg border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm"
            aria-label="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-gray-500 ${wLoading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Error */}
        {showWithdrawalsError && (
          <div className="mx-6 mt-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{wErr}</span>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50/80">
                <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-500">ID</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-500">Driver</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-500">Amount</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-500">Status</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-500">Payment</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {wLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-gray-400">
                    <span className="inline-flex items-center gap-2 text-sm">
                      <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                      Loading withdrawal requests…
                    </span>
                  </td>
                </tr>
              ) : withdrawals.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-gray-400 text-sm">
                    No withdrawal requests found.
                  </td>
                </tr>
              ) : (
                withdrawals.map((w) => (
                  <tr key={w.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-3 text-xs font-mono text-gray-400">#{w.id}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-800 text-sm leading-none">
                        {w.driver?.name || w.driver?.email || `Driver #${w.driver?.id ?? "–"}`}
                      </div>
                      {w.driver?.phone && (
                        <div className="text-[11px] text-gray-400 mt-0.5">{w.driver.phone}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-bold text-gray-900 tabular-nums">
                        {fmt(Number(w.totalAmount || 0))}
                      </span>
                      <span className="ml-1 text-[11px] text-gray-400 font-semibold">{w.currency || "TZS"}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ${statusBadge(w.status)}`}>
                        {statusLabel(w.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 space-y-1">
                      {w.paymentMethod && (
                        <div className="flex items-center gap-1">
                          <LinkIcon className="w-3 h-3 text-gray-400 flex-shrink-0" />
                          <span className="font-medium">{w.paymentMethod}</span>
                        </div>
                      )}
                      {w.paymentRef && (
                        <div className="flex items-center gap-1 font-mono">
                          <LinkIcon className="w-3 h-3 text-gray-400 flex-shrink-0" />
                          <span className="truncate max-w-[120px]" title={w.paymentRef}>{w.paymentRef}</span>
                        </div>
                      )}
                      {!w.paymentMethod && !w.paymentRef && <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        {w.status === "PENDING" && (
                          <>
                            <button
                              onClick={() => approveWithdrawal(w.id)}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100 transition-colors"
                            >
                              <CheckCircle2 className="w-3 h-3" /> Approve
                            </button>
                            <button
                              onClick={() => rejectWithdrawal(w.id)}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700 ring-1 ring-red-200 hover:bg-red-100 transition-colors"
                            >
                              <Ban className="w-3 h-3" /> Reject
                            </button>
                          </>
                        )}
                        {w.status === "APPROVED" && (
                          <button
                            onClick={() => markPaid(w.id)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 ring-1 ring-blue-200 hover:bg-blue-100 transition-colors"
                          >
                            <DollarSign className="w-3 h-3" /> Mark Paid
                          </button>
                        )}
                        {w.status === "PAID" && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                            <ShieldCheck className="w-3.5 h-3.5" /> Paid
                          </span>
                        )}
                        {w.status === "REJECTED" && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-500">
                            <AlertCircle className="w-3.5 h-3.5" /> Rejected
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

