"use client";
import React, { useState, useCallback, useRef } from "react";
import DatePicker from "@/components/ui/DatePicker";
import TableRow from "@/components/TableRow";
import { ListChecks, Wallet, CreditCard, Calendar, Shield, AlertTriangle } from "lucide-react";

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
      const params = new URLSearchParams();
      if (selected) {
        if (Array.isArray(selected)) {
          if (selected[0]) params.set("start", selected[0]);
          if (selected[1]) params.set("end", selected[1]);
        } else {
          params.set("date", selected);
        }
      }
      const url = `/api/driver/trips${params.toString() ? "?" + params.toString() : ""}`;
      const res = await fetch(url, { signal: controller.signal, credentials: "include" });
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
      const params = new URLSearchParams();
      if (selected) {
        if (Array.isArray(selected)) {
          if (selected[0]) params.set("start", selected[0]);
          if (selected[1]) params.set("end", selected[1]);
        } else {
          params.set("date", selected);
        }
      }
      const url = `/api/driver/safety${params.toString() ? "?" + params.toString() : ""}`;
      const res = await fetch(url, { signal: controller.signal, credentials: "include" });
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
      const params = new URLSearchParams();
      if (selected) {
        if (Array.isArray(selected)) {
          if (selected[0]) params.set("start", selected[0]);
          if (selected[1]) params.set("end", selected[1]);
        } else {
          params.set("date", selected);
        }
      }
      const url = `/api/driver/payouts${params.toString() ? "?" + params.toString() : ""}`;
      const res = await fetch(url, { signal: controller.signal, credentials: "include" });
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

  const renderComplianceBadge = (compliance: number | null) => {
    if (compliance === null) return <span className="text-slate-500">—</span>;
    
    let bgColor = 'bg-green-100 text-green-700';
    if (compliance < 70) {
      bgColor = 'bg-red-100 text-red-700';
    } else if (compliance < 85) {
      bgColor = 'bg-amber-100 text-amber-700';
    } else if (compliance < 95) {
      bgColor = 'bg-yellow-100 text-yellow-700';
    }

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bgColor}`}>
        {compliance}%
      </span>
    );
  };

  return (
    <div className="w-full max-w-full space-y-6 overflow-x-hidden">
      <div className="w-full text-center">
        <div className="flex flex-col items-center mb-6">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-emerald-50 text-emerald-600">
            <Calendar className="h-6 w-6" aria-hidden />
          </div>
          <h1 className="mt-3 text-2xl font-semibold text-gray-900">History</h1>
        </div>
      </div>

      <div className="w-full max-w-full mt-4 flex items-center gap-3 flex-wrap">
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
          className={`px-4 py-2 rounded-md border-2 text-sm font-medium transition-colors ${
            showTrips
              ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300'
          }`}
        >
          {loadingTrips ? (
            <div className="flex items-center justify-center">
              <span aria-hidden className="dot-spinner dot-sm">
                <span className="dot dot-blue" />
                <span className="dot dot-black" />
                <span className="dot dot-yellow" />
                <span className="dot dot-green" />
              </span>
            </div>
          ) : (
            <span>My Trips</span>
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
          className={`px-4 py-2 rounded-md border-2 text-sm font-medium transition-colors ${
            showInvoices
              ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300'
          }`}
        >
          {loadingInvoices ? (
            <div className="flex items-center justify-center">
              <span aria-hidden className="dot-spinner dot-sm">
                <span className="dot dot-blue" />
                <span className="dot dot-black" />
                <span className="dot dot-yellow" />
                <span className="dot dot-green" />
              </span>
            </div>
          ) : (
            <span>Invoices</span>
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
          className={`px-4 py-2 rounded-md border-2 text-sm font-medium transition-colors ${
            showSafety
              ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300'
          }`}
        >
          {loadingSafety ? (
            <div className="flex items-center justify-center">
              <span aria-hidden className="dot-spinner dot-sm">
                <span className="dot dot-blue" />
                <span className="dot dot-black" />
                <span className="dot dot-yellow" />
                <span className="dot dot-green" />
              </span>
            </div>
          ) : (
            <span>Safety Measures</span>
          )}
        </button>

        {/* Date range selector for filtering history */}
        <div className="ml-auto flex items-center gap-2">
          <div className="text-sm text-gray-600 mr-2">{renderSelected()}</div>
          <button
            onClick={() => setShowPicker((s) => !s)}
            className="px-3 py-2 rounded-md border-2 border-slate-200 text-sm font-medium transition-colors bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 flex items-center gap-2"
            aria-label="Toggle date picker"
          >
            <Calendar className="h-4 w-4" />
            <span>{new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
          </button>
        </div>
      </div>

      {showPicker && (
        <div className="w-full max-w-full">
          <div className="bg-white rounded-lg p-4 border-2 border-slate-200 shadow-sm">
            <DatePicker
              selected={selected}
              onSelectAction={(s) => {
                setSelected(s);
                // keep picker open to allow further adjustments; close on explicit action
              }}
              onCloseAction={() => setShowPicker(false)}
              allowRange={true}
            />
          </div>
        </div>
      )}

      

      {showTrips && (
        <section className="w-full max-w-full bg-white rounded-lg p-6 border-2 border-slate-200 shadow-sm overflow-x-hidden">
          <div className="flex items-center justify-center mb-6">
            <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-emerald-50 text-emerald-600">
              <ListChecks className="h-6 w-6" aria-hidden />
            </div>
            <h2 className="ml-3 text-xl font-semibold text-gray-900">My Trips</h2>
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

            <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200 max-w-full">
              <table className="w-full divide-y divide-slate-200 table-auto">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider border-b border-slate-200">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider border-b border-slate-200">Pick-Up</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider border-b border-slate-200">Drop-Off</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider border-b border-slate-200">Trip Code</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider border-b border-slate-200">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider border-b border-slate-200">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {trips && trips.length > 0 ? (
                    trips.map((t: any) => (
                      <TableRow key={t.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 text-sm font-medium text-slate-900 whitespace-nowrap">{t.date ?? t.datetime ?? '-'}</td>
                        <td className="px-6 py-4 text-sm text-slate-700">{t.pickup || t.from || '—'}</td>
                        <td className="px-6 py-4 text-sm text-slate-700">{t.dropoff || t.to || '—'}</td>
                        <td className="px-6 py-4 text-sm text-slate-700 font-mono font-medium">{t.trip_code || t.code || t.reference || t.tripCode || '—'}</td>
                        <td className="px-6 py-4 text-sm font-semibold text-slate-900 text-right whitespace-nowrap">{t.amount ?? t.fare ?? t.total ?? '—'}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            Finished
                          </span>
                        </td>
                      </TableRow>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-sm text-slate-500">
                        {loadingTrips ? 'Loading trips…' : 'No trips found'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {showInvoices && (
        <section className="w-full max-w-full bg-white rounded-lg p-6 border-2 border-slate-200 shadow-sm overflow-x-hidden">
          <div className="flex items-center justify-center mb-6">
            <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-emerald-50 text-emerald-600">
              <Wallet className="h-6 w-6" aria-hidden />
            </div>
            <h2 className="ml-3 text-xl font-semibold text-gray-900">Invoices (Paid Payouts)</h2>
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

            <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200 max-w-full">
              <table className="w-full divide-y divide-slate-200 table-auto">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider border-b border-slate-200">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider border-b border-slate-200">Invoice #</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider border-b border-slate-200">Trip Code</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider border-b border-slate-200">Paid At</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider border-b border-slate-200">Paid To</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider border-b border-slate-200">Net Paid</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider border-b border-slate-200">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
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
                        <TableRow key={p.id || invoice || `history-${idx}`} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 text-sm font-medium text-slate-900 whitespace-nowrap">{fmt(date)}</td>
                          <td className="px-6 py-4 text-sm text-slate-700 font-medium">{invoice}</td>
                          <td className="px-6 py-4 text-sm text-slate-700 font-mono font-medium">{trip}</td>
                          <td className="px-6 py-4 text-sm text-slate-700 whitespace-nowrap">{timeFmt(paidAt)}</td>
                          <td className="px-6 py-4 text-sm text-slate-700">{renderPaidTo(p)}</td>
                          <td className="px-6 py-4 text-sm font-semibold text-slate-900 text-right whitespace-nowrap">{typeof net === 'number' ? net.toFixed(2) : net}</td>
                          <td className="px-6 py-4 text-sm">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                              {statusText}
                            </span>
                          </td>
                        </TableRow>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-sm text-slate-500">
                        {loadingInvoices ? 'Loading invoices…' : 'No invoices found'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {showSafety && (
        <section className="w-full max-w-full bg-white rounded-lg p-6 border-2 border-slate-200 shadow-sm overflow-x-hidden">
          <div className="flex items-center justify-center mb-6">
            <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-emerald-50 text-emerald-600">
              <Shield className="h-6 w-6" aria-hidden />
            </div>
            <h2 className="ml-3 text-xl font-semibold text-gray-900">Safety Measures — Monthly Report</h2>
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

            <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200 max-w-full">
              <table className="w-full divide-y divide-slate-200 table-auto">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider border-b border-slate-200">Month</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider border-b border-slate-200">Trips Reviewed</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider border-b border-slate-200">Infractions</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider border-b border-slate-200">Compliance %</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider border-b border-slate-200">Notes</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {safetyReports && safetyReports.length > 0 ? (
                    safetyReports.map((r: any) => {
                      const monthLabel = r.month || r.period || r.label || r.monthLabel || r.monthName || String(r.month);
                      const trips = Number(r.trips ?? r.reviewed ?? 0) || 0;
                      const infractions = Number(r.infractions ?? r.issues ?? 0) || 0;
                      const compliance = trips > 0 ? Math.max(0, Math.round((1 - infractions / trips) * 100)) : null;
                      const notes = r.notes || (infractions > 0 ? `${infractions} infraction${infractions > 1 ? 's' : ''} recorded` : 'No issues reported');

                      return (
                        <TableRow key={monthLabel} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 text-sm font-medium text-slate-900 whitespace-nowrap">{monthLabel}</td>
                          <td className="px-6 py-4 text-sm text-slate-700 text-right whitespace-nowrap">{trips}</td>
                          <td className="px-6 py-4 text-sm text-slate-700 text-right whitespace-nowrap">
                            {infractions > 0 ? (
                              <span className="inline-flex items-center gap-1 text-red-600 font-medium">
                                <AlertTriangle className="h-4 w-4" />
                                {infractions}
                              </span>
                            ) : (
                              <span className="text-slate-500">0</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-right whitespace-nowrap">
                            {renderComplianceBadge(compliance)}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-700">{notes}</td>
                        </TableRow>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center">
                          <Shield className="h-12 w-12 text-slate-300 mb-3" />
                          <div className="text-sm font-medium text-slate-600 mb-1">No safety reports available</div>
                          <div className="text-xs text-slate-500">Safety reports will appear here once available</div>
                        </div>
                      </td>
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
