"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, AlertCircle, Loader2, Gift, DollarSign, ShieldCheck, Ban, RefreshCw, Link as LinkIcon } from "lucide-react";

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

const apiBase = (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4000").replace(/\/$/, "");

export default function AdminReferralsPage() {
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [err, setErr] = useState<string | null>(null);

  const [wLoading, setWLoading] = useState<boolean>(false);
  const [wErr, setWErr] = useState<string | null>(null);

  const summary = useMemo(() => {
    const base = { total: 0, pending: 0, bonus: 0, available: 0, withdrawn: 0 };
    earnings.forEach((e) => {
      const amt = Number(e.amount || 0);
      base.total += amt;
      const st = (e.status || "").toUpperCase();
      if (st === "PENDING") base.pending += amt;
      if (st === "PAID_AS_BONUS") base.bonus += amt;
      if (st === "AVAILABLE_FOR_WITHDRAWAL") base.available += amt;
      if (st === "WITHDRAWN") base.withdrawn += amt;
    });
    return base;
  }, [earnings]);

  const loadEarnings = useCallback(async (targetStatus?: string) => {
    setLoading(true);
    setErr(null);
    try {
      const status = typeof targetStatus === "string" ? targetStatus : statusFilter;
      const url = `${apiBase}/admin/referral-earnings${status ? `?status=${encodeURIComponent(status)}` : ""}`;
      const r = await fetch(url);
      if (!r.ok) throw new Error(`Failed to load (${r.status})`);
      const j = await r.json();
      setEarnings(j.earnings || []);
    } catch (e: any) {
      setErr(e?.message || "Failed to load referral earnings");
      setEarnings([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  const loadWithdrawals = useCallback(async () => {
    setWLoading(true);
    setWErr(null);
    try {
      const url = `${apiBase}/admin/referral-earnings/withdrawals`;
      const r = await fetch(url);
      if (!r.ok) throw new Error(`Failed to load (${r.status})`);
      const j = await r.json();
      setWithdrawals(j.withdrawals || []);
    } catch (e: any) {
      setWErr(e?.message || "Failed to load withdrawals");
      setWithdrawals([]);
    } finally {
      setWLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadEarnings();
    void loadWithdrawals();
  }, [loadEarnings, loadWithdrawals]);

  async function markAsBonus(earningId: number) {
    const ref = prompt("Bonus payment reference", `BONUS-${earningId}-${Date.now()}`);
    if (!ref) return;
    try {
      await fetch(`${apiBase}/admin/referral-earnings/mark-as-bonus`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ earningIds: [earningId], bonusPaymentRef: ref }),
      });
      await loadEarnings();
    } catch (e) {
      alert("Failed to mark as bonus");
    }
  }

  async function approveWithdrawal(id: number) {
    try {
      await fetch(`${apiBase}/admin/referral-earnings/withdrawals/${id}/approve`, { method: "POST" });
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
      await fetch(`${apiBase}/admin/referral-earnings/withdrawals/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rejectionReason: reason }),
      });
      await loadWithdrawals();
      await loadEarnings();
    } catch {
      alert("Failed to reject");
    }
  }

  async function markPaid(id: number) {
    const ref = prompt("Payment reference", "");
    try {
      await fetch(`${apiBase}/admin/referral-earnings/withdrawals/${id}/mark-paid`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentRef: ref }),
      });
      await loadWithdrawals();
      await loadEarnings();
    } catch {
      alert("Failed to mark paid");
    }
  }

  const statusBadge = (s: string) => {
    const v = (s || "").toUpperCase();
    if (v === "PAID_AS_BONUS") return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (v === "AVAILABLE_FOR_WITHDRAWAL") return "bg-blue-50 text-blue-700 border-blue-200";
    if (v === "WITHDRAWN") return "bg-gray-100 text-gray-700 border-gray-200";
    if (v === "PENDING") return "bg-amber-50 text-amber-700 border-amber-200";
    return "bg-slate-50 text-slate-700 border-slate-200";
  };

  const showError = err && !err.toLowerCase().includes("networkerror");
  const showWithdrawalsError = wErr && !wErr.toLowerCase().includes("networkerror");

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
        <div className="flex flex-col gap-2 mb-4 text-center items-center">
          <div className="inline-flex items-center gap-2">
            <Gift className="w-5 h-5 text-slate-500" />
            <h1 className="text-xl font-semibold text-slate-900">Referral Credits</h1>
          </div>
          <p className="text-sm text-slate-600">Decide whether collected credits become bonuses or withdrawals.</p>
          <div className="flex flex-wrap justify-center gap-3 text-sm">
            <button
              type="button"
              onClick={() => {
                setStatusFilter("");
                loadEarnings("");
              }}
              className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 transition border border-slate-200"
            >
              Total: {summary.total.toLocaleString()} TZS
            </button>
            <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800">Pending: {summary.pending.toLocaleString()} TZS</span>
            <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-800">Available: {summary.available.toLocaleString()} TZS</span>
            <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800">Bonus: {summary.bonus.toLocaleString()} TZS</span>
            <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-700">Withdrawn: {summary.withdrawn.toLocaleString()} TZS</span>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <label className="text-sm text-slate-700">Filter by status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-slate-300 rounded-md px-2 py-1 text-sm"
          >
            <option value="">All</option>
            <option value="PENDING">Pending</option>
            <option value="AVAILABLE_FOR_WITHDRAWAL">Available for withdrawal</option>
            <option value="PAID_AS_BONUS">Paid as bonus</option>
            <option value="WITHDRAWN">Withdrawn</option>
          </select>
          <button
            className="inline-flex items-center gap-2 text-sm text-slate-700 hover:text-slate-900"
            onClick={() => loadEarnings()}
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>

        {showError && (
          <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-3">
            <AlertCircle className="w-4 h-4" /> {err}
          </div>
        )}

        <div className="overflow-auto border border-slate-200 rounded-lg">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-3 py-2 font-semibold text-slate-700">ID</th>
                <th className="text-left px-3 py-2 font-semibold text-slate-700">Driver</th>
                <th className="text-left px-3 py-2 font-semibold text-slate-700">Referred User</th>
                <th className="text-left px-3 py-2 font-semibold text-slate-700">Amount</th>
                <th className="text-left px-3 py-2 font-semibold text-slate-700">Status</th>
                <th className="text-left px-3 py-2 font-semibold text-slate-700">Refs</th>
                <th className="text-left px-3 py-2 font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-3 py-4 text-center text-slate-500">
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Loading...
                    </span>
                  </td>
                </tr>
              ) : earnings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-4 text-center text-slate-500">
                    No referral credits found.
                  </td>
                </tr>
              ) : (
                earnings.map((e) => (
                  <tr key={e.id} className="border-t border-slate-100">
                    <td className="px-3 py-2">{e.id}</td>
                    <td className="px-3 py-2 text-slate-800">{e.driverId}</td>
                    <td className="px-3 py-2 text-slate-700">
                      {e.referredUser?.name || e.referredUser?.email || e.referredUser?.id || "-"}
                    </td>
                    <td className="px-3 py-2 font-semibold text-slate-900">
                      {Number(e.amount || 0).toLocaleString()} {e.currency || "TZS"}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-md border text-xs font-medium ${statusBadge(e.status)}`}>
                        {e.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-600 space-y-1">
                      {e.bonusPaymentRef && (
                        <div className="flex items-center gap-1">
                          <Gift className="w-3 h-3 text-emerald-600" /> {e.bonusPaymentRef}
                        </div>
                      )}
                      {e.withdrawalId && (
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3 text-blue-600" /> WD #{e.withdrawalId}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {(e.status === "PENDING" || e.status === "AVAILABLE_FOR_WITHDRAWAL") && (
                        <button
                          onClick={() => markAsBonus(e.id)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                        >
                          <CheckCircle2 className="w-3 h-3" /> Mark bonus
                        </button>
                      )}
                      {e.status === "PAID_AS_BONUS" && (
                        <span className="text-xs text-emerald-700 inline-flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" /> Bonus
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <DollarSign className="w-5 h-5 text-slate-500" />
          <h2 className="text-lg font-semibold text-slate-900">Withdrawal requests</h2>
          <button
            className="inline-flex items-center gap-2 text-sm text-slate-700 hover:text-slate-900 ml-auto"
            onClick={() => loadWithdrawals()}
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>

        {showWithdrawalsError && (
          <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-3">
            <AlertCircle className="w-4 h-4" /> {wErr}
          </div>
        )}

        <div className="overflow-auto border border-slate-200 rounded-lg">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-3 py-2 font-semibold text-slate-700">ID</th>
                <th className="text-left px-3 py-2 font-semibold text-slate-700">Driver</th>
                <th className="text-left px-3 py-2 font-semibold text-slate-700">Amount</th>
                <th className="text-left px-3 py-2 font-semibold text-slate-700">Status</th>
                <th className="text-left px-3 py-2 font-semibold text-slate-700">Payment</th>
                <th className="text-left px-3 py-2 font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {wLoading ? (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-center text-slate-500">
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Loading...
                    </span>
                  </td>
                </tr>
              ) : withdrawals.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-center text-slate-500">
                    No withdrawal requests found.
                  </td>
                </tr>
              ) : (
                withdrawals.map((w) => (
                  <tr key={w.id} className="border-t border-slate-100">
                    <td className="px-3 py-2">{w.id}</td>
                    <td className="px-3 py-2 text-slate-800">
                      {w.driver?.name || w.driver?.email || `Driver #${w.driver?.id ?? ""}`}
                    </td>
                    <td className="px-3 py-2 font-semibold text-slate-900">
                      {Number(w.totalAmount || 0).toLocaleString()} {w.currency || "TZS"}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-md border text-xs font-medium ${statusBadge(w.status)}`}>
                        {w.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-600 space-y-1">
                      {w.paymentMethod && (
                        <div className="flex items-center gap-1">
                          <LinkIcon className="w-3 h-3 text-slate-500" /> {w.paymentMethod}
                        </div>
                      )}
                      {w.paymentRef && (
                        <div className="flex items-center gap-1">
                          <LinkIcon className="w-3 h-3 text-slate-500" /> {w.paymentRef}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 space-x-2">
                      {w.status === "PENDING" && (
                        <>
                          <button
                            onClick={() => approveWithdrawal(w.id)}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                          >
                            <CheckCircle2 className="w-3 h-3" /> Approve
                          </button>
                          <button
                            onClick={() => rejectWithdrawal(w.id)}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-md bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"
                          >
                            <Ban className="w-3 h-3" /> Reject
                          </button>
                        </>
                      )}
                      {w.status === "APPROVED" && (
                        <button
                          onClick={() => markPaid(w.id)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-md bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"
                        >
                          <DollarSign className="w-3 h-3" /> Mark paid
                        </button>
                      )}
                      {w.status === "PAID" && (
                        <span className="text-xs text-emerald-700 inline-flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" /> Paid
                        </span>
                      )}
                      {w.status === "REJECTED" && (
                        <span className="text-xs text-red-700 inline-flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> Rejected
                        </span>
                      )}
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

