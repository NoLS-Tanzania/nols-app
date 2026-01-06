"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Link from "next/link";
import { Calendar, Loader2, PhoneCall, Mail, CheckCircle2, Clock, X, History, Star, Search } from "lucide-react";

// Use same-origin calls + secure httpOnly cookie session.
const api = axios.create({ baseURL: "", withCredentials: true });

type CheckoutItem = {
  id: number;
  property?: { id: number; title: string };
  codeVisible?: string | null;
  validatedAt?: string | null;
  guestName?: string | null;
  guestPhone?: string | null;
  guestEmail?: string | null;
  checkIn?: string | null;
  checkOut?: string | null;
  status?: string | null;
};

type AuditItem = {
  confirmedAt: string;
  note: string | null;
  rating: number | null;
  feedback: string | null;
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

function hoursLeft(checkOut: any) {
  const t = new Date(String(checkOut ?? "")).getTime();
  if (!Number.isFinite(t)) return null;
  const diffH = (t - Date.now()) / 3600000;
  return diffH;
}

export default function OwnerCheckoutPage() {
  const [list, setList] = useState<CheckoutItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<CheckoutItem | null>(null);
  const [rating, setRating] = useState<number>(0);
  const [feedback, setFeedback] = useState<string>("");

  const [auditOpen, setAuditOpen] = useState(false);
  const [auditTarget, setAuditTarget] = useState<CheckoutItem | null>(null);
  const [auditItems, setAuditItems] = useState<AuditItem[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  const url = "/api/owner/bookings/for-checkout";

  const load = async () => {
    setLoading(true);
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
      setList(normalized as CheckoutItem[]);
    } catch (e: any) {
      setList([]);
      setError(e?.response?.data?.error ?? e?.message ?? "Failed to load check-out queue");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((b) => {
      const name = String(b.guestName ?? "").toLowerCase();
      const phone = String(b.guestPhone ?? "").toLowerCase();
      const email = String(b.guestEmail ?? "").toLowerCase();
      const code = String(b.codeVisible ?? "").toLowerCase();
      const prop = String(b.property?.title ?? "").toLowerCase();
      return name.includes(q) || phone.includes(q) || email.includes(q) || code.includes(q) || prop.includes(q);
    });
  }, [list, search]);

  async function confirmCheckout(id: number) {
    if (!rating || rating < 1 || rating > 5) {
      return setError("Please rate the guest (1–5) before confirming check-out.");
    }
    setConfirmingId(id);
    setError(null);
    try {
      const r = await api.post(`/api/owner/bookings/${id}/confirm-checkout`, { rating, feedback: feedback.trim() || null });
      // Refresh list + let sidebar update counts
      window.dispatchEvent(new Event("nols:checkout-changed"));
      setConfirmOpen(false);
      setConfirmTarget(null);
      setRating(0);
      setFeedback("");
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.error ?? e?.message ?? "Failed to confirm check-out");
    } finally {
      setConfirmingId(null);
    }
  }

  async function openAudit(b: CheckoutItem) {
    setAuditOpen(true);
    setAuditTarget(b);
    setAuditLoading(true);
    setAuditItems([]);
    const url = `/api/owner/bookings/${b.id}/audit`;
    try {
      const r = await api.get(url);
      const items = Array.isArray((r as any).data?.items) ? (r as any).data.items : [];
      setAuditItems(items);
    } catch (e: any) {
      setAuditItems([]);
      setError(e?.response?.data?.error ?? e?.message ?? "Failed to load audit history");
    } finally {
      setAuditLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-emerald-100 mb-4">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900">Check-out</h1>
        <p className="text-sm text-slate-600 mt-2 max-w-2xl">Loading upcoming check-outs…</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 pb-6 sm:pb-8 px-4 sm:px-0">
      {/* Confirm modal (rating required) */}
      {confirmOpen && confirmTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="w-full max-w-xl rounded-3xl bg-white border border-slate-200 shadow-xl ring-1 ring-black/10 overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-slate-200 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Confirm Check-out</div>
                <div className="text-lg font-bold text-slate-900 truncate">{confirmTarget.property?.title ?? "—"}</div>
                <div className="text-xs text-slate-600 mt-1">
                  Guest: <span className="font-semibold text-slate-900">{confirmTarget.guestName ?? "—"}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setConfirmOpen(false); setConfirmTarget(null); setRating(0); setFeedback(""); }}
                className="h-10 w-10 rounded-2xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 active:scale-[0.99] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 inline-flex items-center justify-center"
                aria-label="Close confirm dialog"
                title="Close"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Rate this guest (required)</div>
                <div className="mt-2 flex items-center gap-1">
                  {[1,2,3,4,5].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setRating(v)}
                      className={`h-10 w-10 rounded-2xl border transition-all duration-200 inline-flex items-center justify-center ${
                        rating >= v ? "bg-amber-50 border-amber-200" : "bg-white border-slate-200 hover:bg-slate-50"
                      }`}
                      aria-label={`Rate ${v} star`}
                      title={`${v} star`}
                    >
                      <Star className={`h-5 w-5 ${rating >= v ? "text-amber-500" : "text-slate-300"}`} aria-hidden />
                    </button>
                  ))}
                  <span className="ml-2 text-sm font-semibold text-slate-700">{rating ? `${rating}/5` : "Select"}</span>
                </div>
                <div className="mt-3">
                  <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Optional feedback</div>
                  <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    rows={3}
                    className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300 transition-all duration-200"
                    placeholder="Short note about the guest (optional)…"
                    aria-label="Guest rating feedback"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-end">
                <button
                  type="button"
                  onClick={() => openAudit(confirmTarget)}
                  className="h-10 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 hover:border-slate-300 active:scale-[0.99] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 inline-flex items-center gap-2 justify-center"
                >
                  <History className="h-4 w-4" aria-hidden />
                  View Audit History
                </button>
                <button
                  type="button"
                  onClick={() => confirmCheckout(confirmTarget.id)}
                  disabled={confirmingId === confirmTarget.id}
                  className="h-10 rounded-2xl bg-emerald-700 text-white px-6 text-sm font-bold shadow-sm hover:bg-emerald-800 active:scale-[0.99] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-emerald-500/30 inline-flex items-center gap-2 justify-center"
                >
                  {confirmingId === confirmTarget.id ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <CheckCircle2 className="h-4 w-4" aria-hidden />}
                  Confirm Check-out
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Audit modal */}
      {auditOpen && auditTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="w-full max-w-2xl rounded-3xl bg-white border border-slate-200 shadow-xl ring-1 ring-black/10 overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-slate-200 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Audit History</div>
                <div className="text-lg font-bold text-slate-900 truncate">{auditTarget.property?.title ?? "—"}</div>
                <div className="text-xs text-slate-600 mt-1">
                  Booking #{auditTarget.id} • Code <span className="font-mono font-semibold text-slate-900">{auditTarget.codeVisible ?? "—"}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setAuditOpen(false); setAuditTarget(null); setAuditItems([]); }}
                className="h-10 w-10 rounded-2xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 active:scale-[0.99] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 inline-flex items-center justify-center"
                aria-label="Close audit dialog"
                title="Close"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
            <div className="p-5 sm:p-6">
              {auditLoading ? (
                <div className="flex items-center gap-3 text-slate-700">
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                  Loading audit history…
                </div>
              ) : auditItems.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
                  No audit history found yet for this booking.
                </div>
              ) : (
                <div className="w-full overflow-x-auto">
                  <table className="min-w-[700px] w-full text-sm">
                    <thead className="bg-slate-50 border border-slate-200">
                      <tr>
                        <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-600 text-left">Action</th>
                        <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-600 text-left">Confirmed At</th>
                        <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-600 text-left">Rating</th>
                        <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-600 text-left">Feedback</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 border border-slate-200 border-t-0">
                      {auditItems.map((it, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-4 py-3 font-semibold text-slate-900">{it.note ?? "—"}</td>
                          <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{formatDateTime(it.confirmedAt)}</td>
                          <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{typeof it.rating === "number" ? `${it.rating}/5` : "—"}</td>
                          <td className="px-4 py-3 text-slate-700">{it.feedback ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* Header */}
      <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-emerald-50/30 p-4 sm:p-5 lg:p-6 shadow-sm ring-1 ring-black/5">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-emerald-100 mb-4 transition-all duration-300 hover:bg-emerald-200 hover:scale-105">
            <Calendar className="h-8 w-8 text-emerald-700" aria-hidden />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">Check-out</h1>
          <p className="text-sm sm:text-base text-slate-600 mt-2 max-w-2xl leading-relaxed">
            Bookings appear here automatically when they are within <span className="font-semibold text-slate-900">7 hours</span> of check-out (or overdue).
            Use this page to remind guests and confirm check-out once they leave.
          </p>
        </div>

        {/* Centered Modern Search Box */}
        <div className="mt-6 flex flex-col items-center justify-center">
          <div className="w-full max-w-xs">
            <div className="relative group">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10">
                <Search className="h-3 w-3 text-slate-400 group-focus-within:text-emerald-600 transition-colors duration-300" aria-hidden />
              </div>
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 inline-flex items-center justify-center h-4 w-4 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 active:scale-95 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  aria-label="Clear search"
                >
                  <X className="h-2.5 w-2.5" aria-hidden />
                </button>
              )}
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by guest, phone, email, code, property…"
                className="h-9 w-full pl-9 pr-8 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 shadow-sm hover:shadow-md hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 focus:shadow-lg transition-all duration-300"
                aria-label="Search check-out queue"
              />
            </div>
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        ) : null}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm ring-1 ring-black/5 p-10 sm:p-12 text-center">
          <Clock className="h-12 w-12 text-slate-400 mx-auto mb-4 opacity-60" aria-hidden />
          <p className="text-sm sm:text-base text-slate-700 font-semibold">No bookings are ready for check-out.</p>
          <p className="text-xs sm:text-sm text-slate-500 mt-2">
            Check-outs will appear automatically when they are within 7 hours of the check-out time.
          </p>
          <div className="mt-4">
            <Link href="/owner/bookings/checked-in" className="no-underline inline-flex items-center justify-center h-10 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-all duration-200">
              View Checked-In
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm ring-1 ring-black/5 overflow-hidden">
          <div className="w-full overflow-x-auto -mx-4 sm:mx-0">
            <div className="inline-block min-w-full align-middle px-4 sm:px-0">
              <table className="min-w-[1000px] sm:min-w-[1100px] w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-left">
                  <th className="px-4 sm:px-6 py-3 text-xs font-bold uppercase tracking-wide text-slate-600">Property</th>
                  <th className="px-4 sm:px-6 py-3 text-xs font-bold uppercase tracking-wide text-slate-600">Code</th>
                  <th className="px-4 sm:px-6 py-3 text-xs font-bold uppercase tracking-wide text-slate-600">Guest</th>
                  <th className="px-4 sm:px-6 py-3 text-xs font-bold uppercase tracking-wide text-slate-600">Phone</th>
                  <th className="px-4 sm:px-6 py-3 text-xs font-bold uppercase tracking-wide text-slate-600">Validated At</th>
                  <th className="px-4 sm:px-6 py-3 text-xs font-bold uppercase tracking-wide text-slate-600">Check-out Time</th>
                  <th className="px-4 sm:px-6 py-3 text-xs font-bold uppercase tracking-wide text-slate-600">State</th>
                  <th className="px-4 sm:px-6 py-3 text-xs font-bold uppercase tracking-wide text-slate-600 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {filtered.map((b) => {
                  const h = hoursLeft(b.checkOut);
                  const urgent = typeof h === "number" ? h <= 1 : false;
                  const overdue = typeof h === "number" ? h < 0 : false;
                  const phone = String(b.guestPhone ?? "").trim();
                  const email = String(b.guestEmail ?? "").trim();

                  return (
                    <tr key={b.id} className="hover:bg-slate-50/60 transition-colors duration-150">
                      <td className="px-4 sm:px-6 py-3 sm:py-4">
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900 truncate">{b.property?.title ?? "—"}</div>
                          <div className="text-xs text-slate-500 mt-0.5">Booking #{b.id}</div>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4">
                        <span className="font-mono font-semibold text-slate-900">{b.codeVisible ?? "—"}</span>
                      </td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4">
                        <span className="font-semibold text-slate-900">{b.guestName ?? "—"}</span>
                      </td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4">
                        <span className="text-slate-700">{phone || "—"}</span>
                      </td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                        <span className="text-slate-700">{b.validatedAt ? formatDateTime(b.validatedAt) : "—"}</span>
                      </td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                        <div className="text-slate-900 font-semibold">{formatDateTime(b.checkOut)}</div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {typeof h === "number" ? (h < 0 ? `${Math.abs(h).toFixed(1)}h overdue` : `${h.toFixed(1)}h left`) : "—"}
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                          overdue
                            ? "bg-red-50 text-red-700 border-red-200"
                            : urgent
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-emerald-50 text-emerald-700 border-emerald-200"
                        }`}>
                          <Clock className="h-3 w-3" aria-hidden />
                          {overdue ? "OVERDUE" : urgent ? "URGENT" : "DUE SOON"}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4">
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 justify-end">
                          <button
                            type="button"
                            onClick={() => openAudit(b)}
                            className="inline-flex items-center justify-center gap-1.5 sm:gap-2 h-9 rounded-2xl border border-slate-200 bg-white px-2.5 sm:px-3 text-xs sm:text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 hover:border-slate-300 active:scale-[0.99] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                            aria-label="View audit history"
                            title="Audit history"
                          >
                            <History className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden />
                            <span className="hidden sm:inline">History</span>
                          </button>
                          <a
                            href={phone ? `tel:${phone}` : undefined}
                            className={`no-underline inline-flex items-center justify-center gap-1.5 sm:gap-2 h-9 rounded-2xl px-2.5 sm:px-3 text-xs sm:text-sm font-semibold border shadow-sm transition-all duration-200 ${
                              phone
                                ? "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300"
                                : "bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed pointer-events-none"
                            }`}
                            aria-label="Call guest"
                            title={phone ? "Call guest" : "No phone number"}
                          >
                            <PhoneCall className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden />
                            <span className="hidden sm:inline">Call</span>
                          </a>
                          <a
                            href={email ? `mailto:${email}` : undefined}
                            className={`no-underline inline-flex items-center justify-center gap-1.5 sm:gap-2 h-9 rounded-2xl px-2.5 sm:px-3 text-xs sm:text-sm font-semibold border shadow-sm transition-all duration-200 ${
                              email
                                ? "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300"
                                : "bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed pointer-events-none"
                            }`}
                            aria-label="Email guest"
                            title={email ? "Email guest" : "No email"}
                          >
                            <Mail className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden />
                            <span className="hidden sm:inline">Email</span>
                          </a>
                          <button
                            type="button"
                            onClick={() => { setConfirmTarget(b); setConfirmOpen(true); setError(null); }}
                            className="inline-flex items-center justify-center gap-1.5 sm:gap-2 h-9 rounded-2xl bg-emerald-700 text-white px-3 sm:px-4 text-xs sm:text-sm font-bold shadow-sm hover:bg-emerald-800 active:scale-[0.99] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden />
                            <span className="hidden sm:inline">Confirm</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


