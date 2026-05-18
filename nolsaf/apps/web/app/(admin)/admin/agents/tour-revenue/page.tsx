"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { CheckCircle2, Clock, TrendingUp, XCircle, AlertCircle, RefreshCw, ChevronRight, Filter, Printer, X } from "lucide-react";
import apiClient from "@/lib/apiClient";

const api = apiClient;

type RevenueStatus = "NEW" | "VERIFIED" | "APPROVED" | "DISBURSED" | "REJECTED";

interface TourRevenueRecord {
  id: number;
  bookingId: number;
  bookingCode: string;
  operatorAgentId: number;
  operatorName: string;
  tourTitle: string;
  destination: string;
  numberOfPeople: number;
  grossAmount: number;
  commissionPercent: number;
  commissionAmount: number;
  netAmount: number;
  currency: string;
  status: RevenueStatus;
  paymentRef: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

interface RevenueSummary {
  total: number;
  new: number;
  verified: number;
  approved: number;
  disbursed: number;
  rejected: number;
  totalAmount: number;
  disbursedAmount: number;
}

const statusConfig: Record<RevenueStatus, { label: string; color: string; bgColor: string; icon: any }> = {
  NEW: { label: "New", color: "text-blue-700", bgColor: "bg-blue-50 border-blue-200", icon: Clock },
  VERIFIED: { label: "Verified", color: "text-yellow-700", bgColor: "bg-yellow-50 border-yellow-200", icon: AlertCircle },
  APPROVED: { label: "Approved", color: "text-emerald-700", bgColor: "bg-emerald-50 border-emerald-200", icon: CheckCircle2 },
  DISBURSED: { label: "Disbursed", color: "text-green-700", bgColor: "bg-green-50 border-green-200", icon: TrendingUp },
  REJECTED: { label: "Rejected", color: "text-rose-700", bgColor: "bg-rose-50 border-rose-200", icon: XCircle },
};

function authify() {}

function money(value: number, currency = "TZS") {
  return `${currency} ${Math.round(Number(value || 0)).toLocaleString()}`;
}

export default function AdminTourRevenueOverview() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<RevenueStatus | "ALL">("ALL");
  const [summary, setSummary] = useState<RevenueSummary | null>(null);
  const [revenues, setRevenues] = useState<TourRevenueRecord[]>([]);
  const [selectedRevenue, setSelectedRevenue] = useState<TourRevenueRecord | null>(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState<"verify" | "approve" | "disburse" | "reject" | null>(null);
  const [paymentRef, setPaymentRef] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const searchRef = useRef<HTMLInputElement | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      authify();
      const res = await api.get<{
        ok: boolean;
        summary: RevenueSummary;
        revenues: TourRevenueRecord[];
      }>("/api/admin/tour-revenue/overview");
      if (res.data.ok) {
        setSummary(res.data.summary);
        setRevenues(res.data.revenues);
      }
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || "Failed to load tour revenue");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    try {
      searchRef.current?.focus();
    } catch {
      // ignore
    }
  }, [load]);

  const filteredRevenues = useMemo(() => {
    let filtered = revenues;
    if (activeTab !== "ALL") {
      filtered = filtered.filter((r) => r.status === activeTab);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.bookingCode.toLowerCase().includes(q) ||
          r.operatorName.toLowerCase().includes(q) ||
          r.tourTitle.toLowerCase().includes(q) ||
          r.destination.toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [revenues, activeTab, searchQuery]);

  async function executeAction() {
    if (!selectedRevenue || !actionType) return;
    setActionLoading(true);
    try {
      authify();
      const payload: Record<string, any> = { revenueId: selectedRevenue.id, action: actionType };
      if (actionType === "disburse" && paymentRef) payload.paymentRef = paymentRef;
      if (actionType === "reject" && rejectionReason) payload.reason = rejectionReason;

      const res = await api.post("/api/admin/tour-revenue/action", payload);
      if (res.data.ok) {
        setShowActionModal(false);
        setPaymentRef("");
        setRejectionReason("");
        void load();
      }
    } catch (e: any) {
      alert(e?.response?.data?.error || e?.message || "Action failed");
    } finally {
      setActionLoading(false);
    }
  }

  const tabs = [
    { key: "ALL", label: "All", count: summary?.total ?? 0 },
    { key: "NEW", label: "New", count: summary?.new ?? 0 },
    { key: "VERIFIED", label: "Verified", count: summary?.verified ?? 0 },
    { key: "APPROVED", label: "Approved", count: summary?.approved ?? 0 },
    { key: "DISBURSED", label: "Paid / Disbursed", count: summary?.disbursed ?? 0 },
    { key: "REJECTED", label: "Rejected", count: summary?.rejected ?? 0 },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-black tracking-tight">Tour Revenue Pipeline</h1>
          <p className="text-slate-400">All tour operator bookings and disbursement tracking</p>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        )}

        {/* Search + Actions */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div className="relative flex-1">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <svg className="h-5 w-5 text-slate-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
              </svg>
            </div>
            <input
              ref={searchRef}
              type="text"
              placeholder="Search # / booking / operator"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full rounded-lg border border-slate-700 bg-slate-800/50 pl-10 pr-3 py-2.5 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={() => void load()}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-800/50 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-700/50 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Status Tabs + Controls */}
        <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 backdrop-blur p-3">
          <div className="flex items-center gap-3 overflow-x-auto">
            <div className="flex gap-2 whitespace-nowrap">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                    activeTab === tab.key
                      ? "bg-slate-600 text-white"
                      : "bg-slate-700/50 text-slate-300 hover:bg-slate-600/50"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className="font-bold">{tab.count}</span>
                </button>
              ))}
            </div>

            <div className="ml-auto flex items-center gap-2 whitespace-nowrap">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-800/50 px-3 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700/50 transition-colors"
              >
                <Filter className="h-4 w-4" />
                Filters
              </button>
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-800/50 px-3 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700/50 transition-colors"
              >
                <Printer className="h-4 w-4" />
                Print
              </button>
            </div>
          </div>
        </div>

        {/* Revenue Table */}
        <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 backdrop-blur overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-700/50 bg-slate-900/50 whitespace-nowrap">
                  <th className="px-2 py-3 text-center font-semibold text-slate-300 min-w-max">SN</th>
                  <th className="px-2 py-3 text-left font-semibold text-slate-300 min-w-max">INVOICE</th>
                  <th className="px-2 py-3 text-left font-semibold text-slate-300 min-w-max">TOUR OPERATOR</th>
                  <th className="px-2 py-3 text-left font-semibold text-slate-300 min-w-max">DATE</th>
                  <th className="px-2 py-3 text-left font-semibold text-slate-300 min-w-max">PACKAGE NAME</th>
                  <th className="px-2 py-3 text-center font-semibold text-slate-300 min-w-max">NO OF PEOPLE</th>
                  <th className="px-2 py-3 text-right font-semibold text-slate-300 min-w-max">TOTAL PAID</th>
                  <th className="px-2 py-3 text-right font-semibold text-slate-300 min-w-max">COMMISSION</th>
                  <th className="px-2 py-3 text-center font-semibold text-slate-300 min-w-max">TAX %</th>
                  <th className="px-2 py-3 text-center font-semibold text-slate-300 min-w-max">STATUS</th>
                  <th className="px-2 py-3 text-right font-semibold text-slate-300 min-w-max">TOUR PAYOUT</th>
                  <th className="px-2 py-3 text-center font-semibold text-slate-300 min-w-max">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/30">
                {loading ? (
                  <tr>
                    <td colSpan={12} className="px-4 py-8 text-center text-slate-400">
                      Loading...
                    </td>
                  </tr>
                ) : filteredRevenues.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="px-4 py-8 text-center text-slate-400">
                      No records found
                    </td>
                  </tr>
                ) : (
                  filteredRevenues.map((revenue, index) => {
                    const Status = statusConfig[revenue.status];
                    return (
                      <tr key={revenue.id} className="hover:bg-slate-700/20 transition-colors border-slate-700/20 text-xs">
                        <td className="px-2 py-2 text-center text-slate-400 font-medium">{index + 1}</td>
                        <td className="px-2 py-2 whitespace-nowrap">
                          <div className="font-semibold text-white text-xs">{revenue.bookingCode}</div>
                          <div className="text-xs text-slate-400">{new Date(revenue.createdAt).toLocaleDateString()}</div>
                        </td>
                        <td className="px-2 py-2 text-slate-300 whitespace-nowrap text-xs">{revenue.operatorName}</td>
                        <td className="px-2 py-2 text-slate-400 text-xs whitespace-nowrap">{new Date(revenue.createdAt).toLocaleDateString()}</td>
                        <td className="px-2 py-2 whitespace-nowrap">
                          <div className="font-semibold text-white text-xs">{revenue.tourTitle}</div>
                          <div className="text-xs text-slate-400">{revenue.destination}</div>
                        </td>
                        <td className="px-2 py-2 text-center font-semibold text-white text-xs whitespace-nowrap">{revenue.numberOfPeople || 0}</td>
                        <td className="px-2 py-2 text-right font-semibold text-white text-xs whitespace-nowrap">{money(revenue.grossAmount)}</td>
                        <td className="px-2 py-2 text-right whitespace-nowrap">
                          <div className="text-purple-300 font-semibold text-xs">{money(revenue.commissionAmount)}</div>
                        </td>
                        <td className="px-2 py-2 text-center font-semibold text-orange-300 text-xs whitespace-nowrap">{Number(revenue.commissionPercent || 0)}%</td>
                        <td className="px-2 py-2 text-center whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${Status.bgColor} ${Status.color}`}>
                            <Status.icon className="h-3 w-3" />
                            {Status.label}
                          </span>
                        </td>
                        <td className="px-2 py-2 text-right font-semibold text-emerald-300 text-xs whitespace-nowrap">{money(revenue.netAmount)}</td>
                        <td className="px-2 py-2 text-center whitespace-nowrap">
                          <button
                            onClick={() => {
                              setSelectedRevenue(revenue);
                              setShowActionModal(true);
                            }}
                            className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 font-medium text-xs"
                          >
                            Action
                            <ChevronRight className="h-3 w-3" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Note */}
        <p className="text-xs text-slate-500">
          List shows one row per booking. Use search to filter by booking code, operator name, tour title, or destination.
        </p>
      </div>

      {/* Action Modal */}
      {showActionModal && selectedRevenue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur">
          <div className="bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6 space-y-4 border border-slate-700">
            <h3 className="text-lg font-bold text-white">Revenue Action</h3>
            <p className="text-sm text-slate-400">
              Booking: <span className="font-semibold text-white">{selectedRevenue.bookingCode}</span>
            </p>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-200">Select Action</label>
              <select
                value={actionType || ""}
                onChange={(e) => setActionType(e.target.value as any)}
                className="w-full border border-slate-600 rounded-lg bg-slate-700 px-3 py-2 text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Choose an action...</option>
                {selectedRevenue.status === "NEW" && <option value="verify">Verify</option>}
                {selectedRevenue.status === "VERIFIED" && <option value="approve">Approve</option>}
                {selectedRevenue.status === "APPROVED" && <option value="disburse">Disburse</option>}
                {selectedRevenue.status !== "DISBURSED" && selectedRevenue.status !== "REJECTED" && <option value="reject">Reject</option>}
              </select>
            </div>

            {actionType === "disburse" && (
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-200">Payment Reference</label>
                <input
                  type="text"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  placeholder="e.g., MPESA-123456, WIRE-789"
                  className="w-full border border-slate-600 rounded-lg bg-slate-700 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            )}

            {actionType === "reject" && (
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-200">Rejection Reason</label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Explain why this is being rejected..."
                  className="w-full border border-slate-600 rounded-lg bg-slate-700 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
                  rows={3}
                />
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <button
                onClick={() => {
                  setShowActionModal(false);
                  setActionType(null);
                  setPaymentRef("");
                  setRejectionReason("");
                }}
                className="flex-1 border border-slate-600 rounded-lg px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-700/50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => void executeAction()}
                disabled={!actionType || actionLoading}
                className="flex-1 bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {actionLoading ? "Processing..." : "Execute"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
