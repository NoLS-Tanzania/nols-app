"use client";
import React, { useState, useCallback, useRef, useEffect } from "react";
import DatePicker from "@/components/ui/DatePicker";
import { ListChecks, Wallet, CreditCard, Calendar, Shield, AlertTriangle, MapPin, Clock, Hash } from "lucide-react";

type ActiveTab = "trips" | "invoices" | "safety";

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return String(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return String(iso);
  }
}

function formatAmount(amt: any, currency?: string | null) {
  if (amt == null) return "—";
  const code = (currency || "TZS").toUpperCase();
  const n = typeof amt === "number" ? amt : Number(String(amt).replace(/,/g, ""));
  if (!Number.isFinite(n)) return String(amt);
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: code,
      maximumFractionDigits: code === "TZS" ? 0 : 2,
    }).format(n);
  } catch {
    return `${n.toLocaleString()} ${code}`;
  }
}

function getTripStatusBadge(status: string | null | undefined) {
  const s = String(status ?? "").toUpperCase();
  if (s === "COMPLETED" || s === "FINISHED")
    return { label: "Completed", cls: "bg-emerald-50 text-emerald-700 border border-emerald-200" };
  if (s === "IN_PROGRESS")
    return { label: "In Progress", cls: "bg-blue-50 text-blue-700 border border-blue-200" };
  if (s === "CONFIRMED" || s === "ASSIGNED")
    return { label: "Confirmed", cls: "bg-[#02665e]/10 text-[#02665e] border border-[#02665e]/20" };
  if (s === "PENDING_ASSIGNMENT" || s === "PENDING")
    return { label: "Pending", cls: "bg-amber-50 text-amber-700 border border-amber-200" };
  if (s === "CANCELLED" || s === "CANCELED")
    return { label: "Cancelled", cls: "bg-red-50 text-red-700 border border-red-200" };
  return { label: status ?? "—", cls: "bg-slate-100 text-slate-600 border border-slate-200" };
}

function shortenLocation(value?: string | null) {
  const raw = String(value ?? "").trim();
  if (!raw) return "—";
  const parts = raw.split(/\s+-\s+|,\s*/).map((p) => p.trim()).filter(Boolean);
  const unique: string[] = [];
  for (const p of parts) {
    if (!unique.some((u) => u.toLowerCase() === p.toLowerCase())) unique.push(p);
    if (unique.length >= 2) break;
  }
  return unique.length > 0 ? unique.join(", ") : raw;
}

export default function DriverHistoryPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("trips");
  const [showPicker, setShowPicker] = useState(false);
  const [selected, setSelected] = useState<string | string[] | undefined>(undefined);
  const [trips, setTrips] = useState<any[] | null>(null);
  const [loadingTrips, setLoadingTrips] = useState(false);
  const tripsAbortRef = useRef<AbortController | null>(null);
  const [invoices, setInvoices] = useState<any[] | null>(null);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const invoicesAbortRef = useRef<AbortController | null>(null);
  const [safetyReports, setSafetyReports] = useState<any[] | null>(null);
  const [loadingSafety, setLoadingSafety] = useState(false);
  const safetyAbortRef = useRef<AbortController | null>(null);

  const buildParams = useCallback(() => {
    const params = new URLSearchParams();
    if (selected) {
      if (Array.isArray(selected)) {
        if (selected[0]) params.set("start", selected[0]);
        if (selected[1]) params.set("end", selected[1]);
      } else {
        params.set("date", selected);
      }
    }
    return params.toString();
  }, [selected]);

  const fetchTrips = useCallback(async () => {
    try { tripsAbortRef.current?.abort(); } catch {}
    const controller = new AbortController();
    tripsAbortRef.current = controller;
    setLoadingTrips(true);
    try {
      const qs = buildParams();
      const url = `/api/driver/trips${qs ? "?" + qs : ""}`;
      const res = await fetch(url, { signal: controller.signal, credentials: "include" });
      if (!res.ok) { setTrips([]); return; }
      const data = await res.json();
      setTrips(data?.trips ?? (Array.isArray(data) ? data : []));
    } catch (e) {
      if ((e as any)?.name !== "AbortError") setTrips([]);
    } finally {
      tripsAbortRef.current = null;
      setLoadingTrips(false);
    }
  }, [buildParams]);

  const fetchSafety = useCallback(async () => {
    try { safetyAbortRef.current?.abort(); } catch {}
    const controller = new AbortController();
    safetyAbortRef.current = controller;
    setLoadingSafety(true);
    try {
      const qs = buildParams();
      const url = `/api/driver/safety${qs ? "?" + qs : ""}`;
      const res = await fetch(url, { signal: controller.signal, credentials: "include" });
      if (!res.ok) { setSafetyReports([]); return; }
      const data = await res.json();
      const arr = data?.items ?? (Array.isArray(data) ? data : []);
      const looksLikeSummary = arr.length > 0 && (arr[0].month || arr[0].period);
      if (looksLikeSummary) {
        setSafetyReports(arr);
      } else {
        const map = new Map<string, { month: string; trips: number; infractions: number }>();
        for (const it of arr) {
          const dateStr = it.date || it.timestamp || it.createdAt || it.datetime || null;
          const d = dateStr ? new Date(dateStr) : new Date();
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          const existing = map.get(key) ?? { month: key, trips: 0, infractions: 0 };
          existing.trips += 1;
          const infraction = !!(it.infraction || it.ruleViolated || it.speeding || it.hardBraking || it.harshAcceleration || it.distracted || it.offRoute);
          if (infraction) existing.infractions += 1;
          map.set(key, existing);
        }
        setSafetyReports(Array.from(map.values()).sort((a, b) => b.month.localeCompare(a.month)) as any);
      }
    } catch (e) {
      if ((e as any)?.name !== "AbortError") setSafetyReports([]);
    } finally {
      safetyAbortRef.current = null;
      setLoadingSafety(false);
    }
  }, [buildParams]);

  const fetchInvoices = useCallback(async () => {
    try { invoicesAbortRef.current?.abort(); } catch {}
    const controller = new AbortController();
    invoicesAbortRef.current = controller;
    setLoadingInvoices(true);
    try {
      const qs = buildParams();
      const url = `/api/driver/payouts${qs ? "?" + qs : ""}`;
      const res = await fetch(url, { signal: controller.signal, credentials: "include" });
      if (!res.ok) { setInvoices([]); return; }
      const data = await res.json();
      const arr = data?.items ?? (Array.isArray(data) ? data : []);
      setInvoices(arr.filter((p: any) => {
        const st = String(p.status || p.state || "").toLowerCase();
        return st === "paid" || !!p.paidAt || !!p.settledAt || p.paid === true || p.isPaid === true;
      }));
    } catch (e) {
      if ((e as any)?.name !== "AbortError") setInvoices([]);
    } finally {
      invoicesAbortRef.current = null;
      setLoadingInvoices(false);
    }
  }, [buildParams]);

  useEffect(() => {
    if (activeTab === "trips") fetchTrips();
    else if (activeTab === "invoices") fetchInvoices();
    else fetchSafety();
  }, [activeTab, fetchTrips, fetchInvoices, fetchSafety]);

  function renderSelected() {
    if (!selected) return "All dates";
    if (Array.isArray(selected)) return `${selected[0]} → ${selected[1] ?? selected[0]}`;
    return selected;
  }

  const isLoading = activeTab === "trips" ? loadingTrips : activeTab === "invoices" ? loadingInvoices : loadingSafety;

  const tabsMeta = [
    { id: "trips" as ActiveTab, label: "My Trips", icon: <ListChecks className="h-4 w-4" /> },
    { id: "invoices" as ActiveTab, label: "Invoices", icon: <Wallet className="h-4 w-4" /> },
    { id: "safety" as ActiveTab, label: "Safety", icon: <Shield className="h-4 w-4" /> },
  ];

  return (
    <div className="w-full max-w-full space-y-5 overflow-x-hidden pb-8">
      {/* Page header */}
      <div className="flex flex-col items-center text-center pt-2 pb-1">
        <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-[#02665e]/10 text-[#02665e] mb-3">
          <Calendar className="h-7 w-7" aria-hidden />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">History</h1>
        <p className="text-sm text-slate-500 mt-1">Your trips, invoices and safety reports</p>
      </div>

      {/* Date filter bar */}
      <div className="flex items-center gap-3 bg-white border border-slate-100 rounded-2xl px-4 py-3 shadow-sm">
        <Calendar className="h-4 w-4 text-[#02665e] flex-shrink-0" />
        <span className="text-sm text-slate-600 flex-1 truncate">{renderSelected()}</span>
        <button
          onClick={() => setShowPicker((s) => !s)}
          className="text-xs font-semibold text-[#02665e] hover:text-[#014e47] transition-colors px-2 py-1 rounded-lg hover:bg-[#02665e]/5"
        >
          {showPicker ? "Close" : "Filter"}
        </button>
        {selected && (
          <button
            onClick={() => setSelected(undefined)}
            className="text-xs font-medium text-slate-400 hover:text-slate-600 transition-colors px-2 py-1 rounded-lg hover:bg-slate-50"
          >
            Clear
          </button>
        )}
      </div>

      {showPicker && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <DatePicker
            selected={selected}
            onSelectAction={(s) => setSelected(s)}
            onCloseAction={() => setShowPicker(false)}
            allowRange={true}
          />
        </div>
      )}

      {/* Tab navigation */}
      <div className="flex gap-2 bg-slate-50 rounded-2xl p-1.5">
        {tabsMeta.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === tab.id
                ? "bg-white text-[#02665e] shadow-sm border border-slate-100"
                : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
            }`}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Card header */}
        <div className="px-5 py-4 border-b border-slate-50 flex items-center gap-3">
          <div className="h-8 w-8 rounded-xl bg-[#02665e]/10 text-[#02665e] flex items-center justify-center flex-shrink-0">
            {tabsMeta.find((t) => t.id === activeTab)?.icon}
          </div>
          <span className="font-semibold text-slate-800">
            {activeTab === "trips" ? "My Trips" : activeTab === "invoices" ? "Invoices (Paid Payouts)" : "Safety — Monthly Report"}
          </span>
          {isLoading && (
            <span aria-hidden className="dot-spinner dot-sm ml-auto" aria-live="polite">
              <span className="dot dot-blue" />
              <span className="dot dot-black" />
              <span className="dot dot-yellow" />
              <span className="dot dot-green" />
            </span>
          )}
        </div>

        {/* Trips */}
        {activeTab === "trips" && (
          <div>
            {trips && trips.length > 0 ? (
              <div className="divide-y divide-slate-50">
                {trips.map((t: any) => {
                  const { label, cls } = getTripStatusBadge(t.status);
                  return (
                    <div key={t.id} className="px-5 py-4 hover:bg-slate-50/60 transition-colors">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                          <span>{formatDate(t.date ?? t.scheduledDate)}</span>
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold flex-shrink-0 ${cls}`}>
                          {label}
                        </span>
                      </div>
                      <div className="space-y-1.5 mb-3">
                        <div className="flex items-start gap-2">
                          <div className="h-5 w-5 rounded-full bg-[#02665e]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <MapPin className="h-3 w-3 text-[#02665e]" />
                          </div>
                          <span className="text-sm text-slate-700 leading-snug line-clamp-1">{shortenLocation(t.pickup)}</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <div className="h-5 w-5 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <MapPin className="h-3 w-3 text-slate-400" />
                          </div>
                          <span className="text-sm text-slate-700 leading-snug line-clamp-1">{shortenLocation(t.dropoff)}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-50">
                        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono min-w-0">
                          <Hash className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{t.tripCode ?? t.trip_code ?? "—"}</span>
                        </div>
                        <span className="text-sm font-bold text-slate-900 flex-shrink-0">
                          {formatAmount(t.amount, t.currency)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : !loadingTrips ? (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <div className="h-14 w-14 rounded-2xl bg-slate-50 flex items-center justify-center mb-4">
                  <ListChecks className="h-7 w-7 text-slate-300" />
                </div>
                <p className="text-sm font-semibold text-slate-600 mb-1">No trips found</p>
                <p className="text-xs text-slate-400">Try adjusting the date filter</p>
              </div>
            ) : null}
          </div>
        )}

        {/* Invoices */}
        {activeTab === "invoices" && (
          <div>
            {invoices && invoices.length > 0 ? (
              <div className="divide-y divide-slate-50">
                {invoices.map((p: any, idx: number) => {
                  const date = p.date || p.createdAt || p.paidAt || "";
                  const invoice = p.invoiceNumber || p.invoiceId || p.invoice || "—";
                  const trip = p.tripCode || p.trip || p.reference || "—";
                  const paidAt = p.paidAt || p.settledAt || date || "";
                  const net = p.netPaid ?? p.amount ?? p.net ?? null;
                  const statusText = String(p.status || p.state || (p.paidAt ? "Paid" : "") || "—");

                  const fmtDate = (iso: any) => {
                    if (!iso) return "—";
                    try { const d = new Date(iso); return isNaN(d.getTime()) ? String(iso) : d.toLocaleDateString(); } catch { return String(iso); }
                  };
                  const fmtTime = (iso: any) => {
                    if (!iso) return "—";
                    try { const d = new Date(iso); return isNaN(d.getTime()) ? String(iso) : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }); } catch { return String(iso); }
                  };
                  const maskNumber = (s: any) => {
                    const str = s == null ? "" : String(s).trim();
                    if (!str || str.length <= 3) return str || "****";
                    return `****${str.slice(-3)}`;
                  };
                  const renderPaidTo = () => {
                    const phone = p.paymentNumber || p.phone || p.mobile || p.lipaNumber || null;
                    const bankAcct = p.accountNumber || p.bankAccount || p.account || null;
                    if (phone) return <span className="font-mono text-xs flex items-center gap-1"><CreditCard className="h-3 w-3" />{maskNumber(phone)}</span>;
                    if (bankAcct) return <span className="font-mono text-xs flex items-center gap-1"><CreditCard className="h-3 w-3" />{maskNumber(bankAcct)}</span>;
                    return <span className="text-xs">{String(p.paidTo || p.paidBy || p.method || "—")}</span>;
                  };

                  return (
                    <div key={p.id || invoice || idx} className="px-5 py-4 hover:bg-slate-50/60 transition-colors">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                            <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                            <span>{fmtDate(date)}</span>
                          </div>
                          <p className="text-sm font-semibold text-slate-800">Invoice {invoice}</p>
                        </div>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex-shrink-0">
                          {statusText}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                        <div>
                          <p className="text-slate-400 mb-0.5">Trip Code</p>
                          <p className="font-mono text-slate-700 truncate">{trip}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 mb-0.5">Paid At</p>
                          <p className="text-slate-700">{fmtTime(paidAt)}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 mb-0.5">Paid To</p>
                          <div className="text-slate-700">{renderPaidTo()}</div>
                        </div>
                        <div>
                          <p className="text-slate-400 mb-0.5">Net Paid</p>
                          <p className="font-bold text-slate-900">{typeof net === "number" ? net.toFixed(2) : (net ?? "—")}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : !loadingInvoices ? (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <div className="h-14 w-14 rounded-2xl bg-slate-50 flex items-center justify-center mb-4">
                  <Wallet className="h-7 w-7 text-slate-300" />
                </div>
                <p className="text-sm font-semibold text-slate-600 mb-1">No invoices found</p>
                <p className="text-xs text-slate-400">Paid invoices will appear here</p>
              </div>
            ) : null}
          </div>
        )}

        {/* Safety */}
        {activeTab === "safety" && (
          <div>
            {safetyReports && safetyReports.length > 0 ? (
              <div className="divide-y divide-slate-50">
                {safetyReports.map((r: any) => {
                  const monthLabel = r.month || r.period || r.label || "—";
                  const tripCount = Number(r.trips ?? r.reviewed ?? 0) || 0;
                  const infractions = Number(r.infractions ?? r.issues ?? 0) || 0;
                  const compliance = tripCount > 0 ? Math.max(0, Math.round((1 - infractions / tripCount) * 100)) : null;
                  const notes = r.notes || (infractions > 0 ? `${infractions} infraction${infractions > 1 ? "s" : ""} recorded` : "No issues reported");
                  let complianceCls = "bg-emerald-50 text-emerald-700 border border-emerald-200";
                  if (compliance !== null) {
                    if (compliance < 70) complianceCls = "bg-red-50 text-red-700 border border-red-200";
                    else if (compliance < 85) complianceCls = "bg-amber-50 text-amber-700 border border-amber-200";
                    else if (compliance < 95) complianceCls = "bg-yellow-50 text-yellow-700 border border-yellow-200";
                  }
                  return (
                    <div key={monthLabel} className="px-5 py-4 hover:bg-slate-50/60 transition-colors">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{monthLabel}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{tripCount} trip{tripCount !== 1 ? "s" : ""} reviewed</p>
                        </div>
                        {compliance !== null && (
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold flex-shrink-0 ${complianceCls}`}>
                            {compliance}% compliance
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-1.5">
                          {infractions > 0 ? (
                            <>
                              <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                              <span className="font-semibold text-red-600">{infractions} infraction{infractions > 1 ? "s" : ""}</span>
                            </>
                          ) : (
                            <>
                              <div className="h-3.5 w-3.5 rounded-full bg-emerald-400 flex-shrink-0" />
                              <span className="text-emerald-600 font-medium">Clean record</span>
                            </>
                          )}
                        </div>
                        <span className="text-slate-400 text-right max-w-[160px] truncate">{notes}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : !loadingSafety ? (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <div className="h-14 w-14 rounded-2xl bg-slate-50 flex items-center justify-center mb-4">
                  <Shield className="h-7 w-7 text-slate-300" />
                </div>
                <p className="text-sm font-semibold text-slate-600 mb-1">No safety reports</p>
                <p className="text-xs text-slate-400">Reports will appear once available</p>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
