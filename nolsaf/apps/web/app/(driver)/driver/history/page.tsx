"use client";
import React, { useState, useCallback, useRef } from "react";
import DriverPageHeader from "@/components/DriverPageHeader";
import DatePicker from "@/components/ui/DatePicker";
import TableRow from "@/components/TableRow";
import { ListChecks, Wallet, CreditCard } from "lucide-react";

export default function DriverHistoryPage() {
  const [showPicker, setShowPicker] = useState(false);
  const [selected, setSelected] = useState<string | string[] | undefined>(undefined);
  const [showTrips, setShowTrips] = useState(false);
  const [trips, setTrips] = useState<any[] | null>(null);
  const [loadingTrips, setLoadingTrips] = useState(false);
  const tripsAbortRef = useRef<AbortController | null>(null);
  const [showInvoices, setShowInvoices] = useState(false);
  const [invoices, setInvoices] = useState<any[] | null>(null);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const invoicesAbortRef = useRef<AbortController | null>(null);
  const [showSafety, setShowSafety] = useState(false);
  const [safetyReports, setSafetyReports] = useState<any[] | null>(null);
  const [loadingSafety, setLoadingSafety] = useState(false);
  const safetyAbortRef = useRef<AbortController | null>(null);

  const fetchTrips = useCallback(async () => {
    // abort any previous trips fetch
    try { tripsAbortRef.current?.abort(); } catch {}
    const controller = new AbortController();
    tripsAbortRef.current = controller;
    setLoadingTrips(true);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const params = new URLSearchParams();
      if (selected) {
        if (Array.isArray(selected)) {
          if (selected[0]) params.set("start", selected[0]);
          if (selected[1]) params.set("end", selected[1]);
        } else {
          params.set("date", selected);
        }
      }
      const base = process.env.NEXT_PUBLIC_API_URL || "";
      const url = `${base}/driver/trips${params.toString() ? "?" + params.toString() : ""}`;
      const res = await fetch(url, { signal: controller.signal, headers: token ? { Authorization: `Bearer ${token}` } : undefined });
      if (!res.ok) {
        setTrips([]);
        tripsAbortRef.current = null;
        return;
      }
  const data = await res.json();
  const arr = data?.trips ?? (Array.isArray(data) ? data : []);
      setTrips(arr);
    } catch (e) {
      if ((e as any)?.name === 'AbortError') {
        // request was aborted; do nothing
      } else {
        setTrips([]);
      }
    } finally {
      tripsAbortRef.current = null;
      setLoadingTrips(false);
    }
  }, [selected]);

  const fetchSafetyReports = useCallback(async () => {
    try { safetyAbortRef.current?.abort(); } catch {}
    const controller = new AbortController();
    safetyAbortRef.current = controller;
    setLoadingSafety(true);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const params = new URLSearchParams();
      if (selected) {
        if (Array.isArray(selected)) {
          if (selected[0]) params.set("start", selected[0]);
          if (selected[1]) params.set("end", selected[1]);
        } else {
          params.set("date", selected);
        }
      }
      const base = process.env.NEXT_PUBLIC_API_URL || "";
      const url = `${base}/driver/safety${params.toString() ? "?" + params.toString() : ""}`;
      const res = await fetch(url, { signal: controller.signal, headers: token ? { Authorization: `Bearer ${token}` } : undefined });
      if (!res.ok) {
        setSafetyReports([]);
        safetyAbortRef.current = null;
        return;
      }
  const data = await res.json();
  const arr = data?.items ?? (Array.isArray(data) ? data : []);

      // If the API already returns monthly summaries, use them; otherwise, group raw incidents by month
      const looksLikeSummary = arr.length > 0 && arr[0] && (arr[0].month || arr[0].period);
      if (looksLikeSummary) {
        setSafetyReports(arr);
      } else {
        // group by YYYY-MM
        const map = new Map<string, { month: string; trips: number; infractions: number }>();
        for (const it of arr) {
          const dateStr = it.date || it.timestamp || it.createdAt || it.datetime || null;
          const d = dateStr ? new Date(dateStr) : new Date();
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          const existing = map.get(key) ?? { month: key, trips: 0, infractions: 0 };
          existing.trips += 1;
          // detect any infraction-like flags
          const infraction = !!(it.infraction || it.ruleViolated || it.speeding || it.hardBraking || it.harshAcceleration || it.distracted || it.offRoute);
          if (infraction) existing.infractions += 1;
          map.set(key, existing);
        }
        const grouped = Array.from(map.values()).sort((a, b) => b.month.localeCompare(a.month));
        setSafetyReports(grouped as any);
      }
    } catch (e) {
      if ((e as any)?.name === 'AbortError') {
        // aborted
      } else {
        setSafetyReports([]);
      }
    } finally {
      safetyAbortRef.current = null;
      setLoadingSafety(false);
    }
  }, [selected]);

  const fetchInvoices = useCallback(async () => {
    try { invoicesAbortRef.current?.abort(); } catch {}
    const controller = new AbortController();
    invoicesAbortRef.current = controller;
    setLoadingInvoices(true);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const params = new URLSearchParams();
      if (selected) {
        if (Array.isArray(selected)) {
          if (selected[0]) params.set("start", selected[0]);
          if (selected[1]) params.set("end", selected[1]);
        } else {
          params.set("date", selected);
        }
      }
      const base = process.env.NEXT_PUBLIC_API_URL || "";
      const url = `${base}/driver/payouts${params.toString() ? "?" + params.toString() : ""}`;
      const res = await fetch(url, { signal: controller.signal, headers: token ? { Authorization: `Bearer ${token}` } : undefined });
      if (!res.ok) {
        setInvoices([]);
        invoicesAbortRef.current = null;
        return;
      }
  const data = await res.json();
  const arr = data?.items ?? (Array.isArray(data) ? data : []);
      // filter to paid payouts only (best-effort matching common fields)
      const paid = arr.filter((p: any) => {
        const st = String(p.status || p.state || "").toLowerCase();
        return st === "paid" || !!p.paidAt || !!p.settledAt || p.paid === true || p.isPaid === true;
      });
      setInvoices(paid);
    } catch (e) {
      if ((e as any)?.name === 'AbortError') {
        // aborted
      } else {
        setInvoices([]);
      }
    } finally {
      invoicesAbortRef.current = null;
      setLoadingInvoices(false);
    }
  }, [selected]);

  function renderSelected() {
    if (!selected) return "All dates";
    if (Array.isArray(selected)) return `${selected[0]} → ${selected[1] ?? selected[0]}`;
    return selected;
  }

  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-3xl">
        <DriverPageHeader title="History" />
      </div>

      <div className="mx-auto max-w-3xl mt-4 flex items-center gap-3">
        <button
          onClick={() => {
            const willOpen = !showTrips;
            setShowTrips(willOpen);
            // stop other loaders and abort their fetches when switching
            try { invoicesAbortRef.current?.abort(); } catch {}
            try { safetyAbortRef.current?.abort(); } catch {}
            setLoadingInvoices(false);
            setLoadingSafety(false);
            setShowInvoices(false);
            setShowSafety(false);
            if (willOpen) {
              fetchTrips();
            }
          }}
          className={`px-4 py-2 rounded-md border border-gray-200 text-sm font-medium transition duration-150 ease-in-out transform active:scale-95 bg-white text-gray-700 hover:bg-gray-50`}
        >
          {showTrips ? (
            loadingTrips ? (
              <div className="flex items-center justify-center">
                <span aria-hidden className="dot-spinner dot-sm">
                  <span className="dot dot-blue" />
                  <span className="dot dot-black" />
                  <span className="dot dot-yellow" />
                  <span className="dot dot-green" />
                </span>
              </div>
            ) : null
          ) : (
            <div className="flex items-center gap-2">
              <span aria-hidden className={`inline-block h-2 w-2 rounded-full transition-colors ${showTrips ? 'bg-white' : 'bg-slate-300'}`} />
              <span>My Trips</span>
            </div>
          )}
        </button>

        <button
          onClick={() => {
            const willOpen = !showInvoices;
            setShowInvoices(willOpen);
            // stop other loaders and abort their fetches when switching
            try { tripsAbortRef.current?.abort(); } catch {}
            try { safetyAbortRef.current?.abort(); } catch {}
            setLoadingTrips(false);
            setLoadingSafety(false);
            setShowTrips(false);
            setShowSafety(false);
            if (willOpen) {
              fetchInvoices();
            }
          }}
          className={`px-4 py-2 rounded-md border border-gray-200 text-sm font-medium transition duration-150 ease-in-out transform active:scale-95 bg-white text-gray-700 hover:bg-gray-50`}
        >
          {showInvoices ? (
            loadingInvoices ? (
              <div className="flex items-center justify-center">
                <span aria-hidden className="dot-spinner dot-sm">
                  <span className="dot dot-blue" />
                  <span className="dot dot-black" />
                  <span className="dot dot-yellow" />
                  <span className="dot dot-green" />
                </span>
              </div>
            ) : null
          ) : (
            <div className="flex items-center gap-2">
              <span aria-hidden className={`inline-block h-2 w-2 rounded-full transition-colors ${showInvoices ? 'bg-white' : 'bg-slate-300'}`} />
              <span>Invoices</span>
            </div>
          )}
        </button>

        <button
          onClick={() => {
            const willOpen = !showSafety;
            setShowSafety(willOpen);
            // stop other loaders and abort their fetches when switching
            try { tripsAbortRef.current?.abort(); } catch {}
            try { invoicesAbortRef.current?.abort(); } catch {}
            setLoadingTrips(false);
            setLoadingInvoices(false);
            setShowTrips(false);
            setShowInvoices(false);
            if (willOpen) {
              fetchSafetyReports();
            }
          }}
          className="px-4 py-2 rounded-md border border-gray-200 text-sm font-medium transition duration-150 ease-in-out transform active:scale-95 bg-white text-gray-700 hover:bg-gray-50"
        >
          {showSafety ? (
            loadingSafety ? (
              <div className="flex items-center justify-center">
                <span aria-hidden className="dot-spinner dot-sm">
                  <span className="dot dot-blue" />
                  <span className="dot dot-black" />
                  <span className="dot dot-yellow" />
                  <span className="dot dot-green" />
                </span>
              </div>
            ) : null
          ) : (
            <div className="flex items-center gap-2">
              <span aria-hidden className={`inline-block h-2 w-2 rounded-full transition-colors ${showSafety ? 'bg-white' : 'bg-slate-300'}`} />
              <span>Safety Measures</span>
            </div>
          )}
        </button>

        {/* Date range selector for filtering history */}
        <div className="ml-auto flex items-center gap-2">
          <div className="text-sm text-gray-600 mr-2">{renderSelected()}</div>
          <button
            onClick={() => setShowPicker((s) => !s)}
            className={`px-3 py-2 rounded border border-gray-200 text-sm font-medium transition duration-150 ease-in-out transform active:scale-95 bg-white text-gray-700 hover:bg-gray-50`}
            aria-label="Toggle date picker"
          >
            Select date
          </button>
        </div>
      </div>

      {showPicker && (
        <div className="mx-auto max-w-3xl">
          <DatePicker
            selected={selected}
            onSelect={(s) => {
              setSelected(s);
              // keep picker open to allow further adjustments; close on explicit action
            }}
            onClose={() => setShowPicker(false)}
            allowRange={true}
          />
        </div>
      )}

      

      {showTrips && (
        <section className="mx-auto max-w-3xl bg-white rounded-lg p-6 border">
          <div className="flex items-center justify-center">
            <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-blue-50 text-blue-600">
              <ListChecks className="h-6 w-6" aria-hidden />
            </div>
            <h2 className="ml-3 text-lg font-semibold">My Trips</h2>
          </div>

          <div className="mt-4">
            {loadingTrips && (
              <div className="flex items-center justify-center space-x-3 text-gray-600 mb-4">
                <span aria-hidden className="dot-spinner dot-sm" aria-live="polite">
                  <span className="dot dot-blue" />
                  <span className="dot dot-black" />
                  <span className="dot dot-yellow" />
                  <span className="dot dot-green" />
                </span>
                <span>Loading trips…</span>
              </div>
            )}

            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full divide-y table-auto">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="px-4 py-2 text-left text-sm font-medium text-slate-600">Date</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-slate-600">Pick-Up</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-slate-600">Drop-Off</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-slate-600">Trip Code</th>
                    <th className="px-4 py-2 text-right text-sm font-medium text-slate-600">Amount</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-slate-600">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {trips && trips.length > 0 ? (
                    trips.map((t: any) => (
                      <TableRow key={t.id}>
                        <td className="px-4 py-3 text-sm text-slate-700">{t.date ?? t.datetime ?? '-'}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">{t.pickup || t.from || '—'}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">{t.dropoff || t.to || '—'}</td>
                        <td className="px-4 py-3 text-sm text-slate-700 font-mono">{t.trip_code || t.code || t.reference || t.tripCode || '—'}</td>
                        <td className="px-4 py-3 text-sm text-slate-700 text-right">{t.amount ?? t.fare ?? t.total ?? '—'}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">Finished</td>
                      </TableRow>
                    ))
                  ) : (
                    <tr>
                      <td className="px-4 py-3 text-sm text-slate-500">—</td>
                      <td className="px-4 py-3 text-sm text-slate-500">—</td>
                      <td className="px-4 py-3 text-sm text-slate-500">—</td>
                      <td className="px-4 py-3 text-sm text-slate-500">—</td>
                      <td className="px-4 py-3 text-sm text-slate-500 text-right">—</td>
                      <td className="px-4 py-3 text-sm text-slate-500">—</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {showInvoices && (
        <section className="mx-auto max-w-3xl bg-white rounded-lg p-6 border">
          <div className="flex items-center justify-center">
            <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-amber-50 text-amber-600">
              <Wallet className="h-6 w-6" aria-hidden />
            </div>
            <h2 className="ml-3 text-lg font-semibold">Invoices (Paid payouts)</h2>
          </div>

          <div className="mt-4">
            {loadingInvoices && (
              <div className="flex items-center justify-center space-x-3 text-gray-600 mb-4">
                <span aria-hidden className="dot-spinner dot-sm" aria-live="polite">
                  <span className="dot dot-blue" />
                  <span className="dot dot-black" />
                  <span className="dot dot-yellow" />
                  <span className="dot dot-green" />
                </span>
                <span>Loading invoices…</span>
              </div>
            )}

            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full divide-y table-auto">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="px-4 py-2 text-left text-sm font-medium text-slate-600">Date</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-slate-600">Invoice #</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-slate-600">Trip Code</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-slate-600">Paid At</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-slate-600">Paid To</th>
                    <th className="px-4 py-2 text-right text-sm font-medium text-slate-600">Net Paid</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-slate-600">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {invoices && invoices.length > 0 ? (
                    invoices.map((p: any, idx: number) => {
                      const date = p.date || p.createdAt || p.paidAt || "";
                      const invoice = p.invoiceNumber || p.invoiceId || p.invoice || "-";
                      const trip = p.tripCode || p.trip || p.reference || "-";
                      const paidAt = p.paidAt || p.settledAt || date || "-";
                      const net = p.netPaid ?? p.amount ?? p.net ?? "-";

                      const fmt = (iso: any) => {
                        if (!iso) return "-";
                        try { const d = new Date(iso); if (Number.isNaN(d.getTime())) return String(iso); return d.toLocaleDateString(); } catch { return String(iso); }
                      };

                      const timeFmt = (iso: any) => {
                        if (!iso) return "-";
                        try { const d = new Date(iso); if (Number.isNaN(d.getTime())) return String(iso); return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }); } catch { return String(iso); }
                      };

                      const maskNumber = (s: string | number | null | undefined) => {
                        const str = s == null ? "" : String(s).trim();
                        if (!str) return `****`;
                        if (str.length <= 3) return str;
                        const last3 = str.slice(-3);
                        return `****${last3}`;
                      };

                      const renderPaidTo = (payout: any) => {
                        const phone = payout.paymentNumber || payout.phone || payout.mobile || payout.lipaNumber || payout.payment_phone || null;
                        const bankAcct = payout.accountNumber || payout.bankAccount || payout.account || payout.bank_account || null;
                        const manual = payout.paidTo || payout.paid_to || payout.paidToName || null;

                        if (phone) return (<div className="flex items-center justify-end"><CreditCard className="h-4 w-4 text-slate-700 mr-2" /><span className="text-sm">{maskNumber(phone)}</span></div>);
                        if (bankAcct) return (<div className="flex items-center justify-end"><CreditCard className="h-4 w-4 text-slate-700 mr-2" /><span className="text-sm">{maskNumber(bankAcct)}</span></div>);
                        if (manual) return <div className="text-sm text-right">{String(manual)}</div>;
                        const method = String(payout.paidBy || payout.method || payout.source || payout.paymentMethod || '').toLowerCase();
                        if (method.includes('stripe')) {
                          const last4 = payout.cardLast4 || payout.last4 || payout.stripe_last4 || null;
                          return (<div className="flex items-center justify-end"><CreditCard className="h-4 w-4 text-slate-700 mr-2" /><span className="text-sm">{maskNumber(last4)}</span></div>);
                        }
                        return <div className="text-sm text-right">{String(payout.paidBy || payout.method || payout.source || '-')}</div>;
                      };

                      const statusText = String(p.status || p.state || (p.paidAt ? 'Paid' : '') || '-');

                      return (
                        <TableRow key={p.id || invoice || `history-${idx}`} className="bg-white">
                          <td className="px-4 py-3 text-sm text-slate-700">{fmt(date)}</td>
                          <td className="px-4 py-3 text-sm text-slate-700">{invoice}</td>
                          <td className="px-4 py-3 text-sm text-slate-700">{trip}</td>
                          <td className="px-4 py-3 text-sm text-slate-700">{timeFmt(paidAt)}</td>
                          <td className="px-4 py-3 text-sm text-slate-700">{renderPaidTo(p)}</td>
                          <td className="px-4 py-3 text-sm text-slate-700 text-right">{typeof net === 'number' ? net.toFixed(2) : net}</td>
                          <td className="px-4 py-3 text-sm text-slate-700">{statusText}</td>
                        </TableRow>
                      );
                    })
                  ) : (
                    <tr>
                      <td className="px-4 py-3 text-sm text-slate-500">—</td>
                      <td className="px-4 py-3 text-sm text-slate-500">—</td>
                      <td className="px-4 py-3 text-sm text-slate-500">—</td>
                      <td className="px-4 py-3 text-sm text-slate-500">—</td>
                      <td className="px-4 py-3 text-sm text-slate-500">—</td>
                      <td className="px-4 py-3 text-sm text-slate-500 text-right">—</td>
                      <td className="px-4 py-3 text-sm text-slate-500">—</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {showSafety && (
        <section className="mx-auto max-w-3xl bg-white rounded-lg p-6 border">
          <div className="flex items-center justify-center">
            <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-red-50 text-red-600">
              <ListChecks className="h-6 w-6" aria-hidden />
            </div>
            <h2 className="ml-3 text-lg font-semibold">Safety Measures — Monthly report</h2>
          </div>

          <div className="mt-4">
            {loadingSafety && (
              <div className="flex items-center justify-center space-x-3 text-gray-600 mb-4">
                <span aria-hidden className="dot-spinner dot-sm" aria-live="polite">
                  <span className="dot dot-blue" />
                  <span className="dot dot-black" />
                  <span className="dot dot-yellow" />
                  <span className="dot dot-green" />
                </span>
                <span>Loading safety reports…</span>
              </div>
            )}

            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full divide-y table-auto">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="px-4 py-2 text-left text-sm font-medium text-slate-600">Month</th>
                    <th className="px-4 py-2 text-right text-sm font-medium text-slate-600">Trips Reviewed</th>
                    <th className="px-4 py-2 text-right text-sm font-medium text-slate-600">Infractions</th>
                    <th className="px-4 py-2 text-right text-sm font-medium text-slate-600">Compliance %</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-slate-600">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {safetyReports && safetyReports.length > 0 ? (
                    safetyReports.map((r: any) => {
                      const monthLabel = r.month || r.period || r.label || r.monthLabel || r.monthName || String(r.month);
                      const trips = Number(r.trips ?? r.reviewed ?? 0) || 0;
                      const infractions = Number(r.infractions ?? r.issues ?? 0) || 0;
                      const compliance = trips > 0 ? Math.max(0, Math.round((1 - infractions / trips) * 100)) : null;
                      const notes = r.notes || (infractions > 0 ? `Driver had ${infractions} infractions` : 'No issues');

                      return (
                        <TableRow key={monthLabel} className="bg-white">
                          <td className="px-4 py-3 text-sm text-slate-700">{monthLabel}</td>
                          <td className="px-4 py-3 text-sm text-slate-700 text-right">{trips}</td>
                          <td className="px-4 py-3 text-sm text-slate-700 text-right">{infractions}</td>
                          <td className="px-4 py-3 text-sm text-slate-700 text-right">{compliance === null ? '—' : `${compliance}%`}</td>
                          <td className="px-4 py-3 text-sm text-slate-700">{notes}</td>
                        </TableRow>
                      );
                    })
                  ) : (
                    <tr>
                      <td className="px-4 py-3 text-sm text-slate-500">—</td>
                      <td className="px-4 py-3 text-sm text-slate-500 text-right">—</td>
                      <td className="px-4 py-3 text-sm text-slate-500 text-right">—</td>
                      <td className="px-4 py-3 text-sm text-slate-500 text-right">—</td>
                      <td className="px-4 py-3 text-sm text-slate-500">No reports found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* Placeholder removed per request: Open Bonus History and Bonus Overview were removed. */}
    </div>
  );
}
