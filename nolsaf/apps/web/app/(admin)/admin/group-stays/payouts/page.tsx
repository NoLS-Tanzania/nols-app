"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import apiClient from "@/lib/apiClient";
import { Wallet, Loader2, CheckCircle, Clock, User, MapPin, Building2, Calendar, Star, MessageSquare } from "lucide-react";

const api = apiClient;

type Earning = {
  id: number;
  toRegion: string | null;
  toDistrict: string | null;
  checkIn: string | null;
  checkOut: string | null;
  checkedInAt: string | null;
  currency: string;
  totalAmount: number;
  commissionAmount: number;
  ownerCollects: number;
  assignedOwner: { id: number; name: string; email: string | null; phone: string | null } | null;
  confirmedProperty: { id: number; title: string } | null;
  guestReview: { rating: number; title: string | null; comment: string | null; ownerResponse: string | null; createdAt: string } | null;
};

export default function AdminGroupStayEarningsPage() {
  const [filter, setFilter] = useState<"CHECKED_IN" | "ALL">("CHECKED_IN");
  const [ownerId, setOwnerId] = useState<string>("");
  const [owners, setOwners] = useState<Array<{ id: number; name: string; count: number }>>([]);
  const [items, setItems] = useState<Earning[]>([]);
  const [loading, setLoading] = useState(true);

  // Load the owner list (with record counts) for the filter dropdown once.
  useEffect(() => {
    (async () => {
      try {
        const r = await api.get("/api/admin/group-stays/bookings/earnings/owners");
        setOwners(Array.isArray(r.data?.owners) ? r.data.owners : []);
      } catch (err) {
        console.warn("Failed to load owners for filter", err);
        setOwners([]);
      }
    })();
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { filter, pageSize: 100 };
      if (ownerId) params.ownerId = Number(ownerId);
      const r = await api.get("/api/admin/group-stays/bookings/earnings", { params });
      setItems(Array.isArray(r.data?.items) ? r.data.items : []);
    } catch (err) {
      console.error("Failed to load earnings", err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [filter, ownerId]);

  useEffect(() => { load(); }, [load]);

  const money = (n: number | null | undefined, cur = "TZS") =>
    n == null ? "—" : `${cur} ${Math.round(Number(n)).toLocaleString("en-US")}`;

  const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—";

  const summary = useMemo(() => {
    const ratings = items.map((e) => e.guestReview?.rating).filter((r): r is number => typeof r === "number");
    return {
      count: items.length,
      commission: items.reduce((s, e) => s + Number(e.commissionAmount || 0), 0),
      ownerCollects: items.reduce((s, e) => s + Number(e.ownerCollects || 0), 0),
      avgRating: ratings.length ? ratings.reduce((s, r) => s + r, 0) / ratings.length : null,
      reviewCount: ratings.length,
    };
  }, [items]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="flex flex-col items-center text-center">
          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-emerald-50 to-green-100 flex items-center justify-center mb-4">
            <Wallet className="h-8 w-8 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Owner Earnings</h1>
          <p className="text-sm text-gray-500 mt-1 max-w-xl">
            Confirmed group stays and how the money splits. NoLSAF&apos;s commission is the deposit; the owner
            collects the balance directly from the guest at the property. NoLSAF does not disburse to owners.
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          {/* Owner dropdown */}
          <div className="w-full sm:w-auto sm:min-w-[260px]">
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Owner</label>
            <select
              value={ownerId}
              onChange={(e) => setOwnerId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm bg-white"
            >
              <option value="">All owners</option>
              {owners.map((o) => (
                <option key={o.id} value={o.id}>{o.name} ({o.count})</option>
              ))}
            </select>
          </div>

          {/* Checked-in / All toggle */}
          <div className="inline-flex rounded-xl border border-gray-200 p-1 flex-shrink-0">
            {([["CHECKED_IN", "Checked in"], ["ALL", "All confirmed"]] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  filter === key ? "bg-emerald-600 text-white shadow" : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary */}
      {!loading && items.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <SummaryCard label="Group stays" value={String(summary.count)} />
          <SummaryCard label="NoLSAF commission" value={money(summary.commission)} />
          <SummaryCard label="Owners collect" value={money(summary.ownerCollects)} highlight />
          <SummaryCard
            label={`Avg rating${summary.reviewCount ? ` (${summary.reviewCount})` : ""}`}
            value={summary.avgRating != null ? `${summary.avgRating.toFixed(1)} ★` : "—"}
          />
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="min-h-[40vh] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-sm">
          <Wallet className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">
            {ownerId ? "No group stays match this owner." : filter === "CHECKED_IN" ? "No checked-in group stays yet." : "No confirmed group stays yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((e) => (
            <div key={e.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-5">
                <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-11 w-11 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                      <User className="h-5 w-5 text-emerald-700" />
                    </div>
                    <div className="min-w-0">
                      <button
                        onClick={() => e.assignedOwner && setOwnerId(String(e.assignedOwner.id))}
                        className="text-base font-bold text-gray-900 truncate hover:text-emerald-700 hover:underline text-left"
                        title="Filter to this owner"
                        disabled={!e.assignedOwner}
                      >
                        {e.assignedOwner?.name || "Owner"}
                      </button>
                      <p className="text-xs text-gray-500 truncate">
                        Group stay #{e.id}
                        {e.assignedOwner?.phone ? ` • ${e.assignedOwner.phone}` : ""}
                      </p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5 ${
                    e.checkedInAt ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                  }`}>
                    {e.checkedInAt ? <CheckCircle className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                    {e.checkedInAt ? "Checked in" : "Confirmed"}
                  </span>
                </div>

                {/* Split */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                  <Stat label="Booking total" value={money(e.totalAmount, e.currency)} />
                  <Stat label="NoLSAF commission (deposit)" value={money(e.commissionAmount, e.currency)} />
                  <Stat label="Owner collects at property" value={money(e.ownerCollects, e.currency)} highlight />
                </div>

                {/* Meta */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                  {e.confirmedProperty && (
                    <span className="inline-flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" />{e.confirmedProperty.title}</span>
                  )}
                  <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{[e.toDistrict, e.toRegion].filter(Boolean).join(", ") || "—"}</span>
                  <span className="inline-flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />{e.checkedInAt ? `Checked in ${formatDate(e.checkedInAt)}` : `Stay ${formatDate(e.checkIn)}`}</span>
                </div>

                {/* Guest review */}
                {e.guestReview && (
                  <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50/60 p-4">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="inline-flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star key={n} className={`h-4 w-4 ${n <= e.guestReview!.rating ? "text-amber-500 fill-amber-500" : "text-gray-300"}`} />
                        ))}
                      </div>
                      <span className="text-sm font-bold text-gray-900">{e.guestReview.rating}/5</span>
                      {e.guestReview.title && <span className="text-sm font-medium text-gray-700 truncate">· {e.guestReview.title}</span>}
                    </div>
                    {e.guestReview.comment && (
                      <p className="text-sm text-gray-700 leading-relaxed">{e.guestReview.comment}</p>
                    )}
                    {e.guestReview.ownerResponse && (
                      <div className="mt-2 flex items-start gap-2 text-xs text-gray-600 border-l-2 border-emerald-300 pl-2.5">
                        <MessageSquare className="h-3.5 w-3.5 mt-0.5 text-emerald-600 flex-shrink-0" />
                        <span><span className="font-semibold">Owner replied:</span> {e.guestReview.ownerResponse}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg p-3 border ${highlight ? "bg-emerald-600/10 border-emerald-200" : "bg-gray-50 border-gray-100"}`}>
      <p className={`text-[11px] font-medium uppercase tracking-wider mb-1 ${highlight ? "text-emerald-700" : "text-gray-500"}`}>{label}</p>
      <p className={`text-sm font-bold ${highlight ? "text-emerald-800" : "text-gray-900"}`}>{value}</p>
    </div>
  );
}

function SummaryCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl p-4 border shadow-sm ${highlight ? "bg-emerald-50 border-emerald-200" : "bg-white border-gray-200"}`}>
      <p className="text-[11px] font-medium uppercase tracking-wider text-gray-500 mb-1">{label}</p>
      <p className={`text-xl font-bold ${highlight ? "text-emerald-700" : "text-gray-900"}`}>{value}</p>
    </div>
  );
}
