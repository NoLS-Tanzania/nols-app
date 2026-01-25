"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Link from "next/link";
import { Calendar, Loader2, Search, RotateCw, X, History, CheckCircle2 } from "lucide-react";
import TableRow from "@/components/TableRow";

// Use same-origin calls + secure httpOnly cookie session.
const api = axios.create({ baseURL: "", withCredentials: true });

type CheckedOutItem = {
  id: number;
  property?: { id: number; title: string };
  codeVisible?: string | null;
  validatedAt?: string | null;
  guestName?: string | null;
  guestPhone?: string | null;
  guestEmail?: string | null;
  roomType?: string | null;
  roomCode?: string | null;
  checkIn?: string | null;
  checkOut?: string | null;
  checkoutConfirmedAt?: string | null;
  overdueHours?: number | null;
  overdueDays?: number | null;
  checkoutTiming?: "OVERDUE" | "NORMAL" | "UNKNOWN" | string | null;
  status?: string | null;
  totalAmount?: number | null;
  createdAt?: string | null;
};

type AuditItem = {
  confirmedAt: string;
  note: string | null;
  rating: number | null;
  feedback: string | null;
  clientIp?: string | null;
  clientUa?: string | null;
  actorName?: string | null;
  actorRole?: string | null;
};

function formatDateTime(v: any) {
  try {
    const d = new Date(String(v ?? ""));
    const t = d.getTime();
    if (!Number.isFinite(t)) return "—";
    return d.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function formatCurrencyTZS(amount: any) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("en-TZ", {
    style: "currency",
    currency: "TZS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

export default function OwnerCheckedOutPage() {
  const [list, setList] = useState<CheckedOutItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [auditOpen, setAuditOpen] = useState(false);
  const [auditTarget, setAuditTarget] = useState<CheckedOutItem | null>(null);
  const [auditItems, setAuditItems] = useState<AuditItem[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  const url = "/api/owner/bookings/checked-out";

  const load = async (opts?: { silent?: boolean }) => {
    const silent = Boolean(opts?.silent);
    if (silent) setRefreshing(true);
    else setLoading(true);

    setError(null);
    try {
      const r = await api.get<unknown>(url);
      const raw: any = (r as any).data;
      const normalized: any[] = Array.isArray(raw)
        ? raw
        : (Array.isArray(raw?.data)
          ? raw.data
          : (Array.isArray(raw?.items)
            ? raw.items
            : []));
      setList(normalized as CheckedOutItem[]);
    } catch (e: any) {
      if (!silent) setList([]);
      setError(e?.response?.data?.error ?? e?.message ?? "Failed to load checked-out history");
    } finally {
      if (silent) setRefreshing(false);
      else setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function openAudit(b: CheckedOutItem) {
    setAuditOpen(true);
    setAuditTarget(b);
    setAuditLoading(true);
    setAuditItems([]);

    const auditUrl = `/api/owner/bookings/${b.id}/audit`;
    try {
      const r = await api.get(auditUrl);
      const items = Array.isArray((r as any).data?.items) ? (r as any).data.items : [];
      setAuditItems(items);
    } catch (e: any) {
      setAuditItems([]);
      setError(e?.response?.data?.error ?? e?.message ?? "Failed to load audit history");
    } finally {
      setAuditLoading(false);
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((b) => {
      const name = String(b.guestName ?? "").toLowerCase();
      const phone = String(b.guestPhone ?? "").toLowerCase();
      const email = String(b.guestEmail ?? "").toLowerCase();
      const code = String(b.codeVisible ?? "").toLowerCase();
      const prop = String(b.property?.title ?? "").toLowerCase();
      const room = String(b.roomType ?? b.roomCode ?? "").toLowerCase();
      return name.includes(q) || phone.includes(q) || email.includes(q) || code.includes(q) || prop.includes(q) || room.includes(q);
    });
  }, [list, search]);

  const stats = useMemo(() => {
    const now = Date.now();
    let last7d = 0;
    let last30d = 0;
    for (const b of list) {
      const t = new Date(String(b.checkOut ?? "")).getTime();
      if (!Number.isFinite(t)) continue;
      const diffDays = (now - t) / 86400000;
      if (diffDays <= 7) last7d += 1;
      if (diffDays <= 30) last30d += 1;
    }
    return { total: list.length, last7d, last30d };
  }, [list]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-emerald-100 mb-4">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900">Checked-out</h1>
        <p className="text-sm text-slate-600 mt-2 max-w-2xl">Loading check-out history…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
      {/* Audit modal */}
      {auditOpen && auditTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]">
          <div className="w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-2xl ring-1 ring-black/10 overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Audit History</div>
                <div className="text-base sm:text-lg font-bold text-slate-900 truncate">{auditTarget.property?.title ?? "—"}</div>
                <div className="text-xs text-slate-600 mt-1">
                  Booking <span className="font-semibold text-slate-900">#{auditTarget.id}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setAuditOpen(false); setAuditTarget(null); setAuditItems([]); }}
                className="h-9 w-9 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 active:scale-[0.99] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 inline-flex items-center justify-center"
                aria-label="Close audit dialog"
                title="Close"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>

            <div className="p-4 sm:p-5">
              {auditLoading ? (
                <div className="py-10 text-center">
                  <Loader2 className="h-6 w-6 animate-spin text-emerald-600 mx-auto" />
                  <div className="text-sm text-slate-600 mt-3">Loading audit…</div>
                </div>
              ) : auditItems.length === 0 ? (
                <div className="py-10 text-center">
                  <History className="h-10 w-10 text-slate-300 mx-auto" aria-hidden />
                  <div className="text-sm font-semibold text-slate-800 mt-3">No audit records found</div>
                  <div className="text-xs text-slate-500 mt-1">This booking may predate audit logging.</div>
                </div>
              ) : (
                <div className="space-y-3">
                  {auditItems.map((it, idx) => (
                    <div key={idx} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-semibold text-slate-900">
                          {String(it.note ?? "").toLowerCase() === "checkout" ? "CHECK-OUT" : String(it.note ?? "").toLowerCase() === "checkin" ? "CHECK-IN" : (it.note ?? "event")}
                        </div>
                        <div className="text-xs text-slate-600">{formatDateTime(it.confirmedAt)}</div>
                      </div>
                      <div className="mt-2 text-xs text-slate-600 flex flex-wrap gap-x-4 gap-y-1">
                        <span>
                          By: <span className="font-semibold text-slate-900">{it.actorName ?? "—"}</span>
                        </span>
                        <span>
                          Rating: <span className="font-semibold text-slate-900">{typeof it.rating === "number" ? `${it.rating}/5` : "—"}</span>
                        </span>
                        {it.feedback ? (
                          <span className="min-w-0">
                            Feedback: <span className="font-semibold text-slate-900">{it.feedback}</span>
                          </span>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* Header */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 sm:p-8">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-start gap-4">
            <div className="hidden sm:block" />

            <div className="min-w-0 flex flex-col items-center text-center">
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-700">
                <CheckCircle2 className="h-4 w-4" aria-hidden />
                Check-out history
              </div>
              <h1 className="mt-3 text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Checked-out</h1>
              <p className="mt-1 text-sm text-gray-600 max-w-2xl">
                View bookings you’ve already checked out. Use audit history to see ratings and notes.
              </p>
            </div>

            <div className="flex items-center justify-start sm:justify-end gap-2">
              <Link
                href="/owner/bookings/check-out"
                className="no-underline inline-flex items-center justify-center h-10 w-10 rounded-md border border-gray-200 bg-white text-gray-700 shadow-sm hover:bg-gray-50 active:scale-[0.99] transition"
                aria-label="Back to check-out queue"
                title="Back to check-out"
              >
                <Calendar className="h-4 w-4" aria-hidden />
              </Link>
              <button
                type="button"
                onClick={() => load({ silent: true })}
                disabled={refreshing}
                className="inline-flex items-center justify-center h-10 w-10 rounded-md border border-slate-900 bg-slate-900 text-white shadow-sm hover:bg-slate-800 active:scale-[0.99] transition disabled:opacity-60"
                aria-label="Refresh"
                title="Refresh"
              >
                <RotateCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} aria-hidden />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="text-center text-xs font-medium text-gray-500">Total checked-out</div>
          <div className="mt-1 text-center text-2xl font-bold text-gray-900">{stats.total.toLocaleString()}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="text-center text-xs font-medium text-gray-500">Last 7 days</div>
          <div className="mt-1 text-center text-2xl font-bold text-emerald-700">{stats.last7d.toLocaleString()}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="text-center text-xs font-medium text-gray-500">Last 30 days</div>
          <div className="mt-1 text-center text-2xl font-bold text-emerald-700">{stats.last30d.toLocaleString()}</div>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      {/* List */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-10 sm:p-12 text-center shadow-sm">
          <CheckCircle2 className="h-12 w-12 text-gray-300 mx-auto mb-4" aria-hidden />
          <p className="text-sm text-gray-700 font-semibold">No checked-out bookings found.</p>
          <p className="text-xs text-gray-500 mt-2">If you just confirmed a check-out, refresh this page.</p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => load({ silent: true })}
              disabled={refreshing}
              className="inline-flex items-center justify-center h-10 w-10 rounded-md border border-slate-900 bg-slate-900 text-white shadow-sm hover:bg-slate-800 active:scale-[0.99] transition disabled:opacity-60"
              aria-label="Refresh"
              title="Refresh"
            >
              <RotateCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} aria-hidden />
            </button>
            <Link
              href="/owner/bookings/check-out"
              className="no-underline inline-flex items-center justify-center h-10 w-10 rounded-md bg-emerald-700 text-white shadow-sm hover:bg-emerald-800 active:scale-[0.99] transition"
              aria-label="Go to check-out queue"
              title="Go to check-out"
            >
              <Calendar className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="sticky top-0 z-10 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-gray-900">Checked-out bookings</div>
              <div className="text-xs text-gray-500 mt-0.5">Search by guest, code, property, room…</div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" aria-hidden />
                </div>
                {search ? (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center h-7 w-7 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-200/50 active:scale-95 transition"
                    aria-label="Clear search"
                    title="Clear"
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </button>
                ) : null}
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search guest, code, property…"
                  className="h-10 w-full sm:w-72 pl-10 pr-10 rounded-md border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  aria-label="Search checked-out history"
                />
              </div>

              <button
                type="button"
                onClick={() => load({ silent: true })}
                disabled={refreshing}
                className="inline-flex items-center justify-center h-10 w-10 rounded-md border border-slate-900 bg-slate-900 text-white shadow-sm hover:bg-slate-800 active:scale-[0.99] transition disabled:opacity-60"
                aria-label="Refresh checked-out list"
                title="Refresh"
              >
                <RotateCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} aria-hidden />
              </button>

              <Link
                href="/owner/bookings/check-out"
                className="no-underline inline-flex items-center justify-center h-10 w-10 rounded-md bg-emerald-700 text-white shadow-sm hover:bg-emerald-800 active:scale-[0.99] transition"
                aria-label="Back to check-out queue"
                title="Back to check-out"
              >
                <Calendar className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </div>

          <div className={`overflow-x-auto ${refreshing ? "opacity-60" : ""} transition-opacity duration-200`}>
            <table className="min-w-[1250px] w-full text-sm">
              <thead className="sticky top-0 z-10 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Property</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Code</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Guest</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Phone</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Check-in</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Check-out</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Overdue</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filtered.map((b) => (
                  <TableRow key={b.id} className="align-middle">
                    <td className="px-6 py-4">
                      <div className="min-w-0">
                        <div className="font-semibold text-gray-900 truncate">{b.property?.title ?? "—"}</div>
                        <div className="text-xs text-gray-500 mt-0.5">Booking #{b.id}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-mono font-semibold text-gray-900">{b.codeVisible ?? "—"}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900">{b.guestName ?? "—"}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{b.roomType ?? b.roomCode ?? ""}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-700">{b.guestPhone ?? "—"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-700">{formatDateTime(b.checkIn)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-700">{formatDateTime(b.checkOut)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {String(b.checkoutTiming ?? "UNKNOWN").toUpperCase() === "OVERDUE" ? (
                        <span
                          className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700"
                          title={b.checkoutConfirmedAt ? `Confirmed: ${formatDateTime(b.checkoutConfirmedAt)}` : "Overdue"}
                        >
                          OVERDUE
                          {typeof b.overdueDays === "number" || typeof b.overdueHours === "number"
                            ? ` (${typeof b.overdueDays === "number" ? `${b.overdueDays}d` : ""}${typeof b.overdueDays === "number" && typeof b.overdueHours === "number" ? ", " : ""}${typeof b.overdueHours === "number" ? `${b.overdueHours}h` : ""})`
                            : ""}
                        </span>
                      ) : String(b.checkoutTiming ?? "UNKNOWN").toUpperCase() === "NORMAL" ? (
                        <span
                          className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700"
                          title={b.checkoutConfirmedAt ? `Confirmed: ${formatDateTime(b.checkoutConfirmedAt)}` : "Normal"}
                        >
                          NORMAL
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700"
                          title="No confirmation timestamp found for this record"
                        >
                          UNKNOWN
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900 font-semibold">{formatCurrencyTZS(b.totalAmount)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        type="button"
                        onClick={() => openAudit(b)}
                        className="inline-flex items-center justify-center h-9 w-9 rounded-md border border-gray-200 bg-white text-gray-700 shadow-sm hover:bg-gray-50 active:scale-[0.99] transition"
                        aria-label="View audit"
                        title="Audit"
                      >
                        <History className="h-4 w-4" aria-hidden />
                      </button>
                    </td>
                  </TableRow>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
